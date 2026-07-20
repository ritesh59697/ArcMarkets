import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACTS, TEAM_FLAGS, USDC_DECIMALS, runWithRpcFallback } from "../utils/config";
import { PREDICTION_MARKET_ABI } from "../utils/abis";

const DEFAULT_MATCHES = [
  {
    index: 0,
    homeTeam: "Solana",
    awayTeam: "BNB",
    homeFlag: "🇸🇴",
    awayFlag: "🪙",
    matchId: "CRYPTO-SOL-BNB",
    kickoffTime: Date.now() + 86400000,
    totalPool: 2.78,
    homePool: 1.5,
    drawPool: 0.28,
    awayPool: 1.0,
    result: 0,
    status: 0,
    odds: { home: 1.55, draw: 5, away: 2.83 },
  },
  {
    index: 1,
    homeTeam: "Pepe",
    awayTeam: "Dogecoin",
    homeFlag: "🐸",
    awayFlag: "🐶",
    matchId: "CRYPTO-PEPE-DOGE",
    kickoffTime: Date.now() + 172800000,
    totalPool: 10.36,
    homePool: 5.0,
    drawPool: 0.36,
    awayPool: 5.0,
    result: 0,
    status: 0,
    odds: { home: 2.15, draw: 5, away: 1.87 },
  },
  {
    index: 2,
    homeTeam: "Silver",
    awayTeam: "MARKET OPEN",
    homeFlag: "🥈",
    awayFlag: "📈",
    matchId: "SILVER-ATH",
    kickoffTime: Date.now() + 259200000,
    totalPool: 5.0,
    homePool: 2.5,
    drawPool: 0,
    awayPool: 2.5,
    result: 0,
    status: 0,
    odds: { home: 2.15, draw: 5, away: 1.87 },
  },
  {
    index: 3,
    homeTeam: "GOLD",
    awayTeam: "MARKET OPEN",
    homeFlag: "🥇",
    awayFlag: "📈",
    matchId: "GOLD-ATH",
    kickoffTime: Date.now() + 345600000,
    totalPool: 5.0,
    homePool: 5.0,
    drawPool: 0,
    awayPool: 0,
    result: 0,
    status: 0,
    odds: { home: 1, draw: 5, away: 3 },
  },
];

export function useMatches() {
  const [matches, setMatches] = useState(DEFAULT_MATCHES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("arc_matches_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) {
          setMatches(parsed);
        }
        setLoading(false);
      }
    } catch (e) {
      console.warn("Failed to load cached matches:", e);
    }
  }, []);

  const fetchMatches = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      if (!CONTRACTS.PREDICTION_MARKET) {
        setMatches([]);
        return;
      }
      await runWithRpcFallback(async (provider) => {
        const contract = new ethers.Contract(
          CONTRACTS.PREDICTION_MARKET,
          PREDICTION_MARKET_ABI,
          provider
        );

        const count = Number(await contract.getMatchCount());
        const results = [];

        // Fetch matches in controlled chunks to avoid overwhelming the public RPC endpoint
        for (let i = 0; i < count; i++) {
          try {
            const [m, odds] = await Promise.all([
              contract.getMatch(i),
              contract.getOdds(i),
            ]);

            const totalPool = Number(ethers.formatUnits(m.totalPool, USDC_DECIMALS));
            const homePool  = Number(ethers.formatUnits(m.outcomePools[1], USDC_DECIMALS));
            const drawPool  = Number(ethers.formatUnits(m.outcomePools[2], USDC_DECIMALS));
            const awayPool  = Number(ethers.formatUnits(m.outcomePools[3], USDC_DECIMALS));

            // odds from contract are in basis points (10000 = 1x)
            const toDecimal = (bp) => {
              const num = Number(bp);
              if (num < 10000 && num > 0) {
                return Math.round((num * 100 / 10000) * 100) / 100;
              }
              return Math.round((num / 10000) * 100) / 100;
            };

            results[i] = {
              index: i,
              homeTeam: m.homeTeam,
              awayTeam: m.awayTeam,
              homeFlag: TEAM_FLAGS[m.homeTeam] || "🏳️",
              awayFlag: TEAM_FLAGS[m.awayTeam] || "🏳️",
              matchId: m.matchId,
              kickoffTime: Number(m.kickoffTime) * 1000,
              totalPool,
              homePool,
              drawPool,
              awayPool,
              result: Number(m.result),
              status: Number(m.status),
              odds: {
                home: toDecimal(odds.homeOdds),
                draw: toDecimal(odds.drawOdds),
                away: toDecimal(odds.awayOdds),
              },
            };
          } catch (itemErr) {
            console.warn(`Failed to fetch match ${i}:`, itemErr);
          }
        }

        const filteredResults = results.filter(Boolean);
        if (filteredResults.length > 0) {
          setMatches(filteredResults);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("arc_matches_cache", JSON.stringify(filteredResults));
            } catch (e) {
              console.warn("Failed to write matches cache:", e);
            }
          }
        }
      });
    } catch (err) {
      console.error("fetchMatches error:", err);
      // Retain cached matches on RPC error so the UI stays populated
      try {
        const cached = localStorage.getItem("arc_matches_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.length > 0) {
            setMatches(parsed);
          }
        }
      } catch (e) {}
      setError(err.message || "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchMatches(), 0);
    // Refresh odds every 60s silently
    const interval = setInterval(() => fetchMatches(true), 60_000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchMatches]);

  return { matches, loading, error, refetch: fetchMatches };
}
