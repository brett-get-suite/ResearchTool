# Phases 5-8: Later Phases — Architectural Implementation Plans

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Note:** These phases are architectural outlines. Each phase should be expanded into a full detailed plan (with exact code, tests, and commit steps) when you're ready to build it. Use the Phase 1-4 plans as templates for the level of detail needed.

**Design Reference:** All UI work follows the Intelligence Layer design system established in Phase 1. Read `docs/design-references/synthetix_intelligence/DESIGN.md` and the 4 reference HTML files in `docs/design-references/`.

**Master Spec:** Read `docs/superpowers/specs/2026-04-08-ppc-recon-master-plan-design.md` for full requirements.

---

# Phase 5: Google Ads API Completion

**Goal:** Live data replaces CSV-only. Real-time sync powers all metrics.

**Prerequisite:** Phases 1-4 complete.

---

## File Map

**Modified files:**
- `lib/google-ads-auth.js` — harden OAuth token refresh, add error recovery
- `lib/google-ads-query.js` — add GAQL queries for impression share, hourly data, change history
- `lib/google-ads-write.js` — add campaign/keyword/bid mutation methods
- `lib/supabase.js` — add `saveMetricsSnapshot`, `getMetricsHistory`

**New files:**
- `app/api/accounts/[id]/impression-share/route.js` — fetch IS metrics from Google Ads
- `app/api/accounts/[id]/change-history/route.js` — import Google Ads change history
- `app/api/accounts/[id]/pacing/route.js` — budget pacing calculations
- `lib/google-ads-sync.js` — scheduled sync orchestrator (pull campaigns, keywords, ads, metrics)

---

## Task Outline

### Task 1: Harden OAuth Flow
- [ ] Add token refresh retry logic with exponential backoff to `google-ads-auth.js`
- [ ] Add token expiry detection and auto-refresh
- [ ] Add error codes for common failures (invalid_grant, rate_limit)
- [ ] Test against real Google Ads account

### Task 2: Impression Share GAQL Queries
- [ ] Add GAQL query for `metrics.search_impression_share`, `metrics.search_top_impression_rate`, `metrics.search_absolute_top_impression_rate` to `google-ads-query.js`
- [ ] Create `/api/accounts/[id]/impression-share` route
- [ ] Wire into CampaignTable in Agent Controls (replace placeholder data)

### Task 3: Period-over-Period Deltas
- [ ] Add `saveMetricsSnapshot(accountId, metrics, period)` to Supabase
- [ ] Add `getMetricsHistory(accountId, periods)` to Supabase
- [ ] Calculate deltas: current period vs previous period for CPL, spend, conversions, CPC
- [ ] Wire into PerformanceDeltas component (replace hardcoded values)

### Task 4: Budget Pacing
- [ ] Create `/api/accounts/[id]/pacing` route
- [ ] Calculate: `spend_to_date / (daily_budget * days_elapsed_in_period)`
- [ ] Add pacing alerts: on-track, overspending, underspending
- [ ] Wire into PerformanceDeltas Budget Pacing card

### Task 5: Hourly Data for Dayparting
- [ ] Add GAQL query for hourly performance segments
- [ ] Store in account snapshot
- [ ] Wire into existing dayparting analysis module

### Task 6: Change History Import
- [ ] Add GAQL query for `change_event` resource
- [ ] Create `/api/accounts/[id]/change-history` route
- [ ] Display in Change Log tab
- [ ] Flag external changes so agents can avoid conflicts

### Task 7: Scheduled Sync
- [ ] Create `lib/google-ads-sync.js` orchestrator
- [ ] Pull: campaigns, ad groups, keywords, ads, metrics, hourly data, IS data
- [ ] Store snapshots in Supabase
- [ ] Wire into Vercel Cron: `app/api/cron/sync/route.js`

---

# Phase 6: Campaign Creation Wizard

**Goal:** Build campaigns from scratch inside the platform.

**Prerequisite:** Phases 1-5 complete (needs live Google Ads API for campaign push).

---

## File Map

