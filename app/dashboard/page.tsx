"use client";

/**
 * app/dashboard/page.tsx - Capture workspace (protected route V2)
 * 
 * The core BrainBridge capture UI with DepthSelector (Quick, Deep, Research)
 * and multi-agent background enrichment.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { ItemCard } from "@/components/ItemCard";
import { DepthSelector } from "@/components/DepthSelector";
import {
  createItem,
  getRecentItems,
  updateItem,
  deleteItem,
  type Item,
  type Depth,
} from "@/lib/db";
import { syncToSupabase, syncItemNow } from "@/lib/sync";
import { processNow } from "@/lib/process";
import { useLiveQuery } from "dexie-react-hooks";
import { useUser } from "@clerk/nextjs";

/** Toast notification */
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className="bb-toast" role="status">{message}</div>;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [inputValue, setInputValue] = useState("");
  const [depth, setDepth] = useState<Depth>("quick");
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Read stored depth from sessionStorage after client hydration mount
  useEffect(() => {
    const saved = sessionStorage.getItem("bb-depth") as Depth | null;
    if (saved && (saved === "quick" || saved === "deep" || saved === "research")) {
      setDepth(saved);
    }
  }, []);

  // Live query: react to DB changes automatically
  const recentItems = useLiveQuery(
    () => getRecentItems(25),
    [],
    [] as Item[]
  );

  const pendingCount =
    recentItems?.filter((i) => i.status === "pending").length ?? 0;

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleDepthChange = (newDepth: Depth) => {
    setDepth(newDepth);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("bb-depth", newDepth);
    }
  };

  const showToast = (msg: string) => setToast(msg);

  /** Save item - optimistic: IndexedDB first, then sync to Supabase */
  const handleSave = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || saving) return;

    setSaving(true);
    setInputValue("");

    try {
      const item = await createItem(content, depth);
      void syncItemNow(item).catch(() => void syncToSupabase());
    } catch (err) {
      console.error("[BrainBridge] Save error:", err);
      showToast("FAILED TO SAVE - TRY AGAIN");
    } finally {
      setSaving(false);
      textareaRef.current?.focus();
    }
  }, [inputValue, depth, saving]);

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
    if (navigator.onLine) {
      const { supabase } = await import("@/lib/supabase");
      await supabase.from("items").delete().eq("id", id);
    }
    showToast("ITEM DELETED");
  };

  /** Mark pending as done */
  const handleMarkDone = async (id: string) => {
    await updateItem(id, { status: "done", synced: false });
    void syncToSupabase();
    showToast("MARKED AS DONE");
  };

  /** Process Now - marks pending items as ready_to_process */
  const handleProcessNow = async () => {
    if (processing || pendingCount === 0) return;
    setProcessing(true);
    try {
      const result = await processNow();
      if (result.count === 0) {
        showToast("NO PENDING ITEMS TO PROCESS");
      } else if (result.failed === 0) {
        showToast(
          `✓ QUEUED ${result.count} ITEM${result.count > 1 ? "S" : ""} [${result.code}]`
        );
      } else {
        showToast(`QUEUED LOCALLY [${result.code}]`);
      }
    } catch (err) {
      console.error(err);
      showToast("PROCESSING ERROR - TRY AGAIN");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="bb-page">
      {/* User greeting */}
      {user && (
        <div className="bb-mono" style={{
          fontSize: "0.7rem",
          color: "var(--text-dim)",
          padding: "0.75rem 0 0",
          letterSpacing: "0.04em"
        }}>
          // SESSION · {user.primaryEmailAddress?.emailAddress ?? user.id}
        </div>
      )}

      {/* Scratchpad Capture Notes Widget */}
      <section className="bb-notes-area">
        {/* Depth Mode Pills */}
        <DepthSelector value={depth} onChange={handleDepthChange} />

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
          <span className="bb-mono" style={{ color: "var(--amber)", fontSize: "0.85rem", fontWeight: 700 }}>
            &gt;
          </span>
          <span className="bb-mono" style={{ color: "var(--text-muted)", fontSize: "0.75rem", letterSpacing: "0.04em", fontWeight: 600 }}>
            CAPTURE RAW THOUGHT [{depth.toUpperCase()}]
          </span>
          <span className="bb-cursor" />
        </div>
        <label htmlFor="capture-input" className="sr-only">
          Capture raw thought
        </label>
        <textarea
          id="capture-input"
          ref={textareaRef}
          className="bb-notes-input"
          rows={3}
          placeholder="Type your thought, link, or note..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
          aria-label="Capture input. Press Enter to save."
        />
        <div className="bb-notes-toolbar">
          <span className="bb-notes-hint">
            [↵ ENTER TO SAVE · SHIFT+ENTER FOR NEWLINE]
          </span>
          <button
            className="bb-btn bb-btn-primary"
            onClick={handleSave}
            disabled={saving || !inputValue.trim()}
            id="save-btn"
          >
            {saving ? <span className="bb-spinner" /> : `SAVE [${depth.toUpperCase()}]`}
          </button>
        </div>
      </section>

      {/* Stream / Log Section */}
      <section style={{ flex: 1, marginTop: "1.5rem", paddingBottom: "8rem" }}>
        <div
          className="bb-mono"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
            fontSize: "0.72rem",
            color: "var(--text-dim)",
            letterSpacing: "0.05em",
          }}
        >
          <span>// RECENT STREAM</span>
          {recentItems && recentItems.length > 0 && (
            <span>COUNT: {recentItems.length}</span>
          )}
        </div>

        {recentItems === undefined ? (
          <div className="bb-empty">
            <span className="bb-spinner" />
            <span style={{ marginLeft: "0.5rem" }}>LOADING STREAM...</span>
          </div>
        ) : recentItems.length === 0 ? (
          <div className="bb-empty">
            Nothing captured yet — start typing
          </div>
        ) : (
          <div className="bb-stream">
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

      {/* Contextual Process Now Control */}
      <div className="bb-process-bar">
        <button
          id="process-now-btn"
          className={`bb-btn ${pendingCount > 0 ? "bb-btn-primary" : ""}`}
          style={{ width: "100%", opacity: pendingCount === 0 ? 0.4 : 1 }}
          onClick={handleProcessNow}
          disabled={processing || pendingCount === 0}
          aria-label={`Process Now - ${pendingCount} pending items`}
        >
          {processing ? (
            <>
              <span className="bb-spinner" /> PROCESSING QUEUE...
            </>
          ) : pendingCount > 0 ? (
            `PROCESS NOW [ ${pendingCount} PENDING ]`
          ) : (
            "PROCESS NOW [ 0 PENDING ]"
          )}
        </button>
      </div>

      {/* Toast Notification */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </main>
  );
}
