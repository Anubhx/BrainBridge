-- BrainBridge database schema
-- Target: Supabase (Postgres) or Neon
-- Run this in the Supabase SQL editor, or via `psql` / migration tool.

create extension if not exists "pgcrypto";

create table if not exists items (
  id                uuid primary key default gen_random_uuid(),
  content           text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  status            text not null default 'pending'
                    check (status in ('pending','ready_to_process','processing','done','error')),
  process_code      text,
  enriched_summary  text,
  enriched_links    jsonb,
  tags              text[],
  notion_page_id    text,
  error_message     text,
  source            text not null default 'pwa'
);

create index if not exists idx_items_status on items (status);
create index if not exists idx_items_process_code on items (process_code);
create index if not exists idx_items_created_at on items (created_at desc);

-- Keep updated_at current on every row change
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_items_updated_at on items;
create trigger trg_items_updated_at
before update on items
for each row execute function set_updated_at();

-- Optional table (PRD 8) — only needed if you want trigger codes
-- tracked separately from items instead of stored inline.
create table if not exists triggers (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  created_at  timestamptz not null default now(),
  status      text not null default 'active' check (status in ('active','consumed'))
);

-- Row Level Security: single-user tool, but keep RLS on and use the
-- service role key from n8n / server-side code only. The anon key used by
-- the PWA should go through a policy like the one below if you enable RLS.
alter table items enable row level security;

-- Example permissive policy for a single-user personal tool.
-- Tighten this if you ever add auth.
create policy "allow all for now"
on items
for all
using (true)
with check (true);
