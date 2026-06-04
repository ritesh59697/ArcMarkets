"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  Trophy, Zap, Bot, Wallet, Bell, Settings, TrendingUp, TrendingDown,
  Clock, Users, BarChart3, ChevronRight, Shield, Globe, Star, X,
  Play, Pause, RefreshCw, CheckCircle2, AlertCircle, ArrowUpRight,
  Target, Flame, Layers, Activity, Coins, CircleDot, Search,
  LogOut, Copy, ExternalLink, Info, Lock, Unlock, Timer, Sun, Moon
} from "lucide-react";
import { useWalletContext } from "./providers";
import { ACTIVE_NETWORK, TEAM_FLAGS, CONTRACTS } from "../utils/config";
import { useEnrichedMatches } from "../hooks/useEnrichedMatches";
import { useUserBets } from "../hooks/useUserBets";
import { useUSDT } from "../hooks/useUSDT";
import { useBetting } from "../hooks/useBetting";
import { useAgent } from "../hooks/useAgent";
import { getCryptoLogo } from "../utils/marketAssets";
import { LeaderboardSidebar, LeaderboardTab } from "../components/LeaderboardView";
import { useLeaderboard } from "../hooks/useLeaderboard";
import MatchProDashboard from "../components/MatchProDashboard";

const TEAM_IMAGES = {};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const shortAddr = (a) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
const fmt = (n, d = 2) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtK = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : String(n);
function timeUntil(ms) {
  const diff = ms - Date.now();
  if (diff <= 0) return "Live Now";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "Just now";
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Animated Count-Up ───────────────────────────────────────────────────────
function AnimatedStat({ value, prefix = "", suffix = "" }) {
  const [display, setDisplay] = useState(0);
  const isString = typeof value === "string";
  useEffect(() => {
    if (isString) return;
    let start = 0;
    const end = parseFloat(value) || 0;
    if (end === 0) { setDisplay(0); return; }
    const duration = 900;
    const step = 16;
    const increment = end / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, step);
    return () => clearInterval(timer);
  }, [value, isString]);
  if (isString) return <span>{value}</span>;
  const formatted = display >= 1e6 ? `${(display / 1e6).toFixed(1)}M` : display >= 1e3 ? `${(display / 1e3).toFixed(0)}K` : display % 1 !== 0 ? display.toFixed(2) : Math.round(display).toString();
  return <span>{prefix}{formatted}{suffix}</span>;
}


// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  const cfg = {
    success: { bg: "var(--toast-success-bg)", border: "var(--toast-success-border)", icon: <CheckCircle2 size={15} />, color: "var(--green)" },
    error: { bg: "var(--toast-error-bg)", border: "var(--toast-error-border)", icon: <AlertCircle size={15} />, color: "var(--red)" },
    info: { bg: "var(--toast-info-bg)", border: "var(--toast-info-border)", icon: <Info size={15} />, color: "var(--primary)" },
  };
  const c = cfg[type] || cfg.info;
  return (
    <div className="animate-fade-in" style={{
      position: "fixed", top: 76, right: 20, zIndex: 9999,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 10, padding: "12px 18px",
      display: "flex", alignItems: "center", gap: 9,
      color: c.color, fontSize: 13, fontWeight: 600,
      maxWidth: 340, backdropFilter: "blur(16px)",
      boxShadow: "0 8px 32px var(--toast-shadow)"
    }}>
      {c.icon}<span>{msg}</span>
    </div>
  );
}

// ─── Team Avatar ──────────────────────────────────────────────────────────────
function TeamAvatar({ emoji, img, size = 48, borderColor = "var(--border-bright)", isToken = false }) {
  return (
    <div style={{
      width: size + 6, height: size + 6, borderRadius: isToken ? 14 : "50%",
      padding: "3px",
      background: "var(--avatar-border-grad)",
      border: `1px solid ${borderColor}`,
      boxShadow: "var(--avatar-shadow)",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
    }}>
      <div style={{
        width: size, height: size, borderRadius: isToken ? 11 : "50%",
        background: "var(--avatar-inner-bg)",
        overflow: "hidden", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: size * 0.45, flexShrink: 0
      }}>
        {img ? (
          <img
            src={img}
            alt=""
            className={isToken ? "token-logo-img" : ""}
            style={{ width: "100%", height: "100%", objectFit: isToken ? "contain" : "cover" }}
          />
        ) : (
          <span>{emoji}</span>
        )}
      </div>
    </div>
  );
}

// ─── Shimmer Button component (Magic UI-style) ────────────────────────────────
function ShimmerBtn({ children, onClick, disabled, full, variant = "default" }) {
  const cls = variant === "primary" ? "btn-primary" : "btn-shimmer";
  return (
    <button
      className={cls}
      onClick={onClick}
      disabled={disabled}
      style={{ width: full ? "100%" : undefined }}
    >
      {children}
    </button>
  );
}

// ─── Number Ticker (Magic UI-inspired) ───────────────────────────────────────
function NumberTicker({ value, prefix = "", suffix = "" }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setDisplay(value);
    }
  }, [value]);
  return (
    <span className="number-ticker animate-number">
      {prefix}{typeof display === "number" ? fmt(display, 0) : display}{suffix}
    </span>
  );
}

