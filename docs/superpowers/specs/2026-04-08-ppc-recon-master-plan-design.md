# PPC Recon — Master Plan Design Spec
**Date:** 2026-04-08
**Status:** Approved for implementation planning
**Replaces:** All prior individual phase plans and roadmaps

---

## Overview

This spec defines the complete rebuild of PPC Recon from its current state into a full-featured, autonomous PPC audit, analysis, campaign management, and optimization platform with a premium dark-mode UI.

**Product name:** PPC Recon
**Target users:** PPC agencies managing Google Ads accounts for local service businesses (HVAC, plumbing, electrical, roofing, solar) and e-commerce brands. Two user roles: agency staff (full access) and clients (read-only dashboard).
**Two account modes throughout:** Lead gen (optimize for CPA, call/form conversions) and e-commerce (optimize for ROAS, Shopping performance). Set at account level, inherited everywhere.

**The end-state vision (from leadership):** An autonomous system that uses multiple data sources (Google Ads, Google Trends, weather forecasts, and eventually client website analytics) to make informed keyword and bidding decisions. The agency maintains strategic oversight. Clients get a centralized hub to peek under the hood.

---

## Architecture Principles

### Computed vs. AI-Generated (unchanged from prior specs)

- **Computed outputs** — n-gram aggregations, spend totals, zero-conversion flags, ROAS rankings, impression share metrics, pacing calculations — are pure math. No LLM. Deterministic, auditable, fast.
- **AI-generated outputs** — SWOT interpretation, action items, conversational follow-up, ad copy, scaling recommendations — sit on top of computed data. Always labeled with an AI indicator in the UI.

### Data Source Architecture

The platform ingests data from multiple sources. Each source has a defined interface so new sources slot in without restructuring:

| Source | Phase | Method | Purpose |
|---|---|---|---|
| Google Ads API | 5 (partial in 1-4 via existing code) | OAuth + GAQL | Live campaign, keyword, ad, metric, impression share data |
| CSV Upload | 2 (already built) | Drag-and-drop + parsers | Offline Google Ads exports for audit |
| Google Trends API | 3 | REST (unofficial, free) | Seasonal search volume patterns by vertical + location |
| Weather Forecast API | 3 | REST (OpenWeatherMap, free tier) | Demand surge correlation for HVAC/plumbing verticals |
| Google Keyword Planner | 3 (partially built) | Google Ads API | Real CPC/volume data |
| Gemini AI | All phases | REST | Website analysis, SWOT, ad copy, recommendations |
| GA4 Website Analytics | 8 (architecture slot only) | TBD | Client landing page / content performance |

### Tech Stack

- **Framework:** Next.js 14 (App Router) on Vercel
- **Database:** Supabase (PostgreSQL)
- **AI:** Gemini 2.5 Flash via `lib/gemini.js`
- **Google Ads:** REST API v18 via `lib/google-ads-*.js`
- **Styling:** Tailwind CSS with custom design tokens (see Design System below)
- **Charts:** Recharts (SVG-based)
- **CSV Parsing:** PapaParse
- **Testing:** Jest 29

---

## Design System — "The Intelligence Layer"

Full visual rebuild. Dark mode only. Replaces the current Tailwind dark/light mode system.

### Creative North Star: "The Digital Architect"

A command center for AI-driven marketing. Prioritizes tonal depth and asymmetric balance over flat web aesthetics. Expansive white space and layered surfaces create an editorial feel. High-contrast typography scales guide the eye through dense data without cognitive fatigue.

### Color Tokens (CSS Custom Properties)

```
--background:                #0b1326    /* foundational canvas */
--primary:                   #adc6ff    /* action blue */
--primary-container:         #4d8efe    /* gradient endpoint */
--secondary:                 #4edea3    /* success/growth emerald */
--secondary-container:       varies     /* secondary bg context */
--tertiary:                  #bdc2ff    /* AI/intelligence violet */
--tertiary-container:        varies     /* tertiary bg context */
--error:                     #ffb4ab    /* error/alert */
--error-container:           varies     /* error bg context */
--surface-container-lowest:  #060e20    /* inset areas, sidebar */
--surface-container-low:     #131b2e    /* secondary sections */
--surface-container:         #171f33    /* standard cards */
--surface-container-high:    #222a3d    /* elevated modals, hover */
--surface-container-highest: varies     /* top-level overlays */
--surface-variant:           varies     /* glass backgrounds */
--outline-variant:           varies     /* ghost borders at 15% opacity */
--on-surface:                #e0e0e0    /* primary text */
--on-surface-variant:        #8a919e    /* secondary text */
--on-primary:                #ffffff    /* text on primary buttons */
```

