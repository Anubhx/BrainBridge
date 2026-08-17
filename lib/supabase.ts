/**
 * lib/supabase.ts — Supabase client singleton
 *
 * Uses the anon key (safe for client-side) as read by NEXT_PUBLIC_ env vars.
 * The service-role key NEVER goes here — it lives only in n8n on your laptop.
 *
 * Set these in .env.local (never commit that file):
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surface a clear error at startup rather than a cryptic runtime failure.
  // Won't throw during build; only at runtime when the env vars are missing.
  console.warn(
    "[BrainBridge] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env.local and fill in your Supabase project values."
  );
}

export const supabase = createClient(
  supabaseUrl ?? "",
  supabaseAnonKey ?? ""
);

/**
 * Row type that matches the Supabase `items` table.
 * Matches lib/db.ts Item but without the `synced` local-only field.
 */
export interface SupabaseItem {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  status: string;
  process_code: string | null;
  enriched_summary: string | null;
  enriched_links: Array<{ title: string; url: string }> | null;
  tags: string[] | null;
  notion_page_id: string | null;
  error_message: string | null;
  source: string;
}
