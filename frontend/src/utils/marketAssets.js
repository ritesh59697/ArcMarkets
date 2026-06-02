/**
 * Real token logos (CoinGecko CDN) and helpers for sports vs crypto markets.
 */

const COINGECKO = "https://assets.coingecko.com/coins/images";

export const CRYPTO_LOGOS = {
  btc: `${COINGECKO}/1/small/bitcoin.png`,
  eth: `${COINGECKO}/279/small/ethereum.png`,
  sol: `${COINGECKO}/4128/small/solana.png`,
  bnb: `${COINGECKO}/825/small/bnb-icon2_2x.png`,
  xrp: `${COINGECKO}/44/small/xrp-symbol-white-128.png`,
  doge: `${COINGECKO}/5/small/dogecoin.png`,
  pepe: `${COINGECKO}/29850/small/pepe-token.jpeg`,
  fet: `${COINGECKO}/10303/small/Fetch.jpg`,
  rndr: `${COINGECKO}/11636/small/rndr.png`,
  link: `${COINGECKO}/877/small/chainlink-new-logo.png`,
  usdc: `${COINGECKO}/6319/small/usdc.png`,
};

/** Match team / market label → logo URL (crypto only; sports use API crests). */
const CRYPTO_PATTERNS = [
  { re: /\b(btc|bitcoin)\b/i, logo: CRYPTO_LOGOS.btc },
  { re: /\b(eth|ethereum)\b/i, logo: CRYPTO_LOGOS.eth },
  { re: /\b(sol|solana)\b/i, logo: CRYPTO_LOGOS.sol },
  { re: /\b(bnb|binance)\b/i, logo: CRYPTO_LOGOS.bnb },
  { re: /\b(xrp|ripple)\b/i, logo: CRYPTO_LOGOS.xrp },
  { re: /\b(doge|dogecoin)\b/i, logo: CRYPTO_LOGOS.doge },
  { re: /\b(pepe)\b/i, logo: CRYPTO_LOGOS.pepe },
  { re: /\b(link|chainlink)\b/i, logo: CRYPTO_LOGOS.link },
  { re: /\bai\s*token/i, logo: CRYPTO_LOGOS.fet },
  { re: /\bmeme\s*token/i, logo: CRYPTO_LOGOS.pepe },
  { re: /\busdc\b/i, logo: CRYPTO_LOGOS.usdc },
];

export function getCryptoLogo(label) {
  if (!label) return null;
  for (const { re, logo } of CRYPTO_PATTERNS) {
    if (re.test(label)) return logo;
  }
  return null;
}

export function isCryptoMarket(homeTeam, awayTeam, matchId = "") {
  const blob = `${homeTeam} ${awayTeam} ${matchId}`.toLowerCase();
  return (
    blob.includes("crypto") ||
    blob.includes("btc") ||
    blob.includes("eth") ||
    blob.includes("sol") ||
    blob.includes("token") ||
    blob.includes("above") ||
    blob.includes("outperform")
  );
}

export function getMarketCategory(homeTeam, awayTeam, matchId = "") {
  if (isCryptoMarket(homeTeam, awayTeam, matchId)) return "Crypto";
  return "Football";
}

/** Resolve image: crypto logo → enriched crest → null */
export function resolveSideImage(teamName, enrichedCrest) {
  return getCryptoLogo(teamName) || enrichedCrest || null;
}

export function shortAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