**New files:**
- `app/accounts/[id]/campaigns/new/page.js` — rewrite as 15-step wizard
- `components/campaign-wizard/StepStrategy.js` — step 1: campaign strategy
- `components/campaign-wizard/StepType.js` — step 2: campaign type
- `components/campaign-wizard/StepStructure.js` — step 3: SKAG vs STAG
- `components/campaign-wizard/StepKeywords.js` — step 4: keyword selection
- `components/campaign-wizard/StepMatchTypes.js` — step 5: match type recs
- `components/campaign-wizard/StepNegatives.js` — step 6: negative keywords
- `components/campaign-wizard/StepAdCopy.js` — step 7-8: ad copy generation
- `components/campaign-wizard/StepLandingPage.js` — step 9: landing page
- `components/campaign-wizard/StepAssets.js` — step 10: sitelinks, callouts
- `components/campaign-wizard/StepTargeting.js` — step 11-12: location, demographics
- `components/campaign-wizard/StepSchedule.js` — step 13: schedule + dayparting
- `components/campaign-wizard/StepBudget.js` — step 14: budget + bidding
- `components/campaign-wizard/StepReview.js` — step 15: review + launch
- `components/campaign-wizard/WizardNav.js` — step indicator + navigation
- `lib/campaign-builder.js` — assemble campaign payload for Google Ads API

---

## Task Outline

### Task 1: Wizard Shell + Navigation
- [ ] Create WizardNav component (step indicator, back/next buttons)
- [ ] Create wizard page with step state management
- [ ] Store wizard state in React state (no Supabase until launch)

### Task 2: Strategy + Structure Steps (1-3)
- [ ] Step 1: Strategy selection (prospecting, brand protection, competitor)
- [ ] Step 2: Campaign type (Search, Shopping, Performance Max)
- [ ] Step 3: SKAG vs STAG selection with pros/cons

### Task 3: Keywords + Match Types (4-5)
- [ ] Step 4: Pull keywords from Keyword Engine, allow add/remove
- [ ] Step 5: Match type recommendations based on budget tier
- [ ] Pre-populate from account's existing keyword research

### Task 4: Ad Copy + Assets (6-10)
- [ ] Step 6: Pre-populated negative keywords (universal + industry)
- [ ] Step 7-8: AI ad copy generation using brand identity
- [ ] Step 9: Landing page selection with auto-audit score
- [ ] Step 10: Sitelinks, callouts, structured snippets

### Task 5: Targeting + Schedule (11-13)
- [ ] Step 11: Location + language targeting
- [ ] Step 12: Demographic targeting
- [ ] Step 13: Schedule, flight dates, dayparting (informed by Phase 4)

### Task 6: Budget + Review + Launch (14-15)
- [ ] Step 14: Budget, bidding strategy, AI guardrails
- [ ] Step 15: Review all settings, launch to Google Ads API or export CSV
- [ ] Create `lib/campaign-builder.js` to assemble payload

---

# Phase 7: Enhanced Reporting + Client View

**Goal:** Agency-ready exports, client read-only dashboard, automated weekly digests.

**Prerequisite:** Phases 1-6 complete.

---

## File Map

**New files:**
- `lib/export/xlsx.js` — XLSX multi-tab export (install `xlsx` or `exceljs`)
- `lib/export/pdf-summary.js` — executive summary PDF one-pager
- `lib/export/white-label.js` — white-label config (agency name, logo, colors)
- `app/api/export/xlsx/route.js` — XLSX download endpoint
- `app/api/export/pdf-summary/route.js` — PDF download endpoint
- `app/api/digest/route.js` — generate and send weekly digest
- `app/client-portal/page.js` — client read-only dashboard
- `app/client-portal/layout.js` — client portal layout (no sidebar controls)
- `app/api/auth/client-login/route.js` — client authentication
- `components/reports/ExportPanel.js` — export options UI
- `components/reports/WhiteLabelConfig.js` — agency branding settings
- `app/settings/page.js` — settings page with white-label config

**Modified files:**
- `middleware.js` — add client role detection, restrict routes
- `lib/supabase.js` — add client user/role tables

---

## Task Outline

### Task 1: XLSX Multi-Tab Export
- [ ] Install `exceljs` dependency
- [ ] Create `lib/export/xlsx.js` with 8 tabs: summary, n-gram, wasted, top performers, category, variants, SWOT, actions
- [ ] Create `/api/export/xlsx` route
- [ ] Add "Export XLSX" button to Analysis Hub

### Task 2: Executive Summary PDF
- [ ] Create `lib/export/pdf-summary.js` — one-pager with key metrics, SWOT highlights, top recommendations
- [ ] Use HTML-to-PDF approach (Puppeteer or similar)
- [ ] Create `/api/export/pdf-summary` route

### Task 3: White-Label Config
- [ ] Create `lib/export/white-label.js` — load agency name, logo URL, primary color from settings
- [ ] Create settings UI component for branding
- [ ] Apply white-label to all exports

