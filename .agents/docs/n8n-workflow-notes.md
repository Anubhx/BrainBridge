# n8n Workflow Spec — BrainBridge Enrichment (Polling Mode)

Since n8n only runs while your laptop is on, polling is the default mode —
no tunnel or public webhook required. Build this workflow in the n8n editor
UI (http://localhost:5678).

## Nodes, in order

1. **Schedule Trigger**
   - Interval: every 2–5 minutes.

2. **Postgres/Supabase — Fetch ready items**
   ```sql
   select * from items
   where status = 'ready_to_process'
   order by created_at asc
   limit 10;
   ```
   - If 0 rows returned, use an **IF** node to stop the workflow here.

3. **Postgres/Supabase — Mark as processing**
   ```sql
   update items
   set status = 'processing'
   where id = any($1::uuid[]);
   ```
   - Pass the fetched ids as the parameter.

4. **Split into batches** (n8n "Split In Batches" node)
   - Batch size: 5–10 items (PRD §9).

5. **HTTP Request — Gemini**
   - Model: `gemini-2.0-flash-lite` (or latest free Flash-Lite — verify
     current model name in Google AI Studio before wiring this up, names
     change).
   - System prompt: use PRD §9 verbatim, unmodified.
   - User message: JSON array of `{id, content}` for the current batch.
   - Request `responseMimeType: application/json` if the Gemini API
     supports it for your model, to reduce parsing errors.

6. **Code node — Parse response**
   - Parse the JSON array from Gemini.
   - Validate each object has `id`, `summary`, `links`, `tags`,
     `confidence`. Anything malformed → route to the error branch (step 9)
     for that item only, don't fail the whole batch.

7. **Notion node — Create/Update page**
   - One item per iteration (use a "Split Out" / loop node over the parsed
     array).
   - Map: `summary` → page property/body, `links` → property or child
     blocks, `tags` → multi-select property, `confidence` → select property.
   - Capture the returned Notion page ID.

8. **Postgres/Supabase — Write back success**
   ```sql
   update items
   set status = 'done',
       enriched_summary = $2,
       enriched_links = $3::jsonb,
       tags = $4,
       notion_page_id = $5,
       process_code = null
   where id = $1;
   ```

9. **Error branch**
   - Triggered by: Gemini call failure, malformed JSON for an item, or
     Notion write failure.
   ```sql
   update items
   set status = 'error',
       error_message = $2,
       process_code = null
   where id = $1;
   ```

## Stale "processing" cleanup (FR-20)

Add a second, separate Schedule Trigger workflow (or a branch at the start
of this one) that runs every 10–15 minutes:

```sql
update items
set status = 'error',
    error_message = 'Timed out in processing',
    process_code = null
where status = 'processing'
  and updated_at < now() - interval '10 minutes';
```

This guarantees no item is stuck in `processing` forever if n8n crashes
mid-batch or your laptop sleeps.

## Credentials to set up in n8n (UI, not env vars)

- **Postgres/Supabase**: connection string with the *service role* key
  (needs write access; keep this out of the frontend entirely).
- **Gemini**: API key from Google AI Studio (free tier).
- **Notion**: internal integration token, shared with your target database.

## When you're ready for webhook mode later

Swap the Schedule Trigger for a Webhook node, and have the PWA's "Process
Now" action POST the process code to it. You'll need Cloudflare Tunnel or
ngrok pointed at `localhost:5678` so Vercel can reach your laptop. Not
needed for Phase 1/2 — polling covers the MVP fully.
