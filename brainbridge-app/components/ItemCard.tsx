"use client";

import { useState } from "react";
import { StatusBadge } from "./StatusBadge";
import type { Item } from "@/lib/db";

interface ItemCardProps {
  item: Item;
  onDelete?: (id: string) => void;
  onRetry?: (id: string) => void;
  onMarkDone?: (id: string) => void;
  showActions?: boolean;
}

/** Format timestamp into precise technical mono format (e.g. "14:20 • 2m ago") */
function formatTime(isoString: string): string {
  const d = new Date(isoString);
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const timeStr = `${hours}:${mins}`;

  const diff = Date.now() - d.getTime();
  const diffMins = Math.floor(diff / 60_000);
  if (diffMins < 1)  return `${timeStr} • just now`;
  if (diffMins < 60) return `${timeStr} • ${diffMins}m ago`;
  const hrs = Math.floor(diffMins / 60);
  if (hrs < 24)  return `${timeStr} • ${hrs}h ago`;
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
  const hasEnrichment = item.status === "done" && (item.enriched_summary || item.enriched_links);

  return (
    <article className={`bb-stream-item bb-stream-item--${item.status}`}>
      {/* Metadata Bar: Monospace System Log Header */}
      <div className="bb-stream-meta">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <time dateTime={item.created_at} className="bb-mono" style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>
            {formatTime(item.created_at)}
          </time>
          <StatusBadge status={item.status} />
        </div>

        {hasEnrichment && (
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
            {expanded ? "[ COLLAPSE SYSTEM KNOWLEDGE ▲ ]" : "[ VIEW ENRICHED KNOWLEDGE ▼ ]"}
          </button>
        )}
      </div>

      {/* Raw Thought Content: Clean Humanist Sans */}
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
          ERR: {item.error_message}
        </div>
      )}

      {/* Enriched Knowledge Block (Monospace + Sans Structured Layout) */}
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

          {item.tags && item.tags.length > 0 && (
            <div className="bb-tags">
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
            <div style={{ marginTop: "0.2rem" }}>
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