### Design Rules

1. **No-Line Rule:** No 1px solid borders for sectioning. Structural boundaries defined solely through background color shifts between surface tiers.
2. **Glass & Gradient Rule:** Glassmorphism for floating elements — `surface-variant` at 60% opacity + 20px backdrop blur. Primary CTAs use 135-degree gradient from `primary` to `primary-container`.
3. **Tonal Layering:** Depth through stacked surface tiers, not drop shadows. Sidebar (`surface-container-lowest`) next to main content (`background`) hosting cards (`surface-container`).
4. **Ambient Shadows:** Only on floating elements (modals/dropdowns): `box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4)` — never pure black.
5. **Ghost Borders:** When a boundary is required for accessibility, `outline-variant` at 15% opacity.

### Typography

Font: **Inter** (weights 300-900).

| Token | Size | Weight | Use |
|---|---|---|---|
| display-lg | 3.5rem | Bold | Hero metrics (Total Spend, ROAS) |
| headline-sm | 1.5rem | Semi-Bold | Section headings |
| body-md | 0.875rem | Regular | Data labels, descriptions |
| label-sm | 0.6875rem | All-Caps, wide tracking | Status badges, chart axes |

### Border Radius Tokens

| Token | Value | Use |
|---|---|---|
| default | 2px | Subtle rounding |
| lg | 4px | Buttons |
| xl | 8px | Cards, outer containers |
| full | 12px | Pills, badges |

### Core Components

| Component | Description |
|---|---|
| `AppShell` | Fixed 264px sidebar + top nav + main content area. Max-width 1600px. |
| `Sidebar` | `surface-container-lowest` bg. 4 primary nav items with Material Symbols icons. Active state: 4px left pill in `primary` + `surface-variant` bg highlight. Gradient "New Analysis" CTA. Settings/Support footer. |
| `TopNav` | Pill-shaped search input, notification bell, help icon, user profile + org name. `backdrop-blur-xl`. |
| `StatCard` | Large `display-lg` metric, trend delta with up/down arrow in `secondary`/`error`, subtitle in `on-surface-variant`. |
| `DataTable` | Sortable columns, hover row bg transition to `surface-container-high`, status badges, action menus. Divide rows with `outline-variant/5` not borders. |
| `StatusBadge` | Rounded pill. Color-coded: Active (`secondary-container` bg), Idle (`surface-variant` bg), Running (animated pulse), Alert (`error-container` bg). `label-sm` typography. |
| `ProgressBar` | Horizontal bar. Green (90+), Blue (70-89), Muted (<70). |
| `GlassCard` | `surface-variant` at 60% opacity + `backdrop-blur-[20px]`. |
| `GradientButton` | `primary` to `primary-container` at 135deg. White text. `active:scale-95`. |
| `GhostButton` | No bg, `outline` text. Hover: `surface-bright` bg shift. |
| `TimelineItem` | Vertical timeline with `w-[2px]` connecting line, `ring-4` circle nodes, colored per agent type. |
| `CircularGrade` | SVG circle with `stroke-dasharray`/`stroke-dashoffset` for A-F grade display. |
| `DonutChart` | SVG donut for intent distribution and similar breakdowns. |
| `AgentCard` | Bento grid card: icon, status badge, name, description, metric. Alert state with red badge + CTA. |

---

## Navigation Structure

**Primary (sidebar):**
1. **Client Pipeline** — `/` (default landing)
2. **Analysis Hub** — `/accounts/[id]`
3. **Keyword Engine** — `/accounts/[id]/keywords`
4. **Agent Controls** — `/agents`

**Secondary (sidebar, below primary):**
5. Brand Lab — `/brand-lab`
6. Reports — `/reports`

**Footer (sidebar):**
- Settings — `/settings`
- Support

**Top nav:**
- Search (global across clients, keywords, campaigns)
- Notifications bell
- Help
- User profile + organization switcher

---

## Phase 1 — Design System + Pipeline Dashboard

**Goal:** New visual foundation + multi-client overview page with real data. First buildable milestone.

**Ships:**
- Complete design system extraction (all tokens, all core components)
- `AppShell`, `Sidebar`, `TopNav` wired with navigation
- Client Pipeline dashboard page

### Pipeline Dashboard (`/`)

