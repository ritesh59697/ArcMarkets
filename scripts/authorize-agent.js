const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  // Read frontend/.env.local to find the configured agent address
  const envPath = path.join(__dirname, "../frontend/.env.local");
  let agentAddress = process.env.AGENT_ADDRESS;

  if (!agentAddress && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/NEXT_PUBLIC_AGENT_ADDRESS\s*=\s*(0x[a-fA-F0-9]{40})/);
    if (match) {
      agentAddress = match[1];
    }
  }

  if (!agentAddress) {
    console.log("No agent address found in environment or frontend/.env.local. Falling back to deployer address.");
    agentAddress = deployer.address;
  }

  console.log("Target Agent address to authorize:", agentAddress);

  // Read deployment.json
  const deployJsonPath = path.join(__dirname, "../deployment.json");
  if (!fs.existsSync(deployJsonPath)) {
    throw new Error(`deployment.json not found at ${deployJsonPath}`);
  }
  const deployment = JSON.parse(fs.readFileSync(deployJsonPath, "utf8"));
  const marketAddress = deployment.marketAddress;
  console.log("Current PredictionMarket address:", marketAddress);

  const market = await ethers.getContractAt("PredictionMarket", marketAddress);

  console.log(`Checking if agent ${agentAddress} is authorized...`);
  const isAuthorized = await market.authorizedAgents(agentAddress);
  if (isAuthorized) {
    console.log("Agent is already authorized!");
    return;
  }

  console.log(`Authorizing agent ${agentAddress} on PredictionMarket...`);
  const tx = await market.authorizeAgent(agentAddress);
  await tx.wait();
  console.log("Agent authorized successfully ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
