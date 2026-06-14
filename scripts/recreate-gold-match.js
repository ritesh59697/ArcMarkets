const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const deployPath = path.join(__dirname, "../deployment.json");
  if (!fs.existsSync(deployPath)) {
    console.error("deployment.json not found!");
    process.exit(1);
  }
  const deployInfo = JSON.parse(fs.readFileSync(deployPath, "utf8"));
  const marketAddress = deployInfo.marketAddress;
  console.log("PredictionMarket Address:", marketAddress);

  const market = await ethers.getContractAt("PredictionMarket", marketAddress);

  const target2027 = 1798761600; // Jan 1, 2027

  console.log("\nRecreating GOLD vs New ATH match on-chain...");
  try {
    const tx = await market.createMatch("GOLD", "New ATH", "CR_GOLD_ATH_2027_NEW", target2027);
    console.log(` > Tx Hash: ${tx.hash}`);
    await tx.wait();
    console.log(` > Created successfully ✓`);
  } catch (e) {
    console.error(` > Failed to create match:`, e.message);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
