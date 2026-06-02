const { ethers } = require("hardhat");
const deployment = require("../deployment.json");

async function main() {
  const marketAddr = deployment.marketAddress;
  const market = await ethers.getContractAt("PredictionMarket", marketAddr);

  const minBet = await market.MIN_BET();
  const usdtAddress = await market.usdt();
  
  console.log("MIN_BET on contract:", minBet.toString());
  console.log("USDT Address on contract:", usdtAddress);
}

main().catch(console.error);
