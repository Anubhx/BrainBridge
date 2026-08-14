"use client";

/**
 * app/settings/page.tsx — Settings (minimal)
 *
 * PRD §11 — Settings screen:
 *  - Mode indicator (polling vs webhook)
 *  - Danger zone: clear all pending, retry all failed
 *  - Status count summary
 */

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Item } from "@/lib/db";
import { retryFailed } from "@/lib/process";
import { syncToSupabase } from "@/lib/sync";

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.6rem 0",
        borderBottom: "1px solid var(--border)",
        fontSize: "0.875rem",
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const [clearing, setClearing] = useState(false);
  const [toast, setToast]       = useState<string | null>(null);

  const allItems = useLiveQuery(
    () => db.items.toArray(),
    [],
    [] as Item[]
  );

  const counts = {
    total:      allItems?.length ?? 0,
    pending:    allItems?.filter((i) => i.status === "pending").length ?? 0,
    queued:     allItems?.filter((i) => i.status === "ready_to_process").length ?? 0,
    processing: allItems?.filter((i) => i.status === "processing").length ?? 0,
    done:       allItems?.filter((i) => i.status === "done").length ?? 0,
    error:      allItems?.filter((i) => i.status === "error").length ?? 0,
    unsynced:   allItems?.filter((i) => !i.synced).length ?? 0,
  };

  const show = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  /** Clear all pending items from IndexedDB (and Supabase if online) */
  const handleClearPending = async () => {
    if (clearing) return;
    setClearing(true);
    try {
      const pending = await db.items.where("status").equals("pending").toArray();
      const ids = pending.map((i) => i.id);
      await db.items.bulkDelete(ids);

      if (navigator.onLine && ids.length > 0) {
        const { supabase } = await import("@/lib/supabase");
        await supabase.from("items").delete().in("id", ids);
      }
      show(`Cleared ${ids.length} pending item${ids.length !== 1 ? "s" : ""}`);
    } finally {
      setClearing(false);
    }
  };

  /** Retry all failed items */
  const handleRetryAll = async () => {
    const result = await retryFailed();
    void syncToSupabase();
    show(
      result.count > 0
        ? `↺ Retrying ${result.count} item${result.count > 1 ? "s" : ""}`
        : "No failed items to retry"
    );
  };

  /** Force sync unsynced items */
  const handleForceSync = async () => {
    if (!navigator.onLine) {
      show("You are offline — sync will happen automatically when reconnected");
      return;
    }
    await syncToSupabase();
    show("Sync triggered");
  };

  return (
    <main className="bb-page" style={{ paddingBottom: "2rem" }}>
      <div style={{ paddingTop: "0.75rem" }}>
        <h1
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            marginBottom: "1rem",
          }}
        >
          Settings
        </h1>

        {/* Mode */}
        <section className="bb-card" style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            Enrichment Mode
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "var(--status-done)", fontSize: "1rem" }}>●</span>
            <span style={{ fontSize: "0.875rem" }}>Polling mode</span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.4rem", lineHeight: 1.5 }}>
            n8n polls Supabase every 2–5 minutes. No webhook or tunnel required.
            When you click &ldquo;Process Now&rdquo;, items are marked{" "}
            <code style={{ fontSize: "0.75rem", color: "var(--status-ready)" }}>ready_to_process</code>{" "}
            and n8n picks them up automatically on its next run.
          </p>
        </section>

        {/* Status summary */}
        <section className="bb-card" style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem" }}>
            Item Counts
          </h2>
          <Row label="Total"      value={counts.total} />
          <Row label="Pending"    value={counts.pending} />
          <Row label="Queued"     value={counts.queued} />
          <Row label="Processing" value={counts.processing} />
          <Row label="Done"       value={counts.done} />
          <Row label="Error"      value={counts.error} />
          <Row label="Unsynced (local-only)" value={counts.unsynced} />
        </section>

        {/* Actions */}
        <section className="bb-card" style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <h2 style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
            Actions
          </h2>

          <button
            id="force-sync-btn"
            className="bb-btn bb-btn-ghost"
            style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.875rem" }}
            onClick={handleForceSync}
          >
            ↑ Force sync to Supabase now
          </button>

          {counts.error > 0 && (
            <button
              id="retry-failed-btn"
              className="bb-btn bb-btn-ghost"
              style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.875rem" }}
              onClick={handleRetryAll}
            >
              ↺ Retry all failed ({counts.error})
            </button>
          )}
        </section>

        {/* Danger zone */}
        <section
          className="bb-card"
          style={{
            borderColor: "#7f1d1d",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <h2 style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--status-error)" }}>
            Danger Zone
          </h2>
          <p style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
            Deletes data permanently. Cannot be undone.
          </p>
          <button
            id="clear-pending-btn"
            className="bb-btn bb-btn-danger"
            style={{ width: "100%", fontSize: "0.875rem" }}
            onClick={handleClearPending}
            disabled={clearing || counts.pending === 0}
          >
            {clearing ? "Clearing…" : `Clear all pending (${counts.pending})`}
          </button>
        </section>

        {/* App version / info */}
        <p
          style={{
            textAlign: "center",
            fontSize: "0.72rem",
            color: "var(--text-dim)",
            marginTop: "1.5rem",
          }}
        >
          BrainBridge · Phase 1 · Polling mode · No user auth
        </p>
      </div>

      {toast && (
        <div className="bb-toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
