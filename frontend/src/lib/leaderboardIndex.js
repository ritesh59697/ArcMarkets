import { ethers } from "ethers";
import { PREDICTION_MARKET_ABI } from "../utils/abis";

const USDC_DECIMALS = 6;
const CHUNK = 9000;

function getMarketAddress() {
  return (
    process.env.NEXT_PUBLIC_MARKET_ADDRESS ||
    "0xbE2bf8f1c34a0517Dfd8732d4b8A82056DB539B4"
  );
}

function getRpcUrl() {
  return (
    process.env.NEXT_PUBLIC_ARC_RPC_URL ||
    process.env.ARC_RPC_URL ||
    "https://rpc.testnet.arc.network"
  );
}

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

async function queryChunked(contract, filter, fromBlock, toBlock) {
  const promises = [];
  for (let start = fromBlock; start <= toBlock; start += CHUNK) {
    const end = Math.min(start + CHUNK - 1, toBlock);
    promises.push(
      contract.queryFilter(filter, start, end).catch(err => {
        console.warn(`queryFilter ${start}-${end}:`, err.message);
        return [];
      })
    );
  }
  const batches = await Promise.all(promises);
  return batches.flat();
}

export async function buildOnChainLeaderboard(limit = 50) {
  const marketAddress = getMarketAddress();
  const provider = new ethers.JsonRpcProvider(getRpcUrl(), undefined, { batchMaxCount: 100, batchStallTime: 10 });
  const contract = new ethers.Contract(marketAddress, PREDICTION_MARKET_ABI, provider);

  const latest = await provider.getBlockNumber();
  const fromBlock = Number(process.env.LEADERBOARD_FROM_BLOCK || 46585000);

  const [betLogs, claimLogs, resolveLogs] = await Promise.all([
    queryChunked(contract, contract.filters.BetPlaced(), fromBlock, latest),
    queryChunked(contract, contract.filters.WinningsClaimed(), fromBlock, latest),
    queryChunked(contract, contract.filters.MarketResolved(), fromBlock, latest),
  ]);

  const matchResults = {};
  for (const log of resolveLogs) {
    matchResults[Number(log.args.matchIndex)] = Number(log.args.result);
  }

  const stats = new Map();
  const betsById = new Map();

  const touch = (addr) => {
    const key = addr.toLowerCase();
    if (!stats.has(key)) stats.set(key, { address: addr, ...emptyStats() });
    return stats.get(key);
  };

  for (const log of betLogs) {
    const bettor = log.args.bettor;
    const amount = Number(ethers.formatUnits(log.args.amount, USDC_DECIMALS));
    const betId = Number(log.args.betId);
    const matchIndex = Number(log.args.matchIndex);
    const outcome = Number(log.args.outcome);

    const s = touch(bettor);
    s.volume += amount;
    s.bets += 1;
    betsById.set(betId, { bettor, amount, matchIndex, outcome });

    const result = matchResults[matchIndex];
    if (result !== undefined) {
      s.resolvedBets += 1;
      if (outcome === result) s.wins += 1;
      else s.profit -= amount;
    }
  }

  for (const log of claimLogs) {
    const bettor = log.args.bettor;
    const payout = Number(ethers.formatUnits(log.args.payout, USDC_DECIMALS));
    const s = touch(bettor);
    s.claimed += payout;
    s.profit += payout;
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
    indexedFromBlock: fromBlock,
    latestBlock: latest,
    betCount: betLogs.length,
    updatedAt: Date.now(),
  };
}
