# PPC Recon Tool — Full Roadmap Spec
**Date:** 2026-04-07
**Status:** Approved for implementation planning

---

## Overview

This spec defines the complete build-out of the PPC recon / ad research tool from its current state (URL-based prospect research) into a full-featured PPC audit, analysis, campaign management, and autonomous optimization platform.

The tool serves PPC agencies and freelancers managing Google Ads accounts for local service businesses (HVAC, plumbing, electrical, roofing). Two user modes exist throughout: **lead gen mode** (optimize for CPA, call/form conversions) and **e-commerce mode** (optimize for ROAS, Shopping performance).

---

## Architecture Principle: Computed vs. AI-Generated

**Critical separation that applies across all phases:**

- **Computed outputs** — n-gram aggregations, spend totals, zero-conversion flags, ROAS rankings, budget headroom — are pure math on CSV data. No LLM. Deterministic, auditable, fast.
- **AI-generated outputs** — SWOT interpretation, action item recommendations, conversational follow-up responses, copy generation — sit on top of computed data and add interpretation layer.

Every output in the tool must be clearly labeled as one or the other. Users trust "you spent $4,200 on zero-converting 2-word themes" because it's calculated. They understand "here's what that means for your account" is an AI interpretation. Mixing them silently erodes trust.

In the UI: computed data uses neutral display (tables, numbers). AI-generated content carries a subtle indicator and is always presented as a recommendation, not a fact.

---

## Current State (Already Production-Ready)

The tool already ships a complete prospect research pipeline:
- Website analysis → keyword research → competitor audit → low-hanging fruit → budget projections
- Ad copy generator (RSA), landing page audit (8-criteria scoring)
- Negative keyword library, quality score predictor
- Client pitch PDF, CSV/ZIP export
- Google Ads account dashboard (read: campaigns, keywords, ads, metrics)
- Agent framework with undo (7 agent types: audit, bid, budget, keyword, ad_copy, negative, brand)
- Brand Lab, pipeline tracking, OAuth/session auth

**What's missing:** The tool currently has no way to ingest real account data from Google Ads exports. All analysis is AI-estimated from URLs. Every phase below adds grounded, data-driven capability on top of the existing AI layer.

---

## Phase 1 — CSV Upload Engine
**Goal:** Get real account data into the tool. Unblocks all subsequent phases.
**Ships:** Upload UI, 4 report parsers, per-client storage, mode selection.

### 1.1 Universal Upload Component
- Drag-and-drop file zone (CSV, TSV, XLSX)
- Auto-detect report type by column header fingerprint (keyword report vs. search terms vs. campaign vs. product)
- Column mapping UI for non-standard exports (map "Campaign name" → `campaign`, etc.)
- Validation: required columns present, date range displayed, row count shown
- Error display: missing columns, unrecognized format, empty file

### 1.2 Report Parsers (4 types)
Each parser normalizes raw Google Ads export columns into a consistent internal schema:

**Keyword Report** → `{ keyword, matchType, campaign, adGroup, impressions, clicks, cost, conversions, conversionValue, ctr, avgCpc, qualityScore }`

**Search Terms Report** → `{ searchTerm, campaign, adGroup, matchType, impressions, clicks, cost, conversions, conversionValue }`

**Campaign Report** → `{ campaign, campaignType, status, budget, impressions, clicks, cost, conversions, conversionValue, roas, cpa }`

**Product/Shopping Report** → `{ productTitle, productId, category, brand, customLabel, impressions, clicks, cost, conversions, conversionValue, roas }`

### 1.3 Per-Client Storage
- Uploads stored per account with ISO timestamp
- Multiple uploads for same account accumulate (enables trend tracking in Phase 3)
- Upload metadata: report type, date range covered, row count, upload date
- Supabase table: `report_uploads` (`id`, `account_id`, `report_type`, `date_range_start`, `date_range_end`, `row_count`, `raw_data` JSONB, `uploaded_at`)

### 1.4 Lead Gen / E-Commerce Mode
- **Set at account/client level during onboarding, not at upload time**
- A plumbing company is always lead gen. An e-commerce brand is always e-commerce. This doesn't change per upload.
- Stored on the client/account profile as a single source of truth. Every upload, analysis, report, and agent run automatically inherits it.
- Affects throughout the entire tool:
  - Lead gen: primary metric = CPA, conversions = calls/form fills, "good" = low CPA with high intent
  - E-commerce: primary metric = ROAS, conversions = purchases, "good" = high ROAS with revenue scale
