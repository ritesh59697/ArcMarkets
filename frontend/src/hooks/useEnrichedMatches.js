import { useState, useEffect, useCallback } from "react";
import { useMatches } from "./useMatches";
import { getCryptoLogo, getMarketCategory } from "../utils/marketAssets";

export function useEnrichedMatches() {
  const base = useMatches();
  const [matches, setMatches] = useState([]);
  const [upcomingFixtures, setUpcomingFixtures] = useState([]);
  const [fixturesLoading, setFixturesLoading] = useState(true);

  const applyLocalCrypto = useCallback((list) => {
    return list.map((m) => ({
      ...m,
      category: getMarketCategory(m.homeTeam, m.awayTeam, m.matchId),
      homeImage: getCryptoLogo(m.homeTeam) || m.homeImage || m.homeCrest || null,
      awayImage: getCryptoLogo(m.awayTeam) || m.awayImage || m.awayCrest || null,
      league: m.league || (getMarketCategory(m.homeTeam, m.awayTeam, m.matchId) === "Crypto" ? "Crypto" : "Football"),
    }));
  }, []);

  useEffect(() => {
    if (!base.matches.length) {
      setMatches([]);
      return;
    }

    let cancelled = false;
    const local = applyLocalCrypto(base.matches);
    setMatches(local);

    fetch("/api/sports/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matches: base.matches }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.matches?.length) {
          setMatches(applyLocalCrypto(data.matches));
        }
      })
      .catch((err) => console.warn("enrich matches:", err));

    return () => {
      cancelled = true;
    };
  }, [base.matches, applyLocalCrypto]);

  useEffect(() => {
    let cancelled = false;
    setFixturesLoading(true);
    fetch("/api/sports/fixtures")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setUpcomingFixtures(data.fixtures || []);
      })
      .catch(() => {
        if (!cancelled) setUpcomingFixtures([]);
      })
      .finally(() => {
        if (!cancelled) setFixturesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    matches,
    upcomingFixtures,
    fixturesLoading,
    loading: base.loading,
    error: base.error,
    refetch: base.refetch,
  };
}
