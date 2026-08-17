"use client";

/**
 * app/settings/page.tsx — System Settings & Diagnostics
 *
 * Technical Scratchpad Settings:
 *  - System Status Counters
 *  - Mode Indicator
 *  - Maintenance Actions
 */

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Item } from "@/lib/db";
import { retryFailed } from "@/lib/process";
import { syncToSupabase } from "@/lib/sync";

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="bb-mono"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.5rem 0",
        borderBottom: "1px solid var(--border)",
        fontSize: "0.8rem",
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text)", fontWeight: 600 }}>{value}</span>
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
      show(`CLEARED ${ids.length} PENDING ITEMS`);
    } finally {
      setClearing(false);
    }
  };

  const handleRetryAll = async () => {
    const result = await retryFailed();
    void syncToSupabase();
    show(
      result.count > 0
        ? `↺ RETRYING ${result.count} ITEMS`
        : "NO FAILED ITEMS TO RETRY"
    );
  };

  const handleForceSync = async () => {
    if (!navigator.onLine) {
      show("OFFLINE — SYNC WILL RESUME WHEN RECONNECTED");
      return;
    }
    await syncToSupabase();
    show("SYNC TRIGGERED");
  };

  return (
    <main className="bb-page" style={{ paddingBottom: "3rem" }}>
      <div style={{ paddingTop: "1.25rem" }}>
        <h1
          className="bb-mono"
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "var(--text-dim)",
            marginBottom: "1.25rem",
          }}
        >
          // SYSTEM CONFIGURATION & DIAGNOSTICS
        </h1>

        {/* System Mode */}
        <section
          style={{
            padding: "1rem",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
            marginBottom: "1rem",
            borderRadius: "2px",
          }}
        >
          <div className="bb-mono" style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--amber)", marginBottom: "0.35rem" }}>
            ENRICHMENT PIPELINE: POLLING MODE
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
            n8n polls Supabase every 3 minutes. Captures marked <code className="bb-mono" style={{ color: "var(--amber)" }}>ready_to_process</code> are automatically processed and enriched into structured Notion knowledge.
          </p>
        </section>

        {/* Database Counts */}
        <section
          style={{
            padding: "1rem",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
            marginBottom: "1rem",
            borderRadius: "2px",
          }}
        >
          <div className="bb-mono" style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "0.5rem" }}>
            // LOCAL INDEXEDDB STATS
          </div>
          <Row label="TOTAL ITEMS"            value={counts.total} />
          <Row label="PENDING (RAW)"          value={counts.pending} />
          <Row label="QUEUED"                 value={counts.queued} />
          <Row label="PROCESSING"             value={counts.processing} />
          <Row label="ENRICHED (DONE)"        value={counts.done} />
          <Row label="ERROR"                  value={counts.error} />
          <Row label="UNSYNCED (LOCAL ONLY)"  value={counts.unsynced} />
        </section>

        {/* System Maintenance */}
        <section
          style={{
            padding: "1rem",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
            marginBottom: "1rem",
            borderRadius: "2px",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div className="bb-mono" style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "0.25rem" }}>
            // MAINTENANCE ACTIONS
          </div>

          <button
            id="force-sync-btn"
            className="bb-btn"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={handleForceSync}
          >
            ↑ FORCE SYNC TO SUPABASE
          </button>

          {counts.error > 0 && (
            <button
              id="retry-failed-btn"
              className="bb-btn"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={handleRetryAll}
            >
              ↺ RETRY ALL FAILED ({counts.error})
            </button>
          )}
        </section>

        {/* Danger Zone */}
        <section
          style={{
            padding: "1rem",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid rgba(217, 83, 79, 0.4)",
            borderRadius: "2px",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div className="bb-mono" style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--red)" }}>
            // DANGER ZONE
          </div>
          <button
            id="clear-pending-btn"
            className="bb-btn bb-btn-danger"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={handleClearPending}
            disabled={clearing || counts.pending === 0}
          >
            {clearing ? "CLEARING..." : `CLEAR PENDING ITEMS (${counts.pending})`}
          </button>
        </section>

        {/* Info */}
        <div
          className="bb-mono"
          style={{
            textAlign: "center",
            fontSize: "0.72rem",
            color: "var(--text-dim)",
            marginTop: "1.75rem",
          }}
        >
          BRAINBRIDGE v0.1 · PWA OFFLINE-FIRST ARCHITECTURE
        </div>
      </div>

      {toast && (
        <div className="bb-toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
