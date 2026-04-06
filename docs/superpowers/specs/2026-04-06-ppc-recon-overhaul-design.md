# PPC Recon — Overhaul Design Spec
**Date:** 2026-04-06  
**Scope:** Design system (dark/light mode), performance dashboard, budget projection fix, location autocomplete

---

## 1. Design System — Dark/Light Mode

### Goal
Replace the current light-only Tailwind palette with CSS custom properties so every component picks up dark/light mode automatically. A `data-theme="dark"` attribute on `<html>` swaps all tokens. Preference stored in `localStorage`.

### Color Tokens

| Token | Dark Mode | Light Mode |
|---|---|---|
| `--bg` | `#0d1117` | `#f4f6fa` |
| `--sidebar` | `#131820` | `#1e2a3a` (always dark) |
| `--card` | `#1a2230` | `#ffffff` |
| `--primary` | `#2d5be3` | `#2d5be3` |
| `--accent` | `#f5a623` | `#f5a623` |
| `--border` | `#2a3348` | `#e2e8f0` |
| `--text-primary` | `#ffffff` | `#0f172a` |
| `--text-secondary` | `#8b9ab3` | `#64748b` |

### Implementation
- Define tokens in `app/globals.css` under `[data-theme="dark"]` and `:root` (light default)
- Update `tailwind.config.js` to reference CSS vars so all existing `bg-surface`, `text-on-surface`, etc. classes pick up the new tokens
- Toggle button in `components/Sidebar.js` footer — matches GetSuite's "Light mode" toggle position
- `ThemeProvider` context in `app/layout.js` wraps the app; sets `data-theme` on `<html>` and reads/writes `localStorage`

### Sidebar
The sidebar is always dark (navy `#131820`) regardless of mode — matches GetSuite. Logo, nav items, and footer stay white text.

---

## 2. Performance Dashboard

### Goal
Overhaul `/accounts/[id]` to be a real-time campaign performance view. Primary metric is **Cost Per Lead**. This is the first thing bosses see when they open a connected account.

### Data Sources
All data comes from existing API routes — no new routes needed:
- `/api/accounts/[id]/metrics?range=LAST_30_DAYS` — account-level stats
- `/api/accounts/[id]/campaigns` — campaign-level breakdown

### Layout

#### Date Range Selector
Tabs at top right: **7d / 30d / 90d**. Mapped to Google Ads API range values (`LAST_7_DAYS`, `LAST_30_DAYS`, `LAST_90_DAYS`) and passed as `?range=` to both metrics and campaigns fetches. Default: 30d.

#### Hero Stat Row (5 cards, GetSuite strip style)
1. **Cost Per Lead** — `total_cost / conversions`, large bold number, primary color. "—" if no conversions yet.
2. **Total Spend** — formatted as `$X,XXX`
3. **Conversions** — raw count with label "Leads"
4. **Budget Used** — `spend / total_budget` as percentage with a thin progress bar inside the card. Red if > 90%, yellow if > 75%.
5. **Avg CPC** — `total_cost / total_clicks`

#### Charts (two-column bento)
- **Left — Spend Over Time** (bar chart, blue `#2d5be3`): daily spend for selected range. Data from `campaign_snapshots` table (one entry per sync). If fewer than 2 snapshots exist, show a single bar with current period total and a "Sync regularly to build history" note.
- **Right — Conversions Over Time** (line chart, gold `#f5a623`): daily conversions for selected range. Same data source and same fallback.
- Chart library: **Recharts** — not currently installed, add as dependency (`npm install recharts`).

#### Campaign Table
Columns: Name | Status | Spend | Clicks | Conversions | CPL | Daily Budget

- Sortable by any column (client-side sort, default: CPL ascending)
- CPL column: if a campaign's CPL is more than 1.5× the account average CPL, show a red warning badge next to the value
- Status badge: Active (green), Paused (gray), others (yellow)
- Empty state: "No campaign data yet — click Sync to pull from Google Ads"

#### Action Bar (below table)
- **Sync Data** button — calls `POST /api/accounts/[id]/sync`, shows spinner, refreshes data on completion
- **Run AI Audit** button — calls `POST /api/agents/run` with `type: "audit"`, opens a slide-in panel showing audit results (health score, issues, quick wins)

### Component Structure
```
app/accounts/[id]/page.js          ← full overhaul (currently exists)
components/dashboard/
  StatCard.js                      ← reusable hero stat card
  SpendChart.js                    ← bar chart component
  ConversionsChart.js              ← line chart component
  CampaignTable.js                 ← sortable campaign table
  AuditPanel.js                    ← slide-in audit results panel
```

