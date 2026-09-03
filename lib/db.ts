/**
 * lib/db.ts - Dexie.js IndexedDB wrapper
 *
 * This mirrors the Supabase `items` table exactly so rows can be
 * synced bidirectionally. One extra field `synced` tracks whether
 * a row has been pushed to Supabase yet (local-only flag).
 */

import Dexie, { type Table } from "dexie";

export type ItemStatus =
  | "pending"
  | "ready_to_process"
  | "processing"
  | "done"
  | "error";

export type Depth = "quick" | "deep" | "research";

export interface EnrichedLink {
  title: string;
  url: string;
}

export interface ResearchSection {
  id?: string;
  item_id?: string;
  section_order: number;
  section_title: string;
  section_content: string;
  model_used?: string;
}

export interface Item {
  /** UUID - generated client-side via crypto.randomUUID() */
  id: string;
  content: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  status: ItemStatus;
  depth: Depth;
  process_code: string | null;
  enriched_summary: string | null;
  enriched_links: EnrichedLink[] | null;
  tags: string[] | null;
  key_concepts: string[] | null;
  model_primary: string | null;
  model_fallback: string | null;
  retry_count?: number;
  sections?: ResearchSection[] | null;
  notion_page_id: string | null;
  error_message: string | null;
  source: string;
  /** Local-only: true once the row has been upserted to Supabase */
  synced: boolean;
}

class BrainBridgeDB extends Dexie {
  items!: Table<Item, string>;

  constructor() {
    super("brainbridge");

    this.version(1).stores({
      items: "id, status, created_at, process_code",
    });

    this.version(2).stores({
      items: "id, status, created_at, process_code, depth",
    });
  }
}

export const db = new BrainBridgeDB();

// ─── Helper queries ──────────────────────────────────────────────────────────

/** Create a new item and save it locally (offline-safe). */
export async function createItem(
  content: string,
  depth: Depth = "quick"
): Promise<Item> {
  const now = new Date().toISOString();
  const item: Item = {
    id: crypto.randomUUID(),
    content: content.trim(),
    created_at: now,
    updated_at: now,
    status: "pending",
    depth,
    process_code: null,
    enriched_summary: null,
    enriched_links: null,
    tags: null,
    key_concepts: null,
    model_primary: null,
    model_fallback: null,
    retry_count: 0,
    sections: null,
    notion_page_id: null,
    error_message: null,
    source: "pwa",
    synced: false,
  };
  await db.items.add(item);
  return item;
}

/** Get all items ordered newest-first. */
export async function getAllItems(): Promise<Item[]> {
  return db.items.orderBy("created_at").reverse().toArray();
}

/** Get the N most recent items. */
export async function getRecentItems(limit = 20): Promise<Item[]> {
  return db.items.orderBy("created_at").reverse().limit(limit).toArray();
}

/** Get all items in a particular status. */
export async function getItemsByStatus(status: ItemStatus): Promise<Item[]> {
  return db.items.where("status").equals(status).reverse().sortBy("created_at");
}

/** Get all unsynced items (not yet sent to Supabase). */
export async function getUnsyncedItems(): Promise<Item[]> {
  // Boolean values aren't reliably indexed in IndexedDB; filter in-memory instead.
  return db.items.filter((item) => !item.synced).toArray();
}

/** Update any fields on an item by id. */
export async function updateItem(
  id: string,
  changes: Partial<Item>
): Promise<void> {
  const now = new Date().toISOString();
  await db.items.update(id, { ...changes, updated_at: now });
}

/** Delete an item by id. */
export async function deleteItem(id: string): Promise<void> {
  await db.items.delete(id);
}

/** Mark item as synced locally (after successful Supabase upsert). */
export async function markSynced(id: string): Promise<void> {
  await db.items.update(id, { synced: true });
}
