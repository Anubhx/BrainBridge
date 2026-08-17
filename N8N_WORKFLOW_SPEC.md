# Phase 2 — n8n + Gemini Workflow Specification

This document contains the step-by-step guide to setting up the **BrainBridge AI Enrichment & Notion Sync** workflow in n8n (running locally via Docker on `http://localhost:5678`).

---

## 1. Credentials Setup in n8n Editor UI

Before adding nodes, configure the following 3 credentials in **n8n → Credentials → New**:

### Credential 1: Supabase Postgres
- **Type:** Postgres
- **Host:** `db.<your-supabase-project-ref>.supabase.co`
- **Database:** `postgres`
- **User:** `postgres`
- **Password:** `<your-db-password>`
- **Port:** `5432` or `6543` (connection pooler)
- **SSL:** `Require`
- *(Alternative)*: Use HTTP Request nodes with Supabase REST API (`https://<project-ref>.supabase.co/rest/v1/items`) using Header Auth `apikey` and `Authorization: Bearer <service_role_key>`.

### Credential 2: Gemini API
- **Type:** Header Auth (or Query Auth)
- **Header Name:** `x-goog-api-key`
- **Value:** `<your-google-ai-studio-free-api-key>`

### Credential 3: Notion API
- **Type:** Notion API
- **Auth Type:** Internal Integration Token
- **API Key:** `<secret_...>` from [notion.so/my-integrations](https://www.notion.so/my-integrations)
- **Note:** Ensure your Notion database is shared with this integration (`...` → Add connections → your integration).

---

## 2. Main Workflow — Node-by-Node Setup

```
[Schedule Trigger] 
       ↓
[Poll Ready Items] → (If 0 items) → [Stop]
       ↓ (items found)
[Mark as Processing]
       ↓
[Split in Batches (5-10)]
       ↓
[HTTP Request: Gemini Flash-Lite]
       ↓
[Code Node: Validate & Parse JSON]
       ↓
[Loop / Item Split]
       ├── (Success) → [Notion: Create Row] → [Supabase: Write Back Success]
       └── (Error)   → [Supabase: Write Back Error]
```

### Node 1: Schedule Trigger
- **Name:** `Schedule Poller`
- **Type:** Schedule Trigger
- **Trigger Interval:** Every `2` to `5` minutes.

---

### Node 2: Fetch Ready Items (Postgres/Supabase)
- **Name:** `Fetch Ready Items`
- **Type:** Postgres (Execute Query)
- **Query:**
  ```sql
  SELECT id, content, process_code, created_at
  FROM items
  WHERE status = 'ready_to_process'
  ORDER BY created_at ASC
  LIMIT 10;
  ```
- **IF Node Check:** If `fetchResult.length === 0`, stop execution.

---

### Node 3: Mark Items as Processing
- **Name:** `Set Status Processing`
- **Type:** Postgres (Execute Query)
- **Query:**
  ```sql
  UPDATE items
  SET status = 'processing',
      updated_at = NOW()
  WHERE id = ANY($1::uuid[]);
  ```
- **Query Parameters:** `={{ $items().map(i => i.json.id) }}`

---

### Node 4: Batching (Split in Batches)
- **Name:** `Batch Items`
- **Type:** Split In Batches
- **Batch Size:** `5` (or `10` max, to respect Gemini free-tier rate limits and keep prompt small).

---

### Node 5: Gemini API Request
- **Name:** `Gemini Flash-Lite`
- **Type:** HTTP Request
- **Method:** `POST`
- **URL:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent`
- **Authentication:** Header Auth (Gemini Credential)
- **Headers:**
  - `Content-Type`: `application/json`
- **Body Parameter (JSON):**
  ```json
  {
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "System instructions: You are a concise knowledge assistant. For each topic provided, return a JSON array. For every item return an object with: - id: the original id - summary: 1-2 clear sentences explaining what it is - links: array of 2-3 objects { \"title\": \"...\", \"url\": \"...\" } (prefer official or high-quality sources) - tags: array of 1-4 short tags - confidence: \"high\" | \"medium\" | \"low\". If the topic is too vague or you truly don't know, set confidence to \"low\" and give a short honest reply. Return ONLY valid JSON. No markdown.\n\nInput batch:\n{{ JSON.stringify($input.all().map(item => ({ id: item.json.id, content: item.json.content }))) }}"
          }
        ]
      }
    ],
    "generationConfig": {
      "responseMimeType": "application/json",
      "temperature": 0.2
    }
  }
  ```

---

### Node 6: Parse & Validate Response (Code Node)
- **Name:** `Parse Gemini JSON`
- **Type:** Code (JavaScript)
- **Code:**
  ```javascript
  const responseText = $input.first().json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) {
    throw new Error("Empty or invalid response from Gemini API");
  }

  let items;
  try {
    items = JSON.parse(responseText.replace(/```json|```/g, "").trim());
  } catch (err) {
    throw new Error("Failed to parse Gemini JSON: " + err.message);
  }

  return items.map(item => ({
    json: {
      id: item.id,
      summary: item.summary || "No summary generated.",
      links: Array.isArray(item.links) ? item.links : [],
      tags: Array.isArray(item.tags) ? item.tags : [],
      confidence: item.confidence || "medium",
    }
  }));
  ```

---

### Node 7: Notion Integration
- **Name:** `Create Notion Page`
- **Type:** Notion Node (Create Database Page)
- **Database Schema Needed in Notion:**
  Create a Notion Database named **"BrainBridge Knowledge"** with these properties:

  | Property Name | Notion Type | Mapped Value |
  |---------------|-------------|--------------|
  | **Title / Content** | Title | Original item content |
  | **Summary** | Text | `{{ $json.summary }}` |
  | **Tags** | Multi-select | `{{ $json.tags }}` |
  | **Confidence** | Select | `{{ $json.confidence }}` |
  | **Links** | Text (or URL) | `{{ $json.links.map(l => l.title + ': ' + l.url).join('\n') }}` |
  | **App Item ID** | Text | `{{ $json.id }}` |

- **Output:** Captures `notionPageId` from Notion's API response.

---

### Node 8: Write Back Success (Postgres/Supabase)
- **Name:** `Update Status Done`
- **Type:** Postgres (Execute Query)
- **Query:**
  ```sql
  UPDATE items
  SET status = 'done',
      enriched_summary = $2,
      enriched_links = $3::jsonb,
      tags = $4,
      notion_page_id = $5,
      process_code = NULL,
      updated_at = NOW()
  WHERE id = $1::uuid;
  ```
- **Query Parameters:**
  1. `={{ $json.id }}`
  2. `={{ $json.summary }}`
  3. `={{ JSON.stringify($json.links) }}`
  4. `={{ $json.tags }}`
  5. `={{ $json.notionPageId }}`

---

### Node 9: Error Branch (Fallback)
- **Name:** `Handle Item Error`
- **Type:** Postgres (Execute Query)
- **Query:**
  ```sql
  UPDATE items
  SET status = 'error',
      error_message = $2,
      process_code = NULL,
      updated_at = NOW()
  WHERE id = $1::uuid;
  ```
- **Query Parameters:**
  1. `={{ $json.id }}`
  2. `={{ $node["Parse Gemini JSON"].error?.message || 'Enrichment failed' }}`

---

## 3. Stale Processing Timeout Cleanup Workflow (FR-20)

Create a **second workflow** (or a separate schedule branch) in n8n to prevent items from being stuck in `processing` if n8n is interrupted or the laptop sleeps mid-batch:

- **Trigger:** Schedule Trigger (Every 10–15 minutes)
- **Node:** Postgres Execute Query
- **Query:**
  ```sql
  UPDATE items
  SET status = 'error',
      error_message = 'Timed out in processing (exceeded 10 minutes)',
      process_code = NULL,
      updated_at = NOW()
  WHERE status = 'processing'
    AND updated_at < NOW() - INTERVAL '10 minutes';
  ```

---

## 4. PWA Error Recovery Verification (FR-19)

In the PWA:
- Go to **History** or **Settings**.
- Click **"Retry failed"** / **"Retry all failed"**.
- The app resets items with `status = 'error'` back to `status = 'ready_to_process'`, generates a new `PROC-xxxxxx` code, and syncs to Supabase.
- n8n will automatically pick them up on its next polling cycle!
