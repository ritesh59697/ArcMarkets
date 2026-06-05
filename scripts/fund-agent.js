const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Sender (Deployer) address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Sender Balance:", ethers.formatUnits(balance, 18), "ARC");

  // Read frontend/.env.local to find the configured agent address
  const envPath = path.join(__dirname, "../frontend/.env.local");
  let agentAddress;

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/NEXT_PUBLIC_AGENT_ADDRESS\s*=\s*(0x[a-fA-F0-9]{40})/);
    if (match) {
      agentAddress = match[1];
    }
  }

  if (!agentAddress) {
    console.error("Error: Could not find NEXT_PUBLIC_AGENT_ADDRESS in frontend/.env.local");
    process.exit(1);
  }

  console.log("Target Agent address to fund:", agentAddress);

  const agentBalanceBefore = await ethers.provider.getBalance(agentAddress);
  console.log("Agent Balance Before:", ethers.formatUnits(agentBalanceBefore, 18), "ARC");

  // We want the agent to have at least 5 ARC
  const fundAmount = ethers.parseEther("5.0");

  if (balance < fundAmount) {
    console.warn(`WARNING: Sender balance is low (${ethers.formatUnits(balance, 18)} ARC). Trying to send 1 ARC instead.`);
  }

  const txAmount = balance > fundAmount ? fundAmount : ethers.parseEther("1.0");
  
  console.log(`Sending ${ethers.formatUnits(txAmount, 18)} ARC to agent...`);
  const tx = await deployer.sendTransaction({
    to: agentAddress,
    value: txAmount,
  });

  console.log("Waiting for confirmation, TX Hash:", tx.hash);
  await tx.wait();

  const agentBalanceAfter = await ethers.provider.getBalance(agentAddress);
  console.log("Agent Balance After:", ethers.formatUnits(agentBalanceAfter, 18), "ARC ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