### Task 4: Client Portal
- [ ] Create client authentication (separate from admin auth)
- [ ] Client portal page: read-only performance metrics, agent activity, audit scores
- [ ] Client portal layout: stripped-down nav, no controls
- [ ] Middleware: detect client role, restrict to portal routes

### Task 5: Weekly Digest Emails
- [ ] Create `/api/digest` route — generates digest content per account
- [ ] Agency digest: detailed per-account breakdown of changes, metrics, anomalies
- [ ] Client digest: plain-English summary with performance snapshot
- [ ] Set up Vercel Cron to trigger weekly
- [ ] Email delivery via Resend or similar (add to `.env.example`)

### Task 6: Additional Reports
- [ ] Week-over-week trend analysis (diff between snapshots)
- [ ] Product-level performance breakdown (e-commerce mode)
- [ ] Smart bid calculator (target CPA/ROAS from margins, close rates, LTV)

---

# Phase 8: Forecasting, Alerting & Future Integrations

**Goal:** Proactive intelligence. Predict before it happens, catch it when it does.

**Prerequisite:** Phases 1-7 complete.

---

## File Map

**New files:**
- `lib/forecasting/budget-simulator.js` — "what if" budget scenarios
- `lib/forecasting/diminishing-returns.js` — spend efficiency curve
- `lib/forecasting/seasonal.js` — seasonal forecast from historical + Trends
- `lib/alerting/anomaly-detection.js` — statistical anomaly detection
- `lib/alerting/pacing.js` — budget pacing alerts
- `lib/alerting/rules-engine.js` — custom business rules
- `app/api/forecast/route.js` — forecasting endpoints
- `app/api/alerts/route.js` — alerting endpoints
- `components/forecasting/BudgetSimulator.js` — interactive simulator UI
- `components/alerting/AlertPanel.js` — alert notification panel
- `components/alerting/RulesConfig.js` — business rules editor

**Future integration files (architecture slots):**
- `lib/data-sources/ga4.js` — GA4 website analytics (build in this phase)
- `lib/data-sources/call-tracking.js` — CallRail/WhatConverts CSV import
- `app/api/integrations/ga4/route.js` — GA4 data endpoint

---

## Task Outline

### Task 1: Budget Simulator
- [ ] Create `lib/forecasting/budget-simulator.js` — project impact of budget changes
- [ ] Input: current metrics + proposed budget change %
- [ ] Output: projected conversions, CPA, ROAS based on diminishing returns curve
- [ ] Create interactive UI with slider and projected outcomes chart

### Task 2: Anomaly Detection
- [ ] Create `lib/alerting/anomaly-detection.js` — statistical z-score detection
- [ ] Track: spend spikes, CTR crashes, conversion drops, CPC surges
- [ ] Alert when metric deviates >2 standard deviations from rolling 30-day average
- [ ] Create `/api/alerts` route for alert management
- [ ] Alert panel UI component in Agent Controls

### Task 3: Business Rules Engine
- [ ] Create `lib/alerting/rules-engine.js` — configurable rules per account
- [ ] Example rules: "never pause brand terms", "maintain $X minimum on campaign Y"
- [ ] Rules stored in account settings JSONB
- [ ] Agent framework checks rules before executing changes
- [ ] Rules config UI component in Settings

### Task 4: Seasonal Forecasting
- [ ] Create `lib/forecasting/seasonal.js` — merge Google Trends + historical data
- [ ] Predict monthly demand shifts for next 3 months
- [ ] Factor in vertical-specific patterns from `lib/benchmarks.js`
- [ ] Display as forecast chart in Keyword Engine

### Task 5: GA4 Integration (Architecture Slot)
- [ ] Create `lib/data-sources/ga4.js` — connect via GA4 API or CSV upload
- [ ] Pull: landing page performance, content trends, user behavior
- [ ] Feed into Analysis Hub recommendations
- [ ] Create API route for data pull

### Task 6: Call Tracking Import
- [ ] Create `lib/data-sources/call-tracking.js` — parse CallRail/WhatConverts CSV
- [ ] Match calls to keywords/campaigns
- [ ] Calculate real close rate + revenue per keyword
- [ ] Display in Analysis Hub with "real data" badge

### Task 7: Historical Accuracy Tracking
- [ ] Track every AI recommendation + actual outcome after 30 days
- [ ] Calculate recommendation accuracy per agent type
- [ ] Display accuracy scores on Agent Controls page
- [ ] Feed back into agent confidence weighting