**Hero metric row (4 StatCards):**
- Total Ad Spend — aggregate across all accounts, `% vs last month` delta
- Avg. ROAS — portfolio-wide, delta indicator
- Total Leads/Conversions — sum across accounts, "Across all channels" subtitle
- AI Agents Active — e.g. "14/15", "Processing Live Streams" subtitle with animated pulse

**Client Accounts table:**
- Columns: Client icon + name + website, Status badge (Active Management / Analysis Hub / Pitching), Monthly management fee, Last activity timestamp
- Row click → navigates to `/accounts/[id]` (Analysis Hub)
- Pipeline status filter buttons
- Search input
- "View Full Portfolio" link for pagination

**Recent AI Reports sidebar (right column):**
- Card list: report type badge (Keyword Report / Website Analysis / ROAS Strategy), client name, description snippet, timestamp
- Click → navigates to specific report
- Scroll for more

**Action buttons:**
- "Export CRM Data" → CSV download of pipeline
- "Pipeline Filters" → filter panel
- "+ New Analysis" → sidebar CTA, navigates to new client creation

**Data sources:** Supabase `accounts` table for client list. `agent_actions` for recent activity. Google Ads API (when connected) for live metrics. CSV-uploaded data as fallback for metrics.

---

## Phase 2 — Analysis Hub + CSV Upload Engine

**Goal:** Per-client deep dive page. CSV upload → audit → SWOT → action items. First external demo milestone.

**Ships:**
- Analysis Hub page (`/accounts/[id]`)
- CSV upload engine (4 parsers, already built — integrate into new UI)
- Audit engine (n-gram, keyword analysis, campaign analysis)
- SWOT + action items (Gemini)
- Conversational chat panel

### Analysis Hub Page (`/accounts/[id]`)

**Header:** Breadcrumb (Clients > Client Name), website URL with "AI SCANNED" badge, "Export PDF" + "Re-crawl Site" buttons.

**Top row — two cards:**

**Landing Page Audit card (left, ~5 columns):**
- Circular SVG grade (A-F) with `CircularGrade` component
- AI-generated summary quote
- SEO Score (/100) + UX Index (%)
- 8-criteria checklist: Semantic H1, Mobile Fluidity, Fast LCP (<1.2s), SSL Encryption, JSON-LD Schema, CTA Contrast Ratio, Alt-Text Compliance, Internal Link Depth
- Status: `OPTIMIZED` / `NEEDS WORK` / `CRITICAL` badge

**Website Analysis card (right, ~7 columns):**
- "Scanned: X mins ago" timestamp
- Detected Services — pill tags auto-detected from crawl
- Core USPs — 2x2 icon cards (e.g., "25-year Warranty", "Local Installers", "$0 Down Options")
- Target Service Areas — location with density indicator bar

**Bottom row — two panels:**

**Low-Hanging Fruit Keywords table (left, ~8 columns):**
- Columns: Keyword Cluster, Intent badge, Avg CPC, Difficulty bar, Potential ROI (High/Med/Low)
- Sources: keyword research results OR CSV-uploaded analysis

**AI Ad Preview panel (right, ~4 columns):**
- Google Search result mockup (green URL, blue headline, description)
- "Create Campaign" CTA button
- Suggested Focus: Primary Angle, Pain Point, Secondary Offer
- "Generate More Variations" button

### CSV Upload (tab or section within Analysis Hub)

- Drag-and-drop file zone (CSV, TSV)
- Auto-detect report type by column header fingerprint
- Column mapper for non-standard exports
- Validation: required columns, date range, row count
- Upload history per client
- "Run Analysis" button → triggers audit engine
- Results link to `/accounts/[id]/analysis/[analysisId]`

### Audit Results Page (`/accounts/[id]/analysis/[analysisId]`)

- N-gram table (1/2/3-gram): sortable by cost, conversions, with zero-conversion flags
- Wasted Spend breakdown: zero-conversion themes grouped by top phrase
- Campaign Ranking: ROAS/CPA table with scaling badges ("Ready to Scale" / "Optimize" / "Pause")
- SWOT Panel: four-quadrant display, AI badge on each item
- Action Items: prioritized list with confidence scores + category badges
- Conversational Chat Panel: collapsible right-side panel, click-to-focus on any data point, full computed context injected per message
- Data sufficiency warnings when data is thin

---

## Phase 3 — Keyword Engine + Data Sources

**Goal:** Unified keyword intelligence hub with multi-source data for smarter recommendations.

**Ships:**
- Keyword Engine page
- Google Trends API integration
- Weather forecast API integration
- Google Keyword Planner hardening
- Geo-targeted data scoping

