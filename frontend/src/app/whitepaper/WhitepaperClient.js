"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { 
  ArrowLeft, FileText, Printer, Menu, X, Sun, Moon, Compass
} from "lucide-react";
import MarkdownRenderer from "../../components/MarkdownRenderer";

export default function WhitepaperClient({ whitepaper }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  
  const contentRef = useRef(null);

  // Sync theme with document element
  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(t);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "data-theme") {
          const newTheme = document.documentElement.getAttribute("data-theme") || "light";
          setTheme(newTheme);
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("arcmarkets-theme", newTheme);
    setTheme(newTheme);
  };

  // Extract headings from the whitepaper content for the sidebar
  const headings = useMemo(() => {
    if (!whitepaper) return [];
    
    return whitepaper
      .split("\n")
      .map((line, lineIdx) => {
        const match = /^(#{1,3})\s+(.*)$/.exec(line.trim());
        if (match) {
          const level = match[1].length;
          const rawTitle = match[2];
          // Strip bold markers, links or subscripts
          const title = rawTitle.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
          const slug = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          return { level, title, slug, key: `${lineIdx}-${slug}` };
        }
        return null;
      })
      .filter(Boolean);
  }, [whitepaper]);

  // Handle smooth scroll navigation
  const handleHeadingClick = (slug) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(slug);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div style={{
      background: "var(--bg)",
      color: "var(--text-primary)",
      minHeight: "100vh",
      fontFamily: "var(--font-sans)",
      display: "flex",
      flexDirection: "column"
    }} className="print-safe">
      
      {/* HEADER BAR */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "var(--navbar-bg)",
        borderBottom: "1px solid var(--navbar-border)",
        backdropFilter: "blur(20px)",
        padding: "14px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }} className="no-print">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(100, 116, 139, 0.05)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 14px",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--text-secondary)",
            textDecoration: "none",
            cursor: "pointer",
            transition: "all 0.2s"
          }} className="hover:bg-primary/5 hover:text-primary dark:hover:bg-white/10 dark:hover:text-white">
            <ArrowLeft size={14} /> Back to DApp
          </Link>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>ArcMarkets Whitepaper</div>
            <div style={{ fontSize: 9, color: "var(--accent)", letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700 }}>Technical Protocol Specification</div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Print button */}
          <button
            onClick={triggerPrint}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            className="hover:bg-white/5 hover:text-white"
          >
            <Printer size={14} /> Print / PDF
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            className="hover:bg-white/5"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          
          {/* Mobile TOC selector */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: "var(--primary)",
              border: "none",
              borderRadius: 6,
              padding: "8px 12px",
              color: "white",
              display: "none",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer"
            }}
            className="mobile-only-flex"
          >
            {mobileMenuOpen ? <X size={14} /> : <Menu size={14} />}
            <span>Chapters</span>
          </button>
        </div>
      </header>

      {/* WORKSPACE AREA */}
      <div style={{ display: "flex", flex: 1, position: "relative" }}>
        
        {/* SIDEBAR NAVIGATION (Desktop) */}
        <aside 
          style={{
            width: 320,
            background: "rgba(4, 18, 48, 0.2)",
            borderRight: "1px solid var(--border)",
            padding: "24px",
            position: "sticky",
            top: 65,
            height: "calc(100vh - 65px)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 20
          }}
          className="desktop-sidebar no-print"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: 1.2, fontWeight: 700 }}>
              Technical Specifications
            </div>
            
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {headings.map((h) => {
                const paddingLeft = (h.level - 1) * 12;
                return (
                  <button
                    key={h.key}
                    onClick={() => handleHeadingClick(h.slug)}
                    style={{
                      paddingLeft: `${Math.max(4, paddingLeft)}px`,
                      paddingTop: "6px",
                      paddingBottom: "6px",
                      background: "none",
                      border: "none",
                      color: h.level === 1 ? "var(--accent)" : "var(--text-secondary)",
                      fontSize: h.level === 1 ? "12px" : "11.5px",
                      fontWeight: h.level === 1 ? 700 : 500,
                      textAlign: "left",
                      cursor: "pointer",
                      width: "100%",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      opacity: 0.85,
                      transition: "all 0.15s"
                    }}
                    className="hover:text-primary hover:opacity-100"
                  >
                    {h.title}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* MOBILE DRAWER TOC */}
        {mobileMenuOpen && (
          <div 
            style={{
              position: "fixed",
              top: 65,
              left: 0,
              bottom: 0,
              right: 0,
              zIndex: 90,
              background: "rgba(1, 10, 24, 0.95)",
              backdropFilter: "blur(10px)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              overflowY: "auto"
            }}
            className="no-print"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: 1.2, fontWeight: 700 }}>
                Table of Contents
              </div>
              <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {headings.map((h) => {
                  const paddingLeft = (h.level - 1) * 14;
                  return (
                    <button
                      key={h.key}
                      onClick={() => handleHeadingClick(h.slug)}
                      style={{
                        paddingLeft: `${paddingLeft}px`,
                        paddingTop: "8px",
                        paddingBottom: "8px",
                        background: "none",
                        border: "none",
                        color: h.level === 1 ? "var(--accent)" : "var(--text-secondary)",
                        fontSize: h.level === 1 ? "14px" : "13px",
                        fontWeight: h.level === 1 ? 700 : 500,
                        textAlign: "left",
                        cursor: "pointer",
                        width: "100%"
                      }}
                    >
                      {h.title}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* MAIN READER PANEL */}
        <main 
          ref={contentRef}
          style={{
            flex: 1,
            padding: "40px",
            overflowY: "auto",
            maxWidth: 960,
            margin: "0 auto"
          }}
          className="docs-reader-panel"
        >
          {/* Print PDF Tip Card */}
          <div style={{
            background: "rgba(245, 192, 24, 0.04)",
            border: "1px dashed rgba(245, 192, 24, 0.28)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 18px",
            fontSize: "12px",
            color: "var(--text-secondary)",
            marginBottom: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12
          }} className="no-print">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={16} style={{ color: "var(--accent)" }} />
              <span>
                <strong>Document Tip:</strong> You can export this whitepaper as a PDF for offline reading by pressing <strong>Cmd+P</strong> or clicking PDF.
              </span>
            </div>
            <button 
              onClick={triggerPrint} 
              style={{
                background: "rgba(245, 192, 24, 0.12)",
                border: "none",
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--accent)",
                cursor: "pointer"
              }}
            >
              Export now
            </button>
          </div>

          {/* Heading intro breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)", marginBottom: 12, fontWeight: 600 }} className="no-print">
            <FileText size={12} style={{ color: "var(--accent)" }} /> 
            <span>WHITEPAPER SPECIFICATION</span> 
            <span>/</span>
            <span style={{ color: "var(--accent)" }}>VERSION 1.0</span>
          </div>

          <MarkdownRenderer content={whitepaper} />

          <div style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "24px",
            marginTop: "60px",
            textAlign: "center",
            fontSize: "11.5px",
            color: "var(--text-muted)"
          }} className="no-print">
            <p>© 2026 ArcMarkets Protocol. All rights reserved. Secured by the Arc Network Testnet.</p>
            <Link href="/" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: "var(--royal-bright)",
              textDecoration: "none",
              marginTop: 10,
              fontWeight: 600
            }}>
              Return to Betting Portal <Compass size={12} />
            </Link>
          </div>
        </main>

      </div>

      {/* PRINT-SPECIFIC CSS STYLING OVERRIDES */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-safe {
            background: white !important;
            color: black !important;
          }
          .docs-reader-panel {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          p, li, td, th {
            color: #111 !important;
          }
          h1, h2, h3, h4, strong {
            color: black !important;
          }
        }
        @media (max-width: 900px) {
          .desktop-sidebar {
            display: none !important;
          }
          .mobile-only-flex {
            display: flex !important;
          }
          .docs-reader-panel {
            padding: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
