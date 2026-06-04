"use client";

import { createContext, useContext } from "react";
import { useWallet } from "../hooks/useWallet";

export const WalletContext = createContext(null);

export function useWalletContext() {
  return useContext(WalletContext);
}

export function Providers({ children }) {
  const wallet = useWallet();
  return (
    <WalletContext.Provider value={wallet}>
      {children}
    </WalletContext.Provider>
  );
}
