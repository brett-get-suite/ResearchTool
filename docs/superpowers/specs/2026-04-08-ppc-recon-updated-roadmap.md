# PPC Recon Tool — Updated Full Roadmap
**Date:** 2026-04-08
**Status:** Living document — replaces 2026-04-07-ppc-recon-full-roadmap.md

---

## Architecture Principle: Computed vs. AI-Generated (unchanged)

- **Computed outputs** — n-gram aggregations, spend totals, zero-conversion flags, ROAS rankings — are pure math. No LLM. Deterministic, auditable.
- **AI-generated outputs** — SWOT, action items, conversational responses, copy — sit on top of computed data. Always labeled.

---

## Phase 1 — CSV Upload Engine ✅ COMPLETE
Ships: upload UI, 4 report parsers, per-client storage, mode selection, column mapper.

---

## Phase 2 — Audit Engine
**Goal:** First external demo milestone. Turn uploaded CSV data into a full account audit.
**Ships:** N-gram engine, keyword/campaign analysis, SWOT + action items, conversational chat panel.

From feature list:
- N-gram analysis (1/2/3-word) across all search terms
- Engram-by-cost table with zero-conv flags
- Top-performing and wasted keyword themes
- Biggest spenders (keywords + n-gram themes)
- Negative keyword gap analysis
- Account-wide summary snapshot
- Campaign-by-campaign breakdown + ROAS ranking
- "Ready to Scale" identification
- Data sufficiency warnings
- SWOT generation (AI, labeled)
- Action items (AI, prioritized, human-reviewed, confidence-rated)
- Conversational follow-up (click-to-focus, full computed context injected)
- Multiple report types combined in one analysis (keyword + search terms + campaigns)

---

## Phase 3 — Enhanced Reporting + Product Analysis
**Goal:** Agency-ready output. XLSX export. Trend analysis. Product/Shopping depth.

From feature list:
- Product-level performance breakdown
- Category performance ranking (ROAS per category)
- Size/variant performance analysis
- Top vs. wasted products identification
- Product title optimization suggestions from top n-gram themes
- XLSX multi-tab export (8 tabs: summary, n-gram, wasted, top performers, category, variants, SWOT, actions)
- Week-over-week trend analysis (diff between uploads)
- White-label config (agency name, logo, color on all exports)
- Standalone executive summary PDF (one-pager for business owners)
- Smart bid calculator (target CPA/ROAS from margins, close rates, LTV)
- Upload weekly performance reports for trend tracking over time

---

## Phase 4 — Business Context + Competitive Intelligence
**Goal:** Ground AI analysis in real business context, not just ad data.