// ─── Match Card ───────────────────────────────────────────────────────────────
function MatchCard({ match, onBet, onSelect }) {
  const t = match.totalPool || 1;
  const hp = Math.round((match.homePool / t) * 100);
  const dp = Math.round((match.drawPool / t) * 100);
  const ap = Math.round((match.awayPool / t) * 100);

  const homeImg = match.homeImage || getCryptoLogo(match.homeTeam) || match.homeCrest;
  const awayImg = match.awayImage || getCryptoLogo(match.awayTeam) || match.awayCrest;
  const homeIsToken = !!getCryptoLogo(match.homeTeam);
  const awayIsToken = !!getCryptoLogo(match.awayTeam);

  return (
    <div 
      className="card arc-card gamified-card animate-slide-up" 
      onClick={() => onSelect && onSelect(match)}
      style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: "pointer" }}
    >
      {/* Header stripe */}
      <div style={{
        padding: "14px 20px", display: "flex", justifyContent: "space-between",
        alignItems: "center", borderBottom: "1px solid var(--border)",
        background: "var(--card-header-bg)"
      }}>
        {match.status === 1 ? (
          <span className="badge" style={{ gap: 5, padding: "4px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <Lock size={10} /> Locked
          </span>
        ) : match.status === 2 ? (
          <span className="badge badge-done" style={{ gap: 5, padding: "4px 10px" }}>
            <CheckCircle2 size={10} /> Resolved
          </span>
        ) : match.status === 3 ? (
          <span className="badge badge-live" style={{ gap: 5, padding: "4px 10px" }}>
            <AlertCircle size={10} /> Cancelled
          </span>
        ) : match.kickoffTime <= Date.now() ? (
          <span className="badge badge-live" style={{ gap: 5, padding: "4px 10px" }}>
            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff4757", boxShadow: "0 0 8px #ff4757", animation: "pulse-glow 2s infinite" }} /> Live Now
          </span>
        ) : (
          <span className="badge badge-open" style={{ gap: 5, padding: "4px 10px" }}>
            <Clock size={10} /> {timeUntil(match.kickoffTime)}
          </span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Globe size={11} style={{ color: "var(--text-secondary)" }} />
          <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>{match.league || match.category || "Football"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>
          <Coins size={11} style={{ color: "var(--primary)" }} />${fmtK(match.totalPool)}
        </div>
      </div>

      {/* Teams */}
      <div style={{ padding: "26px 20px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ textAlign: "center", flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <TeamAvatar emoji={match.homeFlag} img={homeImg} size={64} borderColor="rgba(3, 86, 197, 0.55)" isToken={homeIsToken} />
          <div className="font-sans" style={{ marginTop: 12, fontSize: 14.5, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>{match.homeTeam}</div>
          <div style={{ fontSize: 9.5, color: "var(--text-secondary)", marginTop: 2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{match.homeFlag} Home</div>
        </div>

        <div style={{ textAlign: "center", padding: "0 12px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{
            fontSize: 9, fontWeight: 800, color: "var(--primary)",
            letterSpacing: "0.1em", padding: "4px 10px", background: "var(--vs-badge-bg)",
            border: "1px solid var(--vs-badge-border)", borderRadius: 12,
            marginBottom: 4
          }}>VS</div>
          <div style={{ fontSize: 8.5, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: "0.06em" }}>
            POOL
          </div>
        </div>

        <div style={{ textAlign: "center", flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <TeamAvatar emoji={match.awayFlag} img={awayImg} size={64} borderColor="rgba(77, 159, 255, 0.5)" isToken={awayIsToken} />
          <div className="font-sans" style={{ marginTop: 12, fontSize: 14.5, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>{match.awayTeam}</div>
          <div style={{ fontSize: 9.5, color: "var(--text-secondary)", marginTop: 2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{match.awayFlag} Away</div>
        </div>
      </div>

      {/* Odds */}
      <div style={{ padding: "0 20px 16px", display: "flex", gap: 8 }}>
        {[
          { label: "Home", odds: match.odds.home, o: 1, cls: "odds-btn-home" },
          { label: "Draw", odds: match.odds.draw, o: 2, cls: "odds-btn-draw" },
          { label: "Away", odds: match.odds.away, o: 3, cls: "odds-btn-away" },
        ].map(opt => {
          const isWinner = match.status === 2 && match.result === opt.o;
          const isLoser = match.status === 2 && match.result !== opt.o;
          const statusClass = match.status === 2 ? (isWinner ? "outcome-won" : "outcome-lost") : "";
          return (
            <button
              key={opt.o}
              className={`odds-btn ${opt.cls} ${statusClass}`}
              disabled={match.status !== 0 || match.kickoffTime <= Date.now()}
              onClick={(e) => {
                e.stopPropagation();
                onBet(match, opt.o);
              }}
            >
              <span className="odds-label">{opt.label}</span>
              <span className="odds-value font-mono">{opt.odds}x</span>
              {isWinner && (
                <span className="winner-badge font-sans">
                  Winner
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Pool bar */}
      <div style={{ padding: "0 20px 20px" }}>
        <div className="pool-bar-track">
          <div className="pool-bar-home" style={{ width: `${hp}%` }} />
          <div className="pool-bar-draw" style={{ width: `${dp}%` }} />
          <div className="pool-bar-away" style={{ width: `${ap}%` }} />
        </div>
        <div className="font-mono" style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 9.5, fontWeight: 700 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--primary)" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--primary)", boxShadow: "0 0 4px var(--primary)" }} /> {hp}%
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--text-secondary)" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--dot-draw)" }} /> {dp}%
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--purple)" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--purple)", boxShadow: "0 0 4px var(--purple)" }} /> {ap}%
          </span>
        </div>
      </div>

      {/* CTA Footer */}
      {match.status === 0 && match.kickoffTime > Date.now() && (
        <div style={{ padding: "0 20px 20px" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect ? onSelect(match) : onBet(match, 1);
            }}
            className="w-full py-3 text-white rounded-xl font-bold text-xs hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--purple))",
              border: "none",
              cursor: "pointer"
            }}
          >
            <Zap size={12} /> Place Prediction
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Bet Success Modal (NFT Receipt) ─────────────────────────────────────────
function BetSuccessModal({ result, match, onClose, theme }) {
  const [confettiPieces] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      color: i % 3 === 0 ? "var(--primary)" : i % 3 === 1 ? "#7b2ff7" : "#ffd700",
      size: 6 + Math.random() * 6,
    }))
  );
  const outcomeName = { 1: "Home Win", 2: "Draw", 3: "Away Win" }[result.outcome] || "Unknown";
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000,
      background: theme === "dark" ? "rgba(2,2,3,0.9)" : "rgba(15,23,42,0.4)",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      {/* Confetti */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {confettiPieces.map(p => (
          <div key={p.id} style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "-10px",
            width: p.size, height: p.size,
            background: p.color,
            borderRadius: p.id % 2 === 0 ? "50%" : "2px",
            animation: `confettiFall 2.5s ${p.delay}s ease-in forwards`,
            opacity: 0.85,
            boxShadow: `0 0 8px ${p.color}88`
          }} />
        ))}
      </div>
      <div className="animate-slide-up" style={{
        width: "100%", maxWidth: 400,
        background: "linear-gradient(160deg, #0e1117, #0a0d16)",
        border: "1px solid rgba(0,212,255,0.3)",
        borderTop: "2px solid var(--primary)",
        borderRadius: 20,
        boxShadow: "0 0 60px rgba(0,212,255,0.12), 0 32px 64px rgba(0,0,0,0.9)",
        overflow: "hidden",
        position: "relative"
      }}>
        <div style={{ padding: 28, textAlign: "center" }}>
          {/* Icon */}
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "rgba(16,185,129,0.1)",
            border: "2px solid rgba(16,185,129,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 0 32px rgba(16,185,129,0.2)"
          }}>
            <CheckCircle2 size={28} style={{ color: "#4ade80" }} />
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6, color: "var(--text-primary)", fontFamily: "var(--font-serif)" }}>
            Bet Placed!
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, fontFamily: "var(--font-sans)" }}>
            Your wager is live on Arc Testnet
          </p>

          {/* NFT Receipt Card — always dark for contrast */}
          <div style={{
            background: "linear-gradient(135deg, #0a0f1a, #0d0a1f)",
            border: "1px solid rgba(0,212,255,0.25)",
            borderRadius: 12, padding: "18px 20px", marginBottom: 20,
            position: "relative", overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)"
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 2,
              background: "linear-gradient(90deg, var(--primary), #7b2ff7)"
            }} />
            <div style={{ fontSize: 10, color: "var(--primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
              ⬡ On-Chain NFT Receipt Minted
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>Match</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
                {match.homeTeam} vs {match.awayTeam}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>Prediction</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", fontFamily: "'Inter', sans-serif" }}>{outcomeName}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>Stake</span>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#f8fafc" }}>
                ${Number(result.amount || 0).toFixed(2)} USDC
              </span>
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "12px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>Est. Payout</span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#4ade80" }}>
                ${Number(result.payout || 0).toFixed(2)} USDC
              </span>
            </div>
          </div>

          {/* TX link */}
          {result.txHash && (
            <a
              href={`${ACTIVE_NETWORK.explorerUrl}/tx/${result.txHash}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 12, color: "var(--primary)", textDecoration: "none",
                fontWeight: 600, marginBottom: 20,
                padding: "7px 16px", borderRadius: 8,
                background: "rgba(0,212,255,0.08)",
                border: "1px solid rgba(0,212,255,0.25)",
                fontFamily: "'Inter', sans-serif"
              }}
            >
              <ExternalLink size={12} /> Verify On-Chain
            </a>
          )}

          <button className="btn-primary" onClick={onClose} style={{ width: "100%", borderRadius: 10 }}>
            <Trophy size={14} /> View My Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bet Modal ────────────────────────────────────────────────────────────────
function BetModal({ match, initOutcome, onClose, onSuccess, signer, theme }) {
  const [outcome, setOutcome] = useState(initOutcome || null);
  const [amount, setAmount] = useState("50");
  const [potentialPayout, setPotentialPayout] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  const { status, error, lastResult, placeBet, simulatePayout, reset } = useBetting(signer);

  const odds = { 1: match.odds.home, 2: match.odds.draw, 3: match.odds.away };
  const OPT_LABELS = { 1: "Home Win", 2: "Draw", 3: "Away Win" };

  useEffect(() => {
    const numAmount = parseFloat(amount) || 0;
    if (outcome && numAmount > 0) {
      simulatePayout(match.index, outcome, numAmount).then(val => {
        setPotentialPayout(val);
      }).catch(err => {
        console.error("Payout simulation failed:", err);
        setPotentialPayout(numAmount * (odds[outcome] || 1));
      });
    } else {
      setPotentialPayout(0);
    }
  }, [match.index, outcome, amount, simulatePayout, odds]);

  const numAmount = parseFloat(amount) || 0;

  // Calculate potential payout with professional empty-pool fallback
  let payout = potentialPayout;
  if (outcome && numAmount > 0) {
    const fallbackPayout = numAmount * (odds[outcome] || 1);
    if (!payout || payout <= numAmount) {
      payout = fallbackPayout;
    }
  }
  const profit = payout - numAmount;

  useEffect(() => {
    if (status === "success" && lastResult) {
      const result = { ...lastResult, amount: numAmount, outcome, payout };
      setSuccessResult(result);
      setShowSuccess(true);
    }
  }, [status, lastResult]);

  const place = async () => {
    if (!outcome) return;
    if (numAmount <= 0) return;
    await placeBet(match.index, outcome, numAmount);
  };

  const homeImg = match.homeImage || getCryptoLogo(match.homeTeam) || match.homeCrest;
  const awayImg = match.awayImage || getCryptoLogo(match.awayTeam) || match.awayCrest;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: theme === "dark" ? "rgba(2,2,3,0.85)" : "rgba(15, 23, 42, 0.3)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      {showSuccess && successResult ? (
        <BetSuccessModal
          result={successResult}
          match={match}
          theme={theme}
          onClose={() => {
            setShowSuccess(false);
            onSuccess(successResult);
          }}
        />
      ) : (
        <div className="card animate-slide-up" style={{ width: "100%", maxWidth: 440, border: "1px solid var(--border)", borderTop: "1px solid var(--border-bright)" }}>
          <div style={{ padding: 24 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 className="font-serif" style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.01em", marginBottom: 4 }}>
                  Place Your Bet
                </h2>
                <div className="font-sans" style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
                  <TeamAvatar emoji={match.homeFlag} img={homeImg} size={18} />
                  <span style={{ fontWeight: 600 }}>{match.homeTeam} vs {match.awayTeam}</span>
                  <TeamAvatar emoji={match.awayFlag} img={awayImg} size={18} />
                </div>
              </div>
              <button onClick={onClose} className="btn-ghost" style={{ width: 32, height: 32, padding: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} />
              </button>
            </div>

            <>
              {/* Outcome selector */}
              <div style={{ marginBottom: 18 }}>
                <div className="font-sans" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 9 }}>Select Outcome</div>
                <div className="bet-outcome-grid">
                  {[1, 2, 3].map(o => {
                    const isSel = outcome === o;
                    const activeClass = isSel ? (o === 1 ? "active-home" : o === 2 ? "active-draw" : "active-away") : "";
                    const labelColor = isSel ? (o === 1 ? "var(--primary)" : o === 2 ? "var(--text-primary)" : "var(--purple)") : "var(--text-muted)";
                    return (
                      <button
                        key={o}
                        onClick={() => setOutcome(o)}
                        className={`bet-outcome-btn ${activeClass}`}
                      >
                        <div className="font-sans" style={{ fontSize: 10, fontWeight: 700, color: labelColor, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                          {["HOME", "DRAW", "AWAY"][o - 1]}
                        </div>
                        <div className="font-mono" style={{ fontSize: 20, fontWeight: 750, color: isSel ? (o === 1 ? "var(--primary)" : o === 2 ? "var(--text-primary)" : "var(--purple)") : "var(--text-primary)" }}>
                          {odds[o]}x
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount */}
              <div style={{ marginBottom: 18 }}>
                <div className="font-sans" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 9 }}>Stake Amount (USDC)</div>
                <div className="bet-amount-grid">
                  {[10, 25, 50, 100, 250].map(a => {
                    const isActive = parseFloat(amount) === a;
                    return (
                      <button
                        key={a}
                        onClick={() => setAmount(a.toString())}
                        className={`bet-amount-btn font-mono ${isActive ? "active" : ""}`}
                      >${a}</button>
                    );
                  })}
                </div>
                <div className="bet-input-wrapper">
                  <Coins size={14} className="bet-input-icon" />
                  <input
                    type="number" value={amount} min={0.01} step={0.01}
                    onChange={e => setAmount(e.target.value)}
                    className="input font-mono"
                  />
                  <span className="bet-input-suffix font-mono">USDC</span>
                </div>
              </div>

              {/* Payout estimate */}
              {outcome && (() => {
                const isLoss = profit < 0;
                const profitColor = isLoss ? "var(--danger-text)" : "var(--success-text)";
                const profitBg = isLoss ? "var(--danger-bg)" : "var(--success-bg)";
                const profitBorder = isLoss ? "1px solid var(--danger-border)" : "1px solid var(--success-border)";
                const profitSign = isLoss ? "-" : "+";
                return (
                  <div style={{
                    background: profitBg, border: profitBorder,
                    borderRadius: 8, padding: "14px 16px", marginBottom: 16,
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                    <div>
                      <div className="font-sans" style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Potential Payout</div>
                      <div className="font-mono" style={{ fontSize: 22, fontWeight: 800, color: profitColor, letterSpacing: -0.5 }}>
                        ${fmt(payout)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="font-sans" style={{ fontSize: 10, color: profitColor, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{isLoss ? "Loss" : "Profit"}</div>
                      <div className="font-mono" style={{ fontSize: 22, fontWeight: 800, color: profitColor, letterSpacing: -0.5 }}>
                        {profitSign}${fmt(Math.abs(profit))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {error && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--danger-text)", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "var(--danger-bg)", borderRadius: 7, border: "1px solid var(--danger-border)" }}>
                  <AlertCircle size={14} />{error}
                </div>
              )}

              <ShimmerBtn variant="primary" full onClick={place} disabled={!outcome || status === "approving" || status === "betting"}>
                {status === "approving" && <><RefreshCw size={14} className="animate-spin" /> Approving USDC…</>}
                {status === "betting" && <><RefreshCw size={14} className="animate-spin" /> Placing on Arc Testnet…</>}
                {status !== "approving" && status !== "betting" && <><Zap size={14} /> {outcome ? `Bet $${amount} on ${OPT_LABELS[outcome]}` : "Select an outcome"}</>}
              </ShimmerBtn>
            </>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoModal({ type, onClose, theme }) {
  const MODAL_CONTENT = {
    whitepaper: {
      title: "ArcMarkets Whitepaper",
      subtitle: "Decentralized Parimutuel Sports Betting & AI Execution",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-primary)" }}>
            ArcMarkets is a state-of-the-art decentralized sports betting protocol that leverages parimutuel pooling and autonomous AI execution on the <strong>Arc Testnet</strong> blockchain.
          </p>
          <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--primary)", marginTop: 6 }}>1. Parimutuel Pooling</h4>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)" }}>
            Unlike traditional bookmakers, all stakes for a given match outcome are pooled. Winning tickets split the total pool (minus a small fee of 2%) proportionally to their wager. The odds are calculated dynamically and finalized only when the pool locks at kickoff.
          </p>
          <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--primary)", marginTop: 6 }}>2. Autonomous AI Delegation</h4>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)" }}>
            Users can delegate their betting activity to a localized AI Betting Agent. By authorizing the contract and depositing USDC, the agent calculates Expected Value (EV) using current pool sizes and historical team data, executing bets sizing based on the Kelly Criterion.
          </p>
          <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--primary)", marginTop: 6 }}>3. Yield & Rewards</h4>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)" }}>
            Winnings are distributed automatically in USDC. Claims are fully decentralized and can be triggered directly via the smart contract.
          </p>
        </div>
      )
    },
    verification: {
      title: "On-Chain Verification",
      subtitle: "Verify contract addresses and logs on the Arc Testnet Explorer",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-primary)" }}>
            All transaction logic, wagers, and agent executions are executed transparently on-chain. You can verify the smart contracts directly:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            <div style={{ background: "rgba(0,0,0,0.04)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", boxShadow: "0 0 6px var(--primary)" }} />
                <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Prediction Market Contract</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                  {CONTRACTS.PREDICTION_MARKET || "0x12114397DCD0A58E10ff4eeb1d55c58558849dC7"}
                </span>
                {CONTRACTS.PREDICTION_MARKET && (
                  <a href={`${ACTIVE_NETWORK.explorerUrl}/address/${CONTRACTS.PREDICTION_MARKET}`} target="_blank" rel="noreferrer" style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
            <div style={{ background: "rgba(0,0,0,0.04)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", boxShadow: "0 0 6px var(--primary)" }} />
                <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Bet Receipt NFT Contract</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                  {CONTRACTS.BET_RECEIPT_NFT || "0x6afb09487F7b3C5826976fFE1f3b851bD7aec75D"}
                </span>
                {CONTRACTS.BET_RECEIPT_NFT && (
                  <a href={`${ACTIVE_NETWORK.explorerUrl}/address/${CONTRACTS.BET_RECEIPT_NFT}`} target="_blank" rel="noreferrer" style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
            <div style={{ background: "rgba(0,0,0,0.04)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--purple)", boxShadow: "0 0 6px var(--purple)" }} />
                <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>USDC Token Contract</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                  {CONTRACTS.USDC || "0x1E4a5963aBFD975d8c9021ce480b42188849D41d"}
                </span>
                {CONTRACTS.USDC && (
                  <a href={`${ACTIVE_NETWORK.explorerUrl}/address/${CONTRACTS.USDC}`} target="_blank" rel="noreferrer" style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
            Verification transaction links are also included with every notification message and inside the wagers list on your Portfolio page.
          </p>
        </div>
      )
    },
    odds: {
      title: "Odds Calculations & API",
      subtitle: "Dynamic Parimutuel Odds Mechanism",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-primary)" }}>
            ArcMarkets operates on a decentralized parimutuel wagering model, meaning there are no fixed bookmaker margins. Odds are determined purely by user participation.
          </p>
          <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--primary)", marginTop: 6 }}>Dynamic Formula</h4>
          <div style={{ background: "var(--primary-alpha-bg)", border: "1px solid var(--primary-alpha-border)", padding: "12px", borderRadius: 8, textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>
            Odds = (Total Pool * 0.98) / Outcome Pool
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)" }}>
            As users place bets, the pools change, and odds adjust. When a match starts, the odds freeze. Winnings are settled based on these frozen closing odds.
          </p>
          <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--primary)", marginTop: 6 }}>Oracle Resolution</h4>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)" }}>
            Match data is fetched from decentralized sports data feeds. Oracle nodes resolve matches directly on the blockchain after final whistle verification. If a match is cancelled or postponed, all pools are fully refunded in USDC.
          </p>
        </div>
      )
    },
    support: {
      title: "Customer Support",
      subtitle: "Get assistance or submit platform feedback",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-primary)" }}>
            Have questions or encountered an issue with your wagers? We are here to help.
          </p>
          <div style={{ background: "rgba(0,0,0,0.03)", padding: "16px", borderRadius: 10, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              <strong>Email Support:</strong> support@arcmarkets.io
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              <strong>Discord Community:</strong> discord.gg/arcmarkets
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              Please include your wallet address, transaction hash, and match ID in any support query to expedite resolution.
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--primary)", marginBottom: 8 }}>Submit Feedback</h4>
            <input placeholder="Your email address" className="input" style={{ marginBottom: 8, fontSize: 12 }} />
            <textarea placeholder="Describe your issue or feedback..." className="input" style={{ minHeight: 80, fontSize: 12, resize: "none", fontFamily: "sans-serif" }} />
            <button onClick={() => alert("Feedback submitted! Thank you.")} className="btn-shimmer" style={{ width: "100%", marginTop: 8 }}>Send Message</button>
          </div>
        </div>
      )
    },
    privacy: {
      title: "Decentralized Privacy Policy",
      subtitle: "Your keys, your data. No central tracking.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-primary)" }}>
            ArcMarkets is committed to absolute user privacy. Our architecture contains no centralized login, database, or analytics trackers.
          </p>
          <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--primary)", marginTop: 6 }}>1. Zero Personal Data</h4>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)" }}>
            We do not collect names, email addresses, IP addresses, or location data. Your identity is simply your public cryptographic wallet address.
          </p>
          <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--primary)", marginTop: 6 }}>2. Local Storage Only</h4>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)" }}>
            Your UI settings, active theme selection (Light vs. Dark mode), and notification transaction histories are stored purely within your own browser's LocalStorage. No cookies are transmitted to third parties.
          </p>
          <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--primary)", marginTop: 6 }}>3. Smart Contract Execution</h4>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)" }}>
            All transaction parameters are publicly accessible on the public blockchain ledger (Arc Testnet). By using ArcMarkets, you acknowledge that on-chain actions are immutable.
          </p>
        </div>
      )
    }
  };

  const data = MODAL_CONTENT[type] || MODAL_CONTENT.whitepaper;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: theme === "dark" ? "rgba(2,2,3,0.85)" : "rgba(15, 23, 42, 0.3)",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card animate-slide-up" style={{
        width: "100%",
        maxWidth: 480,
        border: "1px solid var(--border)",
        borderTop: "1px solid var(--border-bright)",
        maxHeight: "90vh",
        overflowY: "auto"
      }}>
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div>
              <h2 className="font-serif" style={{ fontSize: 24, fontWeight: 400, letterSpacing: "-0.01em", marginBottom: 4 }}>
                {data.title}
              </h2>
              <p className="font-sans" style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{data.subtitle}</p>
            </div>
            <button onClick={onClose} className="btn-ghost" style={{ width: 32, height: 32, padding: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ height: 1, background: "var(--border)", marginBottom: 18 }} />
          <div className="font-sans">{data.content}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Matches Tab ──────────────────────────────────────────────────────────────
function FixturePreviewCard({ fixture }) {
  const homeImg = getCryptoLogo(fixture.homeTeam) || fixture.homeCrest;
  const awayImg = getCryptoLogo(fixture.awayTeam) || fixture.awayCrest;
  return (
    <div className="card arc-card fixture-preview-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="badge" style={{ fontSize: 10, background: "var(--purple-alpha-bg)", border: "1px solid var(--purple-alpha-border)" }}>
          Live data · {fixture.league}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeUntil(fixture.kickoffTime)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ textAlign: "center", flex: 1 }}>
          <TeamAvatar emoji="⚽" img={homeImg} size={40} isToken={!!getCryptoLogo(fixture.homeTeam)} />
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{fixture.homeTeam}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: "var(--accent)" }}>VS</span>
        <div style={{ textAlign: "center", flex: 1 }}>
          <TeamAvatar emoji="⚽" img={awayImg} size={40} isToken={!!getCryptoLogo(fixture.awayTeam)} />
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{fixture.awayTeam}</div>
        </div>
      </div>
      <p style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>
        Fixture from {fixture.source || "sports API"} — on-chain market opens when listed by protocol
      </p>
    </div>
  );
}

function MatchesTab({ 
  matches = [], 
  upcomingFixtures = [], 
  fixturesLoading, 
  loading, 
  onBet, 
  leaderboardRows = [], 
  leaderboardLoading = false, 
  setTab,
  wallet,
  usdtBalance,
  refetchUsdt,
  onNotif,
  addNotif,
  theme,
  userBetsState,
  setFooterModal
}) {
  const [search, setSearch] = useState("");
  const [champsSort, setChampsSort] = useState("profit"); // "profit", "winRate", "bets"
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [initialOutcome, setInitialOutcome] = useState(1);

  if (selectedMatch) {
    return (
      <MatchProDashboard
        match={selectedMatch}
        onBack={() => setSelectedMatch(null)}
        wallet={wallet}
        usdtBalance={usdtBalance}
        refetchUsdt={refetchUsdt}
        onNotif={onNotif}
        addNotif={addNotif}
        theme={theme}
        initialOutcome={initialOutcome}
      />
    );
  }

  const filtered = matches.filter(m =>
    !search || m.homeTeam.toLowerCase().includes(search.toLowerCase()) || m.awayTeam.toLowerCase().includes(search.toLowerCase())
  );

  const onChainKeys = new Set(
    matches.map((m) => `${m.homeTeam?.toLowerCase()}-${m.awayTeam?.toLowerCase()}`)
  );
  const previewFixtures = upcomingFixtures.filter((f) => {
    const key = `${f.homeTeam?.toLowerCase()}-${f.awayTeam?.toLowerCase()}`;
    return !onChainKeys.has(key);
  }).slice(0, 8);

  const sorted = [...filtered].sort((a, b) => {
    // Upcoming/Active matches: status === 0 && kickoffTime > Date.now()
    const aUpcoming = a.status === 0 && a.kickoffTime > Date.now();
    const bUpcoming = b.status === 0 && b.kickoffTime > Date.now();
    if (aUpcoming && !bUpcoming) return -1;
    if (!aUpcoming && bUpcoming) return 1;
    if (aUpcoming && bUpcoming) return a.kickoffTime - b.kickoffTime; // Ascending: soonest matches first

    // Live matches: status === 0 && kickoffTime <= Date.now()
    const aLive = a.status === 0 && a.kickoffTime <= Date.now();
    const bLive = b.status === 0 && b.kickoffTime <= Date.now();
    if (aLive && !bLive) return -1;
    if (!aLive && bLive) return 1;

    // Others (Locked, Resolved, Cancelled): descending kickoff time (most recent first)
    return b.kickoffTime - a.kickoffTime;
  });

  const sortedChamps = [...(leaderboardRows || [])].sort((a, b) => {
    if (champsSort === "winRate") return b.winRate - a.winRate;
    if (champsSort === "bets") return b.bets - a.bets;
    return b.profit - a.profit;
  });

  const displayChamps = sortedChamps.slice(0, 5);
  const totalPool = matches ? matches.reduce((a, m) => a + m.totalPool, 0) : 0;

  return (
    <div className="space-y-8">
      {/* Stitch Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-container p-8 md:p-12 flex flex-col md:flex-row items-center justify-between text-white shadow-xl">
        <div className="z-10 md:w-1/2 space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1 bg-white/20 rounded-full backdrop-blur-sm">
            <span className="pulse-live w-2.5 h-2.5 bg-red-400 rounded-full" />
            <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">Live &amp; On-Chain</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight" style={{ fontFamily: "var(--font-serif)" }}>
            Predict the Future, <br/><span className="text-blue-200">Win the Rewards.</span>
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-md">
            The most high-octane decentralized prediction market. Gamified analytics, real-time odds, and instant payouts.
          </p>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <button 
              onClick={() => {
                document.getElementById("markets-list")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-3.5 bg-white text-primary rounded-xl font-bold text-sm shadow-xl hover:scale-105 transition-transform active:scale-95"
              style={{ border: "none", cursor: "pointer" }}
            >
              Explore Markets
            </button>
            <button 
              onClick={() => setFooterModal("whitepaper")}
              className="px-6 py-3.5 bg-transparent border border-white/30 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition-all active:scale-95"
              style={{ cursor: "pointer" }}
            >
              How it Works
            </button>
          </div>
        </div>
        <div className="md:w-1/2 mt-8 md:mt-0 relative flex justify-center">
          <div className="relative z-10 w-full aspect-square max-w-[340px] md:max-w-[380px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <img 
              className="w-full h-full object-cover" 
              alt="Futuristic Crystal Ball" 
              src="/hero_crystal_ball.png" 
            />
          </div>
          {/* Decorative glows */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-300 rounded-full blur-3xl opacity-30" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary rounded-full blur-3xl opacity-40" />
        </div>
      </section>

      {/* Bento Stats Grid */}
      {(() => {
        const activeTeams = [];
        if (matches) {
          for (const m of matches) {
            if (m.status === 0) {
              if (m.homeTeam && activeTeams.length < 3 && !activeTeams.some(t => t.name === m.homeTeam)) {
                activeTeams.push({
                  name: m.homeTeam,
                  img: m.homeImage || getCryptoLogo(m.homeTeam) || m.homeCrest,
                  flag: m.homeFlag
                });
              }
              if (m.awayTeam && activeTeams.length < 3 && !activeTeams.some(t => t.name === m.awayTeam)) {
                activeTeams.push({
                  name: m.awayTeam,
                  img: m.awayImage || getCryptoLogo(m.awayTeam) || m.awayCrest,
                  flag: m.awayFlag
                });
              }
            }
            if (activeTeams.length >= 3) break;
          }
        }
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Global Vol */}
            <div className="p-6 rounded-2xl gamified-card flex flex-col justify-between" style={{ background: "var(--surface-container-lowest)", border: "1px solid var(--border)" }}>
              <div>
                <span className="text-secondary font-mono uppercase text-[11px] tracking-widest font-semibold" style={{ color: "var(--text-secondary)" }}>Global Vol</span>
                <h3 className="text-3xl font-bold text-primary mt-1" style={{ color: "var(--primary)", fontFamily: "var(--font-mono)" }}>
                  <AnimatedStat value={totalPool} prefix="$" />
                </h3>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                <Activity size={14} style={{ color: "var(--green)" }} />
                <span>Real-time pool data</span>
              </div>
            </div>

            {/* Card 2: Active Markets */}
            <div className="p-6 rounded-2xl gamified-card flex flex-col justify-between" style={{ background: "var(--surface-container-lowest)", border: "1px solid var(--border)" }}>
              <div>
                <span className="text-secondary font-mono uppercase text-[11px] tracking-widest font-semibold" style={{ color: "var(--text-secondary)" }}>Active Markets</span>
                <h3 className="text-3xl font-bold text-tertiary mt-1" style={{ color: "var(--purple)", fontFamily: "var(--font-mono)" }}>
                  <NumberTicker value={matches ? matches.filter(m => m.status === 0).length : 0} />
                </h3>
              </div>
              {/* Dynamic Avatars from Active Markets */}
              <div className="mt-4 flex -space-x-2 items-center">
                {activeTeams.map((team, idx) => {
                  const isToken = !!getCryptoLogo(team.name);
                  return (
                    <div key={idx} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-slate-900 overflow-hidden flex items-center justify-center relative shadow-sm" title={team.name} style={{ width: 32, height: 32 }}>
                      {team.img ? (
                        <img src={team.img} alt={team.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[14px]">{team.flag || "⚽"}</span>
                      )}
                    </div>
                  );
                })}
                {matches && matches.filter(m => m.status === 0).length > activeTeams.length && (
                  <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-primary text-white text-[10px] flex items-center justify-center font-bold shadow-sm" style={{ width: 32, height: 32 }}>
                    +{matches.filter(m => m.status === 0).length - activeTeams.length}
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Rank Progress */}
            <RankProgressBentoCard walletAddress={wallet.address} userBetsState={userBetsState} setTab={setTab} />
          </div>
        );
      })()}

      <div style={{ height: 16 }} />

      {/* Controls */}
      <div id="markets-list" className="font-sans" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, var(--primary), var(--purple))",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", boxShadow: "0 4px 16px var(--primary-glow)"
          }}>
            <Flame size={20} />
          </div>
          <div>
            <h2 className="font-serif" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
              Featured Markets
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "2px 0 0 0", fontWeight: 500 }}>
              Hottest predictions in the ecosystem right now.
            </p>
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input placeholder="Search markets…" value={search} onChange={e => setSearch(e.target.value)}
            className="input font-sans" style={{ paddingLeft: 36, width: 240, fontSize: 13, height: 42, borderRadius: 8 }} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card skeleton-card" style={{ padding: 0, overflow: "hidden", minHeight: 280 }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                <div className="skeleton-pulse" style={{ width: 80, height: 20, borderRadius: 99 }} />
                <div className="skeleton-pulse" style={{ width: 40, height: 20, borderRadius: 99 }} />
              </div>
              <div style={{ padding: "26px 20px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flex: 1 }}>
                  <div className="skeleton-pulse" style={{ width: 70, height: 70, borderRadius: "50%" }} />
                  <div className="skeleton-pulse" style={{ width: 60, height: 14, borderRadius: 6 }} />
                </div>
                <div className="skeleton-pulse" style={{ width: 30, height: 22, borderRadius: 6 }} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flex: 1 }}>
                  <div className="skeleton-pulse" style={{ width: 70, height: 70, borderRadius: "50%" }} />
                  <div className="skeleton-pulse" style={{ width: 60, height: 14, borderRadius: 6 }} />
                </div>
              </div>
              <div style={{ padding: "0 20px 16px", display: "flex", gap: 8 }}>
                {[1, 2, 3].map(j => <div key={j} className="skeleton-pulse" style={{ flex: 1, height: 56, borderRadius: 10 }} />)}
              </div>
              <div style={{ padding: "0 20px 20px" }}>
                <div className="skeleton-pulse" style={{ width: "100%", height: 6, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 && !previewFixtures.length ? (
        <div className="empty-state arc-card">
          <div className="empty-state-icon"><CircleDot size={22} /></div>
          <p className="empty-state-title">No markets open yet</p>
          <p className="empty-state-desc">Deploy contracts on Arc Testnet or browse upcoming fixtures below to see live sports data.</p>
        </div>
      ) : (
        <>
          {filtered.length > 0 && (
            <>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                Bet on-chain
              </h3>
              <div className="match-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 28 }}>
                {sorted.map(m => (
                  <MatchCard 
                    key={m.index} 
                    match={m} 
                    onBet={(match, outcome) => {
                      setSelectedMatch(match);
                      setInitialOutcome(outcome);
                    }}
                    onSelect={(match) => {
                      setSelectedMatch(match);
                      setInitialOutcome(1);
                    }}
                  />
                ))}
              </div>
            </>
          )}
          {(previewFixtures.length > 0 || fixturesLoading) && (
            <>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                Upcoming fixtures (live sports data)
              </h3>
              {fixturesLoading ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading fixtures…</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                  {previewFixtures.map((f) => (
                    <FixturePreviewCard key={f.externalId} fixture={f} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Leaderboard Preview Section */}
          <section className="mt-12 p-6 md:p-8 rounded-3xl border border-outline-variant shadow-xl" style={{ background: "var(--surface-container-lowest)", borderColor: "var(--border)" }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 16, marginBottom: 28 }} className="md:flex-row md:items-center">
              <div>
                <h2 className="font-serif" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>Weekly Champions</h2>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0 0" }}>The most profitable predictors on ArcMarkets right now.</p>
              </div>
              <div style={{ display: "flex", gap: 8, padding: 4, background: "var(--surface-container)", borderRadius: 12 }} className="w-fit">
                {[
                  { id: "profit", label: "Profit" },
                  { id: "winRate", label: "Win Rate" },
                  { id: "bets", label: "Predictions" }
                ].map(opt => {
                  const isActive = champsSort === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setChampsSort(opt.id)}
                      className={`px-4 py-1.5 rounded-lg shadow-sm font-bold text-xs transition-all ${
                        isActive 
                          ? "bg-white text-primary dark:bg-slate-800 dark:text-white" 
                          : "text-secondary hover:text-primary"
                      }`}
                      style={{ border: "none", cursor: "pointer", background: isActive ? undefined : "none" }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                    <th style={{ paddingBottom: 12, fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>Rank</th>
                    <th style={{ paddingBottom: 12, fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>User</th>
                    <th style={{ paddingBottom: 12, fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>Win Rate</th>
                    <th style={{ paddingBottom: 12, fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700, textAlign: "right" }}>Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant" style={{ borderColor: "var(--border)" }}>
                  {leaderboardLoading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                        <RefreshCw size={18} className="animate-spin inline-block mr-2" />
                        Loading champions...
                      </td>
                    </tr>
                  ) : displayChamps.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                        No predictions recorded on-chain yet.
                      </td>
                    </tr>
                  ) : (
                    displayChamps.map(u => (
                      <tr key={u.addr} className="hover:bg-primary/5 transition-colors">
                        <td style={{ padding: "16px 0" }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: u.rank <= 3 ? "transparent" : "var(--surface-container)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--text-primary)",
                            fontWeight: 900,
                            fontSize: u.rank <= 3 ? 18 : 13
                          }}>
                            {u.rank === 1 ? "🥇" : u.rank === 2 ? "🥈" : u.rank === 3 ? "🥉" : u.rank}
                          </div>
                        </td>
                        <td style={{ padding: "16px 0" }}>
                          <a
                            href={`${ACTIVE_NETWORK.explorerUrl}/address/${u.addr}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}
                          >
                            <div style={{
                              width: 40,
                              height: 40,
                              borderRadius: 12,
                              background: u.rank === 1 ? "rgba(251, 191, 36, 0.15)" : u.rank === 2 ? "rgba(203, 213, 225, 0.15)" : "rgba(205, 127, 50, 0.15)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: u.rank === 1 ? "#fbbf24" : u.rank === 2 ? "#cbd5e1" : "#cd7f32"
                            }}>
                              <Trophy size={16} />
                            </div>
                            <div>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                                {u.shortAddr}
                              </p>
                              <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--text-muted)" }}>
                                Vol ${fmt(u.volume, 0)} USDC
                              </p>
                            </div>
                          </a>
                        </td>
                        <td style={{ padding: "16px 0" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontWeight: 750, fontSize: 13, color: "var(--text-primary)" }}>{u.winRate}%</span>
                            <div style={{ width: 128, height: 6, background: "var(--surface-container)", borderRadius: 99, overflow: "hidden" }}>
                              <div style={{ height: "100%", background: "var(--green)", width: `${u.winRate}%` }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "16px 0", textAlign: "right" }}>
                          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: u.profit >= 0 ? "var(--green)" : "var(--red)" }}>
                            {u.profit >= 0 ? "+" : ""}${fmt(u.profit, 2)}
                          </p>
                          <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--text-muted)" }}>
                            {u.bets} prediction{u.bets !== 1 ? "s" : ""}
                          </p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!leaderboardLoading && displayChamps.length > 0 && (
              <div style={{ marginTop: 24, textAlign: "center" }}>
                <button
                  onClick={() => setTab("leaderboard")}
                  className="btn-ghost"
                  style={{ fontSize: 12, gap: 5, padding: "8px 20px", display: "inline-flex", cursor: "pointer" }}
                >
                  View Full Leaderboard <ChevronRight size={13} />
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// ─── AI Agent Tab ─────────────────────────────────────────────────────────────
function AgentTab({ address, signer, matches, usdtBalance, refetchUsdt, onNotif, addNotif, theme, refetchBets }) {
  const [risk, setRisk] = useState("moderate");
  const [budget, setBudget] = useState("100");
  const [analysing, setAn] = useState(false);
  const [analyses, setAns] = useState([]);
  const [runningCycle, setRunningCycle] = useState(false);
  const logRef = useRef(null);

  const {
    isAuthorized,
    remainingBudget,
    loading: agentLoading,
    error: agentError,
    txStatus,
    authorizeAgent,
    topUpBudget,
    revokeAgent,
    refetch: refetchAgent,
  } = useAgent(address, signer);

  const [logs, setLogs] = useState([
    { text: "[System] ArcMarkets Agent v2.1 initialized.", col: "var(--terminal-system)" },
    { text: "[Auth] Connected to Arc Testnet Oracle nodes.", col: "var(--terminal-system)" },
    { text: "[Scan] Monitoring active World Cup markets…", col: "var(--terminal-system)" },
    { text: "> Odds engine ready. EV model loaded.", col: "var(--terminal-info)" },
    { text: "> Kelly criterion sizing: ACTIVE", col: "var(--terminal-primary)" },
    { text: "[Success] Agent standing by for authorization.", col: "var(--terminal-success)" },
  ]);

  useEffect(() => {
    if (isAuthorized) {
      addLog(`[Active] Agent is authorized on-chain. Remaining budget: $${remainingBudget} USDC.`, "var(--terminal-success)");
    } else {
      addLog("[Standby] Agent unauthorized on-chain. Ready to accept delegation.", "var(--terminal-system)");
    }
  }, [isAuthorized, remainingBudget]);

  const RISK = {
    conservative: { color: "var(--green)", bg: "var(--success-bg)", border: "var(--success-border)", icon: <Shield size={13} />, desc: "Min 70% confidence · Max 5% per bet" },
    moderate: { color: "var(--purple)", bg: "var(--purple-alpha-bg)", border: "var(--purple-alpha-border)", icon: <Target size={13} />, desc: "Min 55% confidence · Max 10% per bet" },
    aggressive: { color: "var(--red)", bg: "var(--danger-bg)", border: "var(--danger-border)", icon: <Flame size={13} />, desc: "Min 40% confidence · Max 20% per bet" },
  };

  const addLog = (text, col, txHash) => {
    setLogs(p => [...p, { text, col, txHash }]);
  };

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const analyze = async () => {
    if (!matches || matches.length === 0) {
      onNotif("No matches available to analyze.", "error");
      return;
    }
    setAn(true); addLog("[Scan] Running EV analysis across all markets…", "var(--terminal-info)");
    try {
      const currentBudget = isAuthorized ? remainingBudget : (parseFloat(budget) || 0);
      const results = await Promise.all(matches.map(async m => {
        const r = await fetch("/api/agent-analysis", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchIndex: m.index,
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            riskLevel: risk,
            budget: currentBudget,
            contractOdds: {
              home: Math.round(m.odds.home * 10000),
              draw: Math.round(m.odds.draw * 10000),
              away: Math.round(m.odds.away * 10000)
            }
          })
        });
        const d = await r.json();
        return { match: m, ...(d.analysis || {}) };
      }));
      setAns(results);
      const confThreshold = risk === "conservative" ? 70 : risk === "moderate" ? 55 : 40;
      const recCount = results.filter(r => r.recommendation?.confidence >= confThreshold).length;
      addLog(`[Done] Analysis complete. ${recCount} bets recommended.`, "var(--terminal-success)");
    } catch (e) {
      onNotif("Analysis failed: " + e.message, "error");
      addLog("[Error] Analysis failed.", "var(--terminal-danger)");
    }
    setAn(false);
  };

  const executeManualCycle = async () => {
    if (!isAuthorized) {
      onNotif("Authorize the agent first before running a cycle!", "error");
      return;
    }
    addLog("[Trigger] Initiating manual agent cycle run on Arc Testnet...", "var(--terminal-primary)");
    setRunningCycle(true);
    try {
      const res = await fetch("/api/agent-run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": process.env.NEXT_PUBLIC_CRON_SECRET || "some_random_string",
        },
        body: JSON.stringify({
          users: [{ address, riskLevel: risk, budget: remainingBudget }],
        }),
      });
      const data = await res.json();
      if (data.success) {
        const queue = [];

        // Initial agent status checks in log
        queue.push({ text: "[Scan] Starting analysis of active prediction markets...", col: "var(--terminal-info)" });

        if (data.actions && data.actions.length > 0) {
          data.actions.forEach(act => {
            if (act.type === "BET_PLACED") {
              const outcomeLabel = { 1: "Home Win", 2: "Draw", 3: "Away Win" }[act.outcome] || "Unknown";
              queue.push({
                text: `[Analysis] Match ${act.matchIndex}: High EV detected. Confidence ${act.confidence || 75}%.`,
                col: "var(--terminal-info)"
              });
              queue.push({
                text: `[Bet Placed] Placing $${act.amount} USDC on ${outcomeLabel}...`,
                col: "var(--terminal-success)"
              });
              queue.push({
                text: `[Success] TX Confirmed: ${act.txHash.slice(0, 12)}...`,
                col: "var(--terminal-success)",
                txHash: act.txHash,
                onPrint: () => {
                  addNotif(
                    "Agent Bet Placed",
                    `AI Betting Agent autonomously placed $${act.amount} USDC on ${outcomeLabel} for match index ${act.matchIndex}`,
                    act.txHash
                  );
                }
              });
            } else if (act.type === "SKIPPED") {
              queue.push({
                text: `[Analysis] Match ${act.matchIndex}: Evaluating odds...`,
                col: "var(--terminal-info)"
              });
              queue.push({
                text: `[Skipped] Match ${act.matchIndex}: ${act.reasoning}`,
                col: "var(--terminal-system)"
              });
            } else if (act.type === "ERROR") {
              queue.push({
                text: `[Error] Match ${act.matchIndex}: ${act.reasoning}`,
                col: "var(--terminal-danger)"
              });
            }
          });
        } else {
          queue.push({ text: "[Cycle] No high EV opportunities found. Skipping trade.", col: "var(--terminal-system)" });
        }

        queue.push({
          text: `[Summary] Bets Placed: ${data.summary.betsPlaced}, Skipped: ${data.summary.skipped}, Errors: ${data.summary.errors}`,
          col: "var(--terminal-success)"
        });

        queue.push({
          text: "[Success] Agent cycle execution completed successfully.",
          col: "var(--terminal-success)",
          onPrint: () => {
            addNotif(
              "Agent Run Completed",
              `Agent cycle completed. Placed: ${data.summary.betsPlaced}, Skipped: ${data.summary.skipped}`,
              null
            );
            refetchAgent();
            refetchUsdt();
            if (refetchBets) refetchBets();
            onNotif("Agent cycle execution completed successfully!", "success");
          }
        });

        // Run the log sequence simulation
        let logIndex = 0;
        const printNextLog = () => {
          if (logIndex < queue.length) {
            const item = queue[logIndex];
            addLog(item.text, item.col, item.txHash);
            if (item.onPrint) item.onPrint();
            logIndex++;

            // Adaptive styling delay for premium feeling
            let delay = 600;
            if (item.text.includes("[Scan]") || item.text.includes("[Analysis]") || item.text.includes("Evaluating")) {
              delay = 500;
            } else if (item.text.includes("[Skipped]")) {
              delay = 400;
            } else if (item.text.includes("[Bet Placed]")) {
              delay = 900;
            } else if (item.text.includes("TX Confirmed")) {
              delay = 1400; // Simulated blockchain confirmation wait time
            }

            setTimeout(printNextLog, delay);
          } else {
            setRunningCycle(false);
          }
        };
        printNextLog();

      } else {
        addLog(`[Error] Agent cycle failed: ${data.error}`, "var(--terminal-danger)");
        onNotif(`Agent cycle failed: ${data.error}`, "error");
        setRunningCycle(false);
      }
    } catch (e) {
      addLog(`[Error] Network error during execution: ${e.message}`, "var(--terminal-danger)");
      onNotif("Network error during agent execution.", "error");
      setRunningCycle(false);
    }
  };

  return (
    <div className="agent-tab-container font-sans">

      {/* ── Left: Config panel ── */}
      <div className="card" style={{
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        minHeight: 620,
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "linear-gradient(135deg, var(--primary-alpha-bg), var(--purple-alpha-bg))",
                border: "1px solid var(--primary-alpha-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: theme === "dark" ? "0 0 24px rgba(0,212,255,0.18)" : "none",
                position: "relative", flexShrink: 0
              }}>
                <Bot size={22} style={{ color: "var(--primary)" }} />
                {isAuthorized && <div style={{ position: "absolute", inset: -2, borderRadius: 14, border: "2px solid var(--primary-alpha-border)", animation: "pulse-glow 2s infinite" }} />}
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.1, margin: 0 }}>AI Betting Agent</h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, marginTop: 3 }}>Autonomous execution · Arc Testnet Mainnet</p>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div style={{
              padding: "4px 10px", borderRadius: 20,
              background: isAuthorized ? "var(--success-bg)" : "var(--border-bright)",
              border: `1px solid ${isAuthorized ? "var(--success-border)" : "var(--border)"}`,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: isAuthorized ? "var(--success-text)" : "var(--dot-draw)" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: isAuthorized ? "var(--success-text)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{isAuthorized ? "Active" : "Standby"}</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border)", marginBottom: 28 }} />

        {agentError && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--danger-text)", fontSize: 13, marginBottom: 18, padding: "8px 12px", background: "var(--danger-bg)", borderRadius: 7, border: "1px solid var(--danger-border)" }}>
            <AlertCircle size={14} />{agentError}
          </div>
        )}

        {/* Risk Profile */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Risk Profile</span>
            <span style={{ fontSize: 11, color: RISK[risk].color, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              {RISK[risk].icon} {risk.charAt(0).toUpperCase() + risk.slice(1)}
            </span>
          </div>
          <div className="risk-profile-grid">
            {["conservative", "moderate", "aggressive"].map(r => {
              const cfg = RISK[r];
              const sel = risk === r;
              return (
                <button key={r} onClick={() => setRisk(r)} style={{
                  padding: "14px 8px", borderRadius: 10, cursor: "pointer",
                  border: sel ? `1px solid ${cfg.border}` : "1px solid var(--border)",
                  background: sel ? cfg.bg : "var(--card-header-bg)",
                  textAlign: "center", transition: "all 0.2s",
                  boxShadow: sel ? `0 0 20px ${cfg.bg}, inset 0 1px 0 ${cfg.border}` : "none"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 5, color: sel ? cfg.color : "var(--text-muted)" }}>
                    {cfg.icon}
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: "capitalize" }}>{r}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.3 }}>
                    {r === "conservative" ? "Low yield" : r === "moderate" ? "Balanced" : "High variance"}
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{
            marginTop: 10, fontSize: 11, color: RISK[risk].color,
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 12px",
            background: RISK[risk].bg,
            borderRadius: 7, border: `1px solid ${RISK[risk].border}`
          }}>
            {RISK[risk].icon} <span>{RISK[risk].desc}</span>
          </div>
        </div>

        {/* Escrow Budget */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Escrow Budget</span>
            {!isAuthorized && (
              <button onClick={() => setBudget(usdtBalance.toString())} style={{
                fontSize: 11, color: "var(--primary)", background: "var(--primary-alpha-bg)",
                border: "1px solid var(--primary-alpha-border)", cursor: "pointer",
                fontWeight: 700, padding: "3px 10px", borderRadius: 5, letterSpacing: "0.04em"
              }}>MAX</button>
            )}
          </div>
          {isAuthorized ? (
            <div style={{
              background: "var(--primary-alpha-bg)", border: "1px solid var(--primary-alpha-border)",
              borderRadius: 10, padding: "16px 20px"
            }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Authorized Escrow</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmt(remainingBudget)} <span style={{ fontSize: 14 }}>USDC</span>
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Agent authorized</span>
              </div>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <Wallet size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input type="number" value={budget} min={0.01} step={0.01} onChange={e => setBudget(e.target.value)}
                className="input font-mono" style={{ paddingLeft: 36, paddingRight: 60, height: 46, fontSize: 15 }} />
              <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: "var(--primary)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>USDC</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <Coins size={11} style={{ color: "var(--text-muted)" }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Available Balance: <span style={{ color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(usdtBalance)} USDC</span></span>
          </div>

          {isAuthorized && (
            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <input
                type="number"
                placeholder="Top up amount"
                id="topup-amount-input"
                className="input"
                style={{ height: 38, fontSize: 13, flex: 1 }}
              />
              <button
                className="btn-shimmer"
                onClick={async () => {
                  const el = document.getElementById("topup-amount-input");
                  const val = parseFloat(el?.value || "0");
                  if (val > 0) {
                    const result = await topUpBudget(val);
                    if (result && result.success) {
                      addNotif(
                        "Budget Topped Up",
                        `Added $${val} USDC to AI Betting Agent's budget`,
                        result.txHash
                      );
                      onNotif(
                        <span>
                          Topped up agent budget by ${val} USDC!{" "}
                          <a
                            href={`${ACTIVE_NETWORK.explorerUrl}/tx/${result.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--primary)", textDecoration: "underline", marginLeft: 4 }}
                          >
                            Verify
                          </a>
                        </span>,
                        "success"
                      );
                      if (el) el.value = "";
                      refetchUsdt();
                    } else {
                      onNotif("Top up failed", "error");
                    }
                  } else {
                    onNotif("Enter a valid amount", "error");
                  }
                }}
                style={{ padding: "0 16px", height: 38, borderRadius: 8, fontSize: 12, cursor: "pointer" }}
                disabled={txStatus === "approving" || txStatus === "authorizing"}
              >
                {txStatus === "approving" && "Approving..."}
                {txStatus === "authorizing" && "Topping up..."}
                {txStatus !== "approving" && txStatus !== "authorizing" && "Top Up"}
              </button>
            </div>
          )}
        </div>

        {/* Analysis preview — only when populated */}
        {analyses.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Agent Analysis Preview</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {analyses.map((a, i) => a?.recommendation && (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  background: "var(--card-header-bg)", border: "1px solid var(--border)",
                  borderRadius: 8
                }}>
                  <span style={{ fontSize: 18 }}>{a.match.homeFlag}{a.match.awayFlag}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{a.match.homeTeam} vs {a.match.awayTeam}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.recommendation.reasoning?.slice(0, 72)}…</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {a.recommendation.confidence >= (risk === "conservative" ? 70 : risk === "moderate" ? 55 : 40) ? (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", fontFamily: "'JetBrains Mono', monospace" }}>${a.recommendation.suggestedAmount}</div>
                        <div style={{ fontSize: 10, color: "var(--green)" }}>{a.recommendation.confidence}% conf</div>
                      </>
                    ) : (
                      <span className="badge" style={{ background: "var(--border-bright)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>SKIP</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spacer pushes buttons to bottom */}
        <div style={{ flex: 1 }} />

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border)", marginBottom: 24 }} />

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
          <button className="btn-ghost" onClick={analyze} disabled={analysing}
            style={{ flex: 1, height: 46, borderRadius: 10, justifyContent: "center", gap: 8 }}>
            {analysing
              ? <><RefreshCw size={14} className="animate-spin" />Analyzing…</>
              : <><BarChart3 size={14} />Preview Analysis</>}
          </button>
          {isAuthorized ? (
            <button
              className="btn-ghost"
              onClick={async () => {
                const result = await revokeAgent();
                if (result && result.success) {
                  addNotif(
                    "Agent Revoked",
                    "Revoked authorization and escrow budget for the AI Betting Agent",
                    result.txHash
                  );
                  onNotif(
                    <span>
                      Agent authorization revoked!{" "}
                      <a
                        href={`${ACTIVE_NETWORK.explorerUrl}/tx/${result.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--primary)", textDecoration: "underline", marginLeft: 4 }}
                      >
                        Verify
                      </a>
                    </span>,
                    "success"
                  );
                  refetchUsdt();
                } else {
                  onNotif("Revoke failed", "error");
                }
              }}
              style={{
                flex: 1.5, height: 46, borderRadius: 10, gap: 8,
                border: "1px solid var(--danger-border)",
                color: "var(--danger-text)",
                background: "var(--danger-bg)",
                cursor: "pointer"
              }}
              disabled={txStatus === "revoking"}
            >
              {txStatus === "revoking" ? <><RefreshCw size={14} className="animate-spin" /> Revoking…</> : <><Lock size={15} /> Revoke Agent</>}
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={async () => {
                if (!address) { onNotif("Connect your wallet first!", "error"); return; }
                const numericBudget = parseFloat(budget) || 0;
                if (numericBudget <= 0) { onNotif("Enter a valid budget amount", "error"); return; }
                const result = await authorizeAgent(numericBudget);
                if (result && result.success) {
                  addNotif(
                    "Agent Authorized",
                    `Authorized AI Betting Agent with a budget of $${budget} USDC`,
                    result.txHash
                  );
                  onNotif(
                    <span>
                      Agent active with ${budget} USDC!{" "}
                      <a
                        href={`${ACTIVE_NETWORK.explorerUrl}/tx/${result.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--primary)", textDecoration: "underline", marginLeft: 4 }}
                      >
                        Verify
                      </a>
                    </span>,
                    "success"
                  );
                  refetchUsdt();
                } else {
                  onNotif("Authorization failed", "error");
                }
              }}
              style={{
                flex: 2, height: 46, borderRadius: 10, gap: 8,
              }}
              disabled={txStatus === "approving" || txStatus === "authorizing"}
            >
              {txStatus === "approving" && <><RefreshCw size={14} className="animate-spin" /> Approving USDC…</>}
              {txStatus === "authorizing" && <><RefreshCw size={14} className="animate-spin" /> Authorizing…</>}
              {txStatus !== "approving" && txStatus !== "authorizing" && <><Zap size={15} />Authorize Agent & Escrow</>}
            </button>
          )}
        </div>
      </div>

      {/* ── Right: Log panel ── */}
      <div className="card" style={{
        padding: "32px 28px 28px",
        display: "flex",
        flexDirection: "column",
        minHeight: 620,
      }}>
        {/* Log header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "var(--purple-alpha-bg)",
            border: "1px solid var(--purple-alpha-border)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Activity size={15} style={{ color: "var(--purple)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, fontWeight: 400, letterSpacing: "-0.01em" }}>Live Execution Log</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2, fontWeight: 500 }}>Real-time agent activity stream</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isAuthorized && (
              <button
                className="btn-shimmer"
                onClick={executeManualCycle}
                disabled={runningCycle}
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "var(--primary-alpha-bg)",
                  border: "1px solid var(--primary-alpha-border)",
                  color: "var(--primary)",
                  cursor: "pointer",
                }}
              >
                {runningCycle ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} />}
                {runningCycle ? "Running..." : "Run Cycle"}
              </button>
            )}
            <div style={{
              display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20,
              background: isAuthorized ? "var(--success-bg)" : "var(--border)",
              border: `1px solid ${isAuthorized ? "var(--success-border)" : "var(--border)"}`
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: isAuthorized ? "var(--success-text)" : "var(--dot-draw)",
                boxShadow: isAuthorized ? "0 0 8px var(--success-text)" : "none"
              }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: isAuthorized ? "var(--success-text)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {isAuthorized ? "Active" : "Idle"}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border-bright)", marginBottom: 20 }} />

        {/* Terminal — flex:1 fills remaining height */}
        <div ref={logRef} className="terminal" style={{ flex: 1, minHeight: 0, maxHeight: 440, overflowY: "auto" }}>
          {logs.map((l, i) => (
            <div key={i} className="terminal-line" style={{ color: l.col || "var(--text-secondary)", animationDelay: `${i * 0.04}s` }}>
              <span style={{ color: "var(--text-muted)", marginRight: 8, userSelect: "none", fontSize: 10 }}>›</span>
              {l.text}
              {l.txHash && (
                <a
                  href={`${ACTIVE_NETWORK.explorerUrl}/tx/${l.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--primary)",
                    marginLeft: 8,
                    textDecoration: "underline",
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: "sans-serif"
                  }}
                >
                  [Verify On-Chain]
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Footer bar */}
        <div style={{ height: 1, background: "var(--border)", marginTop: 20, marginBottom: 16 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Globe size={11} style={{ color: "var(--text-muted)" }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Arc Testnet Mainnet</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>Latency: <span style={{ color: "var(--green)" }}>12ms</span></span>
            <div style={{ width: 1, height: 12, background: "var(--border)" }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{logs.length} events</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Portfolio Tab ────────────────────────────────────────────────────────────
function PortfolioTab({ address, signer, refetchUsdt, onNotif, addNotif, onGoLeaderboard, userBetsState }) {
  const { bets, loading, totalPnl, totalBetAmount, pendingBets, claimableBets, settledBets, refetch: refetchBets } = userBetsState;
  const { claimWinnings, status: claimStatus } = useBetting(signer);
  const [activeSubTab, setActiveSubTab] = useState("all");

  const claimable = claimableBets.reduce((acc, b) => acc + b.potentialPayout, 0);

  const filteredBets = (() => {
    if (activeSubTab === "active") return pendingBets || [];
    if (activeSubTab === "claimable") return claimableBets || [];
    if (activeSubTab === "history") return (settledBets || []).filter(b => !b.canClaim);
    return bets || [];
  })();

  if (!address) {
    return (
      <div className="card" style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Wallet size={32} style={{ opacity: 0.4, color: "var(--primary)" }} />
        <div>Connect your wallet to view your betting history and claim rewards.</div>
      </div>
    );
  }

  return (
    <div className="portfolio-grid font-sans">
      <section>
        {/* Stats */}
        <div className="portfolio-stats-container">
          {[
            { label: "Total Wagered", value: `$${fmt(totalBetAmount)}`, icon: <Coins size={16} />, color: "var(--primary)" },
            { label: "Profit / Loss", value: `${totalPnl >= 0 ? "+" : ""}$${fmt(totalPnl)}`, icon: <TrendingUp size={16} />, color: totalPnl >= 0 ? "var(--green)" : "var(--red)" },
            { label: "Claimable", value: `$${fmt(claimable)}`, icon: <Unlock size={16} />, color: "var(--gold)" },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderTop: "1px solid var(--card-border-top)",
              borderRadius: 12,
              padding: "20px 24px",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              textAlign: "left"
            }}>
              <div style={{
                position: "absolute",
                top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, ${s.color}, transparent)`
              }} />
              <div className="font-sans" style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                marginBottom: 10,
                color: "var(--text-secondary)"
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</span>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <div className="font-mono" style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.8, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 16 }}>
          <h2 className="font-serif" style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.01em", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Wallet size={18} style={{ color: "var(--primary)" }} /> My Bets
          </h2>

          {/* Sub-tab pill selectors */}
          <div style={{
            display: "flex",
            gap: 4,
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border)",
            padding: 3,
            borderRadius: 10,
          }}>
            {[
              { id: "all", label: "All", count: (bets || []).length },
              { id: "active", label: "Active & Live", count: (pendingBets || []).length },
              { id: "claimable", label: "Claimable", count: (claimableBets || []).length, highlight: (claimableBets || []).length > 0 },
              { id: "history", label: "History", count: (settledBets || []).filter(b => !b.canClaim).length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className="font-sans"
                style={{
                  padding: "6px 12px",
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: activeSubTab === tab.id ? 700 : 500,
                  color: activeSubTab === tab.id 
                    ? "var(--text-primary)" 
                    : tab.highlight 
                      ? "var(--gold)" 
                      : "var(--text-secondary)",
                  background: activeSubTab === tab.id 
                    ? "rgba(255, 255, 255, 0.08)" 
                    : "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
                <span style={{
                  fontSize: 10,
                  padding: "1px 5px",
                  borderRadius: 99,
                  background: activeSubTab === tab.id 
                    ? "var(--primary)" 
                    : tab.highlight 
                      ? "rgba(212, 175, 55, 0.15)" 
                      : "rgba(255, 255, 255, 0.05)",
                  color: activeSubTab === tab.id 
                    ? "#000" 
                    : tab.highlight 
                      ? "var(--gold)" 
                      : "var(--text-muted)",
                  fontWeight: 700
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: 150, color: "var(--primary)", gap: 8 }}>
              <RefreshCw size={18} className="animate-spin" />
              <span style={{ fontSize: 12, fontWeight: 500 }}>Fetching bets...</span>
            </div>
          ) : filteredBets.length === 0 ? (
            <div className="card" style={{ padding: "48px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--primary-alpha-bg)", border: "1px solid var(--primary-alpha-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CircleDot size={24} style={{ opacity: 0.6, color: "var(--primary)" }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                  {activeSubTab === "active" && "No active or live bets"}
                  {activeSubTab === "claimable" && "No rewards to claim"}
                  {activeSubTab === "history" && "No settled history"}
                  {activeSubTab === "all" && "No bets placed yet"}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  {activeSubTab === "active" && "Your active/live prediction slips will appear here."}
                  {activeSubTab === "claimable" && "When match predictions end in your favor, claim your USDC wins here!"}
                  {activeSubTab === "history" && "Settled, lost, and fully claimed tickets are listed here."}
                  {activeSubTab === "all" && "Pick a match and make your first prediction to earn USDC."}
                </div>
              </div>
              {activeSubTab === "all" && (
                <a href="#" onClick={e => { e.preventDefault(); document.querySelector('[data-tab="matches"]')?.click(); }} style={{ textDecoration: "none" }}>
                  <button className="btn-primary" style={{ borderRadius: 10, marginTop: 4 }}>
                    <BarChart3 size={14} /> Browse Markets
                  </button>
                </a>
              )}
            </div>
          ) : (
            filteredBets.map(bet => {
              const estMultiplier = bet.amount > 0 ? (bet.potentialPayout / bet.amount).toFixed(2) : "0.00";
              
              // Determine card state visuals
              let cardBorderLeft = "4px solid rgba(255, 255, 255, 0.05)";
              let cardBoxShadow = "0 16px 40px rgba(0, 0, 0, 0.75)";
              let statusBadge = null;
              let payoutColor = "var(--text-primary)";
              let payoutLabel = "Est. Payout";
              let isClaimed = bet.claimed;
              let isWinner = bet.isWinner;
              let isLost = bet.matchStatus === 2 && !bet.isWinner;

              if (bet.canClaim) {
                // Claimable / Won but unclaimed
                cardBorderLeft = "4px solid var(--success-text)"; // Neon/emerald green
                cardBoxShadow = "0 16px 40px rgba(0, 0, 0, 0.75), inset 4px 0 10px var(--success-bg)";
                payoutColor = "var(--success-text)";
                payoutLabel = "Winnings";
                statusBadge = (
                  <span className="badge" style={{ gap: 5, padding: "4px 10px", background: "var(--success-bg)", border: "1px solid var(--success-border)", color: "var(--success-text)" }}>
                    <CheckCircle2 size={10} /> Won · Ready to Claim
                  </span>
                );
              } else if (isClaimed) {
                // Won and Claimed
                cardBorderLeft = "4px solid var(--gold)";
                cardBoxShadow = "0 16px 40px rgba(0, 0, 0, 0.75), inset 4px 0 10px rgba(212, 175, 55, 0.04)";
                payoutColor = "var(--gold)";
                payoutLabel = "Claimed Winnings";
                statusBadge = (
                  <span className="badge" style={{ gap: 5, padding: "4px 10px", background: "rgba(212, 175, 55, 0.08)", border: "1px solid rgba(212, 175, 55, 0.2)", color: "var(--gold)" }}>
                    <Unlock size={10} /> Claimed
                  </span>
                );
              } else if (isLost) {
                // Lost
                cardBorderLeft = "4px solid rgba(255, 255, 255, 0.05)";
                payoutColor = "var(--text-muted)";
                payoutLabel = "Potential Payout";
                statusBadge = (
                  <span className="badge" style={{ gap: 5, padding: "4px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    <AlertCircle size={10} style={{ opacity: 0.5 }} /> Settled (Lost)
                  </span>
                );
              } else if (bet.matchStatus === 0) {
                if (bet.kickoffTime > Date.now()) {
                  // Upcoming / Open
                  cardBorderLeft = "4px solid var(--primary)"; // Cyan
                  cardBoxShadow = "var(--card-shadow)";
                  statusBadge = (
                    <span className="badge badge-open" style={{ gap: 5, padding: "4px 10px" }}>
                      <Clock size={10} /> Upcoming
                    </span>
                  );
                } else {
                  // Live Now
                  cardBorderLeft = "4px solid #ff4757"; // Pulsing red
                  cardBoxShadow = "0 16px 40px rgba(0, 0, 0, 0.75), inset 4px 0 10px rgba(255, 71, 87, 0.08)";
                  statusBadge = (
                    <span className="badge badge-live" style={{ gap: 5, padding: "4px 10px" }}>
                      <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff4757", boxShadow: "0 0 8px #ff4757", animation: "pulse-glow 2s infinite" }} /> Live Now
                    </span>
                  );
                }
              } else if (bet.matchStatus === 1) {
                // Locked
                cardBorderLeft = "4px solid var(--border)";
                statusBadge = (
                  <span className="badge" style={{ gap: 5, padding: "4px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    <Lock size={10} /> Locked · Grading
                  </span>
                );
              } else if (bet.matchStatus === 3) {
                // Cancelled
                cardBorderLeft = "4px solid rgba(255, 255, 255, 0.1)";
                payoutColor = "var(--text-primary)";
                payoutLabel = "Refundable";
                statusBadge = (
                  <span className="badge" style={{ gap: 5, padding: "4px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    <AlertCircle size={10} /> Cancelled
                  </span>
                );
              }

              return (
                <div key={bet.betId} className="card" style={{ padding: "16px 20px", borderLeft: cardBorderLeft, boxShadow: cardBoxShadow }}>
                  <div className="font-sans" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    
                    {/* Teams Avatar Group */}
                    <div style={{ display: "flex", alignItems: "center", position: "relative", width: 44, height: 26, flexShrink: 0 }}>
                      <div style={{ position: "absolute", left: 0, zIndex: 2 }}>
                        {getCryptoLogo(bet.homeTeam) ? (
                          <img src={getCryptoLogo(bet.homeTeam)} alt="" style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid var(--bg-card)", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 18 }}>{TEAM_FLAGS[bet.homeTeam] || "🏴"}</span>
                        )}
                      </div>
                      <div style={{ position: "absolute", left: 16, zIndex: 1 }}>
                        {getCryptoLogo(bet.awayTeam) ? (
                          <img src={getCryptoLogo(bet.awayTeam)} alt="" style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid var(--bg-card)", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 18 }}>{TEAM_FLAGS[bet.awayTeam] || "🏴"}</span>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span>{bet.homeTeam} vs {bet.awayTeam}</span>
                        {statusBadge}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Prediction:</span>
                        <span className="text-gradient-primary-purple" style={{ fontSize: 12, fontWeight: 800 }}>
                          {bet.outcomeName}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>@ {estMultiplier}x</span>
                        {bet.isAgentBet && (
                          <span className="badge" style={{ gap: 3, padding: "2px 6px", background: "var(--purple-alpha-bg)", border: "1px solid var(--purple-alpha-border)", color: "var(--purple)", fontSize: 9.5 }}>
                            <Bot size={9} /> Agent
                          </span>
                        )}
                        
                        <div style={{ width: 1, height: 10, background: "var(--border)", margin: "0 4px" }} />
                        
                        {bet.txHash && (
                          <a
                            href={`${ACTIVE_NETWORK.explorerUrl}/tx/${bet.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              fontSize: 10.5,
                              color: "var(--text-secondary)",
                              textDecoration: "none",
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = "var(--primary)"}
                            onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
                          >
                            TX <ExternalLink size={9} />
                          </a>
                        )}
                        {bet.claimed && bet.claimTxHash && (
                          <>
                            <div style={{ width: 1, height: 10, background: "var(--border)", margin: "0 4px" }} />
                            <a
                              href={`${ACTIVE_NETWORK.explorerUrl}/tx/${bet.claimTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                fontSize: 10.5,
                                color: "var(--gold)",
                                textDecoration: "none",
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = "var(--primary)"}
                              onMouseLeave={e => e.currentTarget.style.color = "var(--gold)"}
                            >
                              Claim TX <ExternalLink size={9} />
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ textAlign: "right", paddingRight: 8, minWidth: 60 }}>
                      <div style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Wager</div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-primary)" }}>${fmt(bet.amount)}</div>
                    </div>

                    <div style={{ width: 1, height: 28, background: "var(--border)" }} />

                    {/* Payout */}
                    <div style={{ textAlign: "right", paddingLeft: 8, paddingRight: 12, minWidth: 80 }}>
                      <div style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>{payoutLabel}</div>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: payoutColor, fontFamily: "'JetBrains Mono', monospace" }}>${fmt(bet.potentialPayout)}</div>
                    </div>

                    {/* Action */}
                    {bet.canClaim ? (
                      <button
                        className="btn-shimmer"
                        onClick={async () => {
                          onNotif(`Claiming $${fmt(bet.potentialPayout)} USDC…`, "info");
                          const txHash = await claimWinnings(bet.betId);
                          if (txHash) {
                            addNotif(
                              "Reward Claimed",
                              `Claimed winnings of $${fmt(bet.potentialPayout)} USDC for match ${bet.homeTeam} vs ${bet.awayTeam}`,
                              txHash
                            );
                            onNotif(
                              <span>
                                Claimed successfully!{" "}
                                <a
                                  href={`${ACTIVE_NETWORK.explorerUrl}/tx/${txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: "var(--primary)", textDecoration: "underline", marginLeft: 4 }}
                                >
                                  Verify
                                </a>
                              </span>,
                              "success"
                            );
                            refetchBets();
                            refetchUsdt();
                          } else {
                            onNotif("Claim failed", "error");
                          }
                        }}
                        style={{ gap: 6, padding: "8px 16px", height: 36, fontSize: 12, borderRadius: 8 }}
                        disabled={claimStatus === "claiming"}
                      >
                        {claimStatus === "claiming" ? <RefreshCw size={12} className="animate-spin" /> : <ArrowUpRight size={12} />} Claim
                      </button>
                    ) : null}

                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <LeaderboardSidebar onViewAll={onGoLeaderboard} />
    </div>
  );
}

function RankProgressBentoCard({ walletAddress, userBetsState, setTab }) {
  const bets = userBetsState?.bets || [];
  const count = bets.length;

  let tier = "Bronze League Initiate";
  let percent = 15;
  let text = "850 XP until Silver";

  if (count === 1) {
    tier = "Silver League Challenger";
    percent = 40;
    text = "600 XP until Gold";
  } else if (count === 2) {
    tier = "Silver League Elite";
    percent = 60;
    text = "400 XP until Gold";
  } else if (count === 3) {
    tier = "Gold League Elite";
    percent = 72;
    text = "280 XP until Platinum";
  } else if (count >= 4) {
    tier = "Diamond Grandmaster";
    percent = 100;
    text = "Max Level Achieved";
  }

  return (
    <div
      onClick={() => setTab("portfolio")}
      className="sm:col-span-2 bento-card-gradient p-6 rounded-2xl gamified-card text-white flex items-center justify-between shadow-lg relative overflow-hidden cursor-pointer group"
    >
      {/* Decorative background glow */}
      <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
      <div className="space-y-2 z-10 w-full pr-12">
        <span className="font-mono uppercase text-[10px] tracking-widest text-white/70 font-semibold">Your Rank Progress</span>
        <h3 className="text-xl md:text-2xl font-bold font-sans tracking-tight text-white">{tier}</h3>
        <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden mt-4">
          <div className="progress-fill h-full bg-blue-300 transition-all duration-1000" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-[11px] text-white/70 font-medium group-hover:text-white transition-colors">{text} · View details →</p>
      </div>
      <div className="absolute right-6 flex items-center justify-center pointer-events-none opacity-20 md:opacity-30">
        <Trophy size={72} style={{ strokeWidth: 1 }} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const wallet = useWalletContext() || {};
  const [tab, setTab] = useState("matches");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [footerModal, setFooterModal] = useState(null);

  // Notification history state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);
  const [showSwapWarning, setShowSwapWarning] = useState(true);

  // Load leaderboard & user bets data once at the root level to share
  const { rows: leaderboardRows, loading: leaderboardLoading } = useLeaderboard(5);
  const userBetsState = useUserBets(wallet.address);

  useEffect(() => {
    const stored = localStorage.getItem("arcmarkets-theme");
    const resolved =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
    setTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);

    // Load notifications from local storage
    const savedNotifs = localStorage.getItem("arcmarkets_notifications");
    if (savedNotifs) {
      try {
        const parsed = JSON.parse(savedNotifs);
        setNotifications(parsed);
        setUnreadCount(parsed.filter(n => !n.read).length);
      } catch (e) {
        console.error("Failed to parse notifications", e);
      }
    }
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset swap warning when wallet changes
  useEffect(() => {
    if (wallet.address) {
      setShowSwapWarning(true);
    }
  }, [wallet.address]);

  const addNotification = useCallback((title, message, txHash = null) => {
    const newNotif = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      title,
      message,
      txHash,
      timestamp: Date.now(),
      read: false
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev].slice(0, 50);
      localStorage.setItem("arcmarkets_notifications", JSON.stringify(updated));
      return updated;
    });
    setUnreadCount(prev => prev + 1);
  }, []);

  const toggleNotifications = () => {
    setShowNotifDropdown(!showNotifDropdown);
    if (!showNotifDropdown) {
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, read: true }));
        localStorage.setItem("arcmarkets_notifications", JSON.stringify(updated));
        return updated;
      });
      setUnreadCount(0);
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("arcmarkets-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const {
    matches,
    upcomingFixtures,
    fixturesLoading,
    loading: matchesLoading,
    refetch: refetchMatches,
  } = useEnrichedMatches();
  const { balance: usdtBalance, loading: usdtLoading, refetch: refetchUsdt } = useUSDT(wallet.address, wallet.provider);

  const notify = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const openBet = (match, outcome) => {
    if (!wallet.isConnected) { notify("Connect your wallet first!", "error"); return; }
    setModal({ match, outcome });
  };

  const TABS = [
    { id: "matches", label: "Markets", icon: <BarChart3 size={14} /> },
    { id: "agent", label: "AI Agent", icon: <Bot size={14} /> },
    { id: "portfolio", label: "Portfolio", icon: <Wallet size={14} /> },
    { id: "leaderboard", label: "Leaderboard", icon: <Trophy size={14} /> },
  ];

  const totalPool = matches ? matches.reduce((a, m) => a + m.totalPool, 0) : 0;

  return (
    <>
      <div className="app-root page-enter">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className="grid-bg" aria-hidden />
      {toast && <Toast {...toast} />}

      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="nav-inner">
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="arc-nav-mark" style={{ overflow: "hidden", padding: 0, borderRadius: 8 }}>
              <img src="/logo.jpg" alt="AM Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div>
              <div className="text-gradient-logo" style={{
                fontFamily: "var(--font-serif)",
                fontSize: 20,
                fontWeight: 400,
                letterSpacing: "-0.01em",
                lineHeight: 1
              }}>ArcMarkets</div>
              <div style={{ fontSize: 9, color: "var(--accent)", letterSpacing: 1.8, textTransform: "uppercase", fontWeight: 700, marginTop: 2 }}>Sports · Crypto · Arc</div>
            </div>
          </div>

          {/* Desktop tabs */}
          <div className="desktop-only" style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`tab-item ${tab === t.id ? "active" : ""}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="nav-right">
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div ref={notifRef} style={{ position: "relative" }}>
              <button
                onClick={toggleNotifications}
                className="btn-ghost"
                style={{
                  padding: "7px 10px",
                  borderRadius: 8,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Bell size={15} />
                {unreadCount > 0 && (
                  <span style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--primary)",
                    boxShadow: "0 0 6px var(--primary)",
                    border: "1px solid var(--bg)"
                  }} />
                )}
              </button>

              {showNotifDropdown && (
                <div className="card notif-panel animate-fade-in" style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 320,
                  maxHeight: 400,
                  overflowY: "auto",
                  zIndex: 200,
                  padding: "16px",
                  background: "var(--bg-card)",
                  backdropFilter: "blur(28px)",
                  WebkitBackdropFilter: "blur(28px)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255,255,255,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Notifications</span>
                    {notifications.length > 0 && (
                      <button
                        onClick={() => {
                          setNotifications([]);
                          localStorage.setItem("arcmarkets_notifications", "[]");
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: "pointer"
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = "var(--primary)"}
                        onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-secondary)", fontSize: 12 }}>
                      No notifications yet
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {notifications.map(n => (
                        <div key={n.id} style={{
                          padding: "10px",
                          borderRadius: 8,
                          background: "var(--card-header-bg)",
                          border: "1px solid var(--border)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <span style={{ fontSize: 12, fontWeight: 750, color: "var(--text-primary)" }}>{n.title}</span>
                            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{formatTimeAgo(n.timestamp)}</span>
                          </div>
                          <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.3 }}>{n.message}</p>
                          {n.txHash && (
                            <a
                              href={`${ACTIVE_NETWORK.explorerUrl}/tx/${n.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 10,
                                color: "var(--primary)",
                                textDecoration: "underline",
                                marginTop: 4,
                                fontWeight: 600
                              }}
                            >
                              Verify On-Chain <ExternalLink size={8} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="desktop-only" style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "var(--primary-alpha-bg)", border: "1px solid var(--primary-alpha-border)", borderRadius: 7 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", boxShadow: "0 0 6px var(--primary)" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", fontFamily: "'JetBrains Mono', monospace" }}>{ACTIVE_NETWORK.name}</span>
            </div>
            {wallet.isConnected ? (
              <button type="button" className="wallet-pill connected" onClick={wallet.disconnect}>
                <span className="status-dot" />
                <span>{shortAddr(wallet.address)}</span>
                <LogOut size={12} aria-hidden />
              </button>
            ) : (
              <ShimmerBtn variant="primary" onClick={wallet.connect}>
                <Wallet size={14} /> {wallet.isConnecting ? "Connecting…" : <>Connect<span className="desktop-only"> Wallet</span></>}
              </ShimmerBtn>
            )}
          </div>
        </div>
      </nav>

      {/* ── Content ── */}
      <main id="main-content" className="main-content" role="main" style={{ paddingTop: 100 }}>
        {wallet.isConnected && !usdtLoading && usdtBalance < 0.01 && showSwapWarning && (
          <div className="swap-warning-banner">
            <div className="swap-warning-content">
              <AlertCircle className="swap-warning-icon" size={18} />
              <span className="swap-warning-text">
                Your wallet needs USDC on Arc Testnet to place bets.
                <a
                  href="https://faucet.circle.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="swap-warning-link"
                >
                  Get testnet USDC <ArrowUpRight size={14} />
                </a>
              </span>
            </div>
            <button
              className="swap-warning-close"
              onClick={() => setShowSwapWarning(false)}
              aria-label="Dismiss warning"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {tab === "matches" && (
          <MatchesTab
            matches={matches}
            upcomingFixtures={upcomingFixtures}
            fixturesLoading={fixturesLoading}
            loading={matchesLoading}
            onBet={openBet}
            leaderboardRows={leaderboardRows}
            leaderboardLoading={leaderboardLoading}
            setTab={setTab}
            wallet={wallet}
            usdtBalance={usdtBalance}
            refetchUsdt={refetchUsdt}
            onNotif={notify}
            addNotif={addNotification}
            theme={theme}
            userBetsState={userBetsState}
            setFooterModal={setFooterModal}
          />
        )}
        {tab === "agent" && (
          <AgentTab
            address={wallet.address}
            signer={wallet.signer}
            matches={matches}
            usdtBalance={usdtBalance}
            refetchUsdt={refetchUsdt}
            onNotif={notify}
            addNotif={addNotification}
            theme={theme}
            refetchBets={userBetsState.refetch}
          />
        )}
        {tab === "portfolio" && (
          <PortfolioTab
            address={wallet.address}
            signer={wallet.signer}
            refetchUsdt={refetchUsdt}
            onNotif={notify}
            addNotif={addNotification}
            onGoLeaderboard={() => setTab("leaderboard")}
            userBetsState={userBetsState}
          />
        )}
        {tab === "leaderboard" && <LeaderboardTab />}
      </main>

      {/* ── Footer ── */}
      <footer className="w-full mt-12 border-t border-outline-variant" style={{ background: "var(--surface-container)", borderColor: "var(--border)", padding: "32px 24px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }} className="font-sans">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div className="text-gradient-logo" style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>ArcMarkets</div>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>© 2026 ArcMarkets · Secured by Arc Testnet</span>
            </div>
            
            {/* Support Links */}
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <button onClick={() => setFooterModal("whitepaper")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }} className="hover:text-primary transition-colors">Whitepaper</button>
              <button onClick={() => setFooterModal("verification")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }} className="hover:text-primary transition-colors">Verification</button>
              <button onClick={() => setFooterModal("odds")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }} className="hover:text-primary transition-colors">Odds API</button>
              <button onClick={() => setFooterModal("privacy")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }} className="hover:text-primary transition-colors">Privacy</button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
              Built by{" "}
              <a href="https://github.com/Ritesh59697" target="_blank" rel="noopener noreferrer" className="developer-link" style={{ color: "var(--primary)", fontWeight: 600 }}>Ritesh59697</a>
            </span>
          </div>
        </div>
      </footer>

      {/* ── Sticky Mobile Navigation ── */}
      <div className="mobile-only mobile-bottom-nav">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`mobile-bottom-nav-item ${tab === t.id ? "active" : ""}`}>
            {t.icon}
            <span style={{ fontSize: 9 }}>{t.label}</span>
          </button>
        ))}
      </div>
      </div>

      {/* ── Info Modal ── */}
      {footerModal && (
        <InfoModal
          type={footerModal}
          onClose={() => setFooterModal(null)}
          theme={theme}
        />
      )}

      {/* ── Bet Modal ── */}
      {modal && (
        <BetModal
          match={modal.match}
          initOutcome={modal.outcome}
          onClose={() => setModal(null)}
          signer={wallet.signer}
          theme={theme}
          onSuccess={result => {
            const outcomeName = { 1: "Home Win", 2: "Draw", 3: "Away Win" }[result.outcome] || "Unknown";
            addNotification(
              "Bet Placed Successfully",
              `Placed $${result.amount} USDC on ${outcomeName} for ${modal.match.homeTeam} vs ${modal.match.awayTeam}`,
              result.txHash
            );
            notify(
              <span>
                Bet placed!{" "}
                <a
                  href={`${ACTIVE_NETWORK.explorerUrl}/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--primary)", textDecoration: "underline", marginLeft: 4 }}
                >
                  Verify
                </a>
              </span>,
              "success"
            );
            refetchMatches();
            refetchUsdt();
            setModal(null);
          }}
        />
      )}
    </>
  );
}
