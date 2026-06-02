import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACTS, USDC_DECIMALS, OUTCOME_LABELS, MARKET_STATUS, runWithRpcFallback } from "../utils/config";
import { PREDICTION_MARKET_ABI } from "../utils/abis";

export function useUserBets(userAddress) {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPnl, setTotalPnl] = useState(0);

  const fetchBets = useCallback(async () => {
    if (!userAddress) { setBets([]); return; }
    setLoading(true);

    try {
      await runWithRpcFallback(async (provider) => {
        const contract = new ethers.Contract(CONTRACTS.PREDICTION_MARKET, PREDICTION_MARKET_ABI, provider);

        const matchCount = Number(await contract.getMatchCount());
        const allBets = [];

        // Retrieve transaction hash maps from localStorage cache to bypass RPC range limits
        let betTxMap = {};
        let claimTxMap = {};
        if (typeof window !== "undefined") {
          try {
            betTxMap = JSON.parse(localStorage.getItem("arcmarkets_tx_map") || "{}");
            claimTxMap = JSON.parse(localStorage.getItem("arcmarkets_claim_tx_map") || "{}");
          } catch (e) {
            console.error("Failed to parse cached tx maps", e);
          }
        }

        // Query only recent blocks (last 90) to find new events without hitting the 100-block range restriction
        try {
          const currentBlock = Number(await provider.getBlockNumber());
          const startBlock = Math.max(0, currentBlock - 90);
          
          const betPlacedFilter = contract.filters.BetPlaced(null, userAddress);
          const winningsClaimedFilter = contract.filters.WinningsClaimed(userAddress);

          const [recentBetEvents, recentClaimEvents] = await Promise.all([
            contract.queryFilter(betPlacedFilter, startBlock, "latest").catch(() => []),
            contract.queryFilter(winningsClaimedFilter, startBlock, "latest").catch(() => [])
          ]);

          let updated = false;
          recentBetEvents.forEach(e => {
            const bId = Number(e.args.betId);
            if (!betTxMap[bId]) {
              betTxMap[bId] = e.transactionHash;
              updated = true;
            }
          });

          recentClaimEvents.forEach(e => {
            const bId = Number(e.args.betId);
            if (!claimTxMap[bId]) {
              claimTxMap[bId] = e.transactionHash;
              updated = true;
            }
          });

          if (updated && typeof window !== "undefined") {
            localStorage.setItem("arcmarkets_tx_map", JSON.stringify(betTxMap));
            localStorage.setItem("arcmarkets_claim_tx_map", JSON.stringify(claimTxMap));
          }
        } catch (err) {
          console.warn("Failed to query recent events from block range:", err);
        }

        // Helper to convert basis points to decimal odds
        const toDecimal = (bp) => {
          const num = Number(bp);
          if (num < 10000 && num > 0) {
            return Math.round((num * 100 / 10000) * 100) / 100;
          }
          return Math.round((num / 10000) * 100) / 100;
        };

        // Fetch bets for each match in parallel
        await Promise.all(
          Array.from({ length: matchCount }, async (_, matchIndex) => {
            const betIds = await contract.getUserBetsForMatch(matchIndex, userAddress);
            if (!betIds.length) return;

            const [matchData, oddsData] = await Promise.all([
              contract.getMatch(matchIndex),
              contract.getOdds(matchIndex),
            ]);
            
            const matchStatus = Number(matchData.status);
            const matchResult = Number(matchData.result);
            const totalPool = Number(ethers.formatUnits(matchData.totalPool, USDC_DECIMALS));

            const odds = {
              1: toDecimal(oddsData.homeOdds),
              2: toDecimal(oddsData.drawOdds),
              3: toDecimal(oddsData.awayOdds),
            };

            for (const betIdRaw of betIds) {
              const betId = Number(betIdRaw);
              const bet = await contract.getBet(betId);
              const outcome = Number(bet.outcome);
              const amount = Number(ethers.formatUnits(bet.amount, USDC_DECIMALS));

              // Calculate potential payout
              const winningPool = Number(ethers.formatUnits(matchData.outcomePools[outcome], USDC_DECIMALS));
              const netPool = totalPool * (1 - 0.02); // 2% fee
              let potentialPayout = winningPool > 0 ? (amount / winningPool) * netPool : 0;

              // Professional empty-pool fallback for active matches
              if ((matchStatus === 0 || matchStatus === 1) && potentialPayout <= amount) {
                const currentOdds = odds[outcome] || 1;
                potentialPayout = amount * currentOdds;
              }

              const isWinner = matchStatus === 2 && matchResult === outcome;
              const canClaim = (isWinner || matchStatus === 3) && !bet.claimed;

              allBets.push({
                betId,
                matchIndex,
                homeTeam: matchData.homeTeam,
                awayTeam: matchData.awayTeam,
                outcome,
                outcomeName: OUTCOME_LABELS[outcome] || "Unknown",
                amount,
                potentialPayout: Math.round(potentialPayout * 100) / 100,
                claimed: bet.claimed,
                isAgentBet: bet.isAgentBet,
                timestamp: Number(bet.timestamp) * 1000,
                kickoffTime: Number(matchData.kickoffTime) * 1000,
                matchStatus,
                matchResult,
                isWinner,
                canClaim,
                txHash: betTxMap[betId] || null,
                claimTxHash: claimTxMap[betId] || null,
              });
            }
          })
        );

        // Sort newest first
        allBets.sort((a, b) => b.timestamp - a.timestamp);
        setBets(allBets);

        // Calculate P&L
        const claimed = allBets.filter(b => b.claimed);
        const pnl = claimed.reduce((acc, b) => acc + b.potentialPayout - b.amount, 0);
        setTotalPnl(Math.round(pnl * 100) / 100);
      });
    } catch (err) {
      console.error("fetchBets error:", err);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    const timer = setTimeout(() => fetchBets(), 0);
    return () => clearTimeout(timer);
  }, [fetchBets]);

  const pendingBets    = bets.filter(b => b.matchStatus === 0 || b.matchStatus === 1);
  const claimableBets  = bets.filter(b => b.canClaim);
  const settledBets    = bets.filter(b => b.matchStatus === 2 || b.matchStatus === 3);
  const totalBetAmount = bets.reduce((acc, b) => acc + b.amount, 0);

  return {
    bets, loading, totalPnl, totalBetAmount,
    pendingBets, claimableBets, settledBets,
    refetch: fetchBets,
  };
}
