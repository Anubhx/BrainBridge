# Product Requirements Document (PRD)
**Project Name:** Capture & Enrich (Working Title: "BrainBridge" / "QuickCapture")  
**Version:** 1.0  
**Date:** 2026-08-14  
**Author:** Product Owner  
**Status:** Ready for Implementation  

---

## 1. Overview & Vision

### Problem
People encounter dozens of ideas, topics, words, tasks, and references every day. Most are forgotten within hours because there is no low-friction way to capture them and later turn them into useful, searchable knowledge.

### Solution
A ultra-lightweight Progressive Web App (PWA) that lets the user instantly dump any thought/topic/todo. On demand, the system sends those items to a self-hosted n8n instance which uses the free Gemini API to enrich each item (short explanation + useful links) and saves the results into Notion (primary) and optionally Excel/Google Sheets.

### Core Principle
- Capture friction must be near zero.
- AI enrichment happens **only** when the user explicitly triggers it (to stay within free Gemini limits).
- The system must work well even when the laptop running n8n is offline most of the time.

---

## 2. Goals

### Primary Goals
1. Capture any thought in < 5 seconds from the home screen.
2. Enrich captured items with AI-generated context on explicit user command.
3. Store enriched knowledge permanently in Notion.
4. Stay entirely within free-tier Gemini rate limits.

### Success Metrics
- Time from idea → saved item < 5 seconds.
- User triggers enrichment ≤ 5–10 times per day.
- Gemini API calls ≤ 30–50 per day (batched).
- Zero data loss of captured items.
- PWA installable and usable offline for capture.

---

## 3. User Persona

**Primary User:** Solo knowledge worker / developer / student who:
- Constantly encounters new concepts, tools, tasks, or random ideas.
- Already uses Notion as a second brain.
- Runs n8n on a personal laptop.
- Wants maximum control and zero recurring cost.

---

## 4. User Flows

### Flow 1: Quick Capture (Happy Path)
1. User taps home-screen PWA icon.
2. Sees a clean input field (auto-focused).
3. Types or pastes text → hits Enter / Save.
4. Item is saved instantly (optimistic UI) with timestamp + unique ID.
5. Item appears in a simple chronological list with status badge `pending`.

### Flow 2: Trigger Enrichment
1. User opens the app (or stays on it).
2. Sees list of pending items + a prominent **"Process Now"** button.
3. Optionally selects specific items or processes all pending.
4. Clicks "Process Now".
5. System generates a unique process code, marks selected items, and notifies n8n (webhook or polling).
6. UI shows status changing to `processing` → later `done`.
7. User can later open Notion to see enriched pages.

### Flow 3: Offline Capture
1. User has no internet.
2. Still opens PWA and adds items.
3. Items are stored in IndexedDB.
4. When connection returns, items sync to the backend automatically.

### Flow 4: View History
1. User can scroll through past items.
2. Filter by status (pending / done / error).
3. Clicking a done item shows the Gemini-generated summary + links (pulled from DB or Notion).

---

## 5. Functional Requirements

### 5.1 Capture
- FR-1: Single text input that accepts free-form text (topics, words, todos, URLs, short notes).
- FR-2: On save → create record with: `id` (UUID), `content`, `created_at` (ISO), `status = "pending"`, `process_code = null`.
- FR-3: Support offline capture via IndexedDB + background sync.
- FR-4: Instant optimistic UI update.

### 5.2 List & Management
- FR-5: Chronological list of all items (newest first).
- FR-6: Status badges: `pending`, `processing`, `done`, `error`.
- FR-7: Ability to delete individual items.
- FR-8: Ability to manually mark as done (skip enrichment).
- FR-9: Filter / search by content or status.

### 5.3 Trigger System
- FR-10: "Process Now" button that:
  - Generates a short unique code (e.g. `PROC-a8f3k2`).
  - Assigns the code to all selected pending items (or all pending).
  - Sets their status to `ready_to_process`.
  - Optionally fires a webhook to n8n.
- FR-11: Support both **webhook** (push) and **polling** (n8n checks DB) modes.
- FR-12: Clear the process_code after successful processing.

