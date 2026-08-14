/**
 * lib/sync.ts — Background sync: IndexedDB → Supabase
 *
 * Design:
 *  - Items are always written to Dexie (IndexedDB) first. This guarantees
 *    zero data loss even when offline.
 *  - syncToSupabase() reads all rows where synced=false and upserts them.
 *  - It is called:
 *      1. On app mount (in the root layout via useSyncOnMount hook).
 *      2. When the browser fires the "online" event.
 *      3. Immediately after saving a new item (best-effort live sync).
 *  - Supabase updates (status changes from n8n) are pulled back into Dexie
 *    via pollSupabaseUpdates().
 */

import { supabase } from "./supabase";
import { db, getUnsyncedItems, markSynced, updateItem } from "./db";
import type { Item } from "./db";

let syncInProgress = false;

/**
 * Push all unsynced local items to Supabase.
 * Safe to call multiple times concurrently — a lock prevents double-sends.
 */
export async function syncToSupabase(): Promise<void> {
  if (syncInProgress) return;
  if (!navigator.onLine) return;

  syncInProgress = true;
  try {
    const unsynced = await getUnsyncedItems();
    if (unsynced.length === 0) return;

    for (const item of unsynced) {
      // Strip the local-only `synced` field before sending
      const { synced: _synced, ...row } = item;
      void _synced; // suppress unused-var lint

      const { error } = await supabase.from("items").upsert(row, {
        onConflict: "id",
        ignoreDuplicates: false,
      });

      if (!error) {
        await markSynced(item.id);
      } else {
        console.error("[BrainBridge] Sync error for item", item.id, error);
      }
    }
  } finally {
    syncInProgress = false;
  }
}

/**
 * Pull Supabase status updates back into IndexedDB.
 *
 * This lets the PWA reflect n8n's progress (processing → done / error)
 * without a live websocket. Call this periodically (e.g. every 30 s) or
 * when the user opens the app / pulls to refresh.
 *
 * Only fetches items that are currently in a "transitional" state locally.
 */
export async function pollSupabaseUpdates(): Promise<void> {
  if (!navigator.onLine) return;

  try {
    // Only poll items that might have changed status remotely
    const inFlight = await db.items
      .where("status")
      .anyOf(["ready_to_process", "processing"])
      .toArray();

    if (inFlight.length === 0) return;

    const ids = inFlight.map((i) => i.id);
    const { data, error } = await supabase
      .from("items")
      .select(
        "id, status, enriched_summary, enriched_links, tags, notion_page_id, error_message, process_code, updated_at"
      )
      .in("id", ids);

    if (error || !data) return;

    for (const row of data) {
      await updateItem(row.id, {
        status: row.status,
        enriched_summary: row.enriched_summary,
        enriched_links: row.enriched_links,
        tags: row.tags,
        notion_page_id: row.notion_page_id,
        error_message: row.error_message,
        process_code: row.process_code,
        updated_at: row.updated_at,
        synced: true,
      });
    }
  } catch (err) {
    console.error("[BrainBridge] Poll error:", err);
  }
}

/**
 * Sync a single item to Supabase immediately (used after Process Now).
 * Returns true on success, false on failure.
 */
export async function syncItemNow(item: Item): Promise<boolean> {
  if (!navigator.onLine) return false;
  const { synced: _synced, ...row } = item;
  void _synced;

  const { error } = await supabase.from("items").upsert(row, {
    onConflict: "id",
    ignoreDuplicates: false,
  });

  if (!error) {
    await markSynced(item.id);
    return true;
  }
  return false;
}

/**
 * Register online/offline event listeners.
 * Call once in the root layout.
 */
export function registerSyncListeners(): () => void {
  const handleOnline = () => void syncToSupabase();
  window.addEventListener("online", handleOnline);
  return () => window.removeEventListener("online", handleOnline);
}
