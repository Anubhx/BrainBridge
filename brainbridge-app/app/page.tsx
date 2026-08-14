"use client";

/**
 * app/page.tsx — Home / Capture screen
 *
 * PRD §11:
 *  - Large auto-focused input
 *  - Enter (without Shift) → save
 *  - Optimistic UI (item appears immediately)
 *  - Recent 10–20 items in chronological order (newest first)
 *  - Sticky "Process Now (N pending)" button
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { ItemCard } from "@/components/ItemCard";
import {
  db,
  createItem,
  getRecentItems,
  updateItem,
  deleteItem,
  type Item,
} from "@/lib/db";
import { syncToSupabase, syncItemNow } from "@/lib/sync";
import { processNow } from "@/lib/process";
import { useLiveQuery } from "dexie-react-hooks";

/** Toast notification (auto-dismisses) */
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className="bb-toast" role="status">{message}</div>;
}

export default function HomePage() {
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Live query: react to any DB changes automatically
  const recentItems = useLiveQuery(
    () => getRecentItems(20),
    [],
    [] as Item[]
  );

  const pendingCount =
    recentItems?.filter((i) => i.status === "pending").length ?? 0;

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const showToast = (msg: string) => setToast(msg);

  /** Save item — optimistic: IndexedDB first, then sync to Supabase */
  const handleSave = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || saving) return;

    setSaving(true);
    setInputValue("");

    try {
      const item = await createItem(content);
      // Best-effort live sync — works if online; queued for background sync if not
      void syncItemNow(item).catch(() => void syncToSupabase());
    } catch (err) {
      console.error("[BrainBridge] Save error:", err);
      showToast("Failed to save — please try again");
    } finally {
      setSaving(false);
      textareaRef.current?.focus();
    }
  }, [inputValue, saving]);

  /** Enter (without Shift) triggers save */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSave();
    }
  };

  /** Delete an item */
  const handleDelete = async (id: string) => {
    await deleteItem(id);
    // Also remove from Supabase if online
    if (navigator.onLine) {
      const { supabase } = await import("@/lib/supabase");
      await supabase.from("items").delete().eq("id", id);
    }
    showToast("Item deleted");
  };

  /** Mark pending as done (skip enrichment) */
  const handleMarkDone = async (id: string) => {
    await updateItem(id, { status: "done", synced: false });
    void syncToSupabase();
    showToast("Marked as done");
  };

  /** Process Now — marks all pending as ready_to_process */
  const handleProcessNow = async () => {
    if (processing || pendingCount === 0) return;
    setProcessing(true);
    try {
      const result = await processNow();
      if (result.count === 0) {
        showToast("No pending items to process");
      } else if (result.failed === 0) {
        showToast(
          `✓ ${result.count} item${result.count > 1 ? "s" : ""} queued (${result.code})`
        );
      } else {
        showToast(
          `Queued locally — will sync when online (${result.code})`
        );
      }
    } catch (err) {
      console.error(err);
      showToast("Error — please try again");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="bb-page">
      {/* Capture input */}
      <section style={{ paddingTop: "0.75rem" }}>
        <label htmlFor="capture-input" className="sr-only">
          What&apos;s on your mind?
        </label>
        <textarea
          id="capture-input"
          ref={textareaRef}
          className="bb-input"
          rows={3}
          placeholder="Capture a thought, topic, link, or task…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
          aria-label="Capture input. Press Enter to save."
        />
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "0.5rem",
          }}
        >
          <button
            className="bb-btn"
            onClick={handleSave}
            disabled={saving || !inputValue.trim()}
            style={{ minWidth: 100 }}
            id="save-btn"
          >
            {saving ? <span className="bb-spinner" /> : "Save"}
          </button>
        </div>
        <p style={{ color: "var(--text-dim)", fontSize: "0.75rem", marginTop: "0.35rem" }}>
          ↵ Enter to save · Shift+Enter for newline
        </p>
      </section>

      {/* Recent items */}
      <section style={{ flex: 1, marginTop: "1.25rem", paddingBottom: "8rem" }}>
        <h2
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            marginBottom: "0.75rem",
          }}
        >
          Recent
        </h2>

        {recentItems === undefined ? (
          <p className="bb-empty">Loading…</p>
        ) : recentItems.length === 0 ? (
          <p className="bb-empty">
            Nothing yet. Type something above and press Enter ↵
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {recentItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onMarkDone={handleMarkDone}
                showActions
              />
            ))}
          </div>
        )}
      </section>

      {/* Sticky Process Now bar */}
      <div className="bb-process-bar">
        <button
          id="process-now-btn"
          className="bb-btn"
          style={{ width: "100%" }}
          onClick={handleProcessNow}
          disabled={processing || pendingCount === 0}
          aria-label={`Process Now — ${pendingCount} pending item${pendingCount !== 1 ? "s" : ""}`}
        >
          {processing ? (
            <>
              <span className="bb-spinner" /> Queuing…
            </>
          ) : pendingCount > 0 ? (
            `Process Now (${pendingCount} pending)`
          ) : (
            "Process Now — nothing pending"
          )}
        </button>
      </div>

      {/* Toast notification */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </main>
  );
}
