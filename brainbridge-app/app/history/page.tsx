"use client";

/**
 * app/history/page.tsx — History / All Items screen
 *
 * PRD §11:
 *  - Filter chips: All / Pending / Done / Error
 *  - Search bar (filters by content)
 *  - Each card shows content + status + relative time
 *  - Expandable to show enrichment when status = done
 *  - Retry button on error items (FR-19)
 */

import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ItemCard } from "@/components/ItemCard";
import { db, updateItem, deleteItem, type Item, type ItemStatus } from "@/lib/db";
import { syncToSupabase } from "@/lib/sync";
import { retryFailed } from "@/lib/process";

type FilterChip = "all" | "pending" | "done" | "error";

const CHIPS: { label: string; value: FilterChip }[] = [
  { label: "All",     value: "all"     },
  { label: "Pending", value: "pending" },
  { label: "Done",    value: "done"    },
  { label: "Error",   value: "error"   },
];

export default function HistoryPage() {
  const [filter, setFilter] = useState<FilterChip>("all");
  const [search, setSearch]  = useState("");

  // Live-reactive: re-renders automatically when DB changes
  const allItems = useLiveQuery(
    () => db.items.orderBy("created_at").reverse().toArray(),
    [],
    [] as Item[]
  );

  // Client-side filter + search (data set is small for a personal tool)
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

  /** FR-19: Retry a single error item */
  const handleRetry = async (id: string) => {
    await updateItem(id, { status: "ready_to_process", error_message: null, synced: false });
    void syncToSupabase();
  };

  /** Retry ALL error items */
  const handleRetryAll = async () => {
    await retryFailed();
  };

  /** Delete item from both IndexedDB and Supabase */
  const handleDelete = async (id: string) => {
    await deleteItem(id);
    if (navigator.onLine) {
      const { supabase } = await import("@/lib/supabase");
      await supabase.from("items").delete().eq("id", id);
    }
  };

  /** Mark done (FR-8: manually skip enrichment) */
  const handleMarkDone = async (id: string) => {
    await updateItem(id, { status: "done" as ItemStatus, synced: false });
    void syncToSupabase();
  };

  return (
    <main className="bb-page" style={{ paddingBottom: "2rem" }}>
      <div style={{ paddingTop: "0.75rem" }}>
        {/* Search */}
        <input
          id="history-search"
          type="search"
          className="bb-input"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: "0.95rem", padding: "0.7rem 1rem" }}
          aria-label="Search items"
        />

        {/* Filter chips */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginTop: "0.75rem",
            flexWrap: "wrap",
          }}
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
              {label}
            </button>
          ))}

          {errorCount > 0 && filter !== "error" && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.78rem",
                color: "var(--status-error)",
                alignSelf: "center",
              }}
            >
              {errorCount} error{errorCount > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Retry all errors shortcut */}
        {errorCount > 0 && (
          <div style={{ marginTop: "0.75rem" }}>
            <button
              id="retry-all-btn"
              className="bb-btn bb-btn-ghost"
              style={{ fontSize: "0.82rem", padding: "0.4rem 0.875rem", minHeight: 36 }}
              onClick={handleRetryAll}
            >
              ↺ Retry all {errorCount} failed item{errorCount > 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>

      {/* Items list */}
      <div style={{ marginTop: "1rem" }}>
        {allItems === undefined ? (
          <p className="bb-empty">Loading…</p>
        ) : displayItems.length === 0 ? (
          <p className="bb-empty">
            {search.trim()
              ? `No items matching "${search}"`
              : filter === "all"
              ? "No items yet — head to Capture to add some."
              : `No ${filter} items.`}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
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
          <p
            style={{
              textAlign: "center",
              color: "var(--text-dim)",
              fontSize: "0.75rem",
              marginTop: "1.5rem",
            }}
          >
            {displayItems.length} item{displayItems.length !== 1 ? "s" : ""}
            {filter !== "all" || search ? " shown" : " total"}
          </p>
        )}
      </div>
    </main>
  );
}
