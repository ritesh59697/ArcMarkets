import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { PredictionMarketABI, CONTRACT_ADDRESSES } from "@/utils/contracts";

// FIFA ratings for recommendation calculations
const TEAM_RATINGS = {
  "France": 93, "Brazil": 92, "England": 90, "Spain": 89,
  "Argentina": 88, "Portugal": 87, "Germany": 86, "Netherlands": 85,
  "Belgium": 83, "Italy": 82, "Croatia": 80, "Uruguay": 79,
  "USA": 75, "Mexico": 74, "Japan": 73, "Morocco": 72,
  "Senegal": 70, "Australia": 68, "South Korea": 67, "Poland": 66,
};

const RISK_PROFILES = {
  conservative: { minConfidence: 70, maxBetPercent: 0.05, outcomeMultiplier: 0.8 },
  moderate: { minConfidence: 55, maxBetPercent: 0.10, outcomeMultiplier: 1.0 },
  aggressive: { minConfidence: 40, maxBetPercent: 0.20, outcomeMultiplier: 1.2 },
};

export async function POST(req) {
  try {
    const { userAddress, riskLevel, sizingMethod, customBetSize } = await req.json();

    if (!userAddress) {
      return NextResponse.json({ error: "Missing userAddress" }, { status: 400 });
    }

    const activeRisk = riskLevel || "moderate";

    // Setup provider and signer using agent private key from environment
    const rpcUrl = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network";
    // We get the private key from the environment. On Vercel or locally, this is process.env.PRIVATE_KEY
    // Note: process.env.PRIVATE_KEY is injected by Hardhat or loaded from root .env
    const privateKey = process.env.PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY;

    if (!privateKey) {
      return NextResponse.json({ error: "Agent PRIVATE_KEY not configured on server" }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { batchMaxCount: 100, batchStallTime: 10 });
    const agentWallet = new ethers.Wallet(privateKey, provider);

    const marketAddress = process.env.NEXT_PUBLIC_MARKET_ADDRESS || CONTRACT_ADDRESSES.PredictionMarket;
    const marketContract = new ethers.Contract(marketAddress, PredictionMarketABI, agentWallet);

    console.log(`[Agent API] Running cycle for user: ${userAddress} using agent: ${agentWallet.address}`);

    // Verify if the agent is authorized by the user on-chain
    const authorizedAgentAddress = await marketContract.userAgent(userAddress);
    if (authorizedAgentAddress.toLowerCase() !== agentWallet.address.toLowerCase()) {
      return NextResponse.json({
        error: `Agent not authorized. User's authorized agent is: ${authorizedAgentAddress}`
      }, { status: 400 });
    }

    // Get the user's escrowed budget from the contract
    const rawBudget = await marketContract.agentBudget(userAddress);
    let userBudget = Number(ethers.formatUnits(rawBudget, 6)); // in USDC (6 decimals)

    if (userBudget < 0.01) {
      return NextResponse.json({
        actions: [],
        message: "Agent stopped: Escrowed budget is below 0.01 USDC. Please top up your budget."
      });
    }

    // Fetch matches from the contract
    const matchCount = await marketContract.getMatchCount();
    const count = Number(matchCount);
    const actions = [];

    // Pre-fetch all match details, odds, and user bets in parallel to leverage JSON-RPC batching!
    const matchesData = await Promise.all(
      Array.from({ length: count }, (_, i) => marketContract.getMatch(i))
    );
    const matchesOdds = await Promise.all(
      Array.from({ length: count }, (_, i) => marketContract.getOdds(i))
    );
    const userBetsLists = await Promise.all(
      Array.from({ length: count }, (_, i) => marketContract.getUserBetsForMatch(i, userAddress))
    );

    // Fetch details for all user bets in parallel to check if the agent has already bet on them
    const allBetPromises = [];
    const betIndexMap = []; // keeps track of which match each promise belongs to
    userBetsLists.forEach((bets, matchIndex) => {
      bets.forEach(betId => {
        allBetPromises.push(marketContract.getBet(betId));
        betIndexMap.push({ matchIndex, betId: Number(betId) });
      });
    });
    const allBets = await Promise.all(allBetPromises);

    // Map bets to their match index for instant check
    const agentBetForMatch = new Set();
    allBets.forEach((bet, idx) => {
      if (bet.isAgentBet) {
        agentBetForMatch.add(betIndexMap[idx].matchIndex);
      }
    });

    // Analyze each match using the pre-fetched data
    for (let i = 0; i < count; i++) {
      if (userBudget < 0.01) {
        console.log(`[Agent API] Stopping match loop: budget too low (${userBudget} USDC)`);
        break;
      }
      const match = matchesData[i];

      // Check status: 0 is MarketStatus.OPEN
      if (Number(match.status) !== 0) continue;

      // Check kickoff time
      const kickoff = Number(match.kickoffTime);
      if (kickoff * 1000 < Date.now()) continue;

      const homeTeam = match.homeTeam;
      const awayTeam = match.awayTeam;

      // Check if user has already placed a bet on this match through this agent to prevent duplicates
      if (agentBetForMatch.has(i)) {
        console.log(`[Agent API] Already placed agent bet on match ${i} for user ${userAddress}`);
        continue;
      }

      // Perform analysis
      const homeRating = TEAM_RATINGS[homeTeam] ?? 65;
      const awayRating = TEAM_RATINGS[awayTeam] ?? 65;
      const ratingDiff = homeRating - awayRating;

      // Sigmoid/linear probability model
      const homeWinProb = Math.min(85, Math.max(15, 50 + ratingDiff * 0.4 + 5));
      const awayWinProb = Math.min(85, Math.max(15, 50 - ratingDiff * 0.4 - 5));
      const drawProb = Math.max(10, 100 - homeWinProb - awayWinProb);

      // Get contract odds (pre-fetched)
      const odds = matchesOdds[i];
      const oddsHome = Number(odds[0]) / 10000;
      const oddsDraw = Number(odds[1]) / 10000;
      const oddsAway = Number(odds[2]) / 10000;

      // Calculate Expected Value (EV)
      const homeEV = (homeWinProb / 100) * oddsHome - 1;
      const drawEV = (drawProb / 100) * oddsDraw - 1;
      const awayEV = (awayWinProb / 100) * oddsAway - 1;

      // Select best outcome
      const outcomes = [
        { outcome: 1, ev: homeEV, prob: homeWinProb, label: `${homeTeam} Win` },
        { outcome: 2, ev: drawEV, prob: drawProb, label: "Draw" },
        { outcome: 3, ev: awayEV, prob: awayWinProb, label: `${awayTeam} Win` }
      ].sort((a, b) => b.ev - a.ev);

      const best = outcomes[0];
      const riskConfig = RISK_PROFILES[activeRisk];
      const confidence = Math.min(100, Math.round(best.prob * riskConfig.outcomeMultiplier));

      // Skip if confidence too low for risk profile
      if (confidence < riskConfig.minConfidence) {
        console.log(`[Agent API] Match ${i}: Confidence ${confidence}% too low (min ${riskConfig.minConfidence}%)`);
        continue;
      }

      let suggestedAmount;
      if (sizingMethod === "custom") {
        suggestedAmount = Number(customBetSize) || 10;
      } else {
        const kellyFraction = Math.max(0, best.ev) * riskConfig.outcomeMultiplier * 0.25;
        const maxBet = userBudget * riskConfig.maxBetPercent;
        suggestedAmount = Math.min(
          Math.round(userBudget * kellyFraction * 100) / 100,
          maxBet,
          100 // Cap at 100 USDC per bet
        );
      }

      // Ensure suggestedAmount satisfies MIN_BET (0.01 USDC) but doesn't exceed user's remaining budget
      if (suggestedAmount < 0.01 && userBudget >= 0.01) {
        suggestedAmount = 0.01;
      } else if (suggestedAmount > userBudget) {
        suggestedAmount = userBudget;
      }

      // If user doesn't have enough budget left for the suggested bet or it's below min bet
      if (suggestedAmount > userBudget || suggestedAmount < 0.01) {
        console.log(`[Agent API] Suggested bet ${suggestedAmount} exceeds remaining budget ${userBudget} or is below min bet`);
        continue;
      }

      // Execute on-chain bet!
      try {
        console.log(`[Agent API] Placing bet of ${suggestedAmount} USDC on ${best.label} (Match ${i}) for user ${userAddress}`);
        const amountInUnits = ethers.parseUnits(suggestedAmount.toString(), 6);

        const tx = await marketContract.agentPlaceBet(
          userAddress,
          i,
          best.outcome,
          amountInUnits,
          { gasLimit: 500000 }
        );
        const receipt = await tx.wait();

        actions.push({
          type: "BET_PLACED",
          matchId: i,
          text: `Bet $${suggestedAmount} on ${best.label} (${homeTeam} vs ${awayTeam})`,
          txHash: receipt.hash,
          reasoning: `${best.label} has ${best.prob.toFixed(0)}% historical probability. EV: ${(best.ev * 100).toFixed(1)}%.`
        });

        // Decrease budget tracker for next matches in loop
        userBudget -= suggestedAmount;

      } catch (betError) {
        console.error(`[Agent API] Bet failed for match ${i}:`, betError);
        actions.push({
          type: "ERROR",
          matchId: i,
          text: `Failed to place bet on ${homeTeam} vs ${awayTeam}`,
          reasoning: betError.reason || betError.message
        });
      }
    }

    return NextResponse.json({
      actions,
      message: actions.length > 0
        ? `Agent cycle executed successfully! Placed ${actions.filter(a => a.type === "BET_PLACED").length} bets.`
        : "Agent cycle executed: analyzed all matches, but no bets met the criteria or bets were already placed."
    });

  } catch (error) {
    console.error("[Agent API Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