### Keyword Engine Page (`/accounts/[id]/keywords`)

The Keyword Engine is always scoped to a specific client account. Global keyword research (not tied to a client) uses the "New Analysis" flow which creates a client first.

**Header:** "Keyword Intelligence Engine" + "Strategy Module" label, "Export to Google Ads CSV" button.

**Top row:**

**Intent Distribution donut chart (left, ~4 columns):**
- SVG donut: Transactional (primary), Informational (secondary), Navigational (tertiary)
- Total volume in center

**Metric cards (right, ~8 columns, 3 cards):**
- Avg. CPC — with "% below/above industry avg" delta
- Efficiency Score — /100, AI-optimized path rating
- Est. Conversions — with % projection delta

**Keyword Priority Matrix table (full width):**
- Columns: Keyword String, Intent badge, Monthly Searches, CPC Estimate, Competition Level (color bar from green to red)
- Sortable by any column, filterable by intent
- Row action menu: add to campaign, mark as negative, view trend detail
- Pagination

**AI Insights sidebar (right, ~4 columns):**
- Opportunity recommendations cross-referencing all data sources
- Weather-correlated alerts: "Heat wave forecast in Phoenix — AC repair searches historically spike 40%"
- Seasonal trend indicators per keyword from Google Trends
- Keyword gap analysis vs. competitors
- Checkmark badges for validated recommendations

### Data Source Integrations

**Google Trends API:**
- Fetch 12-month trend index for top keywords per service per location
- Override hardcoded `SEASONALITY_MULTIPLIERS` with real trend data
- 24-hour in-memory cache
- Fallback to hardcoded benchmarks if API unavailable
- Show trend sparkline per keyword in the Priority Matrix

**Weather Forecast API (OpenWeatherMap free tier):**
- 7-day forecast for client's service area
- Correlate weather patterns to vertical demand:
  - HVAC: heat waves → AC repair/install surge; cold snaps → heating surge
  - Plumbing: freezing temps → pipe burst surge; storms → drainage surge
  - Roofing: hail/storms → roof repair surge
- Feed into bid adjustment recommendations in Agent Controls
- Show weather indicator in Keyword Engine when relevant

**Google Keyword Planner (existing, harden):**
- Real CPC and volume data when Google Ads API is connected
- Auto-enriches keyword research results
- Blue "GOOGLE DATA" badge on enriched keywords
- Graceful fallback to Gemini estimates

**Location awareness:**
- All data sources scoped to client's service area
- Weather, trends, competition data are geo-targeted
- Service area stored on account profile

**Architecture slot for GA4:**
- Data source interface accepts a `website_analytics` type
- No integration built this phase — reserved for Phase 8

---

## Phase 4 — Agent Controls + Autonomous Layer

**Goal:** AI agents that optimize campaigns autonomously. The core of the leadership vision.

**Ships:**
- Agent Controls page
- Agent scheduling + guardrails
- Dayparting intelligence
- Audit score trending
- All boss-requested metrics + impression share columns

### Agent Controls Page (`/agents`)

**Header:** Green dot + "Autonomous Layer Active" label, "Pause All Agents" button, "+ Deploy New Agent" button.

**Agent Status Cards (bento grid, 4 across):**
- Per agent: icon, status badge (Active/Idle/Running/Alert), name, current activity description, last run timestamp
- 7 agent types: Audit, Bid, Ad Copy, Budget, Keyword, Negative Keyword, Brand
- Alert state: red badge + "Review Conflict" CTA
- Idle state: reduced opacity (0.75)
- Running state: animated pulse on badge

**Google Ads Account Audit panel (main content, ~8 columns):**

**3 hero metrics:**
- Overall Audit Score (/100) — with week-over-week delta
- Wasted Spend Detected ($) — flagged as warning
- AI Optimization Uplift (%) — labeled "Autonomous improvements"

**Boss-requested performance metrics row (5 cards):**
- CPL (Cost Per Lead) — % change vs. last period, green/red arrow
- Total Spend — % change vs. last period
- Conversions — % change vs. last period
- Budget Pacing — progress bar showing spend-to-date vs. budget allocation, with "On Track" / "Overspending" / "Underspending" label
- Avg. CPC — % change vs. last period

**Campaign Quality Index:**
- Horizontal progress bars per campaign
- Color-coded: green (90+ score), blue (70-89), muted (<70)
- Score percentage label on right

