# Antigravity Build Prompt — "BrainBridge" (Capture & Enrich PWA)

Paste everything below into Antigravity as your project instructions. Attach `PRD.md`
alongside it. The other files in this repo (`schema.sql`, `.env.example`,
`docker-compose.yml`, `n8n-workflow-notes.md`) are reference material — point the
agent at them too.

---

## Prompt to give the agent

You are scaffolding and building a project called **BrainBridge**, a personal
capture-and-enrich PWA. The full spec is in `PRD.md` in this repo — read it fully
before writing any code and treat it as the source of truth for scope.

**My actual environment (important, don't assume otherwise):**
- I run **n8n locally on my own Windows laptop** via Docker Desktop. n8n is NOT
  hosted anywhere in the cloud. It's only reachable while my laptop is on.
- Because n8n is local-only, **default to polling mode, not webhook mode**, for
  n8n→DB communication (FR-11). Webhook mode requires exposing my laptop to the
  internet (Cloudflare Tunnel/ngrok), which I may set up later but shouldn't be
  the default path you build first.
- The frontend (Next.js PWA) will be deployed to Vercel and talks only to
  Supabase — it never talks to n8n directly. n8n talks to Supabase directly too.
  This means the PWA and my laptop don't need to know about each other's
  network location at all, which is the point of the polling design.
- I will host the code on **GitHub** and deploy the frontend from there to
  Vercel. Set the repo up properly (`.gitignore`, no secrets committed, clear
  README) from the first commit.

**Build order — follow PRD §14 phases strictly, in this order, and stop for my
review at the end of each phase before continuing:**

### Phase 1 — Core Capture (MVP)
1. Scaffold a Next.js 15 App Router + TypeScript + Tailwind project.
2. Add Dexie.js for IndexedDB offline storage of items.
3. Add Serwist (or next-pwa) for service worker / installability (NFR:
   Installability, PRD §6).
4. Build the Home/Capture screen per PRD §11: auto-focused input, Enter-to-save,
   optimistic UI, recent items list, sticky "Process Now" button showing
   pending count.
5. Build the History screen: filter chips (All/Pending/Done/Error), search,
   expandable cards showing enrichment when present.
6. Set up Supabase project schema using `schema.sql` in this repo (items
   table exactly as specified in PRD §8). Use Supabase JS client.
7. Implement background sync: items save to IndexedDB first, then sync to
   Supabase when online (PRD FR-3, Flow 3).
8. Implement "Process Now" (PRD FR-10): generates a `PROC-xxxxxx` code,
   sets `status = ready_to_process` on selected/all pending items, stores the
   code on those rows. No webhook call — polling only for now.
9. Deliverable: working PWA, installable, deployed to Vercel, using a real
   Supabase project (I will provide the project URL/keys — put them only in
   `.env.local`, never commit them).

**Stop here and let me test capture, offline, and Process Now before Phase 2.**

### Phase 2 — n8n + Gemini
1. Do NOT scaffold n8n itself — I already run it via `docker-compose.yml` in
   this repo. Instead, produce:
   - A written, node-by-node workflow spec (which nodes, in order, what each
     does, what credentials each needs) that I can build directly in the n8n
     editor UI, following `n8n-workflow-notes.md` as the base.
   - The exact Postgres/Supabase queries each node needs (poll for
     `status = 'ready_to_process'`, set `status = 'processing'`, batch 5–10,
     write results back, clear `process_code`).
   - The Gemini prompt exactly as specified in PRD §9 — don't alter the
     schema of the JSON contract, the frontend will depend on it.
   - Guidance on the Notion node setup (one database, one row per item,
     properties mapped from `summary`, `links`, `tags`, `confidence`).
2. Add a "Retry failed" action in the PWA (FR-19) that resets `error` items
   back to `ready_to_process`.
3. Add a stale-processing timeout note: PRD FR-20 requires n8n never leave
   items stuck in `processing` forever — the polling workflow should reset
   items to `error` if they've been `processing` for over ~10 minutes.

### Phase 3 — Polish
Follow PRD §14 Phase 3 as written (better enrichment view, error recovery UI,
PWA icons/splash/offline indicator). Only start once I confirm Phase 2 works
end-to-end with real Gemini + Notion calls.

**General constraints for every phase:**
- Zero recurring cost — Vercel free tier, Supabase free tier, Gemini free
  tier, Notion free. Flag anything that risks that.
- No user auth in v1 (PRD §12) — single-user tool, but don't hardcode secrets
  client-side.
- Keep the UI extremely minimal per PRD §11 Design Principles — dark mode
  default, large touch targets, no onboarding.
- Every commit should be small and reviewable; don't dump the whole app in
  one commit. Use conventional commit messages.
- Ask me before making any decision listed in PRD §15 (Open Questions) that
  you can't infer from context — especially DB choice if I haven't already
  picked Supabase, and whether Notion should be one database vs. pages under
  a parent page.

Begin with Phase 1, step 1: scaffold the Next.js project and show me the file
tree before writing feature code.
