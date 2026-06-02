"use client";
import "./globals.css";
import "./polish.css";
import "./themes.css";
import { createContext, useContext } from "react";
import { useWallet } from "../hooks/useWallet";

export const WalletContext = createContext(null);
export function useWalletContext() {
  return useContext(WalletContext);
}

export default function RootLayout({ children }) {
  const wallet = useWallet();
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="ArcMarkets - live sports and crypto prediction markets on Arc Testnet, settled in USDC." />
        <title>ArcMarkets — On-Chain Predictions on Arc</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Syne:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var stored = localStorage.getItem('arcmarkets-theme');
                var theme = stored === 'light' || stored === 'dark'
                  ? stored
                  : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                document.documentElement.setAttribute('data-theme', theme);
              })()
            `,
          }}
        />
      </head>
      <body>
        <WalletContext.Provider value={wallet}>
          {children}
        </WalletContext.Provider>
      </body>
    </html>
  );
}
