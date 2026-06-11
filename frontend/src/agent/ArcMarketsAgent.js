/**
 * ArcMarkets AI Agent
 * Analyzes match data and places bets on behalf of users.
 * Integrates with Arc Testnet via ethers.js
 */

import { ethers } from "ethers";

// ─── Constants ───────────────────────────────────────────────────────────────

const RISK_PROFILES = {
  conservative: { minConfidence: 70, maxBetPercent: 0.05, outcomeMultiplier: 0.8 },
  moderate:     { minConfidence: 55, maxBetPercent: 0.10, outcomeMultiplier: 1.0 },
  aggressive:   { minConfidence: 40, maxBetPercent: 0.20, outcomeMultiplier: 1.2 },
};

// FIFA team strength ratings (0-100 scale, updated for 2026)
const TEAM_RATINGS = {
  "France": 93, "Brazil": 92, "England": 90, "Spain": 89,
  "Argentina": 88, "Portugal": 87, "Germany": 86, "Netherlands": 85,
  "Belgium": 83, "Italy": 82, "Croatia": 80, "Uruguay": 79,
  "USA": 75, "Mexico": 74, "Japan": 73, "Morocco": 72,
  "Senegal": 70, "Australia": 68, "South Korea": 67, "Poland": 66,
};

// ─── ArcMarkets Agent Class ───────────────────────────────────────────────────

