import { ethers } from "ethers";
import { PREDICTION_MARKET_ABI } from "../utils/abis.js";

const USDC_DECIMALS = 6;

function getMarketAddress() {
  return (
    process.env.NEXT_PUBLIC_MARKET_ADDRESS ||
    "0xbE2bf8f1c34a0517Dfd8732d4b8A82056DB539B4"
  );
}

const RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_ARC_RPC_URL,
  process.env.ARC_RPC_URL,
  "https://arc-testnet.g.alchemy.com/v2/dsKUaW_GE724U3laOjGG2",
  "https://rpc.testnet.arc.network",
].filter((url, index, self) => url && self.indexOf(url) === index);

function emptyStats() {
  return {
    volume: 0,
    profit: 0,
    claimed: 0,
    bets: 0,
    wins: 0,
    resolvedBets: 0,
  };
}

async function fetchWithProvider(provider, marketAddress, limit) {
  const contract = new ethers.Contract(marketAddress, PREDICTION_MARKET_ABI, provider);
  const latest = await provider.getBlockNumber().catch(() => 0);

  // 1. Fetch matches in chunks of 10
  const matchCount = Number(await contract.getMatchCount());
  const matches = [];
  for (let i = 0; i < matchCount; i += 10) {
    const chunk = Array.from({ length: Math.min(10, matchCount - i) }, (_, j) => contract.getMatch(i + j));
    const res = await Promise.all(chunk);
    matches.push(...res.map((m) => ({
      status: Number(m.status),
      result: Number(m.result),
      totalPool: Number(ethers.formatUnits(m.totalPool, USDC_DECIMALS)),
      outcomePools: m.outcomePools.map((p) => Number(ethers.formatUnits(p, USDC_DECIMALS))),
    })));
  }

  // 2. Binary search upper bound of bet IDs
  let low = 0, high = 1000, maxBet = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    try {
      await contract.getBet(mid);
      maxBet = mid;
      low = mid + 1;
    } catch {
      high = mid - 1;
    }
  }

  const totalBets = maxBet + 1;

  // 3. Fetch bets in chunks of 15
  const allBets = [];
  for (let i = 0; i < totalBets; i += 15) {
    const chunk = Array.from({ length: Math.min(15, totalBets - i) }, (_, j) => contract.getBet(i + j));
    const res = await Promise.all(chunk);
    allBets.push(...res.map((b, idx) => ({
      id: i + idx,
      bettor: b.bettor,
      matchIndex: Number(b.matchIndex),
      outcome: Number(b.outcome),
      amount: Number(ethers.formatUnits(b.amount, USDC_DECIMALS)),
      claimed: b.claimed,
      isAgentBet: b.isAgentBet,
      timestamp: Number(b.timestamp),
    })));
  }

  // 4. Aggregate user stats
  const stats = new Map();
  const touch = (addr) => {
    const key = addr.toLowerCase();
    if (!stats.has(key)) stats.set(key, { address: addr, ...emptyStats() });
    return stats.get(key);
  };

  for (const b of allBets) {
    const s = touch(b.bettor);
    s.volume += b.amount;
    s.bets += 1;

    const m = matches[b.matchIndex];
    if (m && (m.status === 2 || m.status === 3)) { // RESOLVED (2) or CANCELLED (3)
      s.resolvedBets += 1;
      if (m.status === 3) {
        if (b.claimed) s.claimed += b.amount;
      } else if (b.outcome === m.result) {
        s.wins += 1;
        const winningPool = m.outcomePools[m.result];
        const netPool = m.totalPool * 0.98;
        const payout = winningPool > 0 ? (b.amount / winningPool) * netPool : 0;
        s.profit += (payout - b.amount);
        if (b.claimed) s.claimed += payout;
      } else {
        s.profit -= b.amount;
      }
    }
  }

  const rows = Array.from(stats.values())
    .filter((s) => s.bets > 0)
    .map((s) => ({
      address: s.address,
      volume: Math.round(s.volume * 100) / 100,
      profit: Math.round(s.profit * 100) / 100,
      claimed: Math.round(s.claimed * 100) / 100,
      bets: s.bets,
      wins: s.wins,
      winRate: s.resolvedBets > 0 ? Math.round((s.wins / s.resolvedBets) * 100) : 0,
    }))
    .sort((a, b) => b.profit - a.profit || b.volume - a.volume)
    .slice(0, limit)
    .map((row, i) => ({
      rank: i + 1,
      addr: row.address,
      shortAddr: `${row.address.slice(0, 6)}…${row.address.slice(-4)}`,
      profit: row.profit,
      volume: row.volume,
      bets: row.bets,
      winRate: row.winRate,
      medal: i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null,
      streak: 0,
    }));

  return {
    rows,
    indexedFromBlock: 0,
    latestBlock: latest,
    betCount: totalBets,
    updatedAt: Date.now(),
  };
}

export async function buildOnChainLeaderboard(limit = 50) {
  const marketAddress = getMarketAddress();
  let lastErr;

  for (const rpcUrl of RPC_ENDPOINTS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      return await fetchWithProvider(provider, marketAddress, limit);
    } catch (err) {
      console.warn(`RPC ${rpcUrl} failed:`, err.message);
      lastErr = err;
    }
  }

  console.error("All RPC endpoints failed for leaderboard build:", lastErr);
  return {
    rows: [],
    indexedFromBlock: 0,
    latestBlock: 0,
    betCount: 0,
    updatedAt: Date.now(),
    error: lastErr?.message || "Failed to fetch on-chain leaderboard",
  };
}


