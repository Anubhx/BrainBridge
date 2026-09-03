"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { db, type Item, type ResearchSection } from "@/lib/db";

const SECTION_COLORS = [
  "#E8A33D", // 01 Key Points (amber)
  "#5FA8A0", // 02 Evidence & Context (teal)
  "#D9534F", // 03 Counterpoints (red)
  "#5B9BD5", // 04 Related Work (blue)
  "#9B7ED4", // 05 Practical Applications (purple)
  "#E8A33D", // 06 Action Items (amber)
];

function ResearchReportContent() {
  const params = useSearchParams();
  const itemId = params.get("id");
  const [item, setItem] = useState<Item | null>(null);
  const [sections, setSections] = useState<ResearchSection[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) {
      setLoading(false);
      setErrorMsg("No research item ID specified.");
      return;
    }

    async function loadReport() {
      setLoading(true);
      try {
        const currentId = itemId;
        if (!currentId) return;

        // Try fetching local first for zero latency
        const localItem = await db.items.get(currentId);
        if (localItem) {
          setItem(localItem);
        }

        // Fetch from Supabase items table
        if (navigator.onLine) {
          const { data: itemData, error: itemError } = await supabase
            .from("items")
            .select("*")
            .eq("id", currentId)
            .single();

          if (itemData) {
            setItem(itemData as Item);
          } else if (itemError && !localItem) {
            setErrorMsg("Research item not found.");
          }

          // Fetch research report sections
          const { data: sectionData } = await supabase
            .from("research_sections")
            .select("*")
            .eq("item_id", itemId)
            .order("section_order");

          if (sectionData && sectionData.length > 0) {
            setSections(sectionData as ResearchSection[]);
          }
        }
      } catch (err: any) {
        console.error("[BrainBridge] Research report load error:", err);
      } finally {
        setLoading(false);
      }
    }

    void loadReport();
  }, [itemId]);

  const toggleSection = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="bb-empty" style={{ paddingTop: "4rem" }}>
        <span className="bb-spinner" />
        <span style={{ marginLeft: "0.5rem" }}>LOADING RESEARCH REPORT...</span>
      </div>
    );
  }

  if (errorMsg || !item) {
    return (
      <div style={{ paddingTop: "2rem" }}>
        <Link href="/history" className="bb-btn bb-btn-ghost" style={{ fontSize: "0.75rem", marginBottom: "1rem" }}>
          ← BACK TO ARCHIVE
        </Link>
        <div className="bb-empty">{errorMsg || "REPORT NOT FOUND"}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem 0 4rem", maxWidth: "720px", margin: "0 auto" }}>
      {/* Navigation & Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/history"
          className="bb-btn bb-btn-ghost"
          style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
        >
          ← BACK TO ARCHIVE
        </Link>
      </div>

      {/* Main Report Header */}
      <div
        style={{
          marginBottom: "1.5rem",
          borderLeft: "3px solid #9B7ED4",
          paddingLeft: "1rem",
          backgroundColor: "var(--bg-surface, #252422)",
          padding: "1.25rem",
          borderRadius: "2px",
          border: "1px solid #383633",
          borderLeftWidth: "3px",
          borderLeftColor: "#9B7ED4",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <span
            className="bb-mono"
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              padding: "0.1rem 0.35rem",
              borderRadius: "2px",
              color: "#9B7ED4",
              backgroundColor: "rgba(155, 126, 212, 0.10)",
              border: "1px solid #9B7ED4",
              letterSpacing: "0.06em",
            }}
          >
            RESEARCH REPORT
          </span>
          {item.model_primary && (
            <span className="bb-mono" style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
              [{item.model_primary}{item.model_fallback ? ` → ${item.model_fallback}` : ""}]
            </span>
          )}
        </div>

        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary, #E8E4DF)", marginBottom: "0.75rem", lineHeight: 1.4 }}>
          {item.content}
        </h1>

        {item.enriched_summary && (
          <div>
            <div className="bb-mono" style={{ fontSize: "0.68rem", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
              // ABSTRACT SUMMARY
            </div>
            <p style={{ color: "var(--text-muted, #9A948E)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              {item.enriched_summary}
            </p>
          </div>
        )}

        {/* Key Concepts Chips */}
        {item.key_concepts && item.key_concepts.length > 0 && (
          <div style={{ marginTop: "0.75rem" }}>
            <div className="bb-mono" style={{ fontSize: "0.65rem", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              // EXTRACTED CONCEPTS
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {item.key_concepts.map((kc) => (
                <span
                  key={kc}
                  className="bb-mono"
                  style={{
                    fontSize: "0.68rem",
                    color: "#5B9BD5",
                    borderColor: "#5B9BD5",
                    backgroundColor: "rgba(91, 155, 213, 0.08)",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderRadius: "2px",
                    padding: "0.15rem 0.4rem",
                  }}
                >
                  {kc}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="bb-tags" style={{ marginTop: "0.75rem" }}>
            {item.tags.map((t) => (
              <span key={t} className="bb-tag">#{t}</span>
            ))}
          </div>
        )}

        {item.notion_page_id && (
          <div style={{ marginTop: "0.75rem" }}>
            <a
              href={`https://notion.so/${item.notion_page_id.replace(/-/g, "")}`}
              className="bb-enrichment-link"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--text-dim)" }}
            >
              📄 OPEN NOTION REPORT PAGE ↗
            </a>
          </div>
        )}
      </div>

      {/* Structured Accordion Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {sections.length === 0 ? (
          <div className="bb-empty" style={{ backgroundColor: "#252422", border: "1px solid #383633" }}>
            Report sections are currently generating or sync is pending.
          </div>
        ) : (
          sections.map((s, idx) => {
            const isExpanded = expanded.has(idx);
            const accentColor = SECTION_COLORS[idx % SECTION_COLORS.length];
            return (
              <div
                key={s.id || idx}
                style={{
                  border: "1px solid #383633",
                  borderRadius: "2px",
                  overflow: "hidden",
                  backgroundColor: "var(--bg-surface, #252422)",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleSection(idx)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem 1rem",
                    backgroundColor: "#252422",
                    border: "none",
                    color: "#E8E4DF",
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    textAlign: "left",
                    borderLeft: `3px solid ${accentColor}`,
                  }}
                  aria-expanded={isExpanded}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className="bb-mono" style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span>{s.section_title}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {s.model_used && (
                      <span className="bb-mono" style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                        {s.model_used}
                      </span>
                    )}
                    <span className="bb-mono" style={{ fontSize: "0.85rem", color: "var(--amber)" }}>
                      {isExpanded ? "−" : "+"}
                    </span>
                  </span>
                </button>
                {isExpanded && (
                  <div
                    style={{
                      padding: "1rem",
                      backgroundColor: "#131211",
                      borderTop: "1px solid #383633",
                      fontSize: "0.85rem",
                      color: "var(--text-muted, #9A948E)",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {s.section_content}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function ResearchPage() {
  return (
    <main className="bb-page">
      <Suspense fallback={
        <div className="bb-empty" style={{ paddingTop: "4rem" }}>
          <span className="bb-spinner" />
          <span style={{ marginLeft: "0.5rem" }}>LOADING REPORT...</span>
        </div>
      }>
        <ResearchReportContent />
      </Suspense>
    </main>
  );
}
