# PPC Recon — Agent Prompts for Each Phase

Copy-paste the relevant prompt into a fresh Claude Code terminal session. Each prompt gives the agent full context to execute the phase independently.

---

## Phase 1: Design System + Pipeline Dashboard

```
I need you to implement Phase 1 of the PPC Recon rebuild.

PROJECT: C:\Users\bread\Documents\GetSuite\ads-research-tool
This is a Next.js 14 App Router project deployed on Vercel, using Tailwind CSS and Supabase.

WHAT TO BUILD: A complete visual redesign ("The Intelligence Layer" design system) + a new Pipeline Dashboard as the landing page.

PLAN FILE: Read `docs/superpowers/plans/2026-04-08-phase-1-design-system-pipeline.md` — this contains the full step-by-step implementation plan with exact code for every task.

DESIGN REFERENCE: Read `docs/design-references/synthetix_intelligence/DESIGN.md` for the design system spec. Read `docs/design-references/client_pipeline_dashboard/code.html` for the exact HTML/CSS patterns to follow for the Pipeline Dashboard layout.

MASTER SPEC: The overall project vision is in `docs/superpowers/specs/2026-04-08-ppc-recon-master-plan-design.md`.

IMPORTANT RULES:
- Follow the plan file task-by-task. Each step has exact code — use it.
- Dark mode only. No light theme.
- No 1px borders for sectioning. Use tonal layering (surface color shifts) per the design system.
- Commit after each task.
- Run `npm run dev` to verify after each major task.
- The old pages will break after the layout change — that's expected and intentional.
- Do NOT modify any files in `lib/` or `app/api/` — those stay untouched.
- Use the Intelligence Layer color tokens from the plan, not the old color system.

Execute the plan now, starting from Task 1.
```

---

## Phase 2: Analysis Hub + CSV Upload + Audit Engine