export class ArcMarketsAgent {
  constructor(rpcUrl, agentPrivateKey, marketAddress, marketABI) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { batchMaxCount: 100, batchStallTime: 10 });
    this.wallet = new ethers.Wallet(agentPrivateKey, this.provider);
    this.marketABI = marketABI;
    this.marketContract = new ethers.Contract(marketAddress, marketABI, this.wallet);
    this.actionLog = [];
  }

  // ─── Core: Analyze a match ─────────────────────────────────────────────

  async analyzeMatch(matchIndex, profile) {
    try {
      const matchData = await this.marketContract.getMatch(matchIndex);
      const { homeTeam, awayTeam, kickoffTime, status } = matchData;

      if (status !== 0n) return null; // Only analyze OPEN markets
      if (Math.floor(Date.now() / 1000) >= Number(kickoffTime)) return null; // Skip if kickoff has passed

      const historicalData = this.getHistoricalData(homeTeam, awayTeam);
      const [contractHomeOdds, contractDrawOdds, contractAwayOdds] =
        await this.marketContract.getOdds(matchIndex);

      const recommendation = this.computeRecommendation(
        homeTeam,
        awayTeam,
        historicalData,
        Number(contractHomeOdds),
        Number(contractDrawOdds),
        Number(contractAwayOdds),
        profile
      );

      return { matchIndex, homeTeam, awayTeam, recommendation, historicalData };
    } catch (err) {
      console.error(`Error analyzing match ${matchIndex}:`, err);
      return null;
    }
  }

  // ─── Historical + form data ────────────────────────────────────────────

  getHistoricalData(homeTeam, awayTeam) {
    const homeRating = TEAM_RATINGS[homeTeam] ?? 65;
    const awayRating = TEAM_RATINGS[awayTeam] ?? 65;
    const ratingDiff = homeRating - awayRating;

    const homeWinRate = Math.round(50 + ratingDiff * 0.4 + 5);
    const awayWinRate = Math.round(50 - ratingDiff * 0.4 - 5);
    const drawRate = Math.max(10, 100 - homeWinRate - awayWinRate);

    const total = homeWinRate + drawRate + awayWinRate;
    const norm = {
      h: Math.round(homeWinRate / total * 100),
      d: Math.round(drawRate / total * 100),
      a: Math.round(awayWinRate / total * 100),
    };

    return {
      homeWinRate: norm.h,
      drawRate: norm.d,
      awayWinRate: norm.a,
      formScore: { home: Math.round(homeRating / 10), away: Math.round(awayRating / 10) },
      headToHead: { homeWins: Math.round(norm.h / 10), draws: Math.round(norm.d / 10), awayWins: Math.round(norm.a / 10) },
    };
  }

  // ─── Recommendation engine ─────────────────────────────────────────────

  computeRecommendation(homeTeam, awayTeam, hist, contractHomeOdds, contractDrawOdds, contractAwayOdds, profile) {
    const riskConfig = RISK_PROFILES[profile.riskLevel];

    const homeEV = (hist.homeWinRate / 100) * (contractHomeOdds / 10000) - 1;
    const drawEV  = (hist.drawRate / 100)    * (contractDrawOdds / 10000) - 1;
    const awayEV  = (hist.awayWinRate / 100) * (contractAwayOdds / 10000) - 1;

    const isSingleAsset = homeTeam.toLowerCase() === "gold" || homeTeam.toLowerCase() === "silver";
    const outcomes = [
      { outcome: 1, ev: homeEV, prob: hist.homeWinRate, label: `${homeTeam} win` },
      { outcome: 2, ev: drawEV,  prob: hist.drawRate,    label: "Draw" },
      { outcome: 3, ev: awayEV,  prob: hist.awayWinRate, label: `${awayTeam} win` },
    ].filter(o => !isSingleAsset || o.outcome !== 2);

    outcomes.sort((a, b) => b.ev - a.ev);
    const best = outcomes[0];

    const kellyFraction = Math.max(0, best.ev) * riskConfig.outcomeMultiplier * 0.25;
    let suggestedAmount;
    if (profile.sizingMethod === "custom") {
      suggestedAmount = Number(profile.customBetSize) || 10;
    } else {
      const maxBet = profile.budget * riskConfig.maxBetPercent;
      suggestedAmount = Math.min(
        Math.round(profile.budget * kellyFraction * 100) / 100,
        maxBet,
        100
      );
    }

    // Ensure suggestedAmount satisfies MIN_BET (0.01 USDT) but doesn't exceed user's remaining budget
    if (suggestedAmount < 0.01 && profile.budget >= 0.01) {
      suggestedAmount = 0.01;
    } else if (suggestedAmount > profile.budget) {
      suggestedAmount = profile.budget;
    }

    const confidence = Math.min(100, Math.round(best.prob * riskConfig.outcomeMultiplier));

    const reasoning = [
      `${best.label} has ${best.prob}% historical probability.`,
      `Expected value: ${(best.ev * 100).toFixed(1)}%.`,
      `Current market odds: ${(contractHomeOdds/10000).toFixed(2)}x / ${(contractDrawOdds/10000).toFixed(2)}x / ${(contractAwayOdds/10000).toFixed(2)}x.`,
      `Risk profile: ${profile.riskLevel}. Kelly sizing: ${(kellyFraction*100).toFixed(1)}% of budget.`,
    ].join(" ");

    return {
      outcome: best.outcome,
      confidence,
      suggestedAmount,
      reasoning,
    };
  }

  // ─── Execute: Place bet on-chain ───────────────────────────────────────

  async executeBet(user, analysis) {
    const riskConfig = RISK_PROFILES[user.riskLevel];
    const { recommendation, matchIndex, homeTeam, awayTeam } = analysis;

    if (recommendation.confidence < riskConfig.minConfidence) {
      return {
        type: "SKIPPED",
        matchIndex,
        reasoning: `Confidence ${recommendation.confidence}% below threshold ${riskConfig.minConfidence}% for ${user.riskLevel} profile.`,
        timestamp: Date.now(),
      };
    }

    if (recommendation.suggestedAmount < 0.01) {
      return {
        type: "SKIPPED",
        matchIndex,
        reasoning: `Suggested amount $${recommendation.suggestedAmount} too low.`,
        timestamp: Date.now(),
      };
    }

    try {
      const amountInUnits = ethers.parseUnits(
        recommendation.suggestedAmount.toString(),
        6 // USDC decimals
      );

      const tx = await this.marketContract.agentPlaceBet(
        user.address,
        matchIndex,
        recommendation.outcome,
        amountInUnits,
        { gasLimit: 500000 }
      );

      const receipt = await tx.wait();

      const action = {
        type: "BET_PLACED",
        matchIndex,
        outcome: recommendation.outcome,
        amount: recommendation.suggestedAmount,
        txHash: receipt.hash,
        reasoning: recommendation.reasoning,
        timestamp: Date.now(),
      };

      this.actionLog.push(action);
      console.log(`✅ Bet placed: ${homeTeam} vs ${awayTeam} — ${recommendation.suggestedAmount} USDC | TX: ${receipt.hash}`);
      return action;

    } catch (err) {
      const action = {
        type: "ERROR",
        matchIndex,
        reasoning: `Contract call failed: ${err.message}`,
        timestamp: Date.now(),
      };
      this.actionLog.push(action);
      console.error(`❌ Bet failed for match ${matchIndex}:`, err.message);
      return action;
    }
  }

  // ─── Run full agent cycle ──────────────────────────────────────────────

  async runCycle(users) {
    console.log(`\n🤖 ArcMarkets Agent Cycle — ${new Date().toISOString()}`);
    const actions = [];

    const matchCount = await this.marketContract.getMatchCount();
    const count = Number(matchCount);
    console.log(`📊 Total matches: ${count}`);

    // Pre-fetch all match data and odds in parallel!
    const matchesData = await Promise.all(
      Array.from({ length: count }, (_, i) => this.marketContract.getMatch(i))
    );
    const matchesOdds = await Promise.all(
      Array.from({ length: count }, (_, i) => this.marketContract.getOdds(i))
    );

    for (const user of users) {
      if (user.budget < 0.01) {
        console.log(`⏭️  Skipping ${user.address} — insufficient budget (${user.budget} USDC)`);
        continue;
      }

      for (let i = 0; i < count; i++) {
        if (user.budget < 0.01) {
          console.log(`⏭️  Stopping match run for ${user.address} — budget too low (${user.budget} USDC)`);
          break;
        }

        const matchData = matchesData[i];
        const { homeTeam, awayTeam, kickoffTime, status } = matchData;

        if (Number(status) !== 0) continue; // Only analyze OPEN markets
        if (Math.floor(Date.now() / 1000) >= Number(kickoffTime)) continue; // Skip if kickoff has passed

        const historicalData = this.getHistoricalData(homeTeam, awayTeam);
        const odds = matchesOdds[i];

        const recommendation = this.computeRecommendation(
          homeTeam,
          awayTeam,
          historicalData,
          Number(odds[0]),
          Number(odds[1]),
          Number(odds[2]),
          user
        );

        const analysis = { matchIndex: i, homeTeam, awayTeam, recommendation, historicalData };
        const action = await this.executeBet(user, analysis);
        actions.push(action);

        if (action.type === "BET_PLACED" && action.amount) {
          user.budget -= action.amount;
        }
      }
    }

    return actions;
  }

  getActionLog() {
    return this.actionLog;
  }
}

