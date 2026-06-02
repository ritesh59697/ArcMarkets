const hre = require("hardhat");
const { ethers } = hre;

/**
 * Deploy ArcMarkets to Arc Testnet
 * Run: npx hardhat run deploy.js --network arcTestnet
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatUnits(await ethers.provider.getBalance(deployer.address), 6), "USDC");

  // Arc uses USDC as native gas and exposes USDC at this ERC-20 predeploy.
  let USDC_ADDRESS = process.env.USDC_ADDRESS || "0x3600000000000000000000000000000000000000";
  if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
    console.log("\nLocal network detected. Deploying MockUSDT as mock USDC...");
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();
    USDC_ADDRESS = await mockUSDT.getAddress();
    console.log("   MockUSDC deployed to:", USDC_ADDRESS);
  }

  // 1. Deploy BetReceiptNFT
  console.log("\n1. Deploying BetReceiptNFT...");
  const BetReceiptNFT = await ethers.getContractFactory("BetReceiptNFT");
  const betNFT = await BetReceiptNFT.deploy();
  await betNFT.waitForDeployment();
  const nftAddress = await betNFT.getAddress();
  console.log("   BetReceiptNFT:", nftAddress);

  // 2. Deploy PredictionMarket
  console.log("\n2. Deploying PredictionMarket...");
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const market = await PredictionMarket.deploy(USDC_ADDRESS, nftAddress);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log("   PredictionMarket:", marketAddress);

  // 3. Link NFT to market
  console.log("\n3. Linking NFT to PredictionMarket...");
  const tx = await betNFT.setPredictionMarket(marketAddress);
  await tx.wait();
  console.log("   Linked ✓");

  // 4. Seed initial markets across sports and crypto
  console.log("\n4. Creating initial markets...");
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;

  const matches = [
    { home: "Brazil", away: "Mexico", id: "SPORT_WC26_001", kickoff: now + day * 1 },
    { home: "Argentina", away: "Germany", id: "SPORT_WC26_002", kickoff: now + day * 2 },
    { home: "BTC Above $105K", away: "BTC Below $102K", id: "CRYPTO_BTC_24H_001", kickoff: now + 3600 },
    { home: "ETH Outperforms SOL", away: "SOL Outperforms ETH", id: "CRYPTO_ETH_SOL_001", kickoff: now + 7200 },
    { home: "AI Tokens", away: "Meme Tokens", id: "CRYPTO_SECTOR_001", kickoff: now + day },
  ];

  for (const m of matches) {
    const tx = await market.createMatch(m.home, m.away, m.id, m.kickoff);
    await tx.wait();
    console.log(`   Created: ${m.home} vs ${m.away}`);
  }

  // 5. Summary
  console.log("\n═══════════════════════════════════");
  console.log("DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════");
  console.log("BetReceiptNFT:    ", nftAddress);
  console.log("PredictionMarket: ", marketAddress);
  console.log("USDC:             ", USDC_ADDRESS);
  console.log("\nUpdate your .env.local:");
  console.log(`NEXT_PUBLIC_MARKET_ADDRESS=${marketAddress}`);
  console.log(`NEXT_PUBLIC_NFT_ADDRESS=${nftAddress}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${USDC_ADDRESS}`);

  // Save to file for CI/CD
  const fs = require("fs");
  fs.writeFileSync(
    "deployment.json",
    JSON.stringify({ marketAddress, nftAddress, usdcAddress: USDC_ADDRESS, network: hre.network.name }, null, 2)
  );
}

main().catch((err) => { console.error(err); process.exit(1); });
