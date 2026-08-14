"use client";

/**
 * components/SyncProvider.tsx
 *
 * Mounts once in the root layout. Responsibilities:
 *  1. Run an initial sync on mount (pushes any offline-captured items to Supabase).
 *  2. Register the "online" event listener so re-connection triggers sync.
 *  3. Run a polling loop every 30 s to pull status updates from Supabase
 *     (so "processing → done" shows up without a full page reload).
 */

import { useEffect } from "react";
import { syncToSupabase, pollSupabaseUpdates, registerSyncListeners } from "@/lib/sync";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Sync any unsynced items immediately on mount
    void syncToSupabase();

    // 2. Re-sync whenever we come back online
    const cleanup = registerSyncListeners();

    // 3. Poll for status updates every 30 s
    const pollInterval = setInterval(() => {
      void pollSupabaseUpdates();
    }, 30_000);

    return () => {
      cleanup();
      clearInterval(pollInterval);
    };
  }, []);

  return <>{children}</>;
}