- **Edge case:** accounts running both (e-commerce brand + B2B lead gen) can override mode at the per-campaign level. Default still lives on the account profile.
- N-gram engine, SWOT prompts, action item templates, and all metric labels read from this one flag.

### Out of Scope for Phase 1
- Data sufficiency warnings (needs Phase 2 analysis engine to know what's thin)
- Weekly trend tracking UI (needs Phase 3 multi-upload diffing)
- Product of Phase 1: clean, normalized data in storage + account-level mode set, ready for Phase 2 to consume

---

## Phase 2 — Audit Engine + Conversational Follow-up
**Goal:** The first external demo milestone. Turn raw CSV data into a full audit with n-gram insights, SWOT, action items, and a conversational interface to go deeper.
**Ships:** N-gram engine (computed), SWOT + action items (AI), conversational follow-up (AI on computed data).

### 2.1 N-gram Engine (Computed — No LLM)
Pure mathematical analysis of search terms and keyword data:

**N-gram extraction:**
- Tokenize all search terms (lowercase, strip punctuation, split on whitespace)
- Generate 1-gram, 2-gram, 3-gram groups
- Aggregate per group: total cost, total conversions, total clicks, total impressions, conversion rate, CPA

**Engram cost table:**
- Sort n-gram groups by total cost descending
- For each group: cost, conversions, conv rate, CPA, percentage of total spend
- Zero-conversion groups flagged in red — this is wasted spend
- Groups with CPA above account average flagged in amber

**Top spenders view:**
- Top 20 n-gram themes by spend
- Side-by-side: spend vs. conversions for each

**Wasted spend summary:**
- Total spend on zero-conversion search terms
- Grouped by n-gram theme (e.g., "free" 2-grams: "free quote", "free estimate", "free inspection" — $340 wasted)
- Zero-conversion keywords from keyword report (separate from search terms)

**Product analysis (e-commerce mode):**
- Category performance: group products by `category` column, aggregate ROAS per category
- Top ROAS products (ranked list)
- Zero-conversion products flagged
- Size/variant underperformance: group by title pattern, compare variants

**"Ready to Scale" logic:**
- Campaigns with: ROAS > account avg (lead gen: CPA < account avg) AND budget utilization < 80%
- These have headroom for vertical scaling
- Presented as a ranked list with "add $X → expected Y additional conversions" projections

### 2.2 SWOT Analysis (AI-Generated)
Gemini prompt receives: n-gram summary, top spenders, wasted spend total, zero-conv products, campaign ROAS/CPA rankings, mode (lead gen vs. e-commerce).

Output structure:
- **Strengths:** what's working (top-performing themes, strong ROAS campaigns)
- **Weaknesses:** what's costing money without return (wasted spend themes, underperforming campaigns)
- **Opportunities:** underserved intent themes, budget headroom in top performers
- **Threats:** competitor terms appearing in search queries, high-CPA growth areas

Each SWOT item labeled: `[AI INTERPRETATION]`

### 2.3 Action Items (AI-Generated, Human-Reviewed)
Prioritized list of recommended actions — NOT auto-applied. Human decides.

Each action item includes:
- Action description
- Rationale (tied to specific computed data, e.g., "search term 'DIY AC repair' appears 47 times, $180 cost, 0 conversions")
- Confidence: `HIGH` (backed by 50+ data points), `MEDIUM` (10–49), `LOW` (< 10 — data is thin)
- Category: `NEGATIVE_KEYWORD` | `PAUSE_KEYWORD` | `SCALE_BUDGET` | `RESTRUCTURE` | `BID_ADJUSTMENT`
- Est. impact: projected weekly savings or conversion gain

**Data sufficiency check runs here** (before generating action items):
- If upload covers < 14 days: warn "short window — recommendations may not reflect seasonal patterns"
- If total conversions < 30: warn "low conversion volume — statistical significance is limited"
- These warnings appear inline above action items, not blocking

### 2.4 Conversational Follow-up (AI on Computed Data)
Chat interface embedded in the audit results page.

**What it can do:**
- Answer questions about specific data points ("why did you flag 'emergency' as waste?")
- Drill down on any n-gram theme ("show me all 3-word phrases containing 'no heat'")
- Layer in business context user provides ("that's our brand term, ignore it")
- Re-run subset of action items with revised assumptions
- Explain any SWOT item in plain English for client communication

**How it works:**
- Computed data (full n-gram table, campaign stats, product data) is serialized and injected as context on panel open — the user never has to describe the report they're looking at, the AI already has it
- Gemini receives: system prompt (audit assistant role, mode, benchmarks) + full computed data snapshot + conversation history
- **Click-to-focus:** clicking any table row or audit section before opening chat (or while chat is open) sets that item as the focal point. The selected row/section is highlighted and prepended to the next message context: "User is looking at: [selected row data]." This lets the user point at something and ask about it without describing it.
- Business context surfaced in conversation is persisted to client profile for future runs (e.g., "that's our brand term" → stored as protected term, excluded from negative suggestions going forward)
- UI: collapsible chat panel on the right side of audit results

**What it cannot do:**
- Make changes to the account (that's the agent system in Phase 5)
- Access real-time data (works on the uploaded snapshot)

---

## Phase 3 — Enhanced Reporting
**Goal:** Production-quality output for client delivery and trend analysis.
**Ships:** XLSX multi-tab export, week-over-week trend view, data sufficiency surfacing, white-label config.

### 3.1 Multi-Tab XLSX Export
Using `xlsx` library (SheetJS). Tabs:
1. **Account Summary** — top metrics, mode, date range, snapshot date
2. **Engram by Cost** — full n-gram table sorted by spend
3. **Wasted Spend** — zero-conversion themes, grouped
4. **Top ROAS / Top Performers** — by campaign and product (e-commerce)
5. **Category Performance** — e-commerce only
6. **Size/Variant Performance** — e-commerce only
7. **SWOT** — four-quadrant text output
8. **Action Items** — prioritized list with confidence, category, est. impact

### 3.2 Week-over-Week Trend Analysis
When multiple uploads exist for the same account:
- Diff computed metrics between uploads
- Show: spend delta, conversion rate delta, wasted spend delta, top movers (n-gram themes that improved/declined most)
- "Since last audit X days ago: wasted spend ↓ $340, CPA ↓ 12%"

### 3.3 White-Label Config
Agency branding applied to all generated reports (XLSX, PDF):
- Agency name, logo URL, primary color
- Stored in account settings
- Applied to all export headers and cover pages

### 3.4 Standalone Executive Summary
One-page plain-English summary for business owners:
- "Your account spent $X last month. $Y went to searches that never converted. Your top-performing campaign delivered Z leads at $W each. Three things to fix right now: ..."
- Separate PDF from the full audit — designed to be forwarded to the business owner directly

### 3.5 Smart Bid Calculator
Standalone tool (not part of audit flow):
- Inputs: current CPA or ROAS, target CPA or ROAS, current conv rate, avg CPC
- Output: recommended max CPC, bid adjustment direction, estimated conversion impact
- Purely computational — no AI

---

## Phase 4 — Campaign Creation Wizard
**Goal:** Build campaigns from scratch inside the platform, end-to-end.
**Ships:** Full campaign creation wizard with strategy, structure, copy, assets, and targeting.

### Steps in Wizard
1. **Strategy selection** — Prospecting | Brand Protection | Competitor Bidding
2. **Mode confirmation** — Lead gen or e-commerce (inherited from account, overridable)
3. **Brand identity** — pull from Brand Lab or enter manually
4. **Keyword generation** — Gemini + optional Keyword Planner enrichment; budget-aware CPC recommendations
5. **Match type recommendations** — based on budget tier (low budget → exact only; higher → phrase + exact)
6. **Ad group structure** — SKAG (one keyword per group) vs. STAG (themed groups)
7. **Ad copy generation** — RSA headlines/descriptions per ad group, auto-generated and editable
8. **Landing page selection** — enter URL; audit runs automatically; copy recommendations per ad group
9. **Negative keywords** — universal + industry list pre-populated, editable
10. **Conversion action selection** — pull from connected Google Ads account
11. **Assets** — pull sitelinks, callouts, images from account; link to campaign
12. **Demographic targeting** — defaults by industry, override available
13. **Schedule + flight dates** — start date, optional end date, dayparting
14. **AI guardrails** — budget cap, bidding strategy autonomy, excluded campaigns (what agents can/can't touch)
15. **Review + launch** — summary of all settings, launch to Google Ads API or export to Google Ads Editor CSV

### Apply AI to Existing Campaigns
- Import existing campaign structure from Google Ads API
- Run audit against it (quality score, structure, negative coverage)
- Guided wizard to apply AI management: select which campaigns to include, set guardrails

---

## Phase 5 — Autonomous Optimization (Agents + Scheduling)
**Goal:** Agents run on a schedule, not just on-demand. Runs in parallel with Phase 4 — **scheduling infrastructure starts first.**
**Ships:** Cron scheduling, automated reports, feedback loop, Shopping/PMax support.

**Execution order within Phase 4/5 parallel track:**
1. **BidAgent scheduling** — most frequent cadence (daily), lowest risk per action, easiest to validate. Existing BidAgent already works; this just adds cron trigger.
2. **KeywordAgent scheduling** — weekly cadence, higher impact per action. Once bid scheduling is stable.
3. **Campaign creation wizard** — starts in parallel once scheduling is stable. Higher UI effort, lower urgency. Early users are bringing existing accounts; they need optimization of what they have before building from scratch.
4. By the time the wizard ships, real usage data from scheduled agents informs what guardrails and defaults the wizard should offer.

Rationale: agents already exist and work. Scheduling them is the fastest path to "the tool is doing something valuable while you sleep." The wizard is the right next capability but not the highest-ROI first step.

### 5.1 Scheduling Infrastructure
- Per-account cron config: which agents run, how often, what guardrails apply
- Agent types and suggested schedules:
  - Bid adjustments: daily
  - Keyword discovery: weekly
  - Negative keyword additions: weekly
  - Budget reallocation: weekly
  - Ad copy testing: biweekly
  - Full audit: weekly
- Runs via Vercel Cron or external scheduler
- All runs logged to `agent_runs` (already exists)

### 5.2 Weekly Performance Digest
Auto-generated after weekly agent run:
- What changed (bid adjustments, keywords added/paused, budget shifts)
- Results (spend delta, CPA/ROAS delta, conversion delta)
- Plain-English summary for client sharing
- Sent as in-app notification + optionally emailed

### 5.3 Feedback Loop
When user undoes an agent action:
- Prompt: "Why are you undoing this?" (optional text)
- Logged against action type + entity
- Future agent runs for same account de-weight that action type on similar entities
- Pattern emerges: "NegativeAgent has been consistently overridden on brand terms → exclude brand terms from negative suggestions"

### 5.4 Shopping and Performance Max Support
- Extend agent types to handle campaign type = SHOPPING and PERFORMANCE_MAX
- Shopping-specific: product group bid adjustments, negative product IDs, budget reallocation between product groups
- PMax-specific: asset group audit, audience signal recommendations

---

## Phase 6 — Agency Workflow
**Goal:** Multi-client operations, team access, approval workflow.
**Ships:** Multi-account dashboard, approval queue, team permissions, benchmark library UI, custom templates.

### 6.1 Multi-Account Dashboard
- All connected accounts in one view
- Per-account: spend MTD, CPA vs. vertical benchmark, health score (red/amber/green), last audit date
- Benchmark comparison is explicit: "Your HVAC account CPA: $68. Vertical median: $48. 42% above median."
- Sort/filter by health, spend, last audit

### 6.2 Approval Queue (Pre-Action, Not Undo)
The gap between "AI recommends" and "AI executes." Different from the existing undo mechanism (which is post-fact).

Workflow:
1. Agent generates a batch of recommended actions
2. Actions enter the approval queue with: description, rationale, confidence, estimated impact
3. Account manager reviews queue: approve / reject / modify each item
4. Only approved items are sent to Google Ads API
5. Rejected items logged with reason (feeds back into Phase 5's feedback loop)
6. **Default: queue everything.** No agency owner wants to explain to a client that the AI auto-approved a change they didn't know about, even a small one.

**Configurable thresholds — ships in the same phase, not deferred:**
Power users managing 15+ accounts will hit queue fatigue within a week if every $2 bid adjustment needs manual approval. Ship configurable thresholds from day one so users can progressively loosen guardrails as they build trust.

UI: per action type, a threshold input in account settings:
- Bid adjustments: auto-approve changes under $\_\_ (default: off)
- Budget changes: auto-approve changes under $\_\_ (default: off)
- Keyword additions: auto-approve if confidence ≥ \_\_% (default: off)
- Negative keywords: auto-approve if confidence ≥ \_\_% (default: off)

Conservative users stay fully manual. Experienced users opt into auto-approve at their own pace. Everything auto-approved is still logged in the action changelog.

### 6.3 Team Permissions
Three roles:
- **Analyst** — can run audits, view all data, cannot approve/execute changes
- **Account Manager** — can approve/reject action items, export reports, manage clients
- **Admin** — full access, can manage team members, configure agency settings

Implemented via Supabase RLS + role column on users table.

### 6.4 Benchmark Library UI
Currently hardcoded in `lib/benchmarks.js`. Surface it:
- Benchmark reference panel in audit output: "HVAC industry median CPA: $48–65"
- Editable per-account to override with client-specific targets
- Eventually: aggregate anonymized data across platform accounts to build live benchmarks

### 6.5 Persistent Business Context Profiles
Per-client/account profile that auto-injects into every analysis:
- Avg ticket size, close rate, service area, peak seasons, brand terms to protect
- Set once at onboarding, editable anytime
- Used by: budget projections, agent guardrails, conversational follow-up context, SWOT generation

### 6.6 Custom Audit Templates
Save your own audit framework as a reusable prompt chain:
- Template = named set of: analysis steps to run, specific prompts, action item categories to surface
- E.g., "STAB Method Audit" template runs your specific optimization checklist
- Select template at upload time; overrides default audit flow

### 6.7 Recurring Audit Scheduler
- Per-account: set audit frequency (weekly, biweekly, monthly)
- On schedule: re-run full audit against latest uploaded data (or prompt user to upload)
- Diff against previous audit: what changed, what improved, what regressed
- Audit history timeline per account

---

## Phase 7 — Advanced & Differentiating Features
**Goal:** Niche depth for trades agencies. Most items are incremental additions except landing page personalization (flagged separately as V2).

### 7.1 Service Area Heatmap
- Geo performance data from Google Ads (location reports)
- Display by zip/city: CPA, conversion rate, spend
- Highlight where leads come from vs. where money is wasted geographically

### 7.2 Dynamic Seasonality Engine
- Replace hardcoded `SEASONALITY_MULTIPLIERS` with Google Trends API data
- Per-keyword trend pull, integrated into budget projections
- "AC repair" showing Trends spike → recommend budget increase 3 weeks before

### 7.3 Call Tracking Integration
- Upload CallRail or similar export (CSV: call date, duration, source, keyword)
- Match calls to search terms/keywords
- Re-score keywords by actual booked jobs, not just form fills
- Bridges the conversion data gap for call-heavy businesses

### 7.4 Revenue-Per-Lead Calculator
- Input: avg ticket size, close rate
- Applied to every recommendation: "pausing these waste keywords saves $340/week → at your close rate that's $X in protected revenue"
- Deeper than current budget projection ROI calc — wired into action items specifically

### 7.5 Competitor Ad Monitoring
- Input competitor URLs or brand names
- Pull visible ad copy and landing pages (scrape or SerpApi)
- Competitive gap analysis: what they're bidding on that you aren't, what you're bidding on that they aren't

### 7.6 Google Business Profile Alignment Check
- GBP API: pull categories, services, review keywords
- Compare against active keyword themes
- Flag mismatches ("you're bidding on 'boiler repair' but your GBP doesn't list it as a service")

### 7.7 Review Sentiment Mining
- Upload Google/Yelp reviews (copy-paste or CSV)
- Extract: recurring pain points, praise language, customer vocabulary
- Output: recommended ad copy angles, landing page headline options, negative themes to avoid

### 7.8 Lead Quality Scoring
- Let users tag which conversions became booked jobs vs. tire-kickers
- Re-score keywords and search terms by lead quality, not just conversion count
- "This keyword converts at 8% but only 20% become jobs. This one converts at 4% but 60% become jobs."

### 7.9 Reddit / Facebook Research Integration
- Input subreddits or Facebook groups relevant to target audience
- Scrape top posts/comments for pain point language
- Output: customer vocabulary to inform copy, recurring objections to address on landing pages

---

## Phase 7.x — V2 Consideration: Landing Page Personalization Engine
**Separated from Phase 7 because it's a different product, not an incremental feature.**

Dynamic landing page personalization is the core competitive moat of tools like Growass. The founder noted it took months of dedicated engineering. Features:
- Per-intent headline, subheadline, CTA, hero copy, trust section, social proof section variants
- Non-indexed duplicate page creation (SEO-safe)
- Element selector (which sections AI can/cannot modify)
- Integration with ad group keyword themes

This should be scoped, specced, and built as a standalone module in a future cycle — not layered into Phase 7 as a feature. It requires: a page template system, a hosting/proxy layer for variant serving, and a data model for intent-to-variant mapping.

---

## Summary Timeline

| Phase | Core Deliverable | Demo-Ready For |
|---|---|---|
| 1 | CSV upload + parsers + mode selection | Internal only |
| 2 | N-gram engine + SWOT + conversational follow-up | **First external demo** |
| 3 | XLSX export + trends + white-label | Agency prospects |
| 4+5 | Campaign wizard + agent scheduling (parallel) | Full-platform demo |
| 6 | Approval queue + team permissions + multi-account | Agency sales |
| 7 | Advanced niche features | Trades-specific differentiation |
| 7.x | Landing page engine (V2) | Future cycle |
