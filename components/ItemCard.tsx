"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import type { Item, Depth } from "@/lib/db";

interface ItemCardProps {
  item: Item;
  onDelete?: (id: string) => void;
  onRetry?: (id: string) => void;
  onMarkDone?: (id: string) => void;
  showActions?: boolean;
}

const DEPTH_STYLE: Record<Depth, { label: string; color: string; bg: string }> = {
  quick: { label: "QUICK", color: "#E8A33D", bg: "rgba(232, 163, 61, 0.08)" },
  deep: { label: "DEEP", color: "#5B9BD5", bg: "rgba(91, 155, 213, 0.08)" },
  research: { label: "RESEARCH", color: "#9B7ED4", bg: "rgba(155, 126, 212, 0.08)" },
};

const PROCESSING_HINTS: Record<Depth, string> = {
  quick: "⟳ Gemini Flash-Lite",
  deep: "⟳ Gemini → Mistral-7B",
  research: "⟳ Gemini → Llama-3B → Mistral-7B",
};

/** Format timestamp into precise technical mono format (e.g. "14:20 • 2m ago") */
function formatTime(isoString: string): string {
  const d = new Date(isoString);
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const timeStr = `${hours}:${mins}`;

  const diff = Date.now() - d.getTime();
  const diffMins = Math.floor(diff / 60_000);
  if (diffMins < 1) return `${timeStr} • just now`;
  if (diffMins < 60) return `${timeStr} • ${diffMins}m ago`;
  const hrs = Math.floor(diffMins / 60);
  if (hrs < 24) return `${timeStr} • ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${timeStr} • ${days}d ago`;
}

export function ItemCard({
  item,
  onDelete,
  onRetry,
  onMarkDone,
  showActions = true,
}: ItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasEnrichment =
    item.status === "done" && (item.enriched_summary || item.enriched_links);
  const itemDepth = item.depth || "quick";
  const depthInfo = DEPTH_STYLE[itemDepth];

  return (
    <article className={`bb-stream-item bb-stream-item--${item.status}`}>
      {/* Metadata Bar: Monospace System Log Header */}
      <div className="bb-stream-meta">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {/* Depth Badge */}
          <span
            className="bb-mono"
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              padding: "0.1rem 0.35rem",
              borderRadius: "2px",
              color: depthInfo.color,
              backgroundColor: depthInfo.bg,
              border: `1px solid ${depthInfo.color}`,
              letterSpacing: "0.06em",
            }}
          >
            {depthInfo.label}
          </span>

          <StatusBadge status={item.status} />

          {/* Processing agent pipeline hint */}
          {(item.status === "processing" || item.status === "ready_to_process") && (
            <span className="bb-mono" style={{ fontSize: "0.68rem", color: "#F59E0B" }}>
              {PROCESSING_HINTS[itemDepth]}
            </span>
          )}

          {/* Model Primary / Fallback chip */}
          {item.model_primary && item.status === "done" && (
            <span className="bb-mono" style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
              [{item.model_primary}{item.model_fallback ? ` → ${item.model_fallback}` : ""}]
            </span>
          )}

          <time dateTime={item.created_at} className="bb-mono" style={{ color: "var(--text-dim)", fontSize: "0.72rem", marginLeft: "auto" }}>
            {formatTime(item.created_at)}
          </time>
        </div>

        {hasEnrichment && (
          <div style={{ marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "space-between" }}>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="bb-btn bb-btn-ghost"
              style={{
                padding: "0.15rem 0.4rem",
                fontSize: "0.7rem",
                color: "var(--teal)",
              }}
              aria-expanded={expanded}
            >
              {expanded ? "[ COLLAPSE KNOWLEDGE ▲ ]" : "[ VIEW ENRICHED KNOWLEDGE ▼ ]"}
            </button>

            {itemDepth === "research" && (
              <Link
                href={`/research?id=${item.id}`}
                className="bb-btn bb-btn-primary"
                style={{
                  fontSize: "0.7rem",
                  padding: "0.15rem 0.45rem",
                  textDecoration: "none",
                  backgroundColor: "rgba(155, 126, 212, 0.15)",
                  borderColor: "#9B7ED4",
                  color: "#9B7ED4",
                }}
              >
                VIEW REPORT →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Raw Thought Content */}
      <div
        className="bb-stream-content"
        onClick={() => hasEnrichment && setExpanded((e) => !e)}
        style={{ cursor: hasEnrichment ? "pointer" : "default" }}
      >
        {item.content}
      </div>

      {/* Error Output */}
      {item.status === "error" && item.error_message && (
        <div className="bb-mono" style={{ fontSize: "0.75rem", color: "var(--red)", marginTop: "0.4rem" }}>
          ERR: {item.error_message} {item.retry_count ? `(RETRIED ${item.retry_count}x)` : ""}
        </div>
      )}

      {/* Enriched Knowledge Block */}
      {hasEnrichment && expanded && (
        <div className="bb-enrichment">
          {item.enriched_summary && (
            <div>
              <div className="bb-mono" style={{ fontSize: "0.68rem", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                // AI ENRICHED SUMMARY
              </div>
              <p className="bb-enrichment-summary">{item.enriched_summary}</p>
            </div>
          )}

          {/* Key concepts chips (Deep & Research items) */}
          {item.key_concepts && item.key_concepts.length > 0 && (
            <div style={{ marginTop: "0.4rem" }}>
              <div className="bb-mono" style={{ fontSize: "0.68rem", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                // KEY CONCEPTS
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
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
                      padding: "0.1rem 0.35rem",
                    }}
                  >
                    {kc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="bb-tags" style={{ marginTop: "0.4rem" }}>
              {item.tags.map((t) => (
                <span key={t} className="bb-tag">#{t}</span>
              ))}
            </div>
          )}

          {item.enriched_links && item.enriched_links.length > 0 && (
            <div className="bb-enrichment-links">
              <div className="bb-mono" style={{ fontSize: "0.68rem", color: "var(--text-dim)", textTransform: "uppercase", marginTop: "0.25rem" }}>
                // REFERENCE SOURCES
              </div>
              {item.enriched_links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  className="bb-enrichment-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ↗ {link.title}
                </a>
              ))}
            </div>
          )}

          {item.notion_page_id && (
            <div style={{ marginTop: "0.3rem" }}>
              <a
                href={`https://notion.so/${item.notion_page_id.replace(/-/g, "")}`}
                className="bb-enrichment-link"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--text-dim)" }}
              >
                📄 NOTION PAGE
              </a>
            </div>
          )}
        </div>
      )}

      {/* Action Controls */}
      {showActions && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          {item.status === "error" && onRetry && (
            <button
              className="bb-btn bb-btn-ghost"
              style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}
              onClick={() => onRetry(item.id)}
            >
              ↺ RETRY
            </button>
          )}

          {item.status === "pending" && onMarkDone && (
            <button
              className="bb-btn bb-btn-ghost"
              style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}
              onClick={() => onMarkDone(item.id)}
            >
              ✓ MARK DONE
            </button>
          )}

          {onDelete && (
            <button
              className="bb-btn bb-btn-ghost"
              style={{
                fontSize: "0.72rem",
                padding: "0.2rem 0.5rem",
                marginLeft: "auto",
                color: "var(--text-dim)",
              }}
              onClick={() => onDelete(item.id)}
              aria-label="Delete item"
            >
              DELETE
            </button>
          )}
        </div>
      )}
    </article>
  );
}
