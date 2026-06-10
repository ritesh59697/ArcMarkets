const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using deployer account:", deployer.address);
  console.log("Balance:", ethers.formatUnits(await ethers.provider.getBalance(deployer.address), 18), "ARC");

  const deployPath = path.join(__dirname, "../deployment.json");
  let marketAddress = "";
  if (fs.existsSync(deployPath)) {
    const deployInfo = JSON.parse(fs.readFileSync(deployPath, "utf8"));
    marketAddress = deployInfo.marketAddress;
  }

  if (!marketAddress) {
    console.error("Error: PredictionMarket contract address not found in deployment.json.");
    process.exit(1);
  }

  console.log("Target Market Address:", marketAddress);
  const market = await ethers.getContractAt("PredictionMarket", marketAddress);

  const now = Math.floor(Date.now() / 1000);
  const matchesToCreate = [
    { home: "Brazil", away: "Germany", id: "FB_BRA_GER_01", offsetSeconds: 3600 }, // in 1 hour
    { home: "Spain", away: "France", id: "FB_ESP_FRA_01", offsetSeconds: 7200 }, // in 2 hours
    { home: "Argentina", away: "England", id: "FB_ARG_ENG_01", offsetSeconds: 10800 }, // in 3 hours
    { home: "Bitcoin", away: "Ethereum", id: "CR_BTC_ETH_01", offsetSeconds: 14400 }, // in 4 hours
    { home: "Solana", away: "BNB", id: "CR_SOL_BNB_01", offsetSeconds: 21600 }, // in 6 hours
    { home: "Pepe", away: "Dogecoin", id: "CR_PEPE_DOGE_01", offsetSeconds: 28800 } // in 8 hours
  ];

  console.log("\nCreating live matches...");
  for (const m of matchesToCreate) {
    const kickoff = now + m.offsetSeconds;
    console.log(`Creating Match: ${m.home} vs ${m.away} (ID: ${m.id})`);
    try {
      const tx = await market.createMatch(m.home, m.away, m.id, kickoff);
      console.log(` > Tx Hash: ${tx.hash}`);
      await tx.wait();
      console.log(` > Created successfully ✓`);
    } catch (e) {
      console.error(` > Failed to create match:`, e.message);
    }
  }

  console.log("\nAll matches processed!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