### 5.4 Enrichment (n8n + Gemini)
- FR-13: n8n workflow that:
  1. Detects items with a process_code / status = ready_to_process.
  2. Batches them (recommended 5–10 items per Gemini call).
  3. Calls Gemini Flash-Lite (or Flash) with a structured prompt.
  4. Parses the response.
  5. Creates/updates a Notion page or database row for each item.
  6. Writes the enrichment result back to the main database.
  7. Updates status to `done` or `error`.
- FR-14: Prompt must request:
  - 1–2 sentence plain-English explanation
  - 2–3 high-quality web links (with titles)
  - Optional tags / category
  - Confidence or "I don't know" flag if the topic is too vague

### 5.5 Output Destinations
- FR-15: Primary → Notion database (one page or row per item).
- FR-16: Secondary (optional) → Google Sheet / Excel / CSV export.
- FR-17: Enriched data also stored in the app’s own database so the PWA can display it.

### 5.6 Error Handling
- FR-18: If Gemini fails → mark item `error` + store error message.
- FR-19: Retry mechanism (manual “Retry failed” button).
- FR-20: n8n should never leave items stuck in `processing` forever (timeout + reset).

---

## 6. Non-Functional Requirements

| Category              | Requirement                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| Performance           | Capture must feel instant (< 300ms perceived)                               |
| Offline               | Full capture + list viewing must work offline                               |
| Cost                  | $0 recurring. Only free Gemini tier + free Notion + free Supabase/Neon     |
| Rate Limits           | Design must keep Gemini calls well under free-tier daily limits             |
| Reliability           | Captured data must never be lost                                            |
| Privacy               | No third-party analytics. User controls when data is sent to Gemini         |
| Installability        | Must be installable as PWA on Android & iOS home screens                    |
| Simplicity            | UI must be extremely minimal – almost like a notes widget                   |

---

## 7. Technical Stack (Recommended)

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + minimal shadcn/ui or pure Tailwind
- Serwist or next-pwa for service worker
- Dexie.js or idb for IndexedDB (offline)
- Zustand or React Context for client state

### Backend / Database
- Supabase (Postgres) **or** Neon + Prisma
- Alternative for ultra-simple: PocketBase or even a local SQLite if everything stays on laptop

### Automation
- n8n (self-hosted via Docker on user’s laptop)
- Gemini API (Google AI Studio free key) – prefer `gemini-2.0-flash-lite` or latest Flash-Lite model

### Knowledge Base
- Notion (official API via n8n Notion node)
- Optional: Google Sheets node

### Hosting
- Frontend: Vercel (free) or Cloudflare Pages
- Database: Supabase free tier
- n8n: User’s laptop (Docker) + optional Cloudflare Tunnel / ngrok for webhook access

---

## 8. Data Model