```
I need you to implement Phase 2 of the PPC Recon rebuild.

PROJECT: C:\Users\bread\Documents\GetSuite\ads-research-tool
This is a Next.js 14 App Router project with the Intelligence Layer design system already in place (Phase 1 is complete).

WHAT TO BUILD: The per-client Analysis Hub page with website analysis, landing page audit, CSV upload integration, and audit engine UI — all in the new design system.

PLAN FILE: Read `docs/superpowers/plans/2026-04-08-phase-2-analysis-hub.md` — full step-by-step implementation plan with exact code.

DESIGN REFERENCE: Read `docs/design-references/analysis_hub_client_insights/code.html` for exact component patterns. Read `docs/design-references/synthetix_intelligence/DESIGN.md` for design rules.

MASTER SPEC: `docs/superpowers/specs/2026-04-08-ppc-recon-master-plan-design.md`

IMPORTANT CONTEXT:
- Phase 1 is complete. The AppShell, SidebarNav, TopNav, and core UI components (StatCard, StatusBadge, DataTable, etc.) are in `components/ui/`.
- The CSV parsers (`lib/parsers/*`), analysis engine (`lib/analysis/*`), and API routes (`app/api/reports/*`) already exist and work. Do NOT rewrite them.
- The upload components (`components/upload/ReportUpload.js`, `ColumnMapper.js`) need restyling to match the Intelligence Layer tokens but their logic must be preserved.
- The existing `app/accounts/[id]/page.js` needs a full rewrite with the new design.
- Follow the plan's color token migration guide for restyling existing components.

Execute the plan now, starting from Task 1.
```

---

## Phase 3: Keyword Engine + Data Sources

```
I need you to implement Phase 3 of the PPC Recon rebuild.

PROJECT: C:\Users\bread\Documents\GetSuite\ads-research-tool
This is a Next.js 14 App Router project with Phases 1-2 complete (Intelligence Layer design system + Analysis Hub).

WHAT TO BUILD: The Keyword Intelligence Engine page with multi-source data integration — Google Trends API, OpenWeatherMap weather forecasts, and Google Keyword Planner enrichment.

PLAN FILE: Read `docs/superpowers/plans/2026-04-08-phase-3-keyword-engine.md` — full step-by-step implementation plan with exact code.

DESIGN REFERENCE: Read `docs/design-references/keyword_research_engine/code.html` for exact component patterns. Read `docs/design-references/synthetix_intelligence/DESIGN.md` for design rules.

MASTER SPEC: `docs/superpowers/specs/2026-04-08-ppc-recon-master-plan-design.md`

IMPORTANT CONTEXT:
- The Keyword Engine page lives at `/accounts/[id]/keywords` — always scoped to a client account.
- Google Keyword Planner integration already exists in `lib/google-ads.js` and `app/api/keyword-planner/route.js`. Don't rewrite it.
- You'll need to install `google-trends-api` npm package.
- OpenWeatherMap needs an API key (`OPENWEATHERMAP_API_KEY` in .env.local). Add it to `.env.example`.
- Data source modules go in a new `lib/data-sources/` directory.
- Weather demand triggers are vertical-specific: HVAC, plumbing, roofing have different weather correlations.
- The intelligence aggregation layer merges all sources and enriches keywords.

Execute the plan now, starting from Task 0.
```

---

## Phase 4: Agent Controls + Autonomous Layer

```
I need you to implement Phase 4 of the PPC Recon rebuild.

PROJECT: C:\Users\bread\Documents\GetSuite\ads-research-tool
This is a Next.js 14 App Router project with Phases 1-3 complete.

WHAT TO BUILD: The Agent Controls page — the AI command center with agent status monitoring, performance delta metrics (CPL, spend, conversions, budget pacing, CPC), campaign table with impression share columns, dayparting intelligence, audit score trending over time, and an action timeline.

PLAN FILE: Read `docs/superpowers/plans/2026-04-08-phase-4-agent-controls.md` — full step-by-step implementation plan with exact code.

DESIGN REFERENCE: Read `docs/design-references/ai_agent_operations_audit/code.html` for exact component patterns. Read `docs/design-references/synthetix_intelligence/DESIGN.md` for design rules.

MASTER SPEC: `docs/superpowers/specs/2026-04-08-ppc-recon-master-plan-design.md`

IMPORTANT CONTEXT:
- The agent framework already exists in `lib/agents/` (base.js, index.js, and 7 agent modules: audit, bid, keyword, negative, budget, ad_copy, brand). Do NOT rewrite them.
- The API routes `app/api/agents/[type]/route.js` and `app/api/agents/run/route.js` already exist.
- Boss-requested metrics: CPL delta %, Total Spend delta %, Conversions delta %, Budget Pacing (progress bar with on-track/over/under label), Avg CPC delta %
- Boss-requested campaign columns: Search Impression Share %, Search Top Impression Share %, Absolute Top Impression Share % — all from Google Ads API `metrics.search_impression_share`, `metrics.search_top_impression_rate`, `metrics.search_absolute_top_impression_rate`
- Dayparting: analyze conversions by hour-of-day and day-of-week, identify peak windows and dead zones
- Audit trending: line chart showing weekly audit score history from `report_analyses` table
- The AuditTrending component uses Recharts (already installed).

Execute the plan now, starting from Task 1.
```

---

## Phases 5-8 (Expand Before Use)

```
I need you to expand and implement Phase [5/6/7/8] of the PPC Recon rebuild.

PROJECT: C:\Users\bread\Documents\GetSuite\ads-research-tool
This is a Next.js 14 App Router project with Phases 1-4 complete.

ARCHITECTURAL PLAN: Read `docs/superpowers/plans/2026-04-08-phases-5-8-later.md` — this contains the architectural outline for Phase [5/6/7/8]. It has file maps and task outlines but NOT the full step-by-step code.

MASTER SPEC: Read `docs/superpowers/specs/2026-04-08-ppc-recon-master-plan-design.md` — the full requirements spec. Phase [5/6/7/8] section has all the details.

DESIGN REFERENCE: Read `docs/design-references/synthetix_intelligence/DESIGN.md` for design rules. All 4 reference HTML files in `docs/design-references/` show the design patterns.

YOUR JOB:
1. Read the architectural plan and master spec for this phase
2. Explore the current codebase to understand what's already built
3. Expand the task outlines into a full detailed implementation plan (like Phases 1-4 have)
4. Execute the expanded plan task-by-task
5. Commit after each task
6. Run `npm run dev` and `npm test` to verify

Follow the Intelligence Layer design system for all UI. Use existing patterns from `components/ui/` for consistency.
```
