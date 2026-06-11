const { ethers } = require("hardhat");

async function main() {
  const marketAddr = "0xbE2bf8f1c34a0517Dfd8732d4b8A82056DB539B4";
  const market = await ethers.getContractAt("PredictionMarket", marketAddr);

  const count = await market.getMatchCount();
  console.log(`Total Match Count: ${count}`);

  const now = Math.floor(Date.now() / 1000);
  console.log(`Current Time (timestamp): ${now} (${new Date().toLocaleString()})\n`);

  for (let i = 0; i < count; i++) {
    const match = await market.getMatch(i);
    const kickoff = Number(match.kickoffTime);
    const timeLeft = kickoff - now;

    console.log(`Match #${i}: ${match.homeTeam} vs ${match.awayTeam}`);
    console.log(`  ID: ${match.matchId}`);
    console.log(`  Kickoff: ${kickoff} (${new Date(kickoff * 1000).toLocaleString()})`);
    console.log(`  Time left: ${timeLeft > 0 ? (timeLeft / 3600).toFixed(2) + " hours" : "EXPIRED (kicked off)"}`);
    console.log(`  Status: ${match.status} (0: Open, 1: Closed, 2: Settled)`);
    console.log(`  Result: ${match.result} (0: None, 1: Home, 2: Draw, 3: Away, 4: Yes, 5: No)`);
    console.log(`  Total Pool: ${ethers.formatUnits(match.totalPool, 6)} USDC\n`);
  }
}

main().catch(console.error);