**Campaign Table (expandable section):**
- Standard columns: Campaign, Status, Type, Budget, Spend, Conversions, CPA/ROAS
- **Boss-requested columns:**
  - Search Impression Share % — `metrics.search_impression_share`
  - Search Top Impression Share % — `metrics.search_top_impression_rate`
  - Absolute Top Impression Share % — `metrics.search_absolute_top_impression_rate`
- All from Google Ads API. Shows "—" when API not connected.

**Audit Score Trending (new section):**
- Line chart showing weekly audit score history over time
- "Your account went from 72 to 88 over 6 weeks" type narrative
- Plotted per-account, selectable from dropdown
- Data: each weekly audit run stores its score in `report_analyses`

**Recent Agent Actions timeline (sidebar, ~4 columns):**
- Vertical timeline with colored circle indicators per agent type
- Each entry: agent icon, action description, detail text, timestamp
- "View Full Action Audit" link
- Every action has undo (before/after state in `agent_actions` table)

**Autonomous Scaling Opportunity banner (bottom, full width):**
- AI-detected expansion opportunities as dismissable CTA cards
- "Auto-Scale Campaign" button — requires human approval
- "Dismiss" button to skip

### Dayparting Intelligence

- Analyze conversion data by hour-of-day and day-of-week from Google Ads reports
- Identify peak conversion windows and dead zones per campaign
- Feed into Bid Agent: auto-adjust bid modifiers for time-of-day
- Visualize as heatmap grid (hours x days) in campaign detail view
- Particularly valuable for service verticals (HVAC calls peak 8am-6pm weekdays, emergency plumbing spikes evenings/weekends)

### Autonomous Scheduling (per account, in Settings)

| Agent | Default Frequency | Configurable |
|---|---|---|
| Audit | Weekly | Yes |
| Bid | Daily | Yes |
| Keyword Discovery | Weekly | Yes |
| Negative Keyword | Weekly | Yes |
| Budget Reallocation | Weekly | Yes |
| Ad Copy Testing | Biweekly | Yes |
| Brand | On-demand | N/A |

- Per-account guardrails: budget caps, bid ceilings, excluded campaigns
- Undo feeds into learning loop — undone actions de-weight that strategy on similar entities
- Shopping and Performance Max campaign support

---

## Phase 5 — Google Ads API Completion

**Goal:** Live data replaces CSV-only. Real-time sync powers all metrics.

**Ships:**
- Hardened OAuth flow tested against real Google Ads accounts
- Full GAQL query suite: campaigns, ad groups, keywords, ads, search terms, metrics, impression share, change history
- Live data sync (scheduled + on-demand)
- Period-over-period delta calculations for all metrics (CPL, spend, conversions, CPC, impression share)
- Budget pacing: `spend_to_date / (daily_budget * days_elapsed)` with pace alerts
- Impression share data populating Agent Controls campaign table
- Google Ads change history import — track external changes to prevent AI agent conflicts

---

## Phase 6 — Campaign Creation Wizard

**Goal:** Build campaigns from scratch inside the platform.

**Ships:**
- Guided campaign creation flow within Analysis Hub (per-client action)
- 15-step wizard:
  1. Campaign strategy selection (prospecting, brand protection, competitor bidding)
  2. Campaign type (Search, Shopping, Performance Max)
  3. SKAG vs. STAG structure selection
  4. Keyword recommendations from Keyword Engine
  5. Match type recommendations based on budget tier
  6. Negative keywords pre-populated (universal + industry list)
  7. Ad copy generation (RSA: 15 headlines, 4 descriptions per ad group)
  8. Ad copy informed by brand identity, voice, tone from Brand Lab
  9. Landing page selection + auto-audit score
  10. Asset management (sitelinks, callouts, structured snippets)
  11. Location + language targeting
  12. Demographic targeting
  13. Schedule + flight dates + dayparting (informed by Phase 4 intelligence)
  14. Budget + bidding strategy + AI guardrails
  15. Review + launch

- Output: push to Google Ads API directly OR export Google Ads Editor CSV
- Conversion action selection from connected account

---

## Phase 7 — Enhanced Reporting + Client View

**Goal:** Agency-ready output. Client-facing read-only dashboard. Automated digests.

**Ships:**

### Export & Reporting
- XLSX multi-tab export (8 tabs: summary, n-gram, wasted spend, top performers, category, variants, SWOT, actions)
- White-label config: agency name, logo, color scheme on all exports
- Executive summary PDF (one-pager for business owners)
- Client pitch PDF (multi-page, already partially built — migrate to new design)
- Smart bid calculator (target CPA/ROAS from margins, close rates, LTV)

