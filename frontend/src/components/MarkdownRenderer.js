"use client";

import React, { useState } from "react";
import { 
  Terminal, Copy, Check, Info, Shield, 
  Cpu, Wallet, Coins, ArrowRight, Play, RefreshCw, Eye
} from "lucide-react";

// ─── ELEGANT INTERACTIVE SEQUENCE DIAGRAM ────────────────────────────────────
// Replaces the raw mermaid sequenceDiagram block with a high-fidelity animated flow.
function InteractiveSequenceDiagram() {
  const [activeStep, setActiveStep] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  const steps = [
    {
      id: 1,
      title: "1. Agent Authorization & Escrow",
      desc: "User calls `authorizeMyAgent(agentAddress, budget)` transferring USDC directly to the PredictionMarket escrow pool. No private keys are shared.",
      from: "User Wallet",
      to: "Smart Contract",
      detail: "USDC is locked on-chain in escrow. The user can revoke delegation or withdraw funds at any time.",
    },
    {
      id: 2,
      title: "2. Fetch Market Parameters",
      desc: "The autonomous off-chain client agent pulls active match profiles, kickoff times, and current parimutuel pool sizes from the contract.",
      from: "AI Agent Client",
      to: "Smart Contract",
      detail: "Executes cycles every 3 seconds to monitor live changes in team odds and pool sizes.",
    },
    {
      id: 3,
      title: "3. Analyze & Compute Kelly Size",
      desc: "Agent calculates winning probabilities using FIFA team strength ratings and calculates expected value (EV) based on pool odds.",
      from: "AI Agent Client",
      to: "AI Agent Client",
      detail: "Computes EV = (Probability × Odds) - 1. Applies risk sizing profiles (Kelly Criterion multiplier) to size the potential bet.",
    },
    {
      id: 4,
      title: "4. Executing Delegated Wager",
      desc: "If expected value exceeds the profile threshold, agent calls `agentPlaceBet(userAddress, matchIndex, outcome, amount)`.",
      from: "AI Agent Client",
      to: "Smart Contract",
      detail: "Gas fees are funded dynamically using Arc Network's native USDC gas model.",
    },
    {
      id: 5,
      title: "5. On-Chain Settlement & NFT Mint",
      desc: "Smart Contract verifies agent signature, deducts bet amount from user's escrow balance, and mints an on-chain SVG NFT bet receipt to the user.",
      from: "Smart Contract",
      to: "User Wallet",
      detail: "SVG NFT permanently stores your wager parameters on-chain, rendering dynamic card layouts without off-chain servers.",
    }
  ];

  const startAnimation = () => {
    setIsPlaying(true);
    setAnimationStep(0);
    setActiveStep(1);
    
    let current = 1;
    const interval = setInterval(() => {
      current += 1;
      if (current > steps.length) {
        clearInterval(interval);
        setIsPlaying(false);
        setActiveStep(null);
      } else {
        setAnimationStep(current - 1);
        setActiveStep(current);
      }
    }, 4500);
  };

  return (
    <div className="sequence-diagram-card" style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "24px",
      margin: "24px 0",
      boxShadow: "var(--card-shadow)",
      backdropFilter: "blur(20px)",
      color: "var(--text-primary)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h4 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, color: "var(--accent)" }}>
            <Cpu size={18} /> Protocol Sequence: AI Agent Delegation Flow
          </h4>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Interactive view showing on-chain escrow, off-chain prediction analysis, and automated betting execution.
          </p>
        </div>
        <button 
          onClick={startAnimation} 
          disabled={isPlaying}
          className="btn-animation"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: isPlaying ? "rgba(255,255,255,0.05)" : "var(--primary)",
            color: isPlaying ? "var(--text-muted)" : "white",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: isPlaying ? "not-allowed" : "pointer",
            transition: "all 0.2s"
          }}
        >
          {isPlaying ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
          {isPlaying ? `Animating Step ${animationStep + 1}...` : "Simulate Flow"}
        </button>
      </div>

      {/* Actor Blocks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, textAlign: "center", marginBottom: 24 }}>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "center", color: "var(--accent)", marginBottom: 8 }}><Wallet size={24} /></div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>User Wallet</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Retains USDC custody &amp; reviews NFT receipts</div>
        </div>
        <div style={{ background: "rgba(0, 79, 210, 0.05)", border: "1px solid var(--primary-alpha-border)", borderRadius: "var(--radius-sm)", padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "center", color: "var(--primary-glow)", marginBottom: 8 }}><Shield size={24} /></div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--royal-bright)" }}>Smart Contract</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Holds escrow pool &amp; validates permission</div>
        </div>
        <div style={{ background: "rgba(245, 192, 24, 0.04)", border: "1px solid rgba(245,192,24,0.2)", borderRadius: "var(--radius-sm)", padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "center", color: "var(--accent)", marginBottom: 8 }}><Cpu size={24} /></div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>AI Agent Client</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Computes EV &amp; automates fractional Kelly sizing</div>
        </div>
      </div>

      {/* Step Stepper List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((step) => {
          const isActive = activeStep === step.id;
          const isCompleted = activeStep > step.id;
          return (
            <div 
              key={step.id}
              onClick={() => !isPlaying && setActiveStep(step.id === activeStep ? null : step.id)}
              style={{
                background: isActive ? "rgba(0, 79, 210, 0.08)" : "rgba(255,255,255,0.01)",
                border: isActive 
                  ? "1px solid var(--royal-bright)" 
                  : isCompleted 
                    ? "1px solid var(--primary-alpha-border)" 
                    : "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "12px 16px",
                cursor: isPlaying ? "default" : "pointer",
                transition: "all 0.3s ease",
                display: "flex",
                flexDirection: "column",
                gap: 6
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: isActive ? "var(--accent)" : isCompleted ? "var(--text-muted)" : "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}>
                  <span style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: isActive ? "var(--accent)" : isCompleted ? "var(--primary)" : "rgba(255,255,255,0.1)",
                    color: isActive ? "var(--navy-deep)" : "white",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 800
                  }}>
                    {step.id}
                  </span>
                  {step.title}
                </span>
                <span style={{ 
                  fontSize: 10, 
                  padding: "2px 8px", 
                  borderRadius: 4, 
                  background: isActive ? "rgba(0,79,210,0.2)" : "rgba(255,255,255,0.05)",
                  color: "var(--text-muted)"
                }}>
                  {step.from} ➔ {step.to}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 28 }}>
                {step.desc}
              </p>
              {(isActive || (activeStep === null && step.id === 1)) && (
                <div style={{
                  marginTop: 6,
                  paddingTop: 8,
                  borderTop: "1px dashed rgba(255,255,255,0.1)",
                  fontSize: 11,
                  color: "var(--accent)",
                  marginLeft: 28,
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}>
                  <Info size={12} />
                  <span><strong>Protocol Details:</strong> {step.detail}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CODE BLOCK TERMINAL CONTAINER ───────────────────────────────────────────
function TerminalCodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="terminal-container" style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)",
      overflow: "hidden",
      margin: "20px 0",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
    }}>
      {/* Terminal Title Bar */}
      <div className="terminal-header" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "rgba(255, 255, 255, 0.03)",
        padding: "10px 16px",
        borderBottom: "1px solid var(--border)",
        fontFamily: "var(--font-sans)"
      }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f56", display: "inline-block" }}></span>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffbd2e", display: "inline-block" }}></span>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#27c93f", display: "inline-block" }}></span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {language || "code"}
          </span>
        </div>
        <button 
          onClick={copyToClipboard}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 500,
            padding: "4px 8px",
            borderRadius: 4,
            transition: "all 0.2s"
          }}
          className="hover:bg-white/5 hover:text-white"
        >
          {copied ? <Check size={12} style={{ color: "var(--green)" }} /> : <Copy size={12} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      
      {/* Code Text Area */}
      <pre style={{
        padding: "18px",
        margin: 0,
        overflowX: "auto",
        fontFamily: "var(--font-mono)",
        fontSize: "12.5px",
        lineHeight: "1.6",
        background: "rgba(0, 0, 0, 0.15)",
        color: "#d1e3ff"
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ─── TEX MATH FORMULA BLOCK RENDERER ──────────────────────────────────────────
function MathFormulaBlock({ formula }) {
  // Translate LaTeX characters to highly legible unicode blocks
  const parseMath = (raw) => {
    let clean = raw;
    // Replace fractions
    clean = clean.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1) / ($2)");
    // Replace \text
    clean = clean.replace(/\\text\{([^}]+)\}/g, "$1");
    // Replace standard symbols
    clean = clean.replace(/\\Delta/g, "Δ");
    // Replace dots
    clean = clean.replace(/\\cdot/g, " × ");
    clean = clean.replace(/\\times/g, " × ");
    // Replace subscripts
    clean = clean.replace(/_\{([^}]+)\}/g, "$1");
    clean = clean.replace(/_([a-zA-Z0-9*]+)/g, "$1");
    // Remove formatting noise
    clean = clean.replace(/\\sum/g, "Σ");
    clean = clean.replace(/\\in/g, " ∈ ");
    clean = clean.replace(/\\text/g, "");
    clean = clean.replace(/\\;/g, " ");
    clean = clean.replace(/\\!/g, "");
    clean = clean.replace(/\\left/g, "");
    clean = clean.replace(/\\right/g, "");
    clean = clean.replace(/\\,/g, " ");
    clean = clean.replace(/\\:/g, " ");
    clean = clean.replace(/\\texttt\{([^}]+)\}/g, "$1");
    
    return clean;
  };

  return (
    <div style={{
      background: "radial-gradient(ellipse at center, rgba(0, 79, 210, 0.08), transparent 70%)",
      border: "1px dashed var(--border)",
      borderRadius: "var(--radius-sm)",
      padding: "20px 24px",
      margin: "20px 0",
      textAlign: "center",
      fontFamily: "var(--font-mono)",
      fontSize: "14px",
      color: "var(--accent)",
      boxShadow: "inset 0 0 10px rgba(0,0,0,0.1)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      gap: 6
    }}>
      <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: 0.5 }}>
        {parseMath(formula)}
      </div>
      <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: 1 }}>
        Protocol Equation
      </div>
    </div>
  );
}

