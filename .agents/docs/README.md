# BrainBridge (Capture & Enrich)

Ultra-lightweight PWA for instant thought capture, enriched on-demand via a
locally-run n8n workflow + Gemini, saved into Notion. Full spec: `PRD.md`.

## Repo layout

```
PRD.md                    Product spec (source of truth)
ANTIGRAVITY_PROMPT.md      Prompt to hand to Antigravity for scaffolding/build
schema.sql                 Supabase/Postgres schema for the `items` table
docker-compose.yml          Runs n8n locally via Docker Desktop
n8n-workflow-notes.md       Node-by-node n8n workflow spec (polling mode)
.env.example                Template for required env vars
```

## Architecture

```
[Phone/PWA] --offline first--> [IndexedDB] --sync--> [Supabase Postgres]
                                                            ^
                                                            | polls every few min
                                                      [n8n on your laptop]
                                                            |
                                                    [Gemini]  [Notion]
```

The frontend and n8n never talk to each other directly - both just read/write
Supabase. That's deliberate: n8n only runs while your laptop is on, so
polling (not webhooks) is the default and nothing needs to be publicly
reachable.

## Setup

### 1. Frontend (Next.js PWA)
```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```
Deploy to Vercel by connecting this GitHub repo; set the same env vars in
the Vercel project settings.

### 2. Database
Run `schema.sql` in the Supabase SQL editor for your project.

### 3. n8n (local, on your Windows laptop)
Requires Docker Desktop.
```powershell
cp .env.example .env   # fill in N8N_BASIC_AUTH_USER / PASSWORD
docker compose up -d
```
Open http://localhost:5678, then build the workflow described in
`n8n-workflow-notes.md`, adding your Supabase, Gemini, and Notion
credentials inside the n8n UI (not as env vars).

## Cost

Designed to run at $0/month: Vercel free tier, Supabase free tier, Gemini
free tier, Notion free, n8n self-hosted on your own hardware.

## Status

Following the phased build order in `PRD.md` §14 / `ANTIGRAVITY_PROMPT.md`:
Phase 1 (core capture) → Phase 2 (n8n + Gemini) → Phase 3 (polish).
