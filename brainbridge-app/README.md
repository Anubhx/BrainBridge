# BrainBridge

A personal capture-and-enrich PWA. Capture thoughts in under 5 seconds. Enrich them with Gemini AI on demand via n8n. Store results in Notion.

**Stack:** Next.js 15 · TypeScript · Tailwind · Dexie.js (IndexedDB) · Supabase (Postgres) · Serwist (PWA) · n8n (local Docker) · Gemini API · Notion

---

## Architecture

```
Phone/Browser (PWA, Vercel)
  ↕ IndexedDB (Dexie)    — offline-first capture
  ↕ Supabase Postgres    — cloud sync (anon key, RLS on)

n8n (your Windows laptop, Docker Desktop)
  ↕ Supabase Postgres    — polls every 2-5 min (service-role key, never in frontend)
  ↕ Gemini API           — enrichment
  ↕ Notion API           — saves enriched pages
```

The PWA and n8n **never talk to each other directly**. They communicate only through Supabase rows. This means n8n doesn't need to be online when you capture — it just needs to be on when you want enrichment.

---

## Phase 1 Setup (required before running)

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) → New project.

In the **SQL Editor**, run the contents of `schema.sql` (in this directory).

From **Settings → API**, copy:
- Project URL
- `anon` public key

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

> ⚠️ Never commit `.env.local`. It is already in `.gitignore`.

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Deploy to Vercel

1. Push `brainbridge-app/` to GitHub (or the whole repo — set **Root Directory** to `brainbridge-app` in Vercel project settings).
2. Add the two env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in Vercel → Settings → Environment Variables.
3. Deploy.

---

## Phase 2 Setup (n8n enrichment — after Phase 1 works)

> See `../.agents/docs/n8n-workflow-notes.md` for the full node-by-node spec.

1. Start n8n: from the repo root on your Windows laptop:
   ```powershell
   docker compose up -d
   ```
   Open [http://localhost:5678](http://localhost:5678).

2. Add a **Postgres credential** with your Supabase connection string using the **service-role** key (never the anon key).

3. Add a **Gemini credential** (HTTP Header Auth with your Google AI Studio key).

4. Build the workflow from the spec in `n8n-workflow-notes.md`.

5. Activate it — it will poll Supabase every 2–5 minutes for `status = 'ready_to_process'` items.

---

## How it works

| Action | What happens |
|--------|-------------|
| Type + Enter | Saved instantly to IndexedDB → synced to Supabase when online |
| Go offline → type | Saved to IndexedDB → syncs automatically when reconnected |
| Tap "Process Now" | Items get `status=ready_to_process` + a `PROC-xxxxxx` code in Supabase |
| n8n next polling run | Picks up ready items → calls Gemini → writes summary/links → sets `done` |
| Open enriched item | Summary, links, tags, and Notion link visible in the card |

---

## Item status flow

```
pending → ready_to_process → processing → done
                                       ↘ error → (retry) → ready_to_process
```

---

## Cost

| Service | Tier | Cost |
|---------|------|------|
| Vercel | Hobby (free) | $0 |
| Supabase | Free (500 MB DB) | $0 |
| Gemini API | Free tier (~1500 req/day) | $0 |
| Notion API | Free | $0 |
| n8n | Self-hosted on your laptop | $0 |

**Total recurring cost: $0/month.**

---

## Project structure

```
brainbridge-app/
├── app/
│   ├── layout.tsx          # Root layout, PWA meta, NavBar
│   ├── page.tsx            # Home / Capture screen
│   ├── sw.ts               # Serwist service worker (compiled to public/sw.js)
│   ├── history/
│   │   └── page.tsx        # History screen (filter + search)
│   └── settings/
│       └── page.tsx        # Settings screen
├── components/
│   ├── ItemCard.tsx        # Expandable item card
│   ├── NavBar.tsx          # Top nav + offline banner
│   ├── StatusBadge.tsx     # Coloured status pill
│   └── SyncProvider.tsx    # Mounts sync + polling logic
├── lib/
│   ├── db.ts               # Dexie IndexedDB schema + helpers
│   ├── supabase.ts         # Supabase client (anon key)
│   ├── sync.ts             # IndexedDB → Supabase sync + polling
│   └── process.ts          # Process Now / Retry logic
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── icon-192.svg        # PWA icon
│   └── icon-512.svg        # PWA icon (large)
├── schema.sql              # Run this in Supabase SQL editor
├── .env.example            # Copy to .env.local and fill in values
└── next.config.ts          # Serwist PWA integration
```

---

## Development notes

- Service worker is **disabled in development** (`NODE_ENV=development`) to avoid caching headaches. It only activates in production builds.
- Items are always written to **IndexedDB first**. Supabase is the sync target, not the primary store. Zero data loss even with no internet.
- The anon key has **RLS enabled** with a permissive policy (single-user tool). Tighten this if you ever expose the app publicly.
- No user authentication in Phase 1. The app is designed for personal, single-user use.
