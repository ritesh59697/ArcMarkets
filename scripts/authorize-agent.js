const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer / Agent address:", deployer.address);

  // Read deployment.json
  const deployJsonPath = path.join(__dirname, "../deployment.json");
  if (!fs.existsSync(deployJsonPath)) {
    throw new Error(`deployment.json not found at ${deployJsonPath}`);
  }
  const deployment = JSON.parse(fs.readFileSync(deployJsonPath, "utf8"));
  const marketAddress = deployment.marketAddress;
  console.log("Current PredictionMarket address:", marketAddress);

  const market = await ethers.getContractAt("PredictionMarket", marketAddress);

  console.log("Checking if agent is authorized...");
  const isAuthorized = await market.authorizedAgents(deployer.address);
  if (isAuthorized) {
    console.log("Agent is already authorized!");
    return;
  }

  console.log("Authorizing agent on PredictionMarket...");
  const tx = await market.authorizeAgent(deployer.address);
  await tx.wait();
  console.log("Agent authorized successfully ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