### Table: `items`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
content         TEXT NOT NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
status          TEXT NOT NULL DEFAULT 'pending'   -- pending | ready_to_process | processing | done | error
process_code    TEXT                              -- e.g. 'PROC-a8f3k2'
enriched_summary TEXT
enriched_links  JSONB                             -- [{title, url}]
tags            TEXT[]
notion_page_id  TEXT
error_message   TEXT
source          TEXT DEFAULT 'pwa'                -- future: telegram, etc.
```

### Optional Table: `triggers` (if preferred over putting code on items)
```sql
id              UUID PRIMARY KEY
code            TEXT UNIQUE NOT NULL
created_at      TIMESTAMPTZ
status          TEXT  -- active | consumed
```

---

## 9. Gemini Prompt Specification (Critical)

**System / Instruction prompt (keep short):**
```
You are a concise knowledge assistant. For each topic provided, return a JSON array.
For every item return an object with:
- id: the original id
- summary: 1-2 clear sentences explaining what it is
- links: array of 2-3 objects { "title": "...", "url": "..." } (prefer official or high-quality sources)
- tags: array of 1-4 short tags
- confidence: "high" | "medium" | "low"
If the topic is too vague or you truly don't know, set confidence to "low" and give a short honest reply.
Return ONLY valid JSON. No markdown.
```

**User message format:**
```
[
  {"id": "uuid-1", "content": "quantum entanglement"},
  {"id": "uuid-2", "content": "buy noise cancelling headphones under 10k"}
]
```

Batch size: 5–10 items maximum per call.

---

## 10. n8n Workflow Outline

1. **Trigger**
   - Option A: Webhook (POST with process_code)
   - Option B: Schedule (every 2–5 min) + IF node checking for ready items

2. **Fetch items** from database where `status = 'ready_to_process'` (and matching code if provided)

3. **Set status → processing**

4. **Split into batches of 5–10**

5. **HTTP Request / Gemini node** → send batch

6. **Parse JSON response**

7. **For each item:**
   - Create Notion page/row
   - Update database record (summary, links, tags, notion_page_id, status = done)

8. **Error handling branch** → status = error + log message

9. **Clear process_code**

---

## 11. UI/UX Requirements

### Screens
1. **Home / Capture** (default)
   - Large auto-focused input
   - “Save” or Enter
   - Recent 10–20 items below
   - Floating or sticky “Process Now” button (shows count of pending)

2. **History / All Items**
   - Filter chips: All / Pending / Done / Error
   - Search bar
   - Each card shows content + status + relative time
   - Expandable to show enrichment when available

3. **Settings** (minimal)
   - Toggle webhook vs polling mode
   - Notion database ID (or keep in n8n only)
   - Clear all pending / retry failed

### Design Principles
- Extremely minimal, almost monochrome
- Large touch targets
- Dark mode default (optional light)
- No onboarding screens
- Feels like a native notes widget

---

## 12. Security & Privacy

- No user authentication in v1 (single-user personal tool). Optional simple password or magic link later.
- process_code should be reasonably unguessable.
- Webhook endpoint must be protected by a secret header or path secret if exposed publicly.
- Never send sensitive personal data to Gemini intentionally.
- All secrets (Gemini key, Notion token, DB URL) live only in n8n / environment variables.

---

## 13. Out of Scope (v1)

- Multi-user / auth system
- Mobile native apps
- Automatic continuous enrichment (must be manual trigger)
- Complex task management (due dates, priorities, subtasks)
- Full-text search across Notion
- Local LLM fallback (can be added later)
- Telegram / WhatsApp / email capture channels (future)

---

## 14. Implementation Phases

### Phase 1 – Core Capture (MVP)
- Next.js PWA with offline support
- Supabase/Neon database
- Basic list + status
- “Process Now” generates code and marks items

### Phase 2 – n8n + Gemini
- n8n workflow (polling first, then webhook)
- Batch Gemini calls
- Write results back to DB
- Basic Notion integration

### Phase 3 – Polish
- Better UI for viewing enrichments
- Error recovery & retry
- Notion page templates
- Optional Google Sheets backup
- PWA polish (icons, splash, offline indicator)

### Phase 4 – Future
- Local LLM option (Ollama)
- Multiple capture sources
- Daily digest
- Tags & filtering improvements

---

## 15. Open Questions / Decisions Needed

1. Database choice: Supabase vs Neon vs PocketBase vs self-hosted Postgres?
2. Prefer webhook (needs tunnel) or pure polling for n8n?
3. Notion: Database (table) or individual pages inside a parent page?
4. Should the PWA itself display the Gemini summary, or only Notion?
5. Exact free Gemini model to target in Aug 2026 (Flash-Lite recommended).

---

## 16. Acceptance Criteria (Definition of Done for v1)

- [ ] User can install PWA on phone home screen
- [ ] Can add items offline and they sync later
- [ ] “Process Now” correctly marks items and generates unique code
- [ ] n8n successfully processes a batch via Gemini and writes to Notion
- [ ] Status updates correctly in the app
- [ ] No Gemini call happens without explicit user action
- [ ] Entire stack runs at $0/month for personal use

---

**End of PRD**

This document is intentionally detailed and implementation-oriented so that an AI coding agent (Antigravity or similar) can start scaffolding the project with minimal ambiguity.