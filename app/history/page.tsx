"use client";

/**
 * app/history/page.tsx - History / Log Archive screen
 *
 * Technical Scratchpad Archive:
 *  - Monospace filter chips (ALL, PENDING, ENRICHED, ERROR)
 *  - Monospace search field
 *  - Stream / Log list
 */

import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ItemCard } from "@/components/ItemCard";
import { db, updateItem, deleteItem, type Item, type ItemStatus } from "@/lib/db";
import { syncToSupabase } from "@/lib/sync";
import { retryFailed } from "@/lib/process";

type FilterChip = "all" | "pending" | "done" | "error";

const CHIPS: { label: string; value: FilterChip }[] = [
  { label: "ALL", value: "all" },
  { label: "PENDING", value: "pending" },
  { label: "ENRICHED", value: "done" },
  { label: "ERROR", value: "error" },
];

export default function HistoryPage() {
  const [filter, setFilter] = useState<FilterChip>("all");
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
        filter === "all" ||
        (filter === "pending" &&
          (item.status === "pending" || item.status === "ready_to_process" || item.status === "processing")) ||
        item.status === filter;

      const searchMatch =
        !search.trim() ||
        item.content.toLowerCase().includes(search.trim().toLowerCase());

      return statusMatch && searchMatch;
    });
  }, [allItems, filter, search]);

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

        {/* Filter chips */}
        <div
          className="bb-chip-group"
          style={{ marginTop: "0.875rem" }}
          role="group"
          aria-label="Filter by status"
        >
          {CHIPS.map(({ label, value }) => (
            <button
              key={value}
              className={`bb-chip${filter === value ? " bb-chip--active" : ""}`}
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
            >
              [{label}]
            </button>
          ))}

          {errorCount > 0 && filter !== "error" && (
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
              : filter === "all"
                ? "NO LOG ENTRIES YET"
                : `NO ${filter.toUpperCase()} ENTRIES`}
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
