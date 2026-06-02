import { useState, useEffect, useCallback } from "react";

export function useLeaderboard(limit = 50) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  const fetchLeaderboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leaderboard?limit=${limit}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load leaderboard");
      setRows(data.rows || []);
      setMeta({
        betCount: data.betCount,
        updatedAt: data.updatedAt,
        indexedFromBlock: data.indexedFromBlock,
      });
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(() => fetchLeaderboard(true), 90_000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  return { rows, loading, error, meta, refetch: fetchLeaderboard };
}
