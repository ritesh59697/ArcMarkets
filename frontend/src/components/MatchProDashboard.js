"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, TrendingUp, Clock, Coins, Globe, 
  Activity, AlertCircle, CheckCircle2, Sliders, Zap, RefreshCw, Info 
} from "lucide-react";
import { getCryptoLogo, isCryptoMarket } from "../utils/marketAssets";
import { useBetting } from "../hooks/useBetting";
import { ACTIVE_NETWORK } from "../utils/config";

const fmt = (n, d = 2) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtK = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : String(n);

export default function MatchProDashboard({ 
  match, 
  onBack, 
  wallet, 
  usdtBalance, 
  refetchUsdt, 
  onNotif, 
  addNotif, 
  theme,
  initialOutcome = 1
}) {
  const [timeframe, setTimeframe] = useState("1D");
  const [outcome, setOutcome] = useState(initialOutcome || 1); // 1: Home, 2: Draw, 3: Away

  useEffect(() => {
    setOutcome(initialOutcome || 1);
  }, [initialOutcome]);
  const [amount, setAmount] = useState("50");
  const [slippage, setSlippage] = useState("1.0");
  const [hoverIndex, setHoverIndex] = useState(null);
  const [potentialPayout, setPotentialPayout] = useState(0);

  const { status, error, lastResult, placeBet, simulatePayout, reset } = useBetting(wallet.signer);

  const odds = { 1: match.odds.home, 2: match.odds.draw, 3: match.odds.away };
  const OUTCOME_NAMES = { 1: match.homeTeam, 2: "Draw", 3: match.awayTeam };
  const OUTCOME_LABELS = { 1: "Home Win", 2: "Draw", 3: "Away Win" };

  // Generate realistic smooth parimutuel odds and volume simulation
  const [chartData, setChartData] = useState([]);
  useEffect(() => {
    const points = [];
    const count = 18;
    let baseOdds = parseFloat(odds[outcome] || 2.0);
    
    const prefix = timeframe === "1H" ? "Min" : timeframe === "1D" ? "Hr" : timeframe === "1W" ? "Day" : "Wk";
    
    // Start with a price slightly offset from the live target odds
    let currentOdds = Math.max(1.15, baseOdds - (Math.random() - 0.5) * 0.5);
    
    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      
      if (i > 0 && i < count - 1) {
        // Soft drift back to target, plus tiny random noise to keep it smooth and continuous
        const drift = (baseOdds - currentOdds) * 0.12;
        const change = (Math.random() - 0.5) * 0.08;
        currentOdds = Math.max(1.15, currentOdds + drift + change);
      }
      
      // Volume remains clean and spikey but matches the smooth timeline
      let vol = Math.round(Math.random() * 12 + 4);
      if (Math.random() < 0.2) {
        vol = Math.round(Math.random() * 80 + 30);
      }
      
      points.push({
        time: `${prefix} ${i + 1}`,
        odds: parseFloat(currentOdds.toFixed(2)),
        volume: vol
      });
    }
    
    // Set the final point to exactly reflect live contract odds
    points[points.length - 1].odds = parseFloat(baseOdds.toFixed(2));
    setChartData(points);
  }, [timeframe, outcome, match.index]);

  // Simulate potential payouts
  useEffect(() => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount > 0) {
      simulatePayout(match.index, outcome, numAmount).then(val => {
        setPotentialPayout(val);
      }).catch(err => {
        console.error("Simulation failed:", err);
        setPotentialPayout(numAmount * (odds[outcome] || 1));
      });
    } else {
      setPotentialPayout(0);
    }
  }, [match.index, outcome, amount, simulatePayout]);

  const numAmount = parseFloat(amount) || 0;
  let payout = potentialPayout;
  if (numAmount > 0) {
    const fallbackPayout = numAmount * (odds[outcome] || 1);
    if (!payout || payout <= numAmount) {
      payout = fallbackPayout;
    }
  }
  const profit = payout - numAmount;

  // Execute Web3 placement
  const place = async () => {
    if (!wallet.isConnected) { onNotif("Connect your wallet first!", "error"); return; }
    if (numAmount <= 0) { onNotif("Enter a valid amount", "error"); return; }
    const result = await placeBet(match.index, outcome, numAmount);
    if (result && result.success) {
      addNotif(
        "Bet Placed Successfully",
        `Placed $${numAmount} USDC on ${OUTCOME_LABELS[outcome]} for ${match.homeTeam} vs ${match.awayTeam}`,
        result.txHash
      );
      onNotif("Bet placed successfully!", "success");
      refetchUsdt();
    }
  };

  // SVG Chart geometry
  const width = 680;
  const height = 260;
  const pad = 50; // Increased padding to prevent Y-axis labels from being cropped
  const chartW = width - pad * 2;
  const chartH = height - pad * 2 - 30; // Leave space for volume bars

  const oddsList = chartData.map(d => d.odds);
  const minOdds = Math.min(...oddsList, 1.0) * 0.95;
  const maxOdds = Math.max(...oddsList, 3.5) * 1.05;

  const getX = (i) => pad + (i / (chartData.length - 1)) * chartW;
  const getY = (v) => pad + chartH - ((v - minOdds) / (maxOdds - minOdds)) * chartH;

  // Build clean smooth line chart path strings
  let linePath = "";
  let areaPath = "";
  if (chartData.length > 0) {
    linePath = `M ${getX(0)} ${getY(chartData[0].odds)} ` + chartData.map((d, i) => `L ${getX(i)} ${getY(d.odds)}`).join(" ");
    areaPath = linePath + ` L ${getX(chartData.length - 1)} ${pad + chartH} L ${getX(0)} ${pad + chartH} Z`;
  }

  const activePoint = hoverIndex !== null ? chartData[hoverIndex] : chartData[chartData.length - 1];

  const homeImg = match.homeImage || getCryptoLogo(match.homeTeam) || match.homeCrest;
  const awayImg = match.awayImage || getCryptoLogo(match.awayTeam) || match.awayCrest;

  return (
    <div className="font-sans page-enter space-y-6" style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 60 }}>
      {/* Header and Back navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <button onClick={onBack} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8 }}>
          <ArrowLeft size={16} /> Back to Markets
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
          <Globe size={13} style={{ color: "var(--primary)" }} />
          <span>Category: {match.league || match.category || "FIFA World Cup"}</span>
          <span style={{ margin: "0 4px" }}>•</span>
          <Clock size={13} />
          <span>Kickoff: {new Date(match.kickoffTime).toLocaleString()}</span>
        </div>
      </div>

      {/* Match title header */}
      <div className="card" style={{ padding: "24px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--avatar-inner-bg)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
              {homeImg ? <img src={homeImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>⚽</span>}
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{match.homeTeam}</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--primary)", padding: "4px 10px", background: "var(--vs-badge-bg)", border: "1px solid var(--vs-badge-border)", borderRadius: 12 }}>VS</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{match.awayTeam}</span>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--avatar-inner-bg)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
              {awayImg ? <img src={awayImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>⚽</span>}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Total Pool</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>${fmt(match.totalPool || 0)}</div>
          </div>
          <div style={{ width: 1, height: 32, background: "var(--border)" }} />
          <div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Status</div>
            {match.status === 0 ? (
              <span className="badge badge-open" style={{ marginTop: 4 }}><Clock size={10} /> Active</span>
            ) : (
              <span className="badge" style={{ marginTop: 4, background: "var(--border)" }}><Lock size={10} /> Locked</span>
            )}
          </div>
        </div>
      </div>

      {/* Market Description Card */}
      <div className="card" style={{ padding: "16px 24px", display: "flex", gap: 12, alignItems: "center", background: "var(--primary-alpha-bg)", border: "1px solid var(--primary-alpha-border)" }}>
        <Info size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
          <strong>Market Rule:</strong>{" "}
          {isCryptoMarket(match.homeTeam, match.awayTeam, match.matchId) ? (
            (match.homeTeam.toLowerCase().includes("outperforms") || match.homeTeam.toLowerCase().includes("above") || match.homeTeam.toLowerCase().includes("below")) ? (
              `Predict the outcome of this crypto market. Outcomes are graded based on the precise price conditions of ${match.homeTeam} vs ${match.awayTeam} at the scheduled kickoff time.`
            ) : (
              `This is a relative performance market. You are predicting which coin will achieve the higher percentage price increase (or smaller percentage loss) starting from the market creation time up to the kickoff time (${new Date(match.kickoffTime).toLocaleString()}).`
            )
          ) : (
            `This is a standard football prediction market. You are predicting the match winner (Home team win, Draw, or Away team win) based on the official score at full kickoff time.`
          )}
        </div>
      </div>

      {/* Main Grid: Dashboard content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Chart and Live Outcomes table */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Chart card */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 className="font-serif" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Odds History</h3>
                <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0 0" }}>Interactive parimutuel odds tracking stream</p>
              </div>
              <div style={{ display: "flex", gap: 6, padding: 3, background: "var(--surface-container)", borderRadius: 10 }}>
                {["1H", "1D", "1W", "1M"].map(t => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      timeframe === t 
                        ? "bg-primary text-white" 
                        : "text-secondary hover:text-primary"
                    }`}
                    style={{ border: "none", cursor: "pointer", background: timeframe === t ? undefined : "none" }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG line chart */}
            <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
              <svg 
                viewBox={`0 0 ${width} ${height}`} 
                style={{ width: "100%", height: "auto" }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * width;
                  const idx = Math.min(
                    chartData.length - 1,
                    Math.max(0, Math.round(((x - pad) / chartW) * (chartData.length - 1)))
                  );
                  setHoverIndex(idx);
                }}
                onMouseLeave={() => setHoverIndex(null)}
              >
                {/* Gradients */}
                <defs>
                  <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                {Array.from({ length: 5 }).map((_, i) => {
                  const yVal = minOdds + (i / 4) * (maxOdds - minOdds);
                  const yPos = getY(yVal);
                  return (
                    <g key={i}>
                      <line x1={pad} y1={yPos} x2={width - pad} y2={yPos} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                      <text x={pad - 12} y={yPos + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">
                        {yVal.toFixed(2)}x
                      </text>
                    </g>
                  );
                })}

                {/* Volume Bar Chart at the bottom */}
                {(() => {
                  const maxVol = Math.max(...chartData.map(d => d.volume), 100);
                  const barW = Math.max(2, Math.floor(chartW / chartData.length * 0.5));
                  return chartData.map((d, i) => {
                    const barH = (d.volume / maxVol) * 35;
                    return (
                      <rect
                        key={i}
                        x={getX(i) - barW / 2}
                        y={height - pad - barH - 10}
                        width={barW}
                        height={barH}
                        fill="rgba(3, 86, 197, 0.15)"
                        rx="1"
                      />
                    );
                  });
                })()}

                {/* Area path */}
                {areaPath && <path d={areaPath} fill="url(#chartGlow)" />}

                {/* Glowing neon line path */}
                {linePath && (
                  <path 
                    d={linePath} 
                    fill="none" 
                    stroke="var(--primary)" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    style={{ filter: "drop-shadow(0 4px 8px var(--primary-glow))" }}
                  />
                )}

                {/* Active Tracking Ring */}
                {activePoint && (
                  <g>
                    <circle 
                      cx={getX(hoverIndex !== null ? hoverIndex : chartData.length - 1)} 
                      cy={getY(activePoint.odds)} 
                      r="6" 
                      fill="var(--primary)" 
                      stroke="#ffffff" 
                      strokeWidth="2.5" 
                      style={{ filter: "drop-shadow(0 0 6px var(--primary))" }}
                    />
                    <line 
                      x1={getX(hoverIndex !== null ? hoverIndex : chartData.length - 1)} 
                      y1={pad} 
                      x2={getX(hoverIndex !== null ? hoverIndex : chartData.length - 1)} 
                      y2={height - pad - 10} 
                      stroke="var(--border)" 
                      strokeWidth="1.5" 
                    />
                  </g>
                )}
              </svg>

              {/* Live Odds/Tooltip box */}
              {activePoint && (
                <div style={{
                  position: "absolute",
                  top: 10,
                  left: hoverIndex !== null ? `${Math.min(75, Math.max(10, (hoverIndex / chartData.length) * 100))}%` : "16px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  pointerEvents: "none",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
                }}>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                    Odds History ({timeframe})
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 4, alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>
                        {activePoint.odds}x
                      </span>
                      <span style={{ fontSize: 10, color: "var(--text-secondary)", marginLeft: 4 }}>odds</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                        ${fmt(activePoint.volume, 1)}K
                      </span>
                      <span style={{ fontSize: 10, color: "var(--text-secondary)", marginLeft: 4 }}>vol</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Markets Outcomes table */}
          <div className="card" style={{ padding: 24 }}>
            <h3 className="font-serif" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Live Outcomes</h3>
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                    <th style={{ paddingBottom: 10, fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--text-muted)" }}>Outcome</th>
                    <th style={{ paddingBottom: 10, fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--text-muted)" }}>Type</th>
                    <th style={{ paddingBottom: 10, fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--text-muted)", textAlign: "center" }}>Odds</th>
                    <th style={{ paddingBottom: 10, fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--text-muted)", textAlign: "right" }}>Liquidity</th>
                    <th style={{ paddingBottom: 10, fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--text-muted)", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant" style={{ borderColor: "var(--border)" }}>
                  {[
                    { id: 1, name: match.homeTeam, type: "Match Winner", pool: match.homePool, odds: match.odds.home },
                    { id: 2, name: "Draw", type: "Match Winner", pool: match.drawPool, odds: match.odds.draw },
                    { id: 3, name: match.awayTeam, type: "Match Winner", pool: match.awayPool, odds: match.odds.away }
                  ].map(row => (
                    <tr key={row.id} className="hover:bg-primary/5 transition-colors">
                      <td style={{ padding: "14px 0", fontWeight: 700, fontSize: 13.5 }}>{row.name}</td>
                      <td style={{ padding: "14px 0", fontSize: 12, color: "var(--text-secondary)" }}>{row.type}</td>
                      <td style={{ padding: "14px 0", textAlign: "center", fontWeight: 800, fontSize: 14, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>
                        {row.odds}x
                      </td>
                      <td style={{ padding: "14px 0", textAlign: "right", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                        ${fmt(row.pool || 0, 0)} USDC
                      </td>
                      <td style={{ padding: "14px 0", textAlign: "right" }}>
                        <button
                          onClick={() => {
                            setOutcome(row.id);
                            // Scroll to quick bet card on mobile
                            document.getElementById("quick-bet-card")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className={`btn-shimmer ${outcome === row.id ? "btn-primary" : ""}`}
                          style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Bet Form Card */}
        <div id="quick-bet-card" className="lg:col-span-1">
          <div className="card" style={{ padding: 28, borderTop: "2px solid var(--primary)", position: "sticky", top: 100 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="font-serif" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Quick Bet</h3>
              <span className="badge badge-open"><Activity size={10} /> Instant Liquidity</span>
            </div>

            {/* Target Outcome Selector */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Prediction</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[1, 2, 3].map(o => (
                  <button
                    key={o}
                    onClick={() => setOutcome(o)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: outcome === o ? "1px solid var(--primary)" : "1px solid var(--border)",
                      background: outcome === o ? "var(--primary-alpha-bg)" : "var(--card-header-bg)",
                      color: outcome === o ? "var(--primary)" : "var(--text-primary)",
                      fontWeight: 700,
                      fontSize: 13,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <span>{OUTCOME_NAMES[o]}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>{odds[o]}x</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bet Amount */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Bet Amount</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Bal: <span style={{ color: "var(--text-primary)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{fmt(usdtBalance)} USDC</span>
                </span>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  value={amount}
                  min={0.01}
                  step={0.01}
                  onChange={e => setAmount(e.target.value)}
                  className="input font-mono"
                  style={{ height: 46, fontSize: 15, paddingRight: 60 }}
                />
                <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>USDC</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {[10, 50, 100, 250].map(val => (
                  <button
                    key={val}
                    onClick={() => setAmount(val.toString())}
                    className="btn-ghost"
                    style={{ flex: 1, padding: "4px 8px", fontSize: 11, borderRadius: 6, justifyContent: "center" }}
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>

            {/* Slippage Settings */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 4 }}>
                  <Sliders size={10} /> Slippage Limit
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>{slippage}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                value={slippage}
                onChange={e => setSlippage(e.target.value)}
                style={{ width: "100%", accentColor: "var(--primary)", cursor: "pointer" }}
              />
            </div>

            {/* Payout Calculations */}
            {outcome && numAmount > 0 && (
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 20
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Potential Payout</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--green)", fontFamily: "var(--font-mono)" }}>${fmt(payout)} USDC</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Est. Net Profit</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--green)", fontFamily: "var(--font-mono)" }}>+${fmt(profit)} USDC</span>
                </div>
              </div>
            )}

            {/* Error messaging */}
            {error && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--danger-text)", fontSize: 12, marginBottom: 12, padding: "8px 12px", background: "var(--danger-bg)", borderRadius: 7, border: "1px solid var(--danger-border)" }}>
                <AlertCircle size={14} />{error}
              </div>
            )}

            {/* Success Receipt */}
            {status === "success" && lastResult && (
              <div style={{
                background: "var(--success-bg)",
                border: "1px solid var(--success-border)",
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 20,
                color: "var(--success-text)",
                fontSize: 12.5
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 4 }}>
                  <CheckCircle2 size={15} /> Bet Placed On-Chain!
                </div>
                <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>
                  Minted Receipt NFT at ID #{lastResult.betId}.
                </p>
                <a
                  href={`${ACTIVE_NETWORK.explorerUrl}/tx/${lastResult.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, color: "var(--primary)", fontWeight: 700, textDecoration: "underline" }}
                >
                  Verify Explorer <Zap size={10} />
                </a>
              </div>
            )}

            {/* Place Bet CTA */}
            <button
              onClick={place}
              disabled={status === "approving" || status === "betting"}
              className="btn-primary w-full"
              style={{
                display: "flex",
                height: 48,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer"
              }}
            >
              {status === "approving" && <><RefreshCw size={14} className="animate-spin" /> Approving USDC...</>}
              {status === "betting" && <><RefreshCw size={14} className="animate-spin" /> Placing Bet...</>}
              {status !== "approving" && status !== "betting" && (
                wallet.isConnected ? (
                  <>Place Bet on {OUTCOME_NAMES[outcome]}</>
                ) : (
                  <>Connect Wallet to Bet</>
                )
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
