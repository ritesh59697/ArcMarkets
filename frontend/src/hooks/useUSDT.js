import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { CONTRACTS, USDC_DECIMALS, runWithRpcFallback } from "../utils/config";
import { ERC20_ABI } from "../utils/abis";

export function useUSDT(userAddress, provider) {
  const [balance, setBalance] = useState(0);
  const [allowance, setAllowance] = useState(0);
  const [loading, setLoading] = useState(false);
  const hasLoaded = useRef(false);

  useEffect(() => {
    hasLoaded.current = false;
  }, [userAddress]);

  const fetchBalances = useCallback(async () => {
    if (!userAddress) { setBalance(0); setAllowance(0); hasLoaded.current = false; return; }
    if (!hasLoaded.current) {
      setLoading(true);
    }
    try {
      let bal = 0n;
      let allow = 0n;

      if (provider) {
        const usdt = new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, provider);
        try {
          bal = await usdt.balanceOf(userAddress);
        } catch (e) {
          console.warn("balanceOf query failed, trying native balance fallback:", e);
          try {
            bal = await provider.getBalance(userAddress);
          } catch (e2) {
            console.error("native balance query failed:", e2);
          }
        }
        try {
          allow = await usdt.allowance(userAddress, CONTRACTS.PREDICTION_MARKET);
        } catch (e) {
          console.warn("allowance query failed, defaulting to 0:", e);
        }
      } else {
        await runWithRpcFallback(async (p) => {
          const usdt = new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, p);
          try {
            bal = await usdt.balanceOf(userAddress);
          } catch (e) {
            console.warn("balanceOf query failed, trying native balance fallback:", e);
            try {
              bal = await p.getBalance(userAddress);
            } catch (e2) {
              console.error("native balance query failed:", e2);
            }
          }
          try {
            allow = await usdt.allowance(userAddress, CONTRACTS.PREDICTION_MARKET);
          } catch (e) {
            console.warn("allowance query failed, defaulting to 0:", e);
          }
        });
      }

      // Format balance dynamically (18 decimals if native gas fallback was used, 6 if ERC-20 was successful)
      let formattedBal = 0;
      if (bal > 10000000000000n) {
        formattedBal = Number(ethers.formatUnits(bal, 18));
      } else {
        formattedBal = Number(ethers.formatUnits(bal, USDC_DECIMALS));
      }

      setBalance(formattedBal);
      setAllowance(Number(ethers.formatUnits(allow, USDC_DECIMALS)));
      hasLoaded.current = true;
    } catch (err) {
      console.error("fetchBalances error:", err);
    } finally {
      setLoading(false);
    }
  }, [userAddress, provider]);

  useEffect(() => {
    const timer = setTimeout(() => fetchBalances(), 0);
    const interval = setInterval(fetchBalances, 30_000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchBalances]);

  const hasEnough = (amount) => balance >= amount;
  const isApproved = (amount) => allowance >= amount;

  return { balance, allowance, loading, hasEnough, isApproved, refetch: fetchBalances };
}
