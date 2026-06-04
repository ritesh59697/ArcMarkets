// frontend/src/utils/config.js
import { ethers } from "ethers";

export const ARC_TESTNET = {
  chainId: 5042002,
  chainIdHex: "0x4CEF92",
  name: "Arc Testnet",
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerUrl: "https://testnet.arcscan.app",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
};

export const ACTIVE_NETWORK = ARC_TESTNET;

const RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_ARC_RPC_URL || ARC_TESTNET.rpcUrl,
];

let activeRpcUrl = RPC_ENDPOINTS[0];

export function getRpcProvider() {
  const url = typeof window !== "undefined" ? `${window.location.origin}/api/rpc` : activeRpcUrl;
  return new ethers.JsonRpcProvider(url, undefined, { batchMaxCount: 100, batchStallTime: 10 });
}

export function switchRpc() {
  const currentIndex = RPC_ENDPOINTS.indexOf(activeRpcUrl);
  activeRpcUrl = RPC_ENDPOINTS[(currentIndex + 1) % RPC_ENDPOINTS.length];
  return getRpcProvider();
}

export async function runWithRpcFallback(fn) {
  const maxRetries = RPC_ENDPOINTS.length * 2;
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn(getRpcProvider());
    } catch (err) {
      lastError = err;
      switchRpc();
    }
  }
  throw lastError;
}

// Defaults from deployment.json so the UI works without .env.local
const DEPLOYED = {
  PREDICTION_MARKET: "0xbE2bf8f1c34a0517Dfd8732d4b8A82056DB539B4",
  BET_RECEIPT_NFT: "0xEfDdb2C5788E426d0AE18a62B74a84A8c86972dE",
  USDC: "0x3600000000000000000000000000000000000000",
};

export const CONTRACTS = {
  PREDICTION_MARKET: process.env.NEXT_PUBLIC_MARKET_ADDRESS || DEPLOYED.PREDICTION_MARKET,
  BET_RECEIPT_NFT: process.env.NEXT_PUBLIC_NFT_ADDRESS || DEPLOYED.BET_RECEIPT_NFT,
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS || DEPLOYED.USDC,
};

export const MIN_BET_USDC = 0.01;
export const MAX_BET_USDC = 1000;
export const USDC_DECIMALS = 6;
export const PLATFORM_FEE = 0.02;

export const OUTCOME_LABELS = {
  1: "Home Win",
  2: "Draw",
  3: "Away Win",
};

export const OUTCOME_COLORS = {
  1: "#00d4ff",
  2: "#888888",
  3: "#ff6b35",
};

export const MARKET_STATUS = {
  0: "OPEN",
  1: "LOCKED",
  2: "RESOLVED",
  3: "CANCELLED",
};

export const TEAM_FLAGS = {
  Brazil: "🇧🇷",
  Mexico: "🇲🇽",
  Argentina: "🇦🇷",
  Germany: "🇩🇪",
  France: "🇫🇷",
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Spain: "🇪🇸",
  Portugal: "🇵🇹",
  Netherlands: "🇳🇱",
  Italy: "🇮🇹",
  Belgium: "🇧🇪",
  Croatia: "🇭🇷",
  Uruguay: "🇺🇾",
  USA: "🇺🇸",
  Japan: "🇯🇵",
  Morocco: "🇲🇦",
  Senegal: "🇸🇳",
  Australia: "🇦🇺",
  "South Korea": "🇰🇷",
  Poland: "🇵🇱",
  "BTC Above $105K": "₿",
  "BTC Below $102K": "₿",
  "ETH Outperforms SOL": "Ξ",
  "SOL Outperforms ETH": "◎",
  "AI Tokens": "🤖",
  "Meme Tokens": "🐸",
};