// ─── MAIN CUSTOM MARKDOWN PARSER ─────────────────────────────────────────────
export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  // 1. Process code blocks and separate them from text
  const parts = [];
  let index = 0;
  
  // Use regex to locate code blocks including ```
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(index, match.index);
    if (textBefore) {
      parts.push({ type: "text", content: textBefore });
    }
    
    const language = match[1] ? match[1].toLowerCase() : "";
    const codeContent = match[2];
    
    parts.push({ 
      type: "code", 
      language, 
      content: codeContent 
    });
    
    index = codeBlockRegex.lastIndex;
  }

  const textAfter = content.substring(index);
  if (textAfter) {
    parts.push({ type: "text", content: textAfter });
  }

  // Helper to parse simple inline markdown elements (bold, italic, code, links, subscripts)
  const parseInlineElements = (text) => {
    if (typeof text !== "string") return text;
    
    // Convert $$ block math inline if any
    let result = [];
    let remaining = text;

    // A simple parser for inline elements: code (`), bold (**), italic (*), links ([text](url)), subscripts (_)
    // We parse them in order and construct elements
    const parseSpanText = (spanText) => {
      // Inline code
      let index = 0;
      const spans = [];
      
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const boldRegex = /\*\*([^*]+)\*\*/g;
      const inlineCodeRegex = /`([^`]+)`/g;
      
      // We can do a search replacement or split
      // Let's use simple tokenization for inline formatting
      let currentString = spanText;

      // Handle simple math formula conversions inside paragraph text
      currentString = currentString.replace(/\$(\Delta R)\$/g, "ΔR");
      currentString = currentString.replace(/\$([a-zA-Z])_([a-zA-Z0-9*]+)\$/g, "$1_$2");
      currentString = currentString.replace(/\$([a-zA-Z])\^([a-zA-Z0-9*]+)\$/g, "$1^$2");
      currentString = currentString.replace(/\$p_([a-zA-Z0-9*{}]+)\$/g, "p_$1");
      currentString = currentString.replace(/\$O_([a-zA-Z0-9*{}]+)\$/g, "O_$1");
      
      // Render text elements recursively
      // Simple inline splits
      const renderTokens = (str) => {
        if (!str) return [];
        
        // Link match
        let linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(str);
        if (linkMatch) {
          const before = str.substring(0, linkMatch.index);
          const linkText = linkMatch[1];
          const url = linkMatch[2];
          const after = str.substring(linkMatch.index + linkMatch[0].length);
          
          return [
            ...renderTokens(before),
            <a 
              key={linkMatch.index} 
              href={url} 
              className="text-primary hover:underline" 
              style={{ color: "var(--royal-bright)", fontWeight: 600 }}
              {...(url.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {linkText}
            </a>,
            ...renderTokens(after)
          ];
        }

        // Bold match
        let boldMatch = /\*\*([^*]+)\*\*/.exec(str);
        if (boldMatch) {
          const before = str.substring(0, boldMatch.index);
          const boldText = boldMatch[1];
          const after = str.substring(boldMatch.index + boldMatch[0].length);
          
          return [
            ...renderTokens(before),
            <strong key={boldMatch.index} style={{ fontWeight: 700, color: "var(--text-primary)" }}>{boldText}</strong>,
            ...renderTokens(after)
          ];
        }

        // Inline code match
        let codeMatch = /`([^`]+)`/.exec(str);
        if (codeMatch) {
          const before = str.substring(0, codeMatch.index);
          const codeText = codeMatch[1];
          const after = str.substring(codeMatch.index + codeMatch[0].length);
          
          return [
            ...renderTokens(before),
            <code key={codeMatch.index} style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "2px 6px",
              fontFamily: "var(--font-mono)",
              fontSize: "11.5px",
              color: "var(--accent)"
            }}>{codeText}</code>,
            ...renderTokens(after)
          ];
        }

        // Handle subscripts and math variables (like p_H, O_i)
        // Match p_H or O_i or EV_i
        let subMatch = /\b([p|O|L|T|EV|S|f])_([a-zA-Z0-9*]+)\b/.exec(str);
        if (subMatch) {
          const before = str.substring(0, subMatch.index);
          const base = subMatch[1];
          const subscript = subMatch[2];
          const after = str.substring(subMatch.index + subMatch[0].length);

          return [
            ...renderTokens(before),
            <span key={subMatch.index} style={{ fontFamily: "var(--font-mono)" }}>
              <em style={{ fontStyle: "italic" }}>{base}</em>
              <sub>{subscript}</sub>
            </span>,
            ...renderTokens(after)
          ];
        }

        return [str];
      };

      return renderTokens(currentString);
    };

    return parseSpanText(text);
  };

  // Render text segments block by block
  const renderTextBlock = (textBlock, blockKey) => {
    const lines = textBlock.split("\n");
    const blocks = [];
    let currentTable = null;
    let currentList = null;
    let listType = null; // 'ul' or 'ol'
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        // Close lists or tables if any
        if (currentTable) {
          blocks.push(renderTableBlock(currentTable, `table-${i}`));
          currentTable = null;
        }
        if (currentList) {
          blocks.push(renderListBlock(currentList, listType, `list-${i}`));
          currentList = null;
        }
        i++;
        continue;
      }

      // Check for horizontal rule
      if (line === "---" || line === "***") {
        blocks.push(<hr key={`hr-${i}`} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "24px 0" }} />);
        i++;
        continue;
      }

      // Check for headings
      const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const rawTitle = headingMatch[2];
        const titleContent = parseInlineElements(rawTitle);
        // Create an ID for scrolling target
        const slug = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

        const headingStyle = {
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.01em",
          marginTop: level === 1 ? "32px" : level === 2 ? "28px" : "20px",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          scrollMarginTop: "90px" // prevents header from hiding under sticky DApp navbar
        };

        if (level === 1) {
          blocks.push(
            <h1 key={`h-${i}`} id={slug} style={{ ...headingStyle, fontSize: "28px", borderBottom: "1px solid var(--border)", paddingBottom: "8px", color: "var(--accent)" }}>
              {titleContent}
            </h1>
          );
        } else if (level === 2) {
          blocks.push(
            <h2 key={`h-${i}`} id={slug} style={{ ...headingStyle, fontSize: "20px", color: "var(--text-primary)" }}>
              {titleContent}
            </h2>
          );
        } else if (level === 3) {
          blocks.push(
            <h3 key={`h-${i}`} id={slug} style={{ ...headingStyle, fontSize: "16px", color: "var(--text-secondary)" }}>
              {titleContent}
            </h3>
          );
        } else {
          blocks.push(
            <h4 key={`h-${i}`} id={slug} style={{ ...headingStyle, fontSize: "14px", color: "var(--text-muted)" }}>
              {titleContent}
            </h4>
          );
        }
        i++;
        continue;
      }

      // Check for Math equations block $$
      if (line.startsWith("$$") && line.endsWith("$$")) {
        const formula = line.substring(2, line.length - 2).trim();
        blocks.push(<MathFormulaBlock key={`math-${i}`} formula={formula} />);
        i++;
        continue;
      }
      if (line === "$$") {
        // Multi-line math block
        let formulaLines = [];
        i++;
        while (i < lines.length && lines[i].trim() !== "$$") {
          formulaLines.push(lines[i]);
          i++;
        }
        blocks.push(<MathFormulaBlock key={`math-${i}`} formula={formulaLines.join("\n").trim()} />);
        i++;
        continue;
      }

      // Check for blockquote
      if (line.startsWith(">")) {
        const text = line.substring(1).trim();
        // Check if GitHub-style alert block: [!NOTE], [!IMPORTANT], etc.
        const alertMatch = /^\[!(NOTE|IMPORTANT|WARNING|TIP|CAUTION)\](.*)$/.exec(text);
        
        let alertType = "info";
        let alertTitle = "Note";
        let cleanText = text;

        if (alertMatch) {
          alertTitle = alertMatch[1];
          cleanText = alertMatch[2].trim();
          alertType = alertTitle.toLowerCase();
        }

        const alertStyles = {
          note: { bg: "rgba(0, 79, 210, 0.08)", border: "var(--royal-bright)", text: "var(--text-primary)" },
          tip: { bg: "rgba(46, 204, 113, 0.08)", border: "var(--green)", text: "var(--text-primary)" },
          important: { bg: "rgba(245, 192, 24, 0.08)", border: "var(--accent)", text: "var(--text-primary)" },
          warning: { bg: "rgba(255, 82, 123, 0.08)", border: "var(--red)", text: "var(--text-primary)" },
          caution: { bg: "rgba(255, 82, 123, 0.12)", border: "var(--red)", text: "var(--text-primary)" }
        };

        const config = alertStyles[alertType] || alertStyles.note;

        blocks.push(
          <div key={`alert-${i}`} style={{
            background: config.bg,
            borderLeft: `4px solid ${config.border}`,
            padding: "12px 18px",
            borderRadius: "4px",
            margin: "18px 0",
            fontSize: "13px",
            lineHeight: "1.6",
            color: config.text
          }}>
            <div style={{ textTransform: "uppercase", fontSize: "11px", fontWeight: 700, color: config.border, letterSpacing: 0.5, marginBottom: 4 }}>
              {alertTitle}
            </div>
            {parseInlineElements(cleanText)}
          </div>
        );
        i++;
        continue;
      }

      // Check for list items
      const ulMatch = /^[-*]\s+(.*)$/.exec(line);
      const olMatch = /^(\d+)\.\s+(.*)$/.exec(line);
      
      if (ulMatch || olMatch) {
        if (!currentList) {
          currentList = [];
          listType = ulMatch ? "ul" : "ol";
        }
        currentList.push(ulMatch ? ulMatch[1] : olMatch[2]);
        i++;
        continue;
      } else {
        if (currentList) {
          blocks.push(renderListBlock(currentList, listType, `list-${i}`));
          currentList = null;
        }
      }

      // Check for tables
      if (line.startsWith("|")) {
        if (!currentTable) {
          currentTable = [];
        }
        currentTable.push(line);
        i++;
        continue;
      } else {
        if (currentTable) {
          blocks.push(renderTableBlock(currentTable, `table-${i}`));
          currentTable = null;
        }
      }

      // Regular Paragraph
      blocks.push(
        <p key={`p-${i}`} style={{
          fontSize: "14.5px",
          lineHeight: "1.7",
          color: "var(--text-secondary)",
          marginBottom: "16px",
          fontFamily: "var(--font-sans)"
        }}>
          {parseInlineElements(line)}
        </p>
      );
      i++;
    }

    // Wrap up any remaining table or list
    if (currentTable) {
      blocks.push(renderTableBlock(currentTable, `table-end`));
    }
    if (currentList) {
      blocks.push(renderListBlock(currentList, listType, `list-end`));
    }

    return <div key={blockKey}>{blocks}</div>;
  };

  const renderListBlock = (items, type, key) => {
    const listStyle = {
      paddingLeft: "24px",
      margin: "14px 0",
      fontSize: "14.5px",
      lineHeight: "1.7",
      color: "var(--text-secondary)",
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    };

    if (type === "ol") {
      return (
        <ol key={key} style={listStyle}>
          {items.map((item, idx) => (
            <li key={idx} style={{ listStyleType: "decimal" }}>
              {parseInlineElements(item)}
            </li>
          ))}
        </ol>
      );
    } else {
      return (
        <ul key={key} style={listStyle}>
          {items.map((item, idx) => (
            <li key={idx} style={{ position: "relative", listStyleType: "none", paddingLeft: "14px" }}>
              {/* Custom Golden Bullet Dot */}
              <span style={{
                position: "absolute",
                left: 0,
                top: "10px",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent)"
              }}></span>
              {parseInlineElements(item)}
            </li>
          ))}
        </ul>
      );
    }
  };

  const renderTableBlock = (rows, key) => {
    if (rows.length < 2) return null; // Needs at least a header and visual divider
    
    // Parse header row
    const headerCols = rows[0].split("|").slice(1, -1).map(c => c.trim());
    
    // Parse alignment details (from row index 1)
    const alignRow = rows[1].split("|").slice(1, -1).map(c => {
      const trimmed = c.trim();
      if (trimmed.startsWith(":") && trimmed.endsWith(":")) return "center";
      if (trimmed.endsWith(":")) return "right";
      return "left";
    });

    // Parse body rows
    const bodyRows = rows.slice(2).map(r => r.split("|").slice(1, -1).map(c => c.trim()));

    return (
      <div key={key} style={{ overflowX: "auto", margin: "24px 0", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "13.5px",
          textAlign: "left",
          background: "rgba(2, 12, 32, 0.4)",
          backdropFilter: "blur(10px)"
        }}>
          <thead>
            <tr style={{ background: "rgba(0, 79, 210, 0.12)", borderBottom: "1px solid var(--border)" }}>
              {headerCols.map((col, idx) => (
                <th 
                  key={idx} 
                  style={{
                    padding: "12px 16px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    textAlign: alignRow[idx] || "left",
                    fontFamily: "var(--font-sans)"
                  }}
                >
                  {parseInlineElements(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, rIdx) => (
              <tr 
                key={rIdx} 
                style={{ 
                  borderBottom: rIdx === bodyRows.length - 1 ? "none" : "1px solid rgba(255,255,255,0.04)",
                  background: rIdx % 2 === 1 ? "rgba(255,255,255,0.01)" : "transparent"
                }}
                className="hover:bg-white/5 transition-colors"
              >
                {row.map((cell, cIdx) => (
                  <td 
                    key={cIdx} 
                    style={{
                      padding: "12px 16px",
                      color: "var(--text-secondary)",
                      textAlign: alignRow[cIdx] || "left",
                      fontFamily: "var(--font-sans)"
                    }}
                  >
                    {parseInlineElements(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="markdown-body">
      {parts.map((part, index) => {
        if (part.type === "code") {
          if (part.language === "mermaid") {
            return <InteractiveSequenceDiagram key={index} />;
          }
          return <TerminalCodeBlock key={index} code={part.content} language={part.language} />;
        }
        return renderTextBlock(part.content, index);
      })}
    </div>
  );
}
