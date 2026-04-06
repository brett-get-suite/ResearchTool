# PPC Recon — Overhaul Design Spec
**Date:** 2026-04-06  
**Scope:** Design system (dark/light mode), full account dashboard with tabs, budget projection fix, location autocomplete, agent dashboard, Google Trends seasonality, production polish

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
- **Run AI Audit** button — calls `POST /api/agents/run` with `type: "audit"`, navigates to Audit tab on completion

### Full Tab Structure
The Overview tab (above) is the default. The full account page has 7 tabs. All tab content lazy-loads on first activation.

**Tab 1 — Overview** (described above)

**Tab 2 — Campaigns**
- Full campaign table: Name, Status, Daily Budget, Impressions, Clicks, CTR, Cost, Conversions, CPL
- Inline actions per row: Pause/Enable toggle, Edit Budget (inline number input + save)
- "Create Campaign" button → `/accounts/[id]/campaigns/new` (wizard already exists)
- Sortable columns, search/filter by name

**Tab 3 — Keywords**
- Cross-campaign keyword table: Keyword, Match Type, Ad Group, Campaign, Impressions, Clicks, CPC, Cost, Conversions, Quality Score
- Inline actions: Pause/Enable, Edit Bid
- Agent suggestions highlighted with a yellow accent badge: "AI suggests pausing — $42 spent, 0 conversions"
- Filter: All / Active / Paused / Agent Flagged

**Tab 4 — Ad Copy**
- RSA ads grouped by ad group, showing headline/description pinning, approval status, CTR
- "Generate New Ads" button → triggers ad copy agent for that ad group
- Shows asset-level performance where available (pin slot CTR)

**Tab 5 — Change Log**
- Chronological list of all agent actions for this account (`agent_actions` table)
- Each row: timestamp, agent type badge, description, before→after diff, Undo button
- Filter by agent type (Bid / Budget / Keyword / Ad Copy / Negative)
- Undo calls `POST /api/accounts/[id]/actions/[actionId]/undo`

**Tab 6 — Audit**
- Latest AI account audit: health score (0-100), issue list with severity badges, quick wins, wasted spend estimate
- "Re-run Audit" button → triggers audit agent, refreshes tab
- Issue cards: each shows impact estimate, recommended fix, one-click "Apply Fix" where automatable

**Tab 7 — Settings**
- Per-agent enable/disable toggles (Keyword, Bid, Budget, Ad Copy, Negative)
- Bid adjustment cap (default ±20%, slider 5–35%)
- Budget adjustment cap (default ±15%, slider 5–25%)
- Excluded campaigns (multi-select — agents skip these)
- Settings saved to `accounts.settings` JSONB column

### Component Structure
```
app/accounts/[id]/page.js          ← full overhaul (tabbed layout)
components/dashboard/
  StatCard.js                      ← reusable hero stat card
  SpendChart.js                    ← bar chart (Recharts)
  ConversionsChart.js              ← line chart (Recharts)
  CampaignTable.js                 ← sortable campaign table
  KeywordTable.js                  ← keyword table with agent flags
  AdCopyPanel.js                   ← RSA ad group viewer
  ChangeLogTab.js                  ← action history + undo
  AuditTab.js                      ← audit report display
  AccountSettings.js               ← agent settings form
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

---

## 5. Agent Dashboard (`/agents`)

### Goal
Give bosses visibility into what the AI agents are doing across all connected accounts. Already partially exists as a page — needs a proper UI built on top of the existing `/api/agents/` infrastructure.

### Layout
- **Agent cards row** — one card per agent type (Keyword, Bid, Budget, Ad Copy, Negative, Audit). Each shows: status (Active/Paused), last run time, total actions taken all-time, success rate.
- **Recent runs timeline** — last 20 agent runs across all accounts, showing account name, agent type, actions taken, duration, status badge (completed/failed).
- **Global toggles** — enable/disable each agent type globally across all accounts (writes to each account's settings).

### Data
- `agent_runs` table (already exists) — queried via new `GET /api/agents/runs` route
- `agent_actions` table (already exists) — aggregate counts per type

### New route needed
`GET /api/agents/runs?limit=20` — returns recent runs across all accounts with account name joined.

---

## 6. Google Trends Seasonality

### Goal
Replace the hardcoded seasonality multipliers in `lib/benchmarks.js` with real Google Trends data for the specific market being researched. Shows clients an accurate 12-month picture of when demand peaks and troughs.

### How it works
Google Trends has an unofficial JSON endpoint that returns a 12-month relative interest index (0–100) for any search term. No API key required.

**New route: `GET /api/trends?keyword=<kw>&geo=<state>`**
- Fetches `https://trends.google.com/trends/api/explore` with appropriate params
- Parses the 12-month interest-over-time data
- Returns normalized multipliers (1.0 = average month) for the 12 months
- Caches result for 24 hours (in-memory or Supabase if needed)
- Falls back to `lib/benchmarks.js` hardcoded values if Trends fetch fails

**Integration points:**
1. Budget tab in client detail (`/clients/[id]`) — replace hardcoded seasonal chart with real trend data fetched for the client's top keyword + state
2. Budget projection prompt (`lib/prompts.js`) — inject real seasonal multipliers when available so Gemini's budget model uses actual demand curves

**UI change:** In the seasonal 12-month chart, add a small "GOOGLE TRENDS DATA" badge (blue) when real data is used, replacing the current "ESTIMATED" indicator.

---

## 7. Production Polish

### Loading Skeletons
Replace spinners with skeleton loaders on:
- Account detail page tabs (pulse animation matching card shapes)
- Campaign table rows (3 skeleton rows while loading)
- Dashboard stat cards (pulse boxes at correct dimensions)
- Research results tabs

Pattern: use a `Skeleton` component (`components/Skeleton.js`) that renders animated gray boxes. Each data component renders `<Skeleton />` when its loading prop is true.

### Error Boundaries
Wrap each major tab and section in a React error boundary so one failed fetch doesn't crash the whole page.

Pattern: `components/ErrorBoundary.js` — catches render errors, shows:
> "This section couldn't load. [Retry]"

Apply to: each account tab, each research result tab, the dashboard stat section.

### Rate Limiting on API Routes
Prevent accidental Gemini cost spikes from rapid re-runs or external probing.

Implementation: simple in-memory rate limiter in a `lib/rateLimit.js` module.
- Gemini-backed routes (analyze-website, keyword-research, competitor-audit, etc.): **10 requests per minute per IP**
- Google Ads write routes (sync, agents/run): **5 requests per minute per IP**
- Read routes: no limit

Each rate-limited route calls `checkRateLimit(request, { limit, window })` at the top and returns `429` if exceeded.

---

## Implementation Order

1. **Design tokens + dark/light toggle** — foundation, everything builds on this
2. **Budget projection fix** — quick win, fixes the most visible problem immediately
3. **Location autocomplete** — self-contained feature
4. **Performance dashboard + full account tabs** — largest piece
5. **Agent dashboard** — builds on account tab infrastructure
6. **Google Trends seasonality** — adds real data to existing budget views
7. **Production polish** — skeletons, error boundaries, rate limiting last (polish pass)

---

## Out of Scope
- Full auth/user system (already added session middleware)
- Competitor intelligence via SpyFu/SEMrush (requires paid API)
- Geo-targeting heatmap (requires map rendering library)
- Call tracking integration (requires CallRail etc.)
- Email/Slack reports
- Mobile responsive overhaul (desktop-first for now)
