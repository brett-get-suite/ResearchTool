# PPC Recon — Feature Roadmap

## Current State
Website analysis → Keywords → Competitors → Opportunities → Budget Projections → Revenue & ROI → Ad Copy → Landing Page Audit → Negative Keywords → QS Predictor → Pipeline CRM → Export (CSV/ZIP/PDF/Pitch)

---

## Tier 1 — High Impact, Build Next

### ~~1. Revenue & ROI Projections~~ ✅
*Shipped — `lib/benchmarks.js` + Revenue & ROI section in budget tab. Editable close rate & avg job value, funnel table across all 4 tiers, break-even callout.*

### ~~2. Ad Copy Generator~~ ✅
*Shipped — `app/api/ad-copy/route.js` + "Ad Copy" tab in client detail. RSA headlines/descriptions with pin suggestions, char count validation, sitelinks, Google Ads Editor CSV export.*

### ~~3. Seasonal 12-Month Budget Plan~~ ✅
*Shipped — `lib/benchmarks.js` SEASONALITY_MULTIPLIERS for 8 industries + budget tab section with CSS bar chart, monthly detail table with current month highlighted, annual summary, and auto-scaling per selected tier.*

### ~~4. Total Addressable Market (TAM) Calculator~~ ✅
*Shipped — `lib/benchmarks.js` TAM_CONSTANTS + SERVICE_FREQUENCY + budget tab section with population input, funnel breakdown (households → demand → market revenue), capturable share table at 0.5%/1%/3%/5%.*

### ~~5. Client Pitch PDF Export~~ ✅
*Shipped — `app/pitch/[id]/page.js` multi-page client-facing PDF. Pages: Cover → Executive Summary → Market Opportunity (TAM) → Keyword Strategy → Competitive Landscape → Budget & ROI → Seasonal Plan → Next Steps. "Client Pitch" button in client detail header. Agency branding placeholder ready.*

---

## Tier 2 — Strong Value, Build Soon

### ~~6. Landing Page Audit~~ ✅
*Shipped — `app/api/landing-page-audit/route.js` + "Page Audit" tab. Scores 8 criteria (0-10 each), overall grade A-F, pre-launch checklist (pass/fail/warning), per-page score bars + issues, priority fix table with impact/effort.*

### ~~7. Negative Keyword Library~~ ✅
*Shipped — `lib/negative-keywords.js` with universal + 8 industry-specific lists. Shown in Keywords tab as 3-column view (universal / industry / AI+competitor). Google Ads Editor CSV export button.*

### ~~8. Quality Score Predictor~~ ✅
*Shipped — Client-side QS algorithm in Keywords tab. Scores each ad group on group fit (size), intent concentration, and competition. Flags at-risk groups with specific recommendations (split groups, separate informational, tighten ad copy).*

### ~~9. Client Pipeline Tracking~~ ✅
*Shipped — Pipeline fields in Client Info tab (status_pipeline select, monthly_mgmt_fee input, follow_up_date, days since activity, notes textarea). Clients list page shows pipeline stats grid, color-coded pipeline badges, fee column, and pipeline status filters. All fields save to Supabase on blur/change.*

### ~~10. Dashboard Improvements~~ ✅
*Shipped — 5-column stat cards (Total Clients, Completed Research, Keywords Generated, Active Clients, Pipeline Revenue). Research Queue section flags clients with incomplete data and shows missing sections. Quick-add client form in sidebar pre-fills website URL and navigates to research page. Top Opportunities sidebar with cross-client opportunity ranking.*

---

## Tier 3 — Needs External APIs or More Setup

### ~~11. Google Keyword Planner Integration~~ ✅
*Shipped — `lib/google-ads.js` REST API client (OAuth, geo targeting, keyword metrics, keyword ideas). Auto-enriches new research with real Google data. "Enrich with Google Data" button on existing clients. Blue "GOOGLE DATA" badge + per-keyword dot indicator. Graceful fallback to Gemini estimates if API unavailable. Standalone `/api/keyword-planner` endpoint + auto-enrichment in `/api/keyword-research`.*

### 12. Google Trends Seasonality
Validate and refine the hardcoded seasonality curves with real search trend data.
- Free API, no auth required for basic queries
- Pull 12-month trend index for top keywords per service
- Override hardcoded multipliers with real trend data for that specific market
- Show trend chart per keyword group

### 13. Competitor Intelligence (SpyFu / SEMrush API)
Real competitor ad spend and keyword data.
- Actual keywords competitors are bidding on
- Estimated monthly spend (not AI-guessed)
- Ad copy competitors are running
- Requires paid API subscription (~$99–$500/month depending on plan)

---

## Tier 4 — Ideas & Future Vision

### 14. Geo-Targeting Heatmap
Visual map of the client's service area with competitive density overlay.
- Zip code or city-level view of where competitors are bidding
- Highlight underserved areas ("nobody is advertising plumbing in Lakewood")
- Suggest geo-bid adjustments by sub-region
- Great for multi-location or wide-radius contractors

### 15. Call Tracking ROI Loop
Connect ad spend to actual booked jobs via call tracking integration.
- Integrate with CallRail, CallTrackingMetrics, or WhatConverts
- Auto-match calls to keyword/ad group that generated them
- Real close rate + real revenue per keyword (replaces benchmark estimates)
- Dashboard showing actual vs. projected performance

### 16. Multi-Client Comparison Report
Side-by-side analysis of multiple clients or markets.
- Compare CPCs, keyword volume, competition level across markets
- "Denver plumbing vs. Phoenix plumbing" opportunity comparison
- Helps agencies prioritize which clients/markets to push hardest
- Exportable comparison PDF

### 17. Google Ads Account Audit Import
Import existing Google Ads campaigns and grade them.
- Upload CSV from Google Ads Editor or connect via API
- Score: ad group structure, keyword match types, negative keyword coverage, ad copy quality
- Flag wasted spend (broad match bleeding, poor QS keywords)
- Generate "here's what we'd fix" proposal for prospect pitching

---

## Technical Debt & Improvements
- [x] Add `ad_copy` column to Supabase clients table (for ad copy generator)
- [x] Add `budget_projection` column to Supabase clients table
- [x] Add `landing_page_audit` column to Supabase clients table
- [x] Move industry benchmarks into a shared `lib/benchmarks.js` file (reused across revenue projections, TAM, seasonality)
- [ ] Add loading skeletons instead of spinners for better perceived performance
- [ ] Error boundaries on each tab so one failed section doesn't break the whole page
- [ ] Rate limiting on API routes to prevent accidental Gemini cost spikes

---

## Supabase Migrations Needed

```sql
-- Run these in Supabase SQL editor as features are built

-- Already needed:
ALTER TABLE clients ADD COLUMN IF NOT EXISTS budget_projection jsonb;

-- For ad copy generator:
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ad_copy jsonb;

-- For landing page audit:
ALTER TABLE clients ADD COLUMN IF NOT EXISTS landing_page_audit jsonb;

-- For client pipeline:
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status_pipeline text DEFAULT 'prospect';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS monthly_mgmt_fee integer;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS follow_up_date date;
```
