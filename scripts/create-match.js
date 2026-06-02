const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Balance:", ethers.formatUnits(await ethers.provider.getBalance(deployer.address), 18), "ARC");

  // Load contract address from deployment.json
  const deployPath = path.join(__dirname, "../deployment.json");
  let marketAddress = "";
  if (fs.existsSync(deployPath)) {
    const deployInfo = JSON.parse(fs.readFileSync(deployPath, "utf8"));
    marketAddress = deployInfo.marketAddress;
  }
  marketAddress = process.env.MARKET_ADDRESS || marketAddress;

  if (!marketAddress) {
    console.error("Error: PredictionMarket contract address not found in deployment.json and MARKET_ADDRESS is not set.");
    process.exit(1);
  }

  console.log("Target Market Address:", marketAddress);
  const market = await ethers.getContractAt("PredictionMarket", marketAddress);

  // Read arguments from env vars, or prompt usage
  const home = process.env.HOME_TEAM;
  const away = process.env.AWAY_TEAM;
  const id = process.env.MATCH_ID;
  const kickoffOffset = process.env.KICKOFF_HOURS ? parseInt(process.env.KICKOFF_HOURS) : 0;

  if (!home || !away || !id) {
    console.log("=================================================================================");
    console.log("ArcMarkets On-Chain Match Creator");
    console.log("=================================================================================");
    console.log("Usage to create a single match via Env Variables:");
    console.log("  HOME_TEAM=\"Brazil\" AWAY_TEAM=\"Mexico\" MATCH_ID=\"WC2026_001\" KICKOFF_HOURS=48 npx hardhat run scripts/create-match.js --network arcTestnet");
    console.log("---------------------------------------------------------------------------------");
    console.log("Alternatively, edit this script directly to configure multiple matches to create in batch.");
    console.log("=================================================================================");
    
    // As a user convenience, we can define a batch of matches to add if they run the script with default/empty options.
    const defaultMatches = [
      { home: "Brazil",    away: "Germany",   id: "WC2026_006", kickoffHours: 48 },
      { home: "Spain",     away: "France",    id: "WC2026_007", kickoffHours: 72 },
      { home: "Argentina", away: "England",   id: "WC2026_008", kickoffHours: 96 },
      { home: "Netherlands", away: "USA",     id: "WC2026_009", kickoffHours: 120 }
    ];

    console.log("\nNo env arguments provided. Running default batch creation of 4 matches:");
    for (const m of defaultMatches) {
      console.log(` - ${m.home} vs ${m.away} (${m.id})`);
    }

    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const confirm = await new Promise(resolve => {
      readline.question("\nDo you want to batch create these matches on-chain? (y/N): ", ans => {
        readline.close();
        resolve(ans.toLowerCase() === "y");
      });
    });

    if (!confirm) {
      console.log("Match creation aborted.");
      return;
    }

    console.log("\nStarting batch match creation...");
    const now = Math.floor(Date.now() / 1000);
    for (const m of defaultMatches) {
      const kickoff = now + m.kickoffHours * 3600;
      console.log(`Creating Match: ${m.home} vs ${m.away} (ID: ${m.id})`);
      const tx = await market.createMatch(m.home, m.away, m.id, kickoff);
      console.log(` > Transaction hash: ${tx.hash}`);
      await tx.wait();
      console.log(` > Created successfully ✓`);
    }
    console.log("\nBatch match creation complete!");
    return;
  }

  const kickoff = Math.floor(Date.now() / 1000) + kickoffOffset * 3600;
  console.log(`Creating Match: ${home} vs ${away} (ID: ${id}) with kickoff in ${kickoffOffset} hours`);
  const tx = await market.createMatch(home, away, id, kickoff);
  console.log(`Transaction hash: ${tx.hash}`);
  await tx.wait();
  console.log(`Match created successfully!`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
