const { ethers } = require("hardhat");
const deployment = require("../deployment.json");

async function main() {
  const marketAddr = deployment.marketAddress;
  const market = await ethers.getContractAt("PredictionMarket", marketAddr);

  const minBet = await market.MIN_BET();
  const usdcAddress = await market.usdc();
  
  console.log("MIN_BET on contract:", minBet.toString());
  console.log("USDC Address on contract:", usdcAddress);
}

main().catch(console.error);
