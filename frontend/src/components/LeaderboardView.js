"use client";

import { Trophy, RefreshCw, ChevronRight, ExternalLink } from "lucide-react";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { ACTIVE_NETWORK } from "../utils/config";

const fmtK = (n) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n * 100) / 100);

const fmt = (n, d = 0) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

function LeaderboardRows({ rows, compact = false }) {
  if (!rows.length) {
    return (
      <div style={{ padding: 28, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        No on-chain bets yet. Be the first to place a prediction.
      </div>
    );
  }

  const gridCols = compact
    ? "36px 1fr 80px"
    : "48px 1fr 80px 80px 100px";

  return (
    <>
      {!compact && (
        <div
          className="font-sans"
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--border)",
            display: "grid",
            gridTemplateColumns: gridCols,
            gap: 8,
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          <span>Rank</span>
          <span>Wallet</span>
          <span style={{ textAlign: "center" }}>Win %</span>
          <span style={{ textAlign: "center" }}>Bets</span>
          <span style={{ textAlign: "right" }}>Profit</span>
        </div>
      )}
      {rows.map((row, idx) => (
        <a
          key={row.addr}
          href={`${ACTIVE_NETWORK.explorerUrl}/address/${row.addr}`}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: compact ? "12px 16px" : "14px 20px",
            borderBottom: "1px solid var(--border)",
            display: "grid",
            gridTemplateColumns: gridCols,
            gap: 8,
            alignItems: "center",
            textDecoration: "none",
            color: "inherit",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--card-header-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "";
          }}
        >
          <span
            style={{
              fontSize: row.medal ? 16 : 13,
              fontWeight: 700,
              color: ["#e8b84a", "#a8b0c0", "#c98a5c"][row.rank - 1] || "var(--text-muted)",
            }}
          >
            {row.medal || row.rank}
          </span>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
                color: "var(--text-primary)",
              }}
            >
              {row.shortAddr || row.addr}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
              Vol ${fmtK(row.volume)} · Built on Arc Network
            </div>
          </div>
          {!compact && (
            <>
              <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>
                {row.winRate}%
              </div>
              <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-secondary)" }}>{row.bets}</div>
            </>
          )}
          <div
            style={{
              textAlign: "right",
              fontSize: 12,
              fontWeight: 700,
              color: row.profit >= 0 ? "var(--green)" : "var(--red)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {row.profit >= 0 ? "+" : ""}
            {compact ? `$${fmtK(row.profit)}` : fmtK(row.profit)}
          </div>
        </a>
      ))}
    </>
  );
}

export function LeaderboardSidebar({ onViewAll }) {
  const { rows, loading } = useLeaderboard(7);
  const top = rows.slice(0, 7);

  return (
    <aside>
      <h2
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 20,
          fontWeight: 400,
          letterSpacing: "-0.01em",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Trophy size={18} style={{ color: "var(--accent)" }} /> Top Bettors
      </h2>
      <div className="card arc-card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            display: "grid",
            gridTemplateColumns: "36px 1fr 80px",
            gap: 8,
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          <span>#</span>
          <span>Wallet</span>
          <span style={{ textAlign: "right" }}>Profit</span>
        </div>
        {loading ? (
          <div style={{ padding: "32px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--text-secondary)" }}>
            <RefreshCw size={18} className="animate-spin" style={{ color: "var(--primary)" }} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>Indexing chain…</span>
          </div>
        ) : (
          <LeaderboardRows rows={top} compact />
        )}
        <div style={{ padding: "12px 16px", textAlign: "center" }}>
          <button
            type="button"
            onClick={onViewAll}
            className="btn-ghost"
            style={{ fontSize: 12, gap: 5, width: "100%", justifyContent: "center" }}
          >
            View All <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function LeaderboardTab({ theme }) {
  const { rows, loading, error, meta, refetch } = useLeaderboard(50);
  const podium = rows.slice(0, 3);

  return (
    <div className="font-sans" style={{ maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="font-serif" style={{ fontSize: 34, fontWeight: 400, letterSpacing: "-0.01em", marginBottom: 6 }}>
            On-chain <span className="text-gradient-arc" style={{ fontStyle: "italic" }}>Leaderboard</span>
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Ranked by realized USDC profit on-chain · Built on Arc Network
            {meta?.betCount != null && ` · ${meta.betCount} bets indexed`}
          </p>
        </div>
        <button type="button" className="btn-ghost" onClick={() => refetch()} style={{ gap: 6, fontSize: 12 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="card" style={{ padding: 16, marginBottom: 16, color: "var(--red)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: "64px 32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "var(--text-secondary)", minHeight: 220 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--primary-alpha-bg)", border: "1px solid var(--primary-alpha-border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
            <RefreshCw size={22} className="animate-spin" style={{ color: "var(--primary)" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Fetching On-chain State</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Reading predictions and match data directly on-chain…</div>
          </div>
        </div>
      ) : (
        <>
          {podium.length > 0 && (
            <div className="leaderboard-podium" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
              {podium.map((row, idx) => {
                const colors = ["#e8b84a", "#a8b0c0", "#c98a5c"];
                return (
                  <div
                    key={row.addr}
                    className="card arc-card"
                    style={{
                      padding: "20px 16px",
                      textAlign: "center",
                      borderLeft: `3px solid ${colors[idx]}`,
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{row.medal}</div>
                    <a
                      href={`${ACTIVE_NETWORK.explorerUrl}/address/${row.addr}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 700,
                        color: colors[idx],
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {row.shortAddr} <ExternalLink size={10} />
                    </a>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: row.profit >= 0 ? "var(--green)" : "var(--red)",
                        fontFamily: "var(--font-mono)",
                        marginTop: 8,
                      }}
                    >
                      {row.profit >= 0 ? "+" : ""}${fmt(row.profit, 2)}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                      {row.winRate}% win · {row.bets} bets · ${fmtK(row.volume)} vol
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="card arc-card" style={{ padding: 0, overflow: "hidden" }}>
            <LeaderboardRows rows={rows} />
          </div>
        </>
      )}
    </div>
  );
}
