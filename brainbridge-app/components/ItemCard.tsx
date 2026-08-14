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

/** Returns a human-readable relative time string, e.g. "2m ago", "just now". */
function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
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
    <article className="bb-card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
        {/* Content */}
        <button
          onClick={() => hasEnrichment && setExpanded((e) => !e)}
          style={{
            flex: 1,
            textAlign: "left",
            background: "none",
            border: "none",
            color: "var(--text)",
            fontSize: "0.95rem",
            lineHeight: 1.5,
            cursor: hasEnrichment ? "pointer" : "default",
            padding: 0,
          }}
          aria-expanded={hasEnrichment ? expanded : undefined}
          aria-label={hasEnrichment ? (expanded ? "Collapse enrichment" : "Expand enrichment") : undefined}
        >
          {item.content}
          {hasEnrichment && (
            <span style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginLeft: "0.5rem" }}>
              {expanded ? "▲" : "▼"}
            </span>
          )}
        </button>

        {/* Status + time */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem", flexShrink: 0 }}>
          <StatusBadge status={item.status} />
          <time className="bb-time" dateTime={item.created_at}>
            {relativeTime(item.created_at)}
          </time>
        </div>
      </div>

      {/* Error message */}
      {item.status === "error" && item.error_message && (
        <p style={{ fontSize: "0.78rem", color: "var(--status-error)", margin: 0 }}>
          ✕ {item.error_message}
        </p>
      )}

      {/* Enrichment (expanded) */}
      {hasEnrichment && expanded && (
        <div className="bb-enrichment">
          {item.enriched_summary && (
            <p className="bb-enrichment-summary">{item.enriched_summary}</p>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="bb-tags">
              {item.tags.map((t) => (
                <span key={t} className="bb-tag">{t}</span>
              ))}
            </div>
          )}

          {item.enriched_links && item.enriched_links.length > 0 && (
            <div className="bb-enrichment-links">
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
            <a
              href={`https://notion.so/${item.notion_page_id.replace(/-/g, "")}`}
              className="bb-enrichment-link"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--text-dim)" }}
            >
              📄 Open in Notion
            </a>
          )}
        </div>
      )}

      {/* Action buttons */}
      {showActions && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
          {item.status === "error" && onRetry && (
            <button
              className="bb-btn bb-btn-ghost"
              style={{ padding: "0.4rem 0.875rem", fontSize: "0.8rem", minHeight: 36 }}
              onClick={() => onRetry(item.id)}
            >
              ↺ Retry
            </button>
          )}

          {item.status === "pending" && onMarkDone && (
            <button
              className="bb-btn bb-btn-ghost"
              style={{ padding: "0.4rem 0.875rem", fontSize: "0.8rem", minHeight: 36 }}
              onClick={() => onMarkDone(item.id)}
            >
              ✓ Mark done
            </button>
          )}

          {onDelete && (
            <button
              className="bb-btn bb-btn-ghost"
              style={{
                padding: "0.4rem 0.875rem",
                fontSize: "0.8rem",
                minHeight: 36,
                marginLeft: "auto",
                color: "var(--status-error)",
              }}
              onClick={() => onDelete(item.id)}
              aria-label="Delete item"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </article>
  );
}
