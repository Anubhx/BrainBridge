"use client";

/**
 * app/history/page.tsx - History / Log Archive screen
 *
 * Technical Scratchpad Archive:
 *  - Status filter chips (ALL, PENDING, ENRICHED, ERROR)
 *  - Depth filter chips (ALL, QUICK, DEEP, RESEARCH)
 *  - Monospace search field
 *  - Stream / Log list
 */

import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ItemCard } from "@/components/ItemCard";
import { db, updateItem, deleteItem, type Item, type ItemStatus, type Depth } from "@/lib/db";
import { syncToSupabase } from "@/lib/sync";
import { retryFailed } from "@/lib/process";

type StatusFilterChip = "all" | "pending" | "done" | "error";
type DepthFilterChip = "all" | Depth;

const STATUS_CHIPS: { label: string; value: StatusFilterChip }[] = [
  { label: "ALL STATUS", value: "all" },
  { label: "PENDING", value: "pending" },
  { label: "ENRICHED", value: "done" },
  { label: "ERROR", value: "error" },
];

const DEPTH_CHIPS: { label: string; value: DepthFilterChip; color: string }[] = [
  { label: "ALL DEPTHS", value: "all", color: "var(--text-muted)" },
  { label: "QUICK", value: "quick", color: "#E8A33D" },
  { label: "DEEP", value: "deep", color: "#5B9BD5" },
  { label: "RESEARCH", value: "research", color: "#9B7ED4" },
];

export default function HistoryPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilterChip>("all");
  const [depthFilter, setDepthFilter] = useState<DepthFilterChip>("all");
  const [search, setSearch] = useState("");

  const allItems = useLiveQuery(
    () => db.items.orderBy("created_at").reverse().toArray(),
    [],
    [] as Item[]
  );

  const displayItems = useMemo(() => {
    if (!allItems) return [];
    return allItems.filter((item) => {
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "pending" &&
          (item.status === "pending" || item.status === "ready_to_process" || item.status === "processing")) ||
        item.status === statusFilter;

      const itemDepth = item.depth || "quick";
      const depthMatch = depthFilter === "all" || itemDepth === depthFilter;

      const searchMatch =
        !search.trim() ||
        item.content.toLowerCase().includes(search.trim().toLowerCase());

      return statusMatch && depthMatch && searchMatch;
    });
  }, [allItems, statusFilter, depthFilter, search]);

  const errorCount = allItems?.filter((i) => i.status === "error").length ?? 0;

  const handleRetry = async (id: string) => {
    await updateItem(id, { status: "ready_to_process", error_message: null, synced: false });
    void syncToSupabase();
  };

  const handleRetryAll = async () => {
    await retryFailed();
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
    if (navigator.onLine) {
      const { supabase } = await import("@/lib/supabase");
      await supabase.from("items").delete().eq("id", id);
    }
  };

  const handleMarkDone = async (id: string) => {
    await updateItem(id, { status: "done" as ItemStatus, synced: false });
    void syncToSupabase();
  };

  return (
    <main className="bb-page" style={{ paddingBottom: "3rem" }}>
      <div style={{ paddingTop: "1.25rem" }}>
        {/* Search */}
        <input
          id="history-search"
          type="search"
          className="bb-input"
          placeholder="SEARCH ARCHIVE BY CONTENT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search items"
        />

        {/* Row 1: Status filter chips */}
        <div
          className="bb-chip-group"
          style={{ marginTop: "0.875rem" }}
          role="group"
          aria-label="Filter by status"
        >
          {STATUS_CHIPS.map(({ label, value }) => (
            <button
              key={value}
              className={`bb-chip${statusFilter === value ? " bb-chip--active" : ""}`}
              onClick={() => setStatusFilter(value)}
              aria-pressed={statusFilter === value}
            >
              [{label}]
            </button>
          ))}

          {errorCount > 0 && statusFilter !== "error" && (
            <span
              className="bb-mono"
              style={{
                marginLeft: "auto",
                fontSize: "0.72rem",
                color: "var(--red)",
                alignSelf: "center",
              }}
            >
              [{errorCount} ERRORS]
            </span>
          )}
        </div>

        {/* Row 2: Depth filter chips */}
        <div
          className="bb-chip-group"
          style={{ marginTop: "0.5rem" }}
          role="group"
          aria-label="Filter by depth"
        >
          {DEPTH_CHIPS.map(({ label, value, color }) => {
            const isActive = depthFilter === value;
            return (
              <button
                key={value}
                type="button"
                className="bb-mono"
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  padding: "3px 10px",
                  borderRadius: "2px",
                  border: `1px solid ${isActive ? color : "#383633"}`,
                  background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                  color: isActive ? color : "#9A948E",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
                onClick={() => setDepthFilter(value)}
                aria-pressed={isActive}
              >
                [{label}]
              </button>
            );
          })}
        </div>

        {/* Retry all errors shortcut */}
        {errorCount > 0 && (
          <div style={{ marginTop: "0.75rem" }}>
            <button
              id="retry-all-btn"
              className="bb-btn bb-btn-danger"
              style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
              onClick={handleRetryAll}
            >
              ↺ RETRY ALL {errorCount} FAILED ITEMS
            </button>
          </div>
        )}
      </div>

      {/* Items Stream */}
      <div style={{ marginTop: "1.25rem" }}>
        {allItems === undefined ? (
          <div className="bb-empty">
            <span className="bb-spinner" /> LOADING ARCHIVE...
          </div>
        ) : displayItems.length === 0 ? (
          <div className="bb-empty">
            {search.trim()
              ? `NO ENTRIES MATCHING "${search.toUpperCase()}"`
              : statusFilter === "all" && depthFilter === "all"
                ? "NO LOG ENTRIES YET"
                : `NO MATCHING ENTRIES FOR SELECTED FILTERS`}
          </div>
        ) : (
          <div className="bb-stream">
            {displayItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onRetry={handleRetry}
                onMarkDone={handleMarkDone}
                showActions
              />
            ))}
          </div>
        )}

        {allItems && displayItems.length > 0 && (
          <div
            className="bb-mono"
            style={{
              textAlign: "center",
              color: "var(--text-dim)",
              fontSize: "0.72rem",
              marginTop: "1.5rem",
              letterSpacing: "0.04em",
            }}
          >
            TOTAL DISPLAYED: {displayItems.length}
          </div>
        )}
      </div>
    </main>
  );
}
