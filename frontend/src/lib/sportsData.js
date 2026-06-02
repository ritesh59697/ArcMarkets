/**
 * Real football fixture data — football-data.org (optional key) + TheSportsDB fallback.
 */

const THESPORTSDB = "https://www.thesportsdb.com/api/v1/json/3";

/** Top leagues for upcoming fixtures */
const LEAGUES = [
  { id: "4328", name: "Premier League", code: "PL" },
  { id: "4335", name: "La Liga", code: "PD" },
  { id: "4331", name: "Bundesliga", code: "BL1" },
  { id: "4332", name: "Serie A", code: "SA" },
  { id: "4334", name: "Ligue 1", code: "FL1" },
  { id: "4480", name: "FIFA World Cup", code: "WC" },
];

/** OpenLigaDB — free, no API key (Bundesliga + more) */
const OPENLIGA_LEAGUES = [
  { shortcut: "bl1", name: "Bundesliga" },
  { shortcut: "bl2", name: "2. Bundesliga" },
  { shortcut: "bl3", name: "3. Liga" },
];

const teamBadgeCache = new Map();

function normalizeTeamName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/fc$/i, "")
    .replace(/\s+fc$/i, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...headers },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** football-data.org — set FOOTBALL_DATA_API_KEY for higher limits */
async function fetchFootballDataMatches(competition) {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return [];

  const url = `https://api.football-data.org/v4/competitions/${competition}/matches?status=SCHEDULED,LIVE,IN_PLAY,PAUSED`;
  const data = await fetchJson(url, { "X-Auth-Token": key });
  return (data.matches || []).map((m) => ({
    externalId: `FD_${m.id}`,
    homeTeam: m.homeTeam?.name || m.homeTeam?.shortName || "Home",
    awayTeam: m.awayTeam?.name || m.awayTeam?.shortName || "Away",
    league: m.competition?.name || competition,
    kickoffTime: new Date(m.utcDate).getTime(),
    status: m.status,
    homeCrest: m.homeTeam?.crest || null,
    awayCrest: m.awayTeam?.crest || null,
    source: "football-data.org",
  }));
}

async function fetchTheSportsDBLeagueEvents(leagueId, leagueName) {
  const data = await fetchJson(`${THESPORTSDB}/eventsnextleague.php?id=${leagueId}`);
  const events = data.events || [];
  return events.slice(0, 8).map((e) => ({
    externalId: `TSDB_${e.idEvent}`,
    homeTeam: e.strHomeTeam,
    awayTeam: e.strAwayTeam,
    league: leagueName,
    kickoffTime: (() => {
      const t = new Date(`${e.dateEvent}T${e.strTime || "15:00:00"}`);
      return Number.isNaN(t.getTime()) ? Date.now() + 86400000 : t.getTime();
    })(),
    status: e.strStatus || "Scheduled",
    homeCrest: e.strHomeTeamBadge || null,
    awayCrest: e.strAwayTeamBadge || null,
    source: "thesportsdb",
  }));
}

async function fetchOpenLigaFixtures(shortcut, leagueName) {
  const data = await fetchJson(`https://api.openligadb.de/getmatchdata/${shortcut}`);
  const now = Date.now();
  return (data || [])
    .filter((m) => {
      const t = new Date(m.matchDateTimeUTC || m.matchDateTime).getTime();
      return t > now - 3600000 && m.team1?.teamName && m.team2?.teamName;
    })
    .slice(0, 10)
    .map((m) => ({
      externalId: `OL_${m.matchID}`,
      homeTeam: m.team1.teamName,
      awayTeam: m.team2.teamName,
      league: m.leagueName || leagueName,
      kickoffTime: new Date(m.matchDateTimeUTC || m.matchDateTime).getTime(),
      status: "Scheduled",
      homeCrest: m.team1.teamIconUrl || null,
      awayCrest: m.team2.teamIconUrl || null,
      source: "openligadb",
    }));
}

