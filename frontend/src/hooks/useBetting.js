import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACTS, USDC_DECIMALS, runWithRpcFallback } from "../utils/config";
import { PREDICTION_MARKET_ABI, ERC20_ABI } from "../utils/abis";

export function useBetting(signer) {
  const [status, setStatus] = useState("idle");
  const [error, setError]   = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const reset = () => { setStatus("idle"); setError(null); };

  // ─── Check & request USDC approval ───────────────────────────────────────
  const ensureApproval = useCallback(async (amountUsdt) => {
    if (!signer) throw new Error("Wallet not connected");
    const usdt = new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, signer);
    const address = await signer.getAddress();
    const amountWei = ethers.parseUnits(amountUsdt.toString(), USDC_DECIMALS);

    let allowance = 0n;
    try {
      allowance = await usdt.allowance(address, CONTRACTS.PREDICTION_MARKET);
    } catch (e) {
      console.warn("allowance check failed in ensureApproval, will attempt approval directly:", e);
    }

    if (allowance >= amountWei) return; // Already approved

    setStatus("approving");
    try {
      const tx = await usdt.approve(CONTRACTS.PREDICTION_MARKET, amountWei);
      await tx.wait();
    } catch (e) {
      console.error("Approve call failed:", e);
      // Let it pass to placement, in case the chain doesn't enforce standard approval for native predeploy
    }
  }, [signer]);

  // ─── Place a bet ──────────────────────────────────────────────────────────
  const placeBet = useCallback(async (
    matchIndex,
    outcome,
    amountUsdt
  ) => {
    if (!signer) { setError("Connect your wallet first"); return null; }
    setError(null);

    try {
      await ensureApproval(amountUsdt);
      setStatus("betting");

      const market = new ethers.Contract(CONTRACTS.PREDICTION_MARKET, PREDICTION_MARKET_ABI, signer);
      const amountWei = ethers.parseUnits(amountUsdt.toString(), USDC_DECIMALS);

      const tx = await market.placeBet(matchIndex, outcome, amountWei);
      const receipt = await tx.wait();

      // Parse BetPlaced event to get betId
      const iface = new ethers.Interface(PREDICTION_MARKET_ABI);
      let betId = 0;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "BetPlaced") {
            betId = Number(parsed.args.betId);
            break;
          }
        } catch {}
      }

      const result = { betId, txHash: receipt.hash };
      
      // Save txHash to local storage cache for instant retrieval in useUserBets
      if (typeof window !== "undefined") {
        try {
          const cache = JSON.parse(localStorage.getItem("arcmarkets_tx_map") || "{}");
          cache[betId] = receipt.hash;
          localStorage.setItem("arcmarkets_tx_map", JSON.stringify(cache));
        } catch (e) {
          console.error("Failed to cache bet tx", e);
        }
      }

      setLastResult(result);
      setStatus("success");
      return result;

    } catch (err) {
      const msg = err?.reason || err?.message || "Transaction failed";
      setError(msg.includes("user rejected") ? "Transaction cancelled" : msg);
      setStatus("error");
      return null;
    }
  }, [signer, ensureApproval]);

  // ─── Claim winnings for a single bet ─────────────────────────────────────
  const claimWinnings = useCallback(async (betId) => {
    if (!signer) { setError("Connect your wallet first"); return null; }
    setError(null);
    setStatus("claiming");

    try {
      const market = new ethers.Contract(CONTRACTS.PREDICTION_MARKET, PREDICTION_MARKET_ABI, signer);
      const tx = await market.claimWinnings(betId);
      const receipt = await tx.wait();

      // Save claim txHash to local storage cache for instant retrieval in useUserBets
      if (typeof window !== "undefined") {
        try {
          const cache = JSON.parse(localStorage.getItem("arcmarkets_claim_tx_map") || "{}");
          cache[betId] = receipt.hash;
          localStorage.setItem("arcmarkets_claim_tx_map", JSON.stringify(cache));
        } catch (e) {
          console.error("Failed to cache claim tx", e);
        }
      }

      setStatus("success");
      return receipt.hash;
    } catch (err) {
      const msg = err?.reason || err?.message || "Claim failed";
      setError(msg.includes("user rejected") ? "Transaction cancelled" : msg);
      setStatus("error");
      return null;
    }
  }, [signer]);

  // ─── Claim all winnings for a match ──────────────────────────────────────
  const claimAll = useCallback(async (matchIndex) => {
    if (!signer) { setError("Connect your wallet first"); return null; }
    setError(null);
    setStatus("claiming");

    try {
      const market = new ethers.Contract(CONTRACTS.PREDICTION_MARKET, PREDICTION_MARKET_ABI, signer);
      const tx = await market.claimAll(matchIndex);
      const receipt = await tx.wait();
      setStatus("success");
      return receipt.hash;
    } catch (err) {
      const msg = err?.reason || err?.message || "Claim failed";
      setError(msg.includes("user rejected") ? "Transaction cancelled" : msg);
      setStatus("error");
      return null;
    }
  }, [signer]);

  // ─── Simulate payout before betting (read-only) ───────────────────────────
  const simulatePayout = useCallback(async (
    matchIndex,
    outcome,
    amountUsdt
  ) => {
    try {
      if (signer?.provider) {
        const market = new ethers.Contract(CONTRACTS.PREDICTION_MARKET, PREDICTION_MARKET_ABI, signer.provider);
        const amountWei = ethers.parseUnits(amountUsdt.toString(), USDC_DECIMALS);
        const payout = await market.getPotentialPayout(matchIndex, outcome, amountWei);
        return Number(ethers.formatUnits(payout, USDC_DECIMALS));
      } else {
        return await runWithRpcFallback(async (p) => {
          const market = new ethers.Contract(CONTRACTS.PREDICTION_MARKET, PREDICTION_MARKET_ABI, p);
          const amountWei = ethers.parseUnits(amountUsdt.toString(), USDC_DECIMALS);
          const payout = await market.getPotentialPayout(matchIndex, outcome, amountWei);
          return Number(ethers.formatUnits(payout, USDC_DECIMALS));
        });
      }
    } catch {
      return 0;
    }
  }, [signer]);

  return { status, error, lastResult, placeBet, claimWinnings, claimAll, simulatePayout, reset };
}
