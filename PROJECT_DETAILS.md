# 🧠 BrainBridge — In-Depth Project Architecture & Specification

> **Version:** V2.1  
> **Status:** Phase 1 Complete (Clerk Auth + V2 Landing Page + Workspace Deployment)  
> **Production URL:** [https://brain-bridge-kohl.vercel.app](https://brain-bridge-kohl.vercel.app)

---

## 📑 Table of Contents

1. [Executive Vision & Concept](#1-executive-vision--concept)
2. [System Architecture & Data Flow](#2-system-architecture--data-flow)
3. [Technology Stack](#3-technology-stack)
4. [Repository Directory Layout](#4-repository-directory-layout)
5. [Database Schemas](#5-database-schemas)
   - [5.1 Client-Side Schema (IndexedDB via Dexie.js)](#51-client-side-schema-indexeddb-via-dexiejs)
   - [5.2 Cloud Schema (Supabase PostgreSQL)](#52-cloud-schema-supabase-postgresql)
6. [Route Structure & Auth Protection](#6-route-structure--auth-protection)
7. [Design System & Aesthetics](#7-design-system--aesthetics)
8. [Automation Engine & n8n Workflow](#8-automation-engine--n8n-workflow)
9. [Infrastructure & Resilience](#9-infrastructure--resilience)
10. [V2 Roadmap & Phase Breakdown](#10-v2-roadmap--phase-breakdown)
11. [Environment Variables Reference](#11-environment-variables-reference)

---

## 1. Executive Vision & Concept

**BrainBridge** is a high-speed, offline-first **Personal AI Second Brain & Scratchpad**. It bridges the gap between raw, fleeting human thoughts and structured, enriched long-term knowledge.

### 🎯 Core Pillars
- **Zero-Friction Capture**: Fast input widget with instant local storage. You never wait for a network call or server roundtrip when saving a thought.
- **Asynchronous AI Pipeline**: n8n workflows poll pending thoughts in the background, run multi-agent AI enrichment, scrape linked media (Instagram/URLs), and publish structured knowledge pages to Notion.
- **Technical Scratchpad Aesthetic**: A modern dark warm graphite design (`#1C1B1A`) with functional color accents, sharp geometric constraints (2-4px radius), and a monospace/sans typography pairing.

---

## 2. System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT (PWA / Browser)                           │
│                                                                             │
│  [ Raw Thought Input ] ──(1. Save)──> [ Dexie.js (IndexedDB Local Store) ]  │
│                                                     │                       │
│  [ Process Now Button ] ──(3. PROC-xxxxxx)──────────┤                       │
│                                                     │                       │
│  [ UI Live Polling ] <───(9. Poll Status 30s)───────┼──(2. Best-effort Sync) │
└─────────────────────────────────────────────────────┼───────────────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLOUD & BACKEND PLATFORM                          │
│                                                                             │
│                        [ Supabase PostgreSQL DB ]                           │
│                                     │                                       │
│                         (4. Schedule Poll 2-5m)                             │
│                                     ▼                                       │
│                        [ n8n Automation Engine ]                            │
│                                     │                                       │
│            ┌────────────────────────┼────────────────────────┐              │
│            ▼                        ▼                        ▼              │
│   [ RapidAPI Scraper ]     [ Gemini 2.0 AI ]      [ Hugging Face AI ]       │
│   (Instagram / URLs)       (Summaries & Tags)      (Deep & Research)      │
│            │                        │                        │              │
│            └────────────────────────┼────────────────────────┘              │
│                                     ▼                                       │
│                          [ Notion Knowledge Base ]                          │
│                                     │                                       │
│            (8. Write back status='done' + summary + tags)                   │
│                                     ▼                                       │
│                        [ Supabase PostgreSQL DB ]                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Tool / Library | Version | Purpose |
|---|---|---|---|
| **Core Framework** | Next.js (App Router, Turbopack) | `16.3.1` | React Application Framework |
| **UI Library** | React & React DOM | `19.2.8` | Client View Layer |
| **Language** | TypeScript | `^5.0` | Strict Type Safety |
| **Authentication** | Clerk Auth (`@clerk/nextjs`) | `^7.8.2` | User Auth & Route Protection |
| **Local Database** | Dexie.js | `^4.4.4` | IndexedDB Offline Store |
| **Cloud Database** | Supabase JS (`@supabase/supabase-js`) | `^2.109.0` | PostgreSQL Database & Storage |
| **PWA & Offline** | Serwist (`@serwist/next`) | `^9.5.12` | Service Worker & Cache Strategy |
| **Styling** | TailwindCSS v4 + CSS Design Tokens | `^4.0` | Technical Scratchpad UI |
| **Unique IDs** | NanoID | `^5.1.16` | Process Code Generator (`PROC-xxxxxx`) |
| **Automation** | n8n Engine | Self-hosted / Cloud | Background Polling & Multi-Agent AI |
| **AI Models** | Gemini 2.0 Flash-Lite + Hugging Face | Free Tier APIs | Thought Analysis & Synthesis |
| **Scraper** | RapidAPI Instagram Scraper | Free Tier | Reel & Post Content Extraction |
| **Knowledge Base** | Notion API | Integration Token | Final Knowledge Document Storage |
| **Deployment** | Vercel | Production | Zero-Config Hosting |

---

## 4. Repository Directory Layout

```
BrainBridge/
├── .github/
│   └── workflows/
│       └── keep-supabase-alive.yml     # Auto-pings Supabase every 3 days to prevent auto-pause
├── app/
│   ├── dashboard/
│   │   └── page.tsx                    # Protected Capture Workspace (V1 UI + Auth Session)
│   ├── history/
│   │   └── page.tsx                    # Protected Log Archive & Search Page
│   ├── settings/
│   │   └── page.tsx                    # Diagnostics, Sync Status & DB Maintenance
│   ├── favicon.ico
│   ├── globals.css                     # Technical Scratchpad CSS Tokens & Design System
│   ├── layout.tsx                      # Root Layout wrapped with <ClerkProvider>
│   ├── page.tsx                        # Public V2 Landing Page (Hero, Canvas Grid, CTAs)
│   └── sw.ts                           # Serwist Service Worker Entry
├── components/
│   ├── AuthNavWrapper.tsx              # Conditionally mounts Nav + Sync on protected app routes
│   ├── ItemCard.tsx                    # Signature stream item card (3px left status border)
│   ├── NavBar.tsx                      # Main Nav header + Clerk Sign-Out (EXIT) button
│   ├── StatusBadge.tsx                 # Dot indicator + Monospace status tag
│   └── SyncProvider.tsx                # Mount-sync & 30s background polling loop
├── lib/
│   ├── db.ts                           # Dexie.js IndexedDB schema & helper queries
│   ├── process.ts                      # "Process Now" batch code generation logic
│   ├── supabase.ts                     # Supabase JS client singleton
│   └── sync.ts                         # Bidirectional Sync (IndexedDB ↔ Supabase)
├── public/
│   ├── manifest.json                   # Web App PWA Manifest
│   ├── icon-192.svg
│   └── icon-512.svg
├── BrainBridge - Enrichment Pipeline.json  # n8n Workflow Export JSON
├── N8N_WORKFLOW_SPEC.md                # Node-by-node n8n setup specification
├── PROJECT_DETAILS.md                  # Comprehensive Technical Architecture (This Document)
├── README.md                           # Public Overview & Quickstart Guide
├── schema.sql                          # Supabase PostgreSQL DDL Script
├── next.config.ts                      # Next.js & Serwist configuration
├── proxy.ts                            # Clerk auth proxy middleware protecting app routes
├── package.json
└── tsconfig.json
```

---

## 5. Database Schemas

### 5.1 Client-Side Schema (IndexedDB via Dexie.js)

File: [`lib/db.ts`](file:///Users/anubhav/Downloads/BrainBridge/lib/db.ts)

```typescript
export type ItemStatus =
  | "pending"           // Raw capture saved locally
  | "ready_to_process"  // Process Now tapped; queued for n8n
  | "processing"        // n8n is actively running AI pipeline
  | "done"              // AI enrichment complete & saved to Notion
  | "error";            // Enrichment or sync failed

export interface EnrichedLink {
  title: string;
  url: string;
}

export interface Item {
  id: string;                       // Client-generated UUID (crypto.randomUUID())
  content: string;                  // Raw thought content
  created_at: string;               // ISO 8601 timestamp
  updated_at: string;               // ISO 8601 timestamp
  status: ItemStatus;               // Current status
  process_code: string | null;      // e.g., "PROC-a8f3k2"
  enriched_summary: string | null;  // AI-generated 1-3 sentence summary
  enriched_links: EnrichedLink[] | null; // Extracted reference links
  tags: string[] | null;            // AI-generated topic tags
  notion_page_id: string | null;    // Created Notion Page ID
  error_message: string | null;     // Error message if processing failed
  source: string;                   // Default: "pwa"
  synced: boolean;                  // Local-only: true when upserted to Supabase
}
```

### 5.2 Cloud Schema (Supabase PostgreSQL)

File: [`schema.sql`](file:///Users/anubhav/Downloads/BrainBridge/schema.sql)

```sql
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

-- Indexing for performance
create index if not exists idx_items_status on items (status);
create index if not exists idx_items_process_code on items (process_code);
create index if not exists idx_items_created_at on items (created_at desc);
```

---

## 6. Route Structure & Auth Protection

Authentication is powered by **Clerk Auth** (`@clerk/nextjs`).

| Route | View Component | Access Level | Description |
|---|---|---|---|
| `/` | [`app/page.tsx`](file:///Users/anubhav/Downloads/BrainBridge/app/page.tsx) | **Public** | Landing page with canvas grid animation & feature pitch |
| `/sign-in` | Clerk Hosted UI | **Public** | Email/Password & Google Sign-In |
| `/sign-up` | Clerk Hosted UI | **Public** | Account registration |
| `/dashboard` | [`app/dashboard/page.tsx`](file:///Users/anubhav/Downloads/BrainBridge/app/dashboard/page.tsx) | **Protected** | Main capture workspace & live recent stream |
| `/history` | [`app/history/page.tsx`](file:///Users/anubhav/Downloads/BrainBridge/app/history/page.tsx) | **Protected** | Log archive with filter chips & search |
| `/settings` | [`app/settings/page.tsx`](file:///Users/anubhav/Downloads/BrainBridge/app/settings/page.tsx) | **Protected** | System health, sync tools & DB reset |

### Auth Proxy Middleware ([`proxy.ts`](file:///Users/anubhav/Downloads/BrainBridge/proxy.ts))
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/history(.*)",
  "/settings(.*)",
  "/research(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});
```

---

## 7. Design System & Aesthetics

File: [`app/globals.css`](file:///Users/anubhav/Downloads/BrainBridge/app/globals.css)

### 🎨 Color Tokens
- **Base Background**: `#1C1B1A` (Warm Graphite / Charcoal — no pure black `#000000`)
- **Surface Container**: `#252422` (Card & Input Backgrounds)
- **Borders**: `#383633` (Default) / `#4A4743` (Hover)
- **Status Accent Colors**:
  - **Pending / Raw**: Amber (`#E8A33D`)
  - **Processing**: Pulsing Amber (`#F59E0B`)
  - **Enriched / Done**: Sage Teal (`#5FA8A0`)
  - **Error**: Soft Red (`#D9534F`)

### ✒️ Typography Pairing
- **Monospace (`JetBrains Mono`)**: Applied to system log headers, status tags, timestamps (`14:20 • 2m ago`), filter chips (`[ALL]`, `[ENRICHED]`), process buttons, and terminal prompts.
- **Humanist Sans (`Inter`)**: Applied to user-captured raw thoughts and AI summary paragraphs for optimal readability.

### 📐 Rules & Constraints
1. **Corners**: Sharp 2-4px max border radius (`border-radius: 2px`).
2. **Left Status Bar**: Each stream item features a 3px vertical accent border reflecting its status color (`.bb-stream-item--done`, `.bb-stream-item--pending`).
3. **Prompt Indicator**: Terminal-style blinking prompt (`> CAPTURE RAW THOUGHT ▋`).

---

## 8. Automation Engine & n8n Workflow

Workflow File: [`BrainBridge - Enrichment Pipeline.json`](file:///Users/anubhav/Downloads/BrainBridge/BrainBridge%20-%20Enrichment%20Pipeline.json)

```
[Schedule Trigger (Every 2-5 min)]
               │
               ▼
[Postgres: Fetch items WHERE status = 'ready_to_process']
               │
               ▼
[Postgres: Update items SET status = 'processing']
               │
               ▼
[HTTP Node: Gemini 2.0 Flash API Request]
               │
               ▼
[Code Node: Parse & Validate JSON Response]
               │
               ▼
[Notion Node: Create Database Page in "BrainBridge Knowledge"]
               │
               ▼
[Postgres: Update items SET status = 'done', summary, tags, notion_page_id]
```

---

## 9. Infrastructure & Resilience

### 🛡️ Supabase Auto-Pause Defense
Supabase Free Tier pauses databases after 7 days of inactivity. To prevent this, a GitHub Action ([`.github/workflows/keep-supabase-alive.yml`](file:///Users/anubhav/Downloads/BrainBridge/.github/workflows/keep-supabase-alive.yml)) runs automatically every **3 days**:

```yaml
name: Keep Supabase Alive
on:
  schedule:
    - cron: '0 0 */3 * *'
jobs:
  ping-supabase:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase REST API
        run: |
          curl -s -o /dev/null -w "%{http_code}" \
            -H "apikey: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}" \
            "https://kifwylcnfwxenlsfiuso.supabase.co/rest/v1/items?select=id&limit=1"
```

---

## 10. V2 Roadmap & Phase Breakdown

| Phase | Feature | Status | Details |
|---|---|---|---|
| **Phase 1** | **Clerk Auth & V2 Landing Page** | ✅ **Complete** | Public `/` landing page, protected `/dashboard`, Clerk middleware, nav sign-out controls. |
| **Phase 2** | **3-Tier Depth Modes** | ⏳ **Next Up** | `Quick`, `Deep`, and `Research` depth selector above capture widget; DB `depth` column; n8n routing. |
| **Phase 3** | **Multi-Agent AI Pipeline** | ⏳ Pending | Hugging Face (Mistral-7B + Llama 3.2-3B) mixed with Gemini Flash; distributed DB result tables (`enrichment_results`, `research_sections`, `agent_logs`). |
| **Phase 4** | **Instagram & URL Media Scraping** | ⏳ Pending | RapidAPI Instagram Reel/Post scraper; OpenGraph article metadata extraction. |

---

## 11. Environment Variables Reference

File: [`.env`](file:///Users/anubhav/Downloads/BrainBridge/.env) (and [`.env.example`](file:///Users/anubhav/Downloads/BrainBridge/.env.example))

```bash
# Supabase Backend
NEXT_PUBLIC_SUPABASE_URL=https://kifwylcnfwxenlsfiuso.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Clerk Auth (Get from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk Redirect Rules
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

---

*BrainBridge — Personal Second-Brain Knowledge System*
