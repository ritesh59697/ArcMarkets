// frontend/src/hooks/useWallet.js
import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { ACTIVE_NETWORK } from "../utils/config";

const INITIAL_STATE = {
  address: null,
  provider: null,
  signer: null,
  chainId: null,
  isConnected: false,
  isCorrectNetwork: false,
  isConnecting: false,
  error: null,
};

/**
 * Safely resolve an injected EVM provider.
 * When multiple EVM wallet extensions are installed, `window.ethereum` is often a Proxy chain;
 * reading it can cause "Maximum call stack size exceeded". Use each wallet's own global first.
 */
function getEthereumProvider() {
  if (typeof window === "undefined") return null;

  const candidates = [
    () => window.rabby,
    () => window.phantom?.ethereum,
    () => window.coinbaseWalletExtension,
    () => window.braveEthereum,
    () => window.ethereum,
  ];

  for (const pick of candidates) {
    try {
      const provider = pick();
      if (provider && typeof provider.request === "function") return provider;
    } catch {
      /* proxy trap / extension conflict — try next */
    }
  }
  return null;
}

export function useWallet() {
  const [state, setState] = useState(INITIAL_STATE);
  const listenersAttached = useRef(false);

  const switchToArc = useCallback(async (ethereum) => {
    if (!ethereum) return false;
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ACTIVE_NETWORK.chainIdHex }],
      });
      return true;
    } catch (switchError) {
      if (switchError?.code === 4902) {
        try {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: ACTIVE_NETWORK.chainIdHex,
              chainName: ACTIVE_NETWORK.name,
              rpcUrls: [ACTIVE_NETWORK.rpcUrl],
              blockExplorerUrls: [ACTIVE_NETWORK.explorerUrl],
              nativeCurrency: ACTIVE_NETWORK.nativeCurrency,
            }],
          });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }, []);

  const connect = useCallback(async () => {
    let ethereum;
    try {
      ethereum = getEthereumProvider();
    } catch {
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: "Wallet extension conflict. Try disabling extra wallet extensions.",
      }));
      return;
    }

    if (!ethereum) {
      setState((s) => ({
        ...s,
        error: "No wallet found. Install MetaMask, Rabby, or another EVM wallet.",
      }));
      return;
    }

    setState((s) => ({ ...s, isConnecting: true, error: null }));

    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      if (!accounts?.length) throw new Error("No accounts returned");

      const chainIdHex = await ethereum.request({ method: "eth_chainId" });
      const chainId = parseInt(chainIdHex, 16);

      if (chainId !== ACTIVE_NETWORK.chainId) {
        const switched = await switchToArc(ethereum);
        if (!switched) {
          setState((s) => ({
            ...s,
            isConnecting: false,
            error: "Please switch to Arc Testnet in your wallet.",
          }));
          return;
        }
      }

      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setState({
        address,
        provider,
        signer,
        chainId: Number(network.chainId),
        isConnected: true,
        isCorrectNetwork: Number(network.chainId) === ACTIVE_NETWORK.chainId,
        isConnecting: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: err?.message || "Failed to connect wallet",
      }));
    }
  }, [switchToArc]);

  const disconnect = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  useEffect(() => {
    let ethereum;
    try {
      ethereum = getEthereumProvider();
    } catch {
      return undefined;
    }
    if (!ethereum || listenersAttached.current) return undefined;

    listenersAttached.current = true;

    const handleAccountsChanged = async (accounts) => {
      if (!accounts?.length) {
        setState(INITIAL_STATE);
        return;
      }
      try {
        const provider = new ethers.BrowserProvider(ethereum);
        const signer = await provider.getSigner();
        setState((s) => ({ ...s, address: accounts[0], signer, isConnected: true }));
      } catch {
        /* ignore */
      }
    };

    const handleChainChanged = (chainIdHex) => {
      const chainId = parseInt(chainIdHex, 16);
      setState((s) => ({
        ...s,
        chainId,
        isCorrectNetwork: chainId === ACTIVE_NETWORK.chainId,
      }));
    };

    ethereum.on?.("accountsChanged", handleAccountsChanged);
    ethereum.on?.("chainChanged", handleChainChanged);

    ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (accounts?.length) connect();
      })
      .catch(() => {});

    return () => {
      listenersAttached.current = false;
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [connect]);

  return {
    ...state,
    connect,
    disconnect,
    switchToArc: () => switchToArc(getEthereumProvider()),
  };
}
