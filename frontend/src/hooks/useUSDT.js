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
      if (provider) {
        const usdt = new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, provider);
        const [bal, allow] = await Promise.all([
          usdt.balanceOf(userAddress),
          usdt.allowance(userAddress, CONTRACTS.PREDICTION_MARKET),
        ]);
        setBalance(Number(ethers.formatUnits(bal, USDC_DECIMALS)));
        setAllowance(Number(ethers.formatUnits(allow, USDC_DECIMALS)));
      } else {
        await runWithRpcFallback(async (p) => {
          const usdt = new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, p);
          const [bal, allow] = await Promise.all([
            usdt.balanceOf(userAddress),
            usdt.allowance(userAddress, CONTRACTS.PREDICTION_MARKET),
          ]);
          setBalance(Number(ethers.formatUnits(bal, USDC_DECIMALS)));
          setAllowance(Number(ethers.formatUnits(allow, USDC_DECIMALS)));
        });
      }
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