---

## 3. Budget Projection Fix + Calibration

### Problem
Current `budgetProjectionPrompt` in `lib/prompts.js` uses 4–7% conversion rates and "stretch/aggressive" framing that leads Gemini to recommend ~4× real-world budgets (observed: ~$8M/year vs ~$2M/year actual).

### Fix A — Conservative Defaults (always applied)
Update `lib/prompts.js` `budgetProjectionPrompt`:
- Lower conversion rate guidance: **1.5–3% transactional, 0.5–1.5% commercial**
- Replace "stretch tier — aggressive growth scenario with highest lead volume" with **"growth tier — realistic ceiling based on total keyword pool volume"**
- Add explicit math constraint in prompt: *"Monthly budget must not exceed: (number of keywords in tier × avg CPC × 200 clicks per keyword per month). This is a hard ceiling."*
- The 200 clicks/keyword/month cap prevents Gemini from assuming unlimited traffic

### Fix B — Optional Calibration Input (user-supplied anchor)
Add a collapsible "Calibrate with real numbers" section in `app/research/page.js` Step 1 (after service selection, before Run Research):

Fields:
- **Monthly Ad Spend** (`$`) — what they currently spend
- **Leads per Month** (`#`) — what they currently get

If both fields are filled, compute `actual_cpl = spend / leads` and inject into the prompt:
```
"IMPORTANT: This client's actual verified CPL is $${actualCpl}. 
All budget tiers must be anchored to this CPL. 
Do not use generic conversion rate benchmarks — use this real number."
```

Calibration fields are optional. If empty, Fix A defaults apply. Fields are shown with placeholder examples ("e.g. $4,200/mo spend, 18 leads → $233 CPL").

### Files Changed
- `lib/prompts.js` — update `budgetProjectionPrompt`
- `app/research/page.js` — add calibration section in Step 1
- `app/api/budget-projection/route.js` — pass `calibration` object from request body through to prompt

---

## 4. Location Autocomplete + Nearby Expansion

### Goal
Replace the plain text input for service areas with:
1. Autocomplete while typing (city/zip suggestions)
2. After picking a location, suggest nearby cities within ~30 miles

### API Routes (new)
**`GET /api/places/autocomplete?q=<query>`**
- Primary: Google Maps Places Autocomplete API (`GOOGLE_MAPS_API_KEY` env var)
- Fallback: Nominatim OpenStreetMap (`https://nominatim.openstreetmap.org/search`) — free, no key required
- Returns: `[{ label: "Greensboro, NC", placeId: "...", lat: 36.07, lng: -79.79 }]`

**`GET /api/places/nearby?lat=<lat>&lng=<lng>&radius=30`**
- Primary: Google Maps Nearby Search or Places API
- Fallback: Nominatim reverse geocode + bounding box query for populated places
- Returns: `[{ label: "High Point, NC", lat: 35.95, lng: -80.00 }, ...]`
- Radius default: 30 miles. Filters to `locality` and `sublocality` place types only.

### UX Flow in `app/research/page.js`

1. User types in service areas input → debounced 300ms → calls `/api/places/autocomplete`
2. Dropdown appears below input showing up to 5 suggestions
3. User clicks a suggestion → chip added, dropdown closes, `lat/lng` stored in state alongside label
4. After chip is added: a "Nearby areas" row appears below chips:
   - Shows up to 4 nearby city suggestions as clickable pills
   - "+ X more" button expands to show all
   - Clicking a pill adds it as a chip (no lat/lng needed for these — label only)
5. Keyboard: Arrow keys navigate dropdown, Enter selects, Escape closes

### Component
Extract service areas input into `components/ServiceAreaInput.js` — self-contained, replaces the inline JSX in `app/research/page.js`. Accepts `value`, `onChange` props.

### Environment Variable
Add `GOOGLE_MAPS_API_KEY` to `.env.example` with comment: `# Optional — enables city autocomplete. Falls back to OpenStreetMap if not set.`

---

## Implementation Order

1. **Design tokens + dark/light toggle** — affects everything, do first so all subsequent work uses the new system
2. **Location autocomplete** — self-contained, no dependencies on other changes
3. **Budget projection fix** — small prompt + form changes
4. **Performance dashboard** — largest piece, builds on new design system

---

## Out of Scope
- Full auth/user system (already added session middleware)
- Multi-account management beyond what exists
- Email reports or scheduled exports
- Mobile responsive overhaul (desktop-first for now)
