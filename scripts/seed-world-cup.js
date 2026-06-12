const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Load contract address
  const deployPath = path.join(__dirname, "../deployment.json");
  let marketAddress = "";
  if (fs.existsSync(deployPath)) {
    const deployInfo = JSON.parse(fs.readFileSync(deployPath, "utf8"));
    marketAddress = deployInfo.marketAddress;
  }

  if (!marketAddress) {
    console.error("Error: PredictionMarket address not found in deployment.json");
    return;
  }

  const market = await ethers.getContractAt("PredictionMarket", marketAddress);

  console.log("Fetching World Cup matches from TheSportsDB...");
  const THESPORTSDB = "https://www.thesportsdb.com/api/v1/json/3";
  const leagueId = "4480"; // FIFA World Cup
  
  let matchesToCreate = [];
  try {
    const data = await fetchJson(`${THESPORTSDB}/eventsnextleague.php?id=${leagueId}`);
    const events = data.events || [];
    
    events.forEach(e => {
      const kickoffTimeUTC = (() => {
        const t = new Date(`${e.dateEvent}T${e.strTime || "15:00:00"}`);
        return Number.isNaN(t.getTime()) ? Math.floor(Date.now() / 1000) + 86400 * 2 : Math.floor(t.getTime() / 1000);
      })();
      matchesToCreate.push({
        home: e.strHomeTeam,
        away: e.strAwayTeam,
        matchId: `WC_${e.idEvent}`,
        kickoff: kickoffTimeUTC
      });
    });
    
  } catch (err) {
    console.warn("Could not fetch next events from TheSportsDB:", err.message);
  }

  // If we fetched 0 matches, seed standard realistic matches for World Cup 2026
  if (matchesToCreate.length === 0) {
    console.log("Using realistic fallback World Cup 2026 matches...");
    const now = Math.floor(Date.now() / 1000);
    const fallbacks = [
      { home: "Mexico", away: "South Korea", id: "WC_2026_MEX_KOR", offset: 86400 * 1 },
      { home: "Canada", away: "Switzerland", id: "WC_2026_CAN_SUI", offset: 86400 * 2 },
      { home: "Brazil", away: "Morocco", id: "WC_2026_BRA_MAR", offset: 86400 * 3 },
      { home: "United States", away: "Australia", id: "WC_2026_USA_AUS", offset: 86400 * 4 },
      { home: "Germany", away: "Ivory Coast", id: "WC_2026_GER_CIV", offset: 86400 * 5 },
      { home: "Spain", away: "Uruguay", id: "WC_2026_ESP_URU", offset: 86400 * 6 },
      { home: "France", away: "Senegal", id: "WC_2026_FRA_SEN", offset: 86400 * 7 }
    ];
    fallbacks.forEach(f => {
      matchesToCreate.push({
        home: f.home,
        away: f.away,
        matchId: f.id,
        kickoff: now + f.offset
      });
    });
  }

  // Get existing matchIds on-chain
  const matchCount = Number(await market.getMatchCount());
  const existingIds = new Set();
  for (let i = 0; i < matchCount; i++) {
    const m = await market.getMatch(i);
    existingIds.add(m.matchId);
  }

  console.log(`Processing ${matchesToCreate.length} World Cup match(es)...`);
  for (const m of matchesToCreate) {
    if (existingIds.has(m.matchId)) {
      console.log(`Match ${m.home} vs ${m.away} (ID: ${m.matchId}) already exists on contract. Skipping.`);
      continue;
    }
    console.log(`Seeding Match: ${m.home} vs ${m.away} (ID: ${m.matchId}, Kickoff: ${new Date(m.kickoff * 1000).toLocaleString()})`);
    try {
      const tx = await market.createMatch(m.home, m.away, m.matchId, m.kickoff);
      await tx.wait();
      console.log(` > Seeded successfully ✓ Tx: ${tx.hash}`);
    } catch (e) {
      console.error(` > Failed to create match:`, e.message);
    }
  }

  console.log("\nWorld Cup seeding complete!");
}

main().catch(console.error);
