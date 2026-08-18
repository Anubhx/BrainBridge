/**
 * lib/process.ts - "Process Now" logic
 *
 * FR-10: When the user taps "Process Now":
 *  1. Generate a short, unguessable process code (PROC-xxxxxx).
 *  2. For all pending items (or a specific subset), set:
 *       status = 'ready_to_process'
 *       process_code = the generated code
 *  3. Immediately sync those rows to Supabase so n8n can pick them up
 *     in its next polling cycle (every 2–5 min by default).
 *
 * No webhook is called. n8n polls Supabase directly.
 */

import { nanoid } from "nanoid";
import { db, updateItem } from "./db";
import { syncItemNow } from "./sync";
import type { Item } from "./db";

/** Returns a code like "PROC-a8f3k2" */
export function generateProcessCode(): string {
  return `PROC-${nanoid(6).toLowerCase()}`;
}

export interface ProcessResult {
  code: string;
  count: number;
  failed: number; // items that couldn't sync to Supabase (offline etc.)
}

/**
 * Mark pending items as ready_to_process and sync them to Supabase.
 *
 * @param itemIds  If provided, only these items are processed.
 *                 If omitted, all 'pending' items are processed.
 */
export async function processNow(itemIds?: string[]): Promise<ProcessResult> {
  const code = generateProcessCode();
  const now = new Date().toISOString();

  // Fetch the target items from IndexedDB
  let targets: Item[];
  if (itemIds && itemIds.length > 0) {
    targets = await Promise.all(
      itemIds.map((id) => db.items.get(id))
    ).then((rows) =>
      rows.filter((r): r is Item => r !== undefined && r.status === "pending")
    );
  } else {
    targets = await db.items.where("status").equals("pending").toArray();
  }

  if (targets.length === 0) {
    return { code, count: 0, failed: 0 };
  }

  // Update each item locally first (optimistic)
  for (const item of targets) {
    await updateItem(item.id, {
      status: "ready_to_process",
      process_code: code,
      synced: false, // mark for sync
    });
  }

  // Read the updated items back and sync each to Supabase
  let failed = 0;
  for (const item of targets) {
    const updated = await db.items.get(item.id);
    if (updated) {
      const ok = await syncItemNow(updated);
      if (!ok) failed++;
    }
  }

  return { code, count: targets.length, failed };
}

/**
 * FR-19: Reset error items back to ready_to_process so n8n will retry them.
 *
 * @param itemIds  If provided, only retry these items.
 *                 If omitted, retry all error items.
 */
export async function retryFailed(itemIds?: string[]): Promise<ProcessResult> {
  const code = generateProcessCode();

  let targets: Item[];
  if (itemIds && itemIds.length > 0) {
    targets = await Promise.all(
      itemIds.map((id) => db.items.get(id))
    ).then((rows) =>
      rows.filter((r): r is Item => r !== undefined && r.status === "error")
    );
  } else {
    targets = await db.items.where("status").equals("error").toArray();
  }

  if (targets.length === 0) {
    return { code, count: 0, failed: 0 };
  }

  for (const item of targets) {
    await updateItem(item.id, {
      status: "ready_to_process",
      process_code: code,
      error_message: null,
      synced: false,
    });
  }

  let failed = 0;
  for (const item of targets) {
    const updated = await db.items.get(item.id);
    if (updated) {
      const ok = await syncItemNow(updated);
      if (!ok) failed++;
    }
  }

  return { code, count: targets.length, failed };
}