export async function getUpcomingFixtures(limit = 24) {
  const fixtures = [];
  const seen = new Set();

  // OpenLigaDB — always available, real crests
  for (const league of OPENLIGA_LEAGUES) {
    try {
      const rows = await fetchOpenLigaFixtures(league.shortcut, league.name);
      for (const row of rows) {
        const key = `${normalizeTeamName(row.homeTeam)}-${normalizeTeamName(row.awayTeam)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        fixtures.push(row);
      }
    } catch (err) {
      console.warn(`openligadb ${league.shortcut}:`, err.message);
    }
  }

  // Prefer football-data.org when API key is configured
  if (process.env.FOOTBALL_DATA_API_KEY) {
    for (const league of LEAGUES) {
      if (!league.code || league.code === "WC") continue;
      try {
        const rows = await fetchFootballDataMatches(league.code);
        for (const row of rows) {
          const key = `${normalizeTeamName(row.homeTeam)}-${normalizeTeamName(row.awayTeam)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          fixtures.push(row);
        }
      } catch (err) {
        console.warn(`football-data ${league.code}:`, err.message);
      }
    }
  }

  // TheSportsDB — free, no key
  for (const league of LEAGUES) {
    try {
      const rows = await fetchTheSportsDBLeagueEvents(league.id, league.name);
      for (const row of rows) {
        if (!row.homeTeam || !row.awayTeam) continue;
        const key = `${normalizeTeamName(row.homeTeam)}-${normalizeTeamName(row.awayTeam)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        fixtures.push(row);
      }
    } catch (err) {
      console.warn(`thesportsdb ${league.id}:`, err.message);
    }
  }

  return fixtures
    .filter((f) => f.kickoffTime > Date.now() - 3600000)
    .sort((a, b) => a.kickoffTime - b.kickoffTime)
    .slice(0, limit);
}

/** Look up team crest from TheSportsDB by name */
export async function lookupTeamCrest(teamName) {
  const norm = normalizeTeamName(teamName);
  if (!norm || teamName.length < 2) return null;
  if (teamBadgeCache.has(norm)) return teamBadgeCache.get(norm);

  try {
    const q = encodeURIComponent(teamName.split(" ")[0]);
    const data = await fetchJson(`${THESPORTSDB}/searchteams.php?t=${q}`);
    const teams = data.teams || [];
    const match =
      teams.find((t) => normalizeTeamName(t.strTeam) === norm) ||
      teams.find((t) => normalizeTeamName(t.strTeam).includes(norm) || norm.includes(normalizeTeamName(t.strTeam))) ||
      teams[0];

    const crest = match?.strTeamBadge || match?.strBadge || null;
    teamBadgeCache.set(norm, crest);
    return crest;
  } catch {
    teamBadgeCache.set(norm, null);
    return null;
  }
}

export async function enrichOnChainMatches(matches) {
  return Promise.all(
    matches.map(async (m) => {
      const homeCrypto = null; // resolved client-side via marketAssets
      let homeCrest = m.homeCrest || null;
      let awayCrest = m.awayCrest || null;
      let league = m.league || null;

      const crypto =
        (m.matchId || "").toLowerCase().includes("crypto") ||
        /\b(btc|eth|sol|token|above|outperform)\b/i.test(`${m.homeTeam} ${m.awayTeam}`);

      if (!crypto) {
        if (!homeCrest) homeCrest = await lookupTeamCrest(m.homeTeam);
        if (!awayCrest) awayCrest = await lookupTeamCrest(m.awayTeam);
        if (!league) league = inferLeagueFromMatchId(m.matchId) || "Football";
      } else {
        league = league || "Crypto Markets";
      }

      return {
        ...m,
        homeCrest,
        awayCrest,
        league,
        category: crypto ? "Crypto" : "Football",
      };
    })
  );
}

function inferLeagueFromMatchId(matchId) {
  if (!matchId) return null;
  if (matchId.includes("WC")) return "FIFA World Cup";
  if (matchId.includes("PL")) return "Premier League";
  return null;
}
