const { ethers } = require("hardhat");

async function main() {
  const usdtAddr = process.env.NEXT_PUBLIC_USDT_ADDRESS || "0x3600000000000000000000000000000000000000";
  const marketAddr = process.env.NEXT_PUBLIC_MARKET_ADDRESS || "0xbE2bf8f1c34a0517Dfd8732d4b8A82056DB539B4";
  
  const code = await ethers.provider.getCode(usdtAddr);
  console.log("USDT Code Length:", code.length);
  if (code === "0x") {
    console.log("WARNING: No contract code at USDT address!");
  }

  const marketCode = await ethers.provider.getCode(marketAddr);
  console.log("Market Code Length:", marketCode.length);
  if (marketCode === "0x") {
    console.log("WARNING: No contract code at Market address!");
  } else {
    const market = await ethers.getContractAt("PredictionMarket", marketAddr);
    const count = await market.getMatchCount();
    console.log("Match count:", count.toString());
  }
}

main().catch(console.error);