// ─── Standalone analysis function (for /api/agent-analysis route) ─────────────

export async function getAgentAnalysis(
  matchIndex,
  homeTeam,
  awayTeam,
  riskLevel,
  budget,
  contractOdds,
  sizingMethod = "kelly",
  customBetSize = 10
) {
  const riskConfig = RISK_PROFILES[riskLevel] || RISK_PROFILES.moderate;

  const homeRating = TEAM_RATINGS[homeTeam] ?? 65;
  const awayRating = TEAM_RATINGS[awayTeam] ?? 65;
  const ratingDiff = homeRating - awayRating;

  const isSingleAsset = homeTeam.toLowerCase() === "gold" || homeTeam.toLowerCase() === "silver";
  let homeWinProb, awayWinProb, drawProb;
  if (isSingleAsset) {
    homeWinProb = 50;
    awayWinProb = 50;
    drawProb = 0;
  } else {
    homeWinProb = Math.min(85, Math.max(15, 50 + ratingDiff * 0.4 + 5));
    awayWinProb = Math.min(85, Math.max(15, 50 - ratingDiff * 0.4 - 5));
    drawProb = Math.max(10, 100 - homeWinProb - awayWinProb);
  }

  const homeEV = (homeWinProb / 100) * (contractOdds.home / 10000) - 1;
  const drawEV  = (drawProb / 100)    * (contractOdds.draw / 10000) - 1;
  const awayEV  = (awayWinProb / 100) * (contractOdds.away / 10000) - 1;

  const outcomes = [
    { outcome: 1, ev: homeEV, prob: homeWinProb, label: isSingleAsset ? "YES" : `${homeTeam} Win` },
    { outcome: 2, ev: drawEV,  prob: drawProb,    label: "Draw" },
    { outcome: 3, ev: awayEV,  prob: awayWinProb, label: isSingleAsset ? "NO" : `${awayTeam} Win` },
  ].filter(o => !isSingleAsset || o.outcome !== 2).sort((a, b) => b.ev - a.ev);

  const best = outcomes[0];
  
  const kellyFraction = Math.max(0, best.ev) * riskConfig.outcomeMultiplier * 0.25;
  let suggestedAmount;
  if (sizingMethod === "custom") {
    suggestedAmount = Number(customBetSize) || 10;
  } else {
    suggestedAmount = Math.min(
      Math.round(budget * kellyFraction * 100) / 100,
      budget * riskConfig.maxBetPercent,
      100
    );
  }

  if (suggestedAmount < 0.01 && budget >= 0.01) {
    suggestedAmount = 0.01;
  } else if (suggestedAmount > budget) {
    suggestedAmount = budget;
  }

  return {
    recommendation: {
      outcome: best.outcome,
      outcomeName: best.label,
      confidence: Math.min(100, Math.round(best.prob * riskConfig.outcomeMultiplier)),
      suggestedAmount,
      reasoning: `${best.label} has ${best.prob.toFixed(0)}% historical win probability. EV: ${(best.ev * 100).toFixed(1)}%. Based on FIFA ratings: ${homeTeam} (${homeRating}) vs ${awayTeam} (${awayRating}).`,
    },
    historicalData: {
      homeWinRate: Math.round(homeWinProb),
      drawRate: Math.round(drawProb),
      awayWinRate: Math.round(awayWinProb),
      homeRating,
      awayRating,
    },
  };
}
