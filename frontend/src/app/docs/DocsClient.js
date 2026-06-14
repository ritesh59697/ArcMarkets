"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { 
  BookOpen, Search, ArrowLeft, Info, HelpCircle, 
  Menu, X, Sun, Moon, ArrowUpRight, Compass
} from "lucide-react";
import MarkdownRenderer from "../../components/MarkdownRenderer";

export default function DocsClient({ howItWorks, readme }) {
  const [activeTab, setActiveTab] = useState("how-it-works"); // 'how-it-works' or 'readme'
  const [searchQuery, setSearchQuery] = useState("");
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

  const activeContent = activeTab === "how-it-works" ? howItWorks : readme;

  // Extract headings from the current document content for the Table of Contents sidebar
  const headings = useMemo(() => {
    if (!activeContent) return [];
    
    return activeContent
      .split("\n")
      .map((line, lineIdx) => {
        const match = /^(#{1,4})\s+(.*)$/.exec(line.trim());
        if (match) {
          const level = match[1].length;
          const rawTitle = match[2];
          // Strip any inline markdown formatting (bold, links, etc) for the clean sidebar title
          const title = rawTitle.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
          const slug = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          return { level, title, slug, key: `${lineIdx}-${slug}` };
        }
        return null;
      })
      .filter(Boolean);
  }, [activeContent]);

  // Filter headings based on query in sidebar
  const filteredHeadings = useMemo(() => {
    if (!searchQuery.trim()) return headings;
    const q = searchQuery.toLowerCase();
    return headings.filter(h => h.title.toLowerCase().includes(q));
  }, [headings, searchQuery]);

  // Handle smooth scroll navigation click
  const handleHeadingClick = (slug) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(slug);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div style={{
      background: "var(--bg)",
      color: "var(--text-primary)",
      minHeight: "100vh",
      fontFamily: "var(--font-sans)",
      display: "flex",
      flexDirection: "column"
    }}>
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
      }}>
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
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>ArcMarkets Docs</div>
            <div style={{ fontSize: 9, color: "var(--accent)", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>User &amp; System Guides</div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Theme switcher */}
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
          
          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: "var(--primary)",
              border: "none",
              borderRadius: 6,
              padding: "8px 12px",
              color: "white",
              display: "none", // Will show on responsive media queries in CSS
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer"
            }}
            className="mobile-only-flex"
          >
            {mobileMenuOpen ? <X size={14} /> : <Menu size={14} />}
            <span>Menu</span>
          </button>
        </div>
      </header>

      {/* WORKSPACE AREA */}
      <div style={{ display: "flex", flex: 1, position: "relative" }}>
        
        {/* SIDEBAR NAVIGATION (Desktop) */}
        <aside 
          style={{
            width: 300,
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
          className="desktop-sidebar"
        >
          {/* Tab Selector Buttons */}
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: 1.2, fontWeight: 700, marginBottom: 8 }}>
              Documentation Section
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button 
                onClick={() => { setActiveTab("how-it-works"); setSearchQuery(""); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: activeTab === "how-it-works" ? "var(--primary)" : "transparent",
                  color: activeTab === "how-it-works" ? "white" : "var(--text-secondary)",
                  border: activeTab === "how-it-works" ? "none" : "1px solid transparent",
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                className={activeTab !== "how-it-works" ? "hover:bg-primary/5 dark:hover:bg-white/5" : ""}
              >
                <HelpCircle size={15} /> How it Works
              </button>
              <button 
                onClick={() => { setActiveTab("readme"); setSearchQuery(""); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: activeTab === "readme" ? "var(--primary)" : "transparent",
                  color: activeTab === "readme" ? "white" : "var(--text-secondary)",
                  border: activeTab === "readme" ? "none" : "1px solid transparent",
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                className={activeTab !== "readme" ? "hover:bg-primary/5 dark:hover:bg-white/5" : ""}
              >
                <BookOpen size={15} /> System Overview
              </button>
            </div>
          </div>

          {/* Quick Search Input */}
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: 1.2, fontWeight: 700, marginBottom: 8 }}>
              Search Topics
            </div>
            <div style={{ position: "relative" }}>
              <input 
                type="text"
                placeholder="Type to filter chapters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 30px",
                  borderRadius: 6,
                  background: "rgba(2, 12, 32, 0.6)",
                  border: "1px solid var(--border)",
                  color: "white",
                  fontSize: 12,
                  outline: "none",
                  transition: "all 0.2s"
                }}
                className="focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <Search size={12} style={{ position: "absolute", left: 10, top: 11, color: "var(--text-muted)" }} />
            </div>
          </div>

          {/* Headings Table of Contents */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: 1.2, fontWeight: 700 }}>
              On This Page
            </div>
            {filteredHeadings.length === 0 ? (
              <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "8px 4px" }}>
                No headings found
              </div>
            ) : (
              <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {filteredHeadings.map((h) => {
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
            )}
          </div>
        </aside>

        {/* MOBILE DRAWER TABLE OF CONTENTS */}
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
          >
            {/* Mob Tab selector */}
            <div style={{ display: "flex", gap: 10 }}>
              <button 
                onClick={() => { setActiveTab("how-it-works"); setMobileMenuOpen(false); setSearchQuery(""); }}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px",
                  borderRadius: 8,
                  background: activeTab === "how-it-works" ? "var(--primary)" : "rgba(255,255,255,0.05)",
                  color: "white",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                <HelpCircle size={15} /> How it Works
              </button>
              <button 
                onClick={() => { setActiveTab("readme"); setMobileMenuOpen(false); setSearchQuery(""); }}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px",
                  borderRadius: 8,
                  background: activeTab === "readme" ? "var(--primary)" : "rgba(255,255,255,0.05)",
                  color: "white",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                <BookOpen size={15} /> Dev Specs
              </button>
            </div>

            {/* Mobile Headings */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: 1.2, fontWeight: 700 }}>
                Jump to Chapter
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

        {/* MAIN READER BODY PANEL */}
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
          {/* Floating welcome breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)", marginBottom: 12, fontWeight: 600 }}>
            <BookOpen size={12} style={{ color: "var(--accent)" }} /> 
            <span>DOCUMENTATION</span> 
            <span>/</span>
            <span style={{ color: "var(--accent)", textTransform: "uppercase" }}>{activeTab.replace("-", " ")}</span>
          </div>

          <MarkdownRenderer content={activeContent} />

          {/* Quick Support / Contact Callout */}
          <div style={{
            background: "rgba(4, 18, 48, 0.45)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "20px",
            marginTop: "60px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16
          }}>
            <div>
              <h5 style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                Need technical assistance or found a bug?
              </h5>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                Join our prediction community, review smart contract audits, or speak directly to a builder.
              </p>
            </div>
            <Link href="/" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--primary)",
              color: "white",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              textDecoration: "none"
            }}>
              Return to Prediction Portal <Compass size={12} />
            </Link>
          </div>
        </main>

      </div>

      {/* INJECT CONTAINER CSS RESPONSIVE OVERRIDES */}
      <style jsx global>{`
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
