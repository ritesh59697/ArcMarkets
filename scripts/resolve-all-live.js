const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Load contract address from deployment.json
  const deployPath = path.join(__dirname, "../deployment.json");
  let marketAddress = "";
  if (fs.existsSync(deployPath)) {
    const deployInfo = JSON.parse(fs.readFileSync(deployPath, "utf8"));
    marketAddress = deployInfo.marketAddress;
  }
  marketAddress = process.env.MARKET_ADDRESS || marketAddress;

  if (!marketAddress) {
    console.error("Error: PredictionMarket contract address not found.");
    process.exit(1);
  }

  const market = await ethers.getContractAt("PredictionMarket", marketAddress);

  // Indexes to resolve
  const indexesToResolve = [0, 1, 2, 3, 4, 5];

  console.log("Starting batch resolution of ended matches (0-5)...");

  for (const idx of indexesToResolve) {
    const m = await market.getMatch(idx);
    console.log(`\nMatch ${idx}: ${m.homeTeam} vs ${m.awayTeam}`);
    const status = Number(m.status);
    console.log(`Current Status: ${status} (0=OPEN, 1=LOCKED, 2=RESOLVED)`);

    if (status === 0) {
      console.log(` > Locking market...`);
      try {
        const txLock = await market.lockMarket(idx);
        console.log(`   > Lock Tx: ${txLock.hash}`);
        await txLock.wait();
        console.log(`   > Locked ✓`);
      } catch (err) {
        console.error(`   > Failed to lock:`, err.message);
        continue;
      }
    }

    const currentMatch = await market.getMatch(idx);
    const updatedStatus = Number(currentMatch.status);
    if (updatedStatus === 1) {
      console.log(` > Resolving with outcome HOME_WIN (1)...`);
      try {
        const txResolve = await market.resolveMarket(idx, 1);
        console.log(`   > Resolve Tx: ${txResolve.hash}`);
        await txResolve.wait();
        console.log(`   > Resolved successfully ✓`);
      } catch (err) {
        console.error(`   > Failed to resolve:`, err.message);
      }
    } else if (updatedStatus === 2) {
      console.log(` > Match already resolved.`);
    } else {
      console.log(` > Match status (${updatedStatus}) cannot be resolved, skipping.`);
    }
  }

  console.log("\nBatch resolution completed!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
