const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const userAddress = "0x06eaED5d3DCa7158111F25577108C9743404e118";
  
  const deployPath = path.join(__dirname, "../deployment.json");
  let marketAddress = "";
  if (fs.existsSync(deployPath)) {
    const deployInfo = JSON.parse(fs.readFileSync(deployPath, "utf8"));
    marketAddress = deployInfo.marketAddress;
  }
  
  if (!marketAddress) {
    console.error("Error: PredictionMarket address not found");
    return;
  }

  const market = await ethers.getContractAt("PredictionMarket", marketAddress);
  const matchCount = await market.getMatchCount();
  
  console.log(`Checking bets for user ${userAddress} across all ${matchCount} matches:`);
  
  for (let i = 0; i < matchCount; i++) {
    const betIds = await market.getUserBetsForMatch(i, userAddress);
    if (betIds.length > 0) {
      const matchData = await market.getMatch(i);
      console.log(`\nMatch Index ${i}: ${matchData.homeTeam} vs ${matchData.awayTeam} (Status: ${matchData.status.toString()}, Result: ${matchData.result.toString()})`);
      for (const betIdRaw of betIds) {
        const betId = Number(betIdRaw);
        const bet = await market.getBet(betId);
        console.log(`  Bet ID ${betId}: Outcome ${bet.outcome.toString()}, Amount: ${ethers.formatUnits(bet.amount, 6)} USDC, Claimed: ${bet.claimed}`);
      }
    }
  }
}

main().catch(console.error);
