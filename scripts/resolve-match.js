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
  const matchCount = await market.getMatchCount();
  console.log(`Total Matches on Contract: ${matchCount.toString()}\n`);

  const STATUS_STR = ["OPEN", "LOCKED", "RESOLVED", "CANCELLED"];
  const OUTCOME_STR = ["NONE", "HOME_WIN", "DRAW", "AWAY_WIN"];

  // Fetch all matches
  const matchesList = [];
  for (let i = 0; i < matchCount; i++) {
    const m = await market.getMatch(i);
    matchesList.push({
      index: i,
      home: m.homeTeam,
      away: m.awayTeam,
      id: m.matchId,
      kickoff: new Date(Number(m.kickoffTime) * 1000).toLocaleString(),
      kickoffRaw: Number(m.kickoffTime),
      status: Number(m.status),
      result: Number(m.result),
      totalPool: ethers.formatUnits(m.totalPool, 6) // USDT has 6 decimals
    });
  }

  // Print table
  console.log("==========================================================================");
  console.log("INDEX | TEAMS                     | STATUS     | RESULT    | POOL (USDT)");
  console.log("==========================================================================");
  for (const m of matchesList) {
    const teams = `${m.home} vs ${m.away}`.padEnd(25);
    const status = STATUS_STR[m.status].padEnd(10);
    const result = OUTCOME_STR[m.result].padEnd(10);
    console.log(`  ${m.index.toString().padEnd(3)} | ${teams} | ${status} | ${result} | $${m.totalPool}`);
  }
  console.log("==========================================================================\n");

  const matchIdxStr = process.env.MATCH_INDEX;
  const outcomeStr = process.env.OUTCOME;

  if (matchIdxStr === undefined || outcomeStr === undefined) {
    console.log("Usage to lock and resolve a match via Env Variables:");
    console.log("  MATCH_INDEX=0 OUTCOME=1 npx hardhat run scripts/resolve-match.js --network arcTestnet");
    console.log("\nOutcome values:");
    console.log("  1 = HOME_WIN");
    console.log("  2 = DRAW");
    console.log("  3 = AWAY_WIN");
    console.log("  4 = CANCEL (will call cancelMarket instead of resolveMarket)");
    return;
  }

  const matchIndex = parseInt(matchIdxStr);
  const outcome = parseInt(outcomeStr);

  if (matchIndex < 0 || matchIndex >= matchesList.length) {
    console.error("Error: Invalid match index");
    process.exit(1);
  }

  const selectedMatch = matchesList[matchIndex];
  console.log(`Targeting Match: ${selectedMatch.home} vs ${selectedMatch.away}`);
  console.log(`Current Status: ${STATUS_STR[selectedMatch.status]}`);

  // 1. Lock the market if it is OPEN
  if (selectedMatch.status === 0) {
    console.log(`Locking market for match ${matchIndex}...`);
    const tx = await market.lockMarket(matchIndex);
    console.log(` > Lock Tx: ${tx.hash}`);
    await tx.wait();
    console.log(` > Market locked successfully ✓`);
  }

  // 2. Resolve/Cancel the market
  if (outcome === 4) {
    console.log(`Cancelling market for match ${matchIndex}...`);
    const tx = await market.cancelMarket(matchIndex);
    console.log(` > Cancel Tx: ${tx.hash}`);
    await tx.wait();
    console.log(` > Market cancelled successfully ✓`);
  } else {
    console.log(`Resolving market for match ${matchIndex} with result: ${OUTCOME_STR[outcome]} (${outcome})...`);
    const tx = await market.resolveMarket(matchIndex, outcome);
    console.log(` > Resolve Tx: ${tx.hash}`);
    await tx.wait();
    console.log(` > Market resolved successfully ✓`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