### Client Read-Only Dashboard
- Separate login role (client vs. agency staff)
- Clients see: performance metrics, agent activity log, audit scores, reports
- Clients cannot: modify settings, trigger agents, create campaigns, access other clients
- Branded per-client: agency logo + colors

### Weekly Digest Emails
- **Agency digest (detailed):** Per-account summary of agent actions taken, metrics deltas, anomalies detected, items needing review. Sent weekly to account managers.
- **Client digest (high-level):** Plain-English summary — "Your account is healthy. We reduced wasted spend by $340 this week. Conversions up 12%." Performance snapshot + link to dashboard. Sent weekly or monthly (configurable per client).
- Email delivery via Supabase Edge Functions + Resend (or similar transactional email service)

### Additional Reporting
- Week-over-week trend analysis (diff between uploads / sync snapshots)
- Product-level performance breakdown (e-commerce mode)
- Category performance ranking (ROAS per category)
- Product title optimization suggestions from top n-gram themes

---

## Phase 8 — Forecasting, Alerting & Future Integrations

**Goal:** Proactive intelligence. Predict before it happens, catch it when it does.

**Ships:**

### Forecasting
- "What if" budget simulator — "if I increase budget by 30%, projected return is..."
- Diminishing returns calculator — where additional spend stops paying
- Seasonal forecast engine — predict demand shifts from vertical historical patterns + Google Trends
- LTV-adjusted ROAS — factor in customer lifetime value, not just first-conversion

### Alerting
- Anomaly detection: spend spikes, CTR crashes, conversion drops, CPC surges
- Budget pacing alerts: on track to overspend or underspend
- Quality Score degradation tracking
- Competitor entry alerts from auction insights data
- Configurable alert thresholds per account

### Intelligence
- Vertical-specific AI models (pre-trained patterns for HVAC/plumbing/roofing/solar/e-commerce)
- Custom business rules engine ("never pause brand terms", "always maintain $X on this campaign")
- Historical recommendation accuracy tracking (how past AI suggestions actually performed)
- Recommendation priority scoring (HIGH / MEDIUM / LOW impact ranking)

### Future Integrations
- GA4 website analytics integration (the architecture slot built in Phase 3, wired here)
- Call tracking CSV import (CallRail, CallTrackingMetrics, WhatConverts)
- Search term to conversion path mapping
- Assisted conversion analysis
- Google Business Profile alignment check (GBP categories vs. active keywords)

---

## Summary Timeline

| Phase | Core Deliverable | Demo-Ready For |
|---|---|---|
| 1 | Design System + Pipeline Dashboard | Internal — new visual foundation |
| 2 | Analysis Hub + CSV Upload + Audit Engine | **First external demo** |
| 3 | Keyword Engine + Google Trends + Weather | Data-driven keyword intelligence |
| 4 | Agent Controls + Autonomous Layer + Dayparting + Audit Trending | "Works while you sleep" |
| 5 | Google Ads API Completion + Live Metrics | Full real-time data |
| 6 | Campaign Creation Wizard | Full platform demo |
| 7 | Enhanced Reporting + Client View + Weekly Digests | Agency sales + client onboarding |
| 8 | Forecasting + Alerting + GA4 + Advanced Intelligence | Enterprise/power users |

---

## Out of Scope (Separate Products)

- **Landing page personalization** — dynamic variants, element selector, intent-to-variant mapping. Requires its own template system, hosting/proxy layer, and engineering cycle.
- **Multi-platform ads** — Meta Ads, Microsoft Ads, LinkedIn Ads. Google Ads only for now.
- **White-label SaaS** — reselling the platform to other agencies. Agency branding on reports is in scope; multi-tenant platform is not.

---

## Reference Materials

- **Design mockups:** 4 screens in `/stitch/` folder (Pipeline Dashboard, Analysis Hub, Agent Controls, Keyword Engine)
- **Design system:** `/stitch/synthetix_intelligence/DESIGN.md` — "The Intelligence Layer"
- **Reference HTML:** 4 code files in `/stitch/` with component patterns, color tokens, layout structures
- **Prior plans (superseded):** `docs/superpowers/plans/2026-04-06-*.md`, `2026-04-07-*.md`, `2026-04-08-*.md`
- **Prior specs (superseded):** `docs/superpowers/specs/2026-04-06-*.md`, `2026-04-07-*.md`, `2026-04-08-ppc-recon-updated-roadmap.md`
