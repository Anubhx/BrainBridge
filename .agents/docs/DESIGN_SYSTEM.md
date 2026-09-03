# 🎨 BrainBridge V2 — Framer Design System & Component Specification

> **Brand Aesthetic:** Technical Scratchpad & Personal Second Brain  
> **Visual Identity:** Warm graphite background `#1C1B1A`, sharp `2px` corners maximum, `JetBrains Mono` system typography, `3px` vertical left-border status indicators.

---

## 1. Design Tokens

### Colors Collection (`BB/Colors`)
| Token Name | Hex / Value | Usage | Next.js CSS Variable |
|---|---|---|---|
| `bg-base` | `#1C1B1A` | Main page background (warm graphite) | `--bg` |
| `bg-surface` | `#252422` | Cards & container background | `--bg-surface` |
| `border-default` | `#383633` | 1px border default | `--border` |
| `border-hover` | `#4A4743` | 1px border hover state | `--border-light` |
| `accent-amber` | `#E8A33D` | Quick depth mode / Pending status | `--amber` |
| `accent-blue` | `#5B9BD5` | Deep depth mode / Key concept chips | `--blue` |
| `accent-purple` | `#9B7ED4` | Research depth mode / Report viewer | `--purple` |
| `status-done` | `#5FA8A0` | Done / Enriched status (teal) | `--teal` |
| `status-error` | `#D9534F` | Error status (soft red) | `--red` |
| `status-processing` | `#F59E0B` | Processing status (pulsing amber) | `--amber-processing` |
| `text-primary` | `#E8E4DF` | Raw thoughts & body text | `--text` |
| `text-muted` | `#9A948E` | Secondary description & body text | `--text-muted` |

### Typography Styles
| Style Name | Font Family | Size | Weight | Letter Spacing | Line Height | Usage |
|---|---|---|---|---|---|---|
| `mono-label` | `JetBrains Mono` | 10px | 500 | `0.08em` | 1.2 | System chips, badges, tags, tooltips |
| `mono-body` | `JetBrains Mono` | 12px | 400 | `0.02em` | 1.4 | Timestamps, model chips, process codes |
| `sans-body` | `Inter` | 13.5px | 400 | Normal | 1.6 | Note content, AI summaries, section text |
| `sans-ui` | `Inter` | 13px | 500 | Normal | 1.4 | Section titles, interactive UI elements |
| `sans-large` | `Inter` | 16px | 600 | `-0.01em` | 1.3 | Page headings & title accents |

### Spacing & Corner Radius
- **Border Radius:** `2px` strictly enforced across all cards, buttons, badges, and chips.
- **Spacing Scale:** `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`.
- **Padding Specs:**
  - Chips & badges: `2px 6px`
  - Mode selector tabs: `5px 14px`
  - Stream cards: `12px 14px 12px 18px`

---

## 2. Framer Core Components

### A. DepthSelector
- **Layout:** `HStack` container with `2px` gap, height `28px`.
- **Tabs:** `QUICK`, `DEEP`, `RESEARCH`.
- **Active State:** Font `mono-label`, text color = depth accent, border = depth accent, background = `10%` opacity tint of depth accent.
- **Inactive State:** Font `mono-label`, text `#9A948E`, border `#383633`, background transparent.
- **Tooltips:**
  - `QUICK`: `"1-sentence summary, 3 tags — fast single AI call"`
  - `DEEP`: `"Full summary, key concepts, links — Gemini + Mistral"`
  - `RESEARCH`: `"6-section structured report — Gemini + Llama + Mistral"`

### B. ItemCard (6 Variants)
- **Container:** Flex column with signature `3px` left border indicating status.
- **Variants:**
  1. `Pending`: 3px left border `#E8A33D` (amber)
  2. `Processing`: 3px left border `#F59E0B` with `1s` opacity pulse animation (`1 → 0.3 → 1`)
  3. `Done-Quick`: 3px left border `#5FA8A0` (teal), monospace depth badge `#E8A33D`
  4. `Done-Deep`: 3px left border `#5FA8A0` (teal), monospace depth badge `#5B9BD5`, key concept blue chips (`#5B9BD5`)
  5. `Done-Research`: 3px left border `#5FA8A0` (teal), monospace depth badge `#9B7ED4`, `[ VIEW REPORT → ]` button
  6. `Error`: 3px left border `#D9534F` (red), error message + retry count
- **Processing Hints:**
  - Quick: `⟳ Gemini Flash-Lite`
  - Deep: `⟳ Gemini → Mistral-7B`
  - Research: `⟳ Gemini → Llama-3B → Mistral-7B`

### C. ResearchSection Accordion
- **Layout:** Vertical stack of 6 structured report cards.
- **3px Left Border Section Accents:**
  - `01 Key Points`: `#E8A33D` (amber)
  - `02 Evidence & Context`: `#5FA8A0` (teal)
  - `03 Counterpoints`: `#D9534F` (red)
  - `04 Related Work`: `#5B9BD5` (blue)
  - `05 Practical Applications`: `#9B7ED4` (purple)
  - `06 Action Items`: `#E8A33D` (amber)
- **Header:** `HStack` with section number (`01`-`06` in `mono-label`), title (`sans-ui`), model used (`mono-label`), toggle (`−` / `+`).
- **Body:** Dark background `#131211`, top border `#383633`, text `#9A948E`, line-height `1.6`, padding `12px 16px`. Default expanded section: `01 Key Points`.

---

## 3. Motion & Animation Rules

1. **Processing Pulse:** `opacity` keyframes `1 → 0.3 → 1`, `1s ease-in-out infinite`.
2. **Tab Switch:** `background-color` and `border-color` transition `150ms ease`.
3. **Status Done Transition:** Left border color transition `300ms ease`.
4. **Accordion Expand:** Spring animation (`stiffness: 400`, `damping: 35`) for height and opacity.
5. **New Item Insertion:** `opacity 0 → 1` and `translateY 8px → 0`, `200ms ease-out`.
6. **Error Shake:** `translateX 0 → -4px → 4px → -4px → 0` over `300ms`.
7. **No Page Load Animation:** Existing items render statically without entrance lag.

---

## 4. Handoff JSON (`public/design-tokens.json`)

```json
{
  "colors": {
    "bgBase": "#1C1B1A",
    "bgSurface": "#252422",
    "borderDefault": "#383633",
    "borderHover": "#4A4743",
    "accentAmber": "#E8A33D",
    "accentBlue": "#5B9BD5",
    "accentPurple": "#9B7ED4",
    "statusDone": "#5FA8A0",
    "statusError": "#D9534F",
    "statusProcessing": "#F59E0B",
    "textPrimary": "#E8E4DF",
    "textMuted": "#9A948E"
  },
  "radius": "2px",
  "spacing": [4, 8, 12, 16, 24, 32, 48]
}
```
