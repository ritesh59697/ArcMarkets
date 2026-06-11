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
  const target2027 = 1798761600; // Jan 1, 2027
  const matchesToCreate = [
    { home: "Brazil", away: "Germany", id: "FB_BRA_GER_02", offsetSeconds: 86400 * 7 },    // in 7 days
    { home: "Spain", away: "France", id: "FB_ESP_FRA_02", offsetSeconds: 86400 * 14 },    // in 14 days
    { home: "Argentina", away: "England", id: "FB_ARG_ENG_02", offsetSeconds: 86400 * 21 },  // in 21 days
    { home: "Bitcoin", away: "Ethereum", id: "CR_BTC_ETH_02", offsetSeconds: 86400 * 30 },  // in 30 days
    { home: "Solana", away: "BNB", id: "CR_SOL_BNB_02", offsetSeconds: 86400 * 45 },     // in 45 days
    { home: "Pepe", away: "Dogecoin", id: "CR_PEPE_DOGE_02", offsetSeconds: 86400 * 60 },    // in 60 days
    { home: "GOLD", away: "New ATH", id: "CR_GOLD_ATH_2027", kickoffOverride: target2027 },
    { home: "Silver", away: "New ATH", id: "CR_SILVER_ATH_2027", kickoffOverride: target2027 }
  ];

  console.log("\nCreating live matches...");
  for (const m of matchesToCreate) {
    const kickoff = m.kickoffOverride || (now + m.offsetSeconds);
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
