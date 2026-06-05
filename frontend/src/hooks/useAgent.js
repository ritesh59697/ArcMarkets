import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACTS, USDC_DECIMALS, runWithRpcFallback } from "../utils/config";
import { PREDICTION_MARKET_ABI, ERC20_ABI } from "../utils/abis";

export function useAgent(
  userAddress,
  signer
) {
  const agentWallet = process.env.NEXT_PUBLIC_AGENT_ADDRESS || "";

  const [state, setState] = useState({
    isAuthorized: false,
    agentAddress: null,
    remainingBudget: 0,
    loading: false,
    error: null,
    txStatus: "idle",
  });

  // ─── Fetch current agent state from contract ──────────────────────────────
  const fetchAgentState = useCallback(async () => {
    if (!userAddress) return;
    setState(s => ({ ...s, loading: true }));

    try {
      await runWithRpcFallback(async (provider) => {
        const contract = new ethers.Contract(CONTRACTS.PREDICTION_MARKET, PREDICTION_MARKET_ABI, provider);

        const [agentAddr, budget] = await Promise.all([
          contract.userAgent(userAddress),
          contract.agentBudget(userAddress),
        ]);

        const isAuthorized = agentAddr !== ethers.ZeroAddress;
        setState(s => ({
          ...s,
          isAuthorized,
          agentAddress: isAuthorized ? agentAddr : null,
          remainingBudget: Number(ethers.formatUnits(budget, USDC_DECIMALS)),
          loading: false,
        }));
      });
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err.message }));
    }
  }, [userAddress]);

  useEffect(() => {
    fetchAgentState();
  }, [fetchAgentState]);

  // ─── Authorize agent with budget ──────────────────────────────────────────
  const authorizeAgent = useCallback(async (budgetUsdc) => {
    if (!signer || !agentWallet) {
      setState(s => ({ ...s, error: "Wallet not connected or agent address missing" }));
      return false;
    }

    setState(s => ({ ...s, error: null, txStatus: "approving" }));

    try {
      const budgetWei = ethers.parseUnits(budgetUsdc.toString(), USDC_DECIMALS);

      // Step 1: Approve USDC
      const usdt = new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, signer);
      const userAddr = await signer.getAddress();
      const allowance = await usdt.allowance(userAddr, CONTRACTS.PREDICTION_MARKET);

      if (allowance < budgetWei) {
        const approveTx = await usdt.approve(CONTRACTS.PREDICTION_MARKET, budgetWei);
        await approveTx.wait();
      }

      // Step 2: Authorize agent
      setState(s => ({ ...s, txStatus: "authorizing" }));
      const market = new ethers.Contract(CONTRACTS.PREDICTION_MARKET, PREDICTION_MARKET_ABI, signer);
      const tx = await market.authorizeMyAgent(agentWallet, budgetWei);
      const receipt = await tx.wait();

      setState(s => ({
        ...s,
        txStatus: "success",
        isAuthorized: true,
        agentAddress: agentWallet,
        remainingBudget: budgetUsdc,
      }));

      await fetchAgentState();
      return { success: true, txHash: receipt.hash };

    } catch (err) {
      const msg = err?.reason || err?.message || "Authorization failed";
      setState(s => ({
        ...s,
        txStatus: "error",
        error: msg.includes("user rejected") ? "Transaction cancelled" : msg,
      }));
      return { success: false, error: msg };
    }
  }, [signer, fetchAgentState, agentWallet]);

  // ─── Top up agent budget ──────────────────────────────────────────────────
  const topUpBudget = useCallback(async (additionalUsdc) => {
    if (!signer) return { success: false, error: "Wallet not connected" };
    setState(s => ({ ...s, error: null, txStatus: "approving" }));

    try {
      const amountWei = ethers.parseUnits(additionalUsdc.toString(), USDC_DECIMALS);

      const usdt = new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, signer);
      const userAddr = await signer.getAddress();
      const allowance = await usdt.allowance(userAddr, CONTRACTS.PREDICTION_MARKET);
      if (allowance < amountWei) {
        const tx = await usdt.approve(CONTRACTS.PREDICTION_MARKET, amountWei);
        await tx.wait();
      }

      setState(s => ({ ...s, txStatus: "authorizing" }));
      const market = new ethers.Contract(CONTRACTS.PREDICTION_MARKET, PREDICTION_MARKET_ABI, signer);
      const tx = await market.updateAgentBudget(amountWei);
      const receipt = await tx.wait();

      setState(s => ({
        ...s,
        txStatus: "success",
        remainingBudget: s.remainingBudget + additionalUsdc,
      }));

      await fetchAgentState();
      return { success: true, txHash: receipt.hash };
    } catch (err) {
      setState(s => ({ ...s, txStatus: "error", error: err?.message || "Top-up failed" }));
      return { success: false, error: err?.message || "Top-up failed" };
    }
  }, [signer, fetchAgentState]);

  // ─── Revoke agent ─────────────────────────────────────────────────────────
  const revokeAgent = useCallback(async () => {
    if (!signer) return { success: false, error: "Wallet not connected" };
    setState(s => ({ ...s, error: null, txStatus: "revoking" }));

    try {
      const market = new ethers.Contract(CONTRACTS.PREDICTION_MARKET, PREDICTION_MARKET_ABI, signer);
      const tx = await market.revokeAgent();
      const receipt = await tx.wait();

      setState(s => ({
        ...s,
        txStatus: "success",
        isAuthorized: false,
        agentAddress: null,
        remainingBudget: 0,
      }));
      return { success: true, txHash: receipt.hash };
    } catch (err) {
      setState(s => ({ ...s, txStatus: "error", error: err?.message || "Revoke failed" }));
      return { success: false, error: err?.message || "Revoke failed" };
    }
  }, [signer]);

  const resetTxStatus = () => setState(s => ({ ...s, txStatus: "idle", error: null }));

  return {
    ...state,
    agentWallet,
    authorizeAgent,
    topUpBudget,
    revokeAgent,
    resetTxStatus,
    refetch: fetchAgentState,
  };
}