From feature list:
- Brand identity auto-generation from website URL (scrapes: brand voice, key terms, target audience, differentiators)
- Landing page analysis + content extraction (product name, features, pain points, audience segments)
- Upload sales call transcripts for keyword/messaging strategy
- Customer pain point extraction from Reddit, Facebook groups, transcripts
- Auction insights analysis (upload or pull: impression share gaps, overlap rate, who you're losing to)
- Competitor keyword gap analysis
- Competitor ad copy library (scrape + catalog over time)
- Market CPC trend tracking by vertical
- Lead gen vs. e-commerce mode (already in Phase 1, deepened here with vertical benchmarks)
- Seasonality awareness from Google Trends API (replaces hardcoded SEASONALITY_MULTIPLIERS)

---

## Phase 5 — Campaign Creation Wizard
**Goal:** Build campaigns from scratch inside the platform.

From feature list:
- Full campaign creation wizard (15-step)
- SKAG vs. STAG structure selection
- Strategy selection (prospecting, brand protection, competitor bidding)
- Keyword recommendation engine (Gemini + Keyword Planner enrichment)
- Match type recommendations based on budget tier
- Ad copy generation (RSA: 15 headlines, 4 descriptions per ad group)
- Ad copy informed by brand identity, voice, tone
- Landing page selection + auto-audit
- Negative keywords (universal + industry list pre-populated)
- Conversion action selection (from connected Google Ads account)
- Asset management (sitelinks, callouts, images, structured snippets)
- Location, language, demographic targeting
- Schedule + flight dates + dayparting
- AI guardrails (budget cap, bidding strategy autonomy, excluded campaigns)
- Review + launch (Google Ads API or Editor CSV export)

---

## Phase 6 — Autonomous Management (Agent Scheduling)
**Goal:** The tool does something valuable while you sleep.

From feature list:
- Per-account cron config (which agents, how often, what guardrails)
- Bid adjustments: daily
- Keyword discovery + negative additions: weekly
- Budget reallocation: weekly
- Ad copy testing: biweekly
- Full audit: weekly
- 24/7 data processing
- Automated scaling (campaigns with headroom)
- Undo any AI-made change with explanation (feeds back into learning loop)
- Weekly automated performance digests (what changed, results, plain-English summary)
- Built-in learning system (undo actions de-weight that action type on similar entities)
- Shopping and Performance Max support

---

## Phase 7 — Client & Agency Workflow
**Goal:** Multi-client operations, team access, client-facing deliverables.

From feature list:
- Multi-account dashboard (spend MTD, CPA vs. benchmark, health score, last audit)
- Account health scoring (single score: waste %, ROAS, structure quality, keyword hygiene)
- Approval queue — pre-action, not just undo (AM reviews before anything executes)
  - Configurable thresholds per action type (auto-approve bids under $X)
- Before/after snapshots (here's the account, here's what changed, here's the result)
- White-labeled PDF reports with agency branding
- Executive summary mode (one-page for business owners)
- Client approval workflow (client approves/rejects in-app before changes go live)
- Team/role permissions (Analyst / Account Manager / Admin)
- Vertical-specific audit templates (HVAC template, plumbing template, e-commerce template)
- Bulk actions across accounts (pause wasted themes across 20 accounts at once)
- Persistent business context profiles (avg ticket, close rate, peak seasons, brand terms)

---

## Phase 8 — Forecasting, Alerting & Advanced Intelligence
**Goal:** Proactive intelligence. Predict before it happens, catch it when it does.

From feature list:
- "What if" budget simulator (if I increase by 30%, projected return)
- Diminishing returns calculator (where additional spend stops paying)
- Seasonal forecast engine (predict shifts from vertical historical patterns)
- LTV-adjusted ROAS (factor in customer lifetime value, not just first-conversion)
- Anomaly detection alerts (spend spike, CTR crash, conversion drop, CPC surge)
- Budget pacing alerts (on track to overspend or underspend)
- Quality Score degradation tracking
- Competitor entry alerts (new entrants appearing in auction insights)
- Vertical-specific AI models (pre-trained on HVAC/plumbing/roofing/e-commerce patterns)
- Custom business rules engine ("never pause brand terms," "always maintain $X minimum on this campaign")
- Historical recommendation accuracy tracking (how past AI suggestions performed)
- Optimization changelog (timestamped log of every recommendation + action + rationale)
- Recommendation priority scoring (HIGH/MEDIUM/LOW impact ranking)

---

## Phase 9 — Integrations
**Goal:** Live data in, automated output out.

From feature list:
- Google Ads direct API connection (real-time sync, no CSV upload required)
- Ineligible/disapproved product flagging (needs live feed data)
- Budget pacing (needs live impression/spend data)
- Call tracking integration (upload CallRail CSV, match calls to keywords)
- Search term to conversion path mapping
- Assisted conversion analysis
- Funnel drop-off analysis (when landing page data is available)
- Google Business Profile alignment check (GBP categories vs. active keywords)

---

## Phase 10 — Landing Page Personalization (V2 — separate product)
Separated from Phase 9 because it's a different product, not an incremental feature.
Dynamic landing page variants, element selector, non-indexed duplicate pages, intent-to-variant mapping.
Requires: template system, hosting/proxy layer, separate engineering cycle.

---

## Summary Timeline

| Phase | Core Deliverable | Demo-Ready For |
|---|---|---|
| 1 ✅ | CSV upload + parsers + mode | Internal only |
| 2 | Audit engine + SWOT + chat | **First external demo** |
| 3 | Product analysis + XLSX + trends | Agency prospects |
| 4 | Business context + competitive intel | Deeper demos |
| 5 | Campaign creation wizard | Full platform demo |
| 6 | Agent scheduling + autonomous ops | "Works while you sleep" demo |
| 7 | Agency workflow + approval queue | Agency sales |
| 8 | Forecasting + alerting + AI learning | Enterprise/power users |
| 9 | Live Google Ads integration | Production-grade |
| 10 | Landing page personalization | V2 product |
