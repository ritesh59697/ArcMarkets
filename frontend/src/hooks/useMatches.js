import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACTS, TEAM_FLAGS, USDC_DECIMALS, runWithRpcFallback } from "../utils/config";
import { PREDICTION_MARKET_ABI } from "../utils/abis";

export function useMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("arc_matches_cache");
      if (cached) {
        setMatches(JSON.parse(cached));
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
