/**
 * ArcMarkets AI Agent
 * Analyzes match data and places bets on behalf of users.
 * Integrates with Arc Testnet via ethers.js
 */

import { ethers } from "ethers";

// ─── Constants ───────────────────────────────────────────────────────────────

const RISK_PROFILES = {
  conservative: { minConfidence: 60, maxBetPercent: 0.05, outcomeMultiplier: 0.9, minEv: 0.05 },
  moderate:     { minConfidence: 45, maxBetPercent: 0.10, outcomeMultiplier: 1.0, minEv: 0.02 },
  aggressive:   { minConfidence: 30, maxBetPercent: 0.20, outcomeMultiplier: 1.1, minEv: 0.00 },
};

// FIFA team strength ratings & asset strength proxies (0-100 scale, updated for 2026)
const TEAM_RATINGS = {
  // Football/soccer
  "France": 93, "Brazil": 92, "England": 90, "Spain": 89,
  "Argentina": 88, "Portugal": 87, "Germany": 86, "Netherlands": 85,
  "Belgium": 83, "Italy": 82, "Croatia": 80, "Uruguay": 79,
  "USA": 75, "Mexico": 74, "Japan": 73, "Morocco": 72,
  "Senegal": 70, "Australia": 68, "South Korea": 67, "Poland": 66,

  // Cryptocurrency assets
  "Bitcoin": 95, "Ethereum": 88,
  "Solana": 84, "BNB": 80,
  "Dogecoin": 72, "Pepe": 64,

  // Commodities & prediction outcomes
  "GOLD": 92, "Silver": 80, "New ATH": 83,
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
    const isSingleAsset = homeTeam.toLowerCase() === "gold" || homeTeam.toLowerCase() === "silver";
    
    if (isSingleAsset) {
      const homeRating = TEAM_RATINGS[homeTeam] ?? 80;
      const awayRating = TEAM_RATINGS[awayTeam] ?? 80;
      const ratingDiff = homeRating - awayRating;
      
      const homeWinRate = Math.min(90, Math.max(10, 50 + ratingDiff * 1.5));
      const awayWinRate = 100 - homeWinRate;
      
      return {
        homeWinRate,
        drawRate: 0,
        awayWinRate,
        formScore: { home: Math.round(homeRating / 10), away: Math.round(awayRating / 10) },
        headToHead: { homeWins: Math.round(homeWinRate / 10), draws: 0, awayWins: Math.round(awayWinRate / 10) },
      };
    }

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
      { outcome: 1, ev: homeEV, prob: hist.homeWinRate, label: isSingleAsset ? "YES" : `${homeTeam} win` },
      { outcome: 2, ev: drawEV,  prob: hist.drawRate,    label: "Draw" },
      { outcome: 3, ev: awayEV,  prob: hist.awayWinRate, label: isSingleAsset ? "NO" : `${awayTeam} win` },
    ].filter(o => !isSingleAsset || o.outcome !== 2);

    outcomes.sort((a, b) => b.ev - a.ev);
    const best = outcomes[0];

    const minEvRequired = riskConfig.minEv ?? 0;
    if (best.ev < minEvRequired) {
      return {
        outcome: best.outcome,
        confidence: 0,
        suggestedAmount: 0,
        reasoning: `Skipped: Best EV (${(best.ev * 100).toFixed(1)}%) is below the minimum required edge (${(minEvRequired * 100).toFixed(1)}%) for ${profile.riskLevel} profile.`,
      };
    }

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
    if (suggestedAmount > 0) {
      if (suggestedAmount < 0.01 && profile.budget >= 0.01) {
        suggestedAmount = 0.01;
      } else if (suggestedAmount > profile.budget) {
        suggestedAmount = profile.budget;
      }
    }

    // Confidence is base probability scaled + EV bonus (10% EV = +10 confidence)
    const evBonus = Math.max(0, Math.round(best.ev * 100));
    const confidence = Math.min(100, Math.round(best.prob * riskConfig.outcomeMultiplier) + evBonus);

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

  // ─── Submit a single bet tx (does NOT wait for receipt) ───────────────

  async submitBet(user, analysis) {
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

      // Submit tx — wallet assigns the next sequential nonce automatically.
      // We do NOT await tx.wait() here; we collect the tx and wait later in batch.
      const tx = await this.marketContract.agentPlaceBet(
        user.address,
        matchIndex,
        recommendation.outcome,
        amountInUnits,
        { gasLimit: 500000 }
      );

      console.log(`📤 TX submitted for match ${matchIndex}: ${tx.hash}`);
      return { type: "PENDING", matchIndex, homeTeam, awayTeam, tx, recommendation };

    } catch (err) {
      console.error(`❌ Submit failed for match ${matchIndex}:`, err.message);
      return {
        type: "ERROR",
        matchIndex,
        reasoning: `Submit failed: ${err.message}`,
        timestamp: Date.now(),
      };
    }
  }

  // ─── Run full agent cycle ──────────────────────────────────────────────
  // Strategy: submit txs sequentially (unique nonces) → wait for all receipts in parallel

  async runCycle(users) {
    console.log(`\n🤖 ArcMarkets Agent Cycle — ${new Date().toISOString()}`);
    const allActions = [];

    const matchCount = await this.marketContract.getMatchCount();
    const count = Number(matchCount);
    console.log(`📊 Total matches: ${count}`);

    // Fetch all match data AND odds in a single parallel round
    const [matchesData, matchesOdds] = await Promise.all([
      Promise.all(Array.from({ length: count }, (_, i) => this.marketContract.getMatch(i).catch(() => null))),
      Promise.all(Array.from({ length: count }, (_, i) => this.marketContract.getOdds(i).catch(() => null))),
    ]);

    for (const user of users) {
      if (user.budget < 0.01) {
        console.log(`⏭️  Skipping ${user.address} — insufficient budget (${user.budget} USDC)`);
        continue;
      }

      // ── Phase 1: Decide which markets to bet on ──────────────────────
      const pendingAnalyses = [];
      for (let i = 0; i < count; i++) {
        const matchData = matchesData[i];
        const odds = matchesOdds[i];
        if (!matchData || !odds) continue;

        const { homeTeam, awayTeam, kickoffTime, status } = matchData;
        if (Number(status) !== 0) continue;
        if (Math.floor(Date.now() / 1000) >= Number(kickoffTime)) continue;

        const historicalData = this.getHistoricalData(homeTeam, awayTeam);
        const recommendation = this.computeRecommendation(
          homeTeam, awayTeam, historicalData,
          Number(odds[0]), Number(odds[1]), Number(odds[2]),
          user
        );

        pendingAnalyses.push({ matchIndex: i, homeTeam, awayTeam, recommendation, historicalData });
      }

      // ── Phase 2: Submit txs sequentially (prevents REPLACEMENT_UNDERPRICED) ──
      // Each await here is just the RPC submission round-trip (~100-200ms), not a block confirmation.
      const submittedResults = [];
      for (const analysis of pendingAnalyses) {
        const result = await this.submitBet(user, analysis);
        submittedResults.push(result);
        // Pass-through SKIPPED/ERROR immediately
        if (result.type !== "PENDING") {
          allActions.push(result);
        }
      }

      // ── Phase 3: Wait for ALL pending receipts in parallel ───────────
      // This is where the real time saving is: all block confirmations happen concurrently.
      const pendingTxs = submittedResults.filter(r => r.type === "PENDING");
      const TX_TIMEOUT_MS = 30000;

      const receipts = await Promise.all(
        pendingTxs.map(({ tx, matchIndex, homeTeam, awayTeam, recommendation }) =>
          Promise.race([
            tx.wait().then(receipt => ({ ok: true, receipt, matchIndex, homeTeam, awayTeam, recommendation })),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`tx.wait() timed out after ${TX_TIMEOUT_MS / 1000}s`)), TX_TIMEOUT_MS)
            ),
          ]).catch(err => ({ ok: false, err, matchIndex, homeTeam, awayTeam, recommendation }))
        )
      );

      for (const res of receipts) {
        if (res.ok) {
          const action = {
            type: "BET_PLACED",
            matchIndex: res.matchIndex,
            outcome: res.recommendation.outcome,
            amount: res.recommendation.suggestedAmount,
            txHash: res.receipt.hash,
            reasoning: res.recommendation.reasoning,
            timestamp: Date.now(),
          };
          this.actionLog.push(action);
          console.log(`✅ Confirmed: ${res.homeTeam} vs ${res.awayTeam} — $${res.recommendation.suggestedAmount} | TX: ${res.receipt.hash}`);
          allActions.push(action);
          user.budget -= action.amount;
        } else {
          const action = {
            type: "ERROR",
            matchIndex: res.matchIndex,
            reasoning: `Confirmation failed: ${res.err.message}`,
            timestamp: Date.now(),
          };
          this.actionLog.push(action);
          console.error(`❌ Confirmation failed for match ${res.matchIndex}:`, res.err.message);
          allActions.push(action);
        }
      }
    }

    return allActions;
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
    const homeRatingRaw = TEAM_RATINGS[homeTeam] ?? 80;
    const awayRatingRaw = TEAM_RATINGS[awayTeam] ?? 80;
    const diff = homeRatingRaw - awayRatingRaw;
    homeWinProb = Math.min(90, Math.max(10, 50 + diff * 1.5));
    awayWinProb = 100 - homeWinProb;
    drawProb = 0;
  } else {
    const homeWinProbRaw = Math.round(50 + ratingDiff * 0.4 + 5);
    const awayWinProbRaw = Math.round(50 - ratingDiff * 0.4 - 5);
    const drawProbRaw = Math.max(10, 100 - homeWinProbRaw - awayWinProbRaw);
    const total = homeWinProbRaw + drawProbRaw + awayWinProbRaw;
    homeWinProb = Math.round(homeWinProbRaw / total * 100);
    drawProb = Math.round(drawProbRaw / total * 100);
    awayWinProb = Math.round(awayWinProbRaw / total * 100);
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
  
  const minEvRequired = riskConfig.minEv ?? 0;
  if (best.ev < minEvRequired) {
    return {
      recommendation: {
        outcome: best.outcome,
        outcomeName: best.label,
        confidence: 0,
        suggestedAmount: 0,
        reasoning: `Skipped: Best EV (${(best.ev * 100).toFixed(1)}%) is below the minimum required edge (${(minEvRequired * 100).toFixed(1)}%) for ${riskLevel} profile.`,
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

  if (suggestedAmount > 0) {
    if (suggestedAmount < 0.01 && budget >= 0.01) {
      suggestedAmount = 0.01;
    } else if (suggestedAmount > budget) {
      suggestedAmount = budget;
    }
  }

  const evBonus = Math.max(0, Math.round(best.ev * 100));
  const confidence = Math.min(100, Math.round(best.prob * riskConfig.outcomeMultiplier) + evBonus);

  return {
    recommendation: {
      outcome: best.outcome,
      outcomeName: best.label,
      confidence,
      suggestedAmount,
      reasoning: `${best.label} has ${best.prob.toFixed(0)}% historical win probability. EV: ${(best.ev * 100).toFixed(1)}%. Based on ratings: ${homeTeam} (${homeRating}) vs ${awayTeam} (${awayRating}).`,
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
