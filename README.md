# 🧠 BrainBridge - Capture & AI Knowledge Enrichment

**BrainBridge** is a personal, offline-first "Second Brain" quick-capture tool built to catch fast, fleeting thoughts in under 5 seconds and enrich them into structured, searchable knowledge via AI and Notion.

---

## ⚡ Concept & Design System

BrainBridge bridges the gap between a **raw scratchpad** on one end and a **structured knowledge system** on the other.

- **Raw Thought vs. System Knowledge**:
  - **Humanist Sans (`Inter`)**: Used exclusively for your raw captured thoughts.
  - **Technical Monospace (`JetBrains Mono`)**: Used for all system metadata, timestamps (`14:20 • 2m ago`), status indicators, numeric counters, tags, and navigation.
- **Functional Status Palette**:
  - **Warm Charcoal (`#1C1B1A`)**: Deep warm graphite base (no pure black).
  - **Warm Amber (`#E8A33D`)**: Signals pending & raw captures.
  - **Cool Teal (`#5FA8A0`)**: Signals enriched knowledge & completed processing.
  - **Muted Red (`#D9534F`)**: Signals system errors.
- **Log Stream Architecture**:
  - Captures are displayed as a continuous system log stream (`.bb-stream`) with a signature 3px left status border that shifts color dynamically from **Amber** (pending) to **Teal** (enriched).
- **Restraint**: Zero gradients, zero drop-glows, zero rounded pills. Sharp **2px–4px radius max** across all elements.

---

## 🏗️ Architecture

```
[ PWA / Mobile / Desktop ]  ─── (Offline-First) ───►  [ IndexedDB (Dexie.js) ]
          │                                                   │
   (Background Sync)                                   (Local Instant Render)
          ▼                                                   │
 [ Supabase Postgres ] ◄──────────────────────────────────────┘
          ▲
          │ (Polls every 3 minutes)
          ▼
  [ n8n Workflow ] ──────► [ Gemini 3.1 Flash-Lite ] (AI Batch Summaries & Tags)
          │
          └──────────────► [ Notion Database ] (Saves Enriched Knowledge Pages)
```

> **Decoupled Architecture:** The Next.js frontend and n8n never communicate directly. They communicate asynchronously via Supabase rows. You can capture thoughts anytime offline or online, and n8n enriches them whenever it runs.

---

## 🚀 Quick Start & Development

### 1. Prerequisites
- Node.js 18+ & npm
- A [Supabase](https://supabase.com) project (free tier)
- A Google AI Studio API Key (for Gemini) & Notion Integration Token

### 2. Environment Setup

Inside `brainbridge-app/`, copy `.env.example` to `.env`:

```bash
cd brainbridge-app
cp .env.example .env
```

Set your Supabase credentials in `brainbridge-app/.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 3. Database Schema

Run `brainbridge-app/schema.sql` in your **Supabase SQL Editor**:

```sql
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
```

### 4. Run Development Server

```bash
cd brainbridge-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔄 n8n Pipeline Setup (Enrichment Engine)

The n8n workflow file is exported and ready at `brainbridge-app/BrainBridge - Enrichment Pipeline.json`.

1. **Import Workflow**:
   - Open n8n (Free Trial Cloud or Local Docker at `http://localhost:5678`).
   - Go to **Workflows** → **Import from File** → Select `BrainBridge - Enrichment Pipeline.json`.

2. **Configure Credentials in n8n**:
   - **Supabase Account**: Base URL (`https://<project-id>.supabase.co`) & API Key.
   - **Google Gemini API**: Free API Key from Google AI Studio.
   - **Notion Account**: Notion Integration Token & connect your target Notion Database.

3. **Activate**:
   - Toggle the workflow switch to **Active**. n8n will automatically poll Supabase every 3 minutes for pending captures.

---

## 🌐 Deploying to Vercel

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "Deploy BrainBridge"
   git push origin main
   ```

2. Go to [Vercel Dashboard](https://vercel.com/new) → **Import Project**.
3. Set **Root Directory** to `brainbridge-app`.
4. Add **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**.

---

## 📁 Repository Structure

```
brainbridge-app/
├── app/
│   ├── layout.tsx             # Root layout with Inter + JetBrains Mono
│   ├── globals.css            # Technical Scratchpad CSS design system
│   ├── page.tsx               # Capture screen (notes widget + stream log)
│   ├── history/page.tsx       # Search & Filterable archive log
│   └── settings/page.tsx      # System stats & maintenance controls
├── components/
│   ├── ItemCard.tsx           # Stream log item with left border status accent
│   ├── NavBar.tsx             # Uppercase monospace header navigation
│   ├── StatusBadge.tsx        # Technical status dot & tag indicator
│   └── SyncProvider.tsx       # Auto-sync & background polling listener
├── lib/
│   ├── db.ts                  # Dexie.js IndexedDB schema (offline store)
│   ├── supabase.ts            # Supabase client initializer
│   ├── sync.ts                # Offline-first Dexie ↔ Supabase sync
│   └── process.ts             # Process Now & Retry queue helpers
├── schema.sql                 # Supabase PostgreSQL schema
├── .env.example               # Environment variables template
└── BrainBridge - Enrichment Pipeline.json  # n8n workflow export
```
