# Phase 4: Agent Controls + Autonomous Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Agent Controls page — the AI command center for autonomous campaign optimization. Includes agent status cards (7 types), 3 hero audit metrics, 5 boss-requested performance deltas (CPL, spend, conversions, budget pacing, CPC), campaign table with impression share columns, dayparting intelligence with heatmap visualization, audit score trending, agent action timeline, autonomous scaling opportunities, and per-account agent scheduling with guardrails.

**Architecture:** The Agent Controls page (`/agents`) aggregates data across all connected accounts. Each agent type (audit, bid, keyword, negative, budget, ad_copy, brand) has a configurable schedule and guardrails (budget caps, bid ceilings, excluded campaigns). The existing `lib/agents/` framework (`base.js`, `index.js`, and 7 agent modules) is preserved — this phase builds the UI layer on top and adds new GAQL queries for impression share and hourly performance, a dayparting analysis module, audit score history tracking, and a scheduling/guardrails system. A centralized `lib/agent-config.js` module defines all agent metadata (types, icons, labels, colors, default schedules) so the UI and scheduling logic share a single source of truth.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS (Intelligence Layer tokens from Phase 1), Supabase, Google Ads API v18 (GAQL via `lib/google-ads-query.js`), Recharts (line chart, heatmap), existing `lib/agents/*`, Jest 29

**Design Reference:** Read `docs/design-references/ai_agent_operations_audit/code.html` for exact component patterns. Read `docs/design-references/synthetix_intelligence/DESIGN.md` for design rules.

**Prerequisite:** Phases 1-3 must be complete.

---

## File Map

**New files:**
- `lib/agent-config.js` — centralized agent type definitions (icons, labels, colors, default schedules, guardrail defaults)
- `lib/analysis/dayparting.js` — hour-of-day × day-of-week conversion analysis with peak/dead zone detection
- `__tests__/analysis/dayparting.test.js` — dayparting analysis tests
- `app/api/accounts/[id]/dayparting/route.js` — GET: dayparting analysis for account
- `app/api/accounts/[id]/audit-history/route.js` — GET: weekly audit score history
- `components/agent-controls/AgentCards.js` — bento grid of 7 agent status cards (4-across)
- `components/agent-controls/AuditMetrics.js` — 3 hero metrics: audit score, wasted spend, AI uplift
- `components/agent-controls/PerformanceDeltas.js` — 5-card row: CPL, spend, conversions, pacing, CPC
- `components/agent-controls/CampaignQuality.js` — horizontal progress bars per campaign with quality scores
- `components/agent-controls/CampaignTable.js` — full campaign table with 3 impression share columns
- `components/agent-controls/AuditTrending.js` — Recharts line chart of weekly audit scores
- `components/agent-controls/DaypartingHeatmap.js` — 7×24 grid heatmap (days × hours) with bid modifier recommendations
- `components/agent-controls/ActionTimeline.js` — vertical timeline with colored agent-type indicators + undo
- `components/agent-controls/ScalingOpportunity.js` — dismissable CTA banner for AI-detected expansion
- `components/agent-controls/ScheduleConfig.js` — per-account agent scheduling + guardrails panel

**Modified files:**
- `lib/google-ads-query.js` — add `fetchCampaignMetricsWithIS()` (impression share fields) and `fetchHourlyPerformance()` (hourly segments)
- `lib/supabase.js` — add `getAuditScoreHistory(accountId)` and `getAccountSchedule(accountId)` / `saveAccountSchedule(accountId, config)`
- `app/agents/page.js` — full rewrite with new design
- `components/Sidebar.js` — update Agent Controls nav entry to show active count badge

**Preserved (logic untouched):**
- `lib/agents/base.js` — BaseAgent observe→analyze→execute→log pattern
- `lib/agents/index.js` — AGENT_MAP with 7 lazy-loaded agent types, `runAgent()` dispatcher
- `lib/agents/audit.js`, `bid.js`, `keyword.js`, `budget.js`, `ad-copy.js`, `negative.js`, `brand.js` — all 7 agent modules
- `app/api/agents/[type]/route.js` — manual agent trigger
- `app/api/agents/run/route.js` — cron trigger
- `app/api/agents/runs/route.js` — run history fetch
- `app/api/accounts/[id]/actions/route.js` — action list
- `app/api/accounts/[id]/actions/[actionId]/undo/route.js` — undo action

---

## Task 0: Agent Config Constants

Centralize all agent metadata in one module. Currently `app/agents/page.js` has `AGENT_CONFIG` with 6 types (missing brand), and `lib/agents/index.js` has `AGENT_MAP` with 7 types. We create a single source of truth.

**Files:**
- Create: `lib/agent-config.js`

- [ ] **Step 1: Create agent config module**

Create `lib/agent-config.js`:

```js
/**
 * Centralized agent type definitions.
 * Single source of truth for icons, labels, colors, and scheduling defaults.
 * Used by Agent Controls UI, scheduling system, and sidebar badges.
 */

export const AGENT_TYPES = {
  audit: {
    key: 'audit',
    label: 'Audit Agent',
    icon: 'fact_check',
    color: 'bg-primary',        // timeline dot color
    textColor: 'text-primary',
    defaultFrequency: 'weekly',
    description: 'Comprehensive account health analysis',
  },
  bid: {
    key: 'bid',
    label: 'Bid Agent',
    icon: 'trending_up',
    color: 'bg-secondary',
    textColor: 'text-secondary',
    defaultFrequency: 'daily',
    description: 'Keyword bid optimization (±20% cap)',
  },
  ad_copy: {
    key: 'ad_copy',
    label: 'Ad Copy Agent',
    icon: 'edit_note',
    color: 'bg-tertiary',
    textColor: 'text-tertiary',
    defaultFrequency: 'biweekly',
    description: 'Responsive search ad testing and rotation',
  },
  budget: {
    key: 'budget',
    label: 'Budget Agent',
    icon: 'account_balance',
    color: 'bg-error',
    textColor: 'text-error',
    defaultFrequency: 'weekly',
    description: 'Campaign budget reallocation (±15% cap)',
  },
  keyword: {
    key: 'keyword',
    label: 'Keyword Agent',
    icon: 'key',
    color: 'bg-primary-container',
    textColor: 'text-primary-container',
    defaultFrequency: 'weekly',
    description: 'Keyword discovery and optimization',
  },
  negative: {
    key: 'negative',
    label: 'Negative KW Agent',
    icon: 'block',
    color: 'bg-on-surface-variant',
    textColor: 'text-on-surface-variant',
    defaultFrequency: 'weekly',
    description: 'Search term mining for negative keywords',
  },
  brand: {
    key: 'brand',
    label: 'Brand Agent',
    icon: 'palette',
    color: 'bg-tertiary',
    textColor: 'text-tertiary',
    defaultFrequency: 'on-demand',
    description: 'Website crawl for brand identity and voice',
  },
};

export const AGENT_TYPE_KEYS = Object.keys(AGENT_TYPES);

/**
 * Default schedule config for a new account.
 * Each agent has: enabled (bool), frequency (string), guardrails (object).
 */
export function getDefaultScheduleConfig() {
  return {
    audit:    { enabled: true,  frequency: 'weekly',   guardrails: {} },
    bid:      { enabled: true,  frequency: 'daily',    guardrails: { maxBidChangePct: 20 } },
    ad_copy:  { enabled: false, frequency: 'biweekly', guardrails: {} },
    budget:   { enabled: true,  frequency: 'weekly',   guardrails: { maxBudgetChangePct: 15 } },
    keyword:  { enabled: true,  frequency: 'weekly',   guardrails: {} },
    negative: { enabled: true,  frequency: 'weekly',   guardrails: {} },
    brand:    { enabled: false, frequency: 'on-demand', guardrails: {} },
  };
}

/**
 * Guardrail defaults applied per-account. These can be overridden in ScheduleConfig.
 */
export const GUARDRAIL_DEFAULTS = {
  maxDailyBudgetCap: null,        // $ — null means no cap
  maxBidCeiling: null,            // $ per click — null means no cap
  excludedCampaignIds: [],        // campaign IDs agents should never touch
  requireApprovalAbove: null,     // $ threshold requiring human approval
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/agent-config.js
git commit -m "feat: add centralized agent config constants (7 types, schedules, guardrails)"
```

---

## Task 1: Dayparting Analysis — Failing Tests

**Files:**
- Create: `__tests__/analysis/dayparting.test.js`

- [ ] **Step 1: Write failing tests for dayparting analysis**

Create `__tests__/analysis/dayparting.test.js`:

```js
import { analyzeDayparting } from '@/lib/analysis/dayparting';

describe('analyzeDayparting', () => {
  test('returns empty grid structure with no data', () => {
    const result = analyzeDayparting([]);
    expect(result.grid).toHaveLength(7);          // 7 days
    expect(result.grid[0]).toHaveLength(24);       // 24 hours
    expect(result.peaks).toEqual([]);
    expect(result.deadZones).toEqual([]);
    expect(result.recommendations).toEqual([]);
    expect(result.totalConversions).toBe(0);
    expect(result.days).toEqual([
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
    ]);
  });

  test('populates grid cells from hourly rows', () => {
    const rows = [
      { day_of_week: 1, hour_of_day: 9, impressions: 100, clicks: 10, conversions: 2, cost: 50 },
      { day_of_week: 1, hour_of_day: 10, impressions: 120, clicks: 15, conversions: 3, cost: 60 },
    ];
    const result = analyzeDayparting(rows);

    // Monday (index 1), 9am
    const cell = result.grid[1][9];
    expect(cell).not.toBeNull();
    expect(cell.impressions).toBe(100);
    expect(cell.clicks).toBe(10);
    expect(cell.conversions).toBe(2);
    expect(cell.cost).toBe(50);
    expect(cell.ctr).toBeCloseTo(0.1);           // 10/100
    expect(cell.conv_rate).toBeCloseTo(0.2);      // 2/10
    expect(cell.cpa).toBeCloseTo(25);             // 50/2
  });

  test('ignores out-of-range day/hour values', () => {
    const rows = [
      { day_of_week: -1, hour_of_day: 9, impressions: 100, clicks: 10, conversions: 1, cost: 20 },
      { day_of_week: 7, hour_of_day: 9, impressions: 100, clicks: 10, conversions: 1, cost: 20 },
      { day_of_week: 1, hour_of_day: 24, impressions: 100, clicks: 10, conversions: 1, cost: 20 },
      { day_of_week: 1, hour_of_day: -1, impressions: 100, clicks: 10, conversions: 1, cost: 20 },
    ];
    const result = analyzeDayparting(rows);
    expect(result.totalConversions).toBe(0);
  });

  test('identifies peak conversion windows', () => {
    const rows = [
      // High conversion rate slot
      { day_of_week: 1, hour_of_day: 10, impressions: 200, clicks: 40, conversions: 10, cost: 100 },
      // Medium slot
      { day_of_week: 1, hour_of_day: 14, impressions: 200, clicks: 40, conversions: 8, cost: 100 },
      // Low slot
      { day_of_week: 1, hour_of_day: 22, impressions: 200, clicks: 40, conversions: 1, cost: 100 },
    ];
    const result = analyzeDayparting(rows);

    // Peak is 10am Mon (conv_rate = 10/40 = 0.25)
    // Threshold = 0.25 * 0.7 = 0.175
    // 14:00 has 8/40 = 0.2 → above threshold → also a peak
    // 22:00 has 1/40 = 0.025 → below threshold
    expect(result.peaks.length).toBeGreaterThanOrEqual(1);
    expect(result.peaks.some((p) => p.hour === 10 && p.day === 'Monday')).toBe(true);
  });

  test('identifies dead zones (cost with zero conversions)', () => {
    const rows = [
      { day_of_week: 0, hour_of_day: 2, impressions: 50, clicks: 5, conversions: 0, cost: 30 },
      { day_of_week: 0, hour_of_day: 3, impressions: 40, clicks: 4, conversions: 0, cost: 25 },
      { day_of_week: 0, hour_of_day: 4, impressions: 30, clicks: 3, conversions: 0, cost: 20 },
      { day_of_week: 0, hour_of_day: 5, impressions: 20, clicks: 2, conversions: 0, cost: 15 },
      // Need a conversion somewhere so maxConvRate > 0
      { day_of_week: 1, hour_of_day: 10, impressions: 100, clicks: 20, conversions: 5, cost: 50 },
    ];
    const result = analyzeDayparting(rows);

    expect(result.deadZones.length).toBe(4);
    expect(result.deadZones[0].day).toBe('Sunday');
    expect(result.deadZones[0].wasted).toBe(30);
  });

  test('generates bid increase recommendation for peaks', () => {
    const rows = [
      { day_of_week: 1, hour_of_day: 10, impressions: 200, clicks: 40, conversions: 10, cost: 100 },
      { day_of_week: 2, hour_of_day: 10, impressions: 200, clicks: 40, conversions: 8, cost: 100 },
    ];
    const result = analyzeDayparting(rows);

    const increaseRec = result.recommendations.find((r) => r.type === 'increase');
    expect(increaseRec).toBeDefined();
    expect(increaseRec.modifier).toBe('+20%');
  });

  test('generates bid decrease recommendation when >3 dead zones', () => {
    const rows = [
      { day_of_week: 0, hour_of_day: 1, impressions: 50, clicks: 5, conversions: 0, cost: 30 },
      { day_of_week: 0, hour_of_day: 2, impressions: 50, clicks: 5, conversions: 0, cost: 25 },
      { day_of_week: 0, hour_of_day: 3, impressions: 50, clicks: 5, conversions: 0, cost: 20 },
      { day_of_week: 0, hour_of_day: 4, impressions: 50, clicks: 5, conversions: 0, cost: 15 },
      { day_of_week: 1, hour_of_day: 10, impressions: 200, clicks: 40, conversions: 10, cost: 100 },
    ];
    const result = analyzeDayparting(rows);

    const decreaseRec = result.recommendations.find((r) => r.type === 'decrease');
    expect(decreaseRec).toBeDefined();
    expect(decreaseRec.modifier).toBe('-30%');
    expect(decreaseRec.description).toContain('4 zero-conversion');
    expect(decreaseRec.description).toContain('$90');
  });

  test('handles null/undefined input gracefully', () => {
    expect(() => analyzeDayparting(null)).not.toThrow();
    expect(() => analyzeDayparting(undefined)).not.toThrow();
    const result = analyzeDayparting(null);
    expect(result.grid).toHaveLength(7);
    expect(result.totalConversions).toBe(0);
  });

  test('CPA is null when zero conversions', () => {
    const rows = [
      { day_of_week: 3, hour_of_day: 15, impressions: 100, clicks: 10, conversions: 0, cost: 50 },
    ];
    const result = analyzeDayparting(rows);
    expect(result.grid[3][15].cpa).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/analysis/dayparting.test.js --verbose`
Expected: FAIL — `Cannot find module '@/lib/analysis/dayparting'`

- [ ] **Step 3: Commit**

```bash
git add __tests__/analysis/dayparting.test.js
git commit -m "test: add failing tests for dayparting analysis module"
```

---

## Task 2: Dayparting Analysis — Implementation

**Files:**
- Create: `lib/analysis/dayparting.js`

- [ ] **Step 1: Implement dayparting analysis**

Create `lib/analysis/dayparting.js`:

```js
/**
 * Analyze conversion patterns by hour-of-day and day-of-week.
 * Input: array of hourly performance rows from Google Ads.
 * Output: heatmap grid, peak/dead zone identification, bid modifier recommendations.
 *
 * Used by:
 * - DaypartingHeatmap component (visualization)
 * - BidAgent (auto bid modifier adjustments)
 * - Campaign wizard Step 13 (schedule recommendations in Phase 6)
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function analyzeDayparting(hourlyData) {
  // Initialize 7×24 grid (days × hours), all null
  const grid = Array.from({ length: 7 }, () => Array(24).fill(null));

  // Fill grid with computed metrics per cell
  (hourlyData || []).forEach((row) => {
    const day = row.day_of_week;
    const hour = row.hour_of_day;
    if (day < 0 || day >= 7 || hour < 0 || hour >= 24) return;

    grid[day][hour] = {
      impressions: row.impressions || 0,
      clicks: row.clicks || 0,
      conversions: row.conversions || 0,
      cost: row.cost || 0,
      ctr: row.impressions > 0 ? (row.clicks || 0) / row.impressions : 0,
      conv_rate: (row.clicks || 0) > 0 ? (row.conversions || 0) / row.clicks : 0,
      cpa: (row.conversions || 0) > 0 ? (row.cost || 0) / row.conversions : null,
    };
  });

  // Find max conversion rate across entire grid
  let maxConvRate = 0;
  let totalConversions = 0;

  grid.forEach((dayData) => {
    dayData.forEach((cell) => {
      if (!cell) return;
      totalConversions += cell.conversions;
      if (cell.conv_rate > maxConvRate) maxConvRate = cell.conv_rate;
    });
  });

  // Identify peaks (≥70% of max conv rate) and dead zones (cost > 0, conversions === 0)
  const peaks = [];
  const deadZones = [];
  const threshold = maxConvRate * 0.7;

  grid.forEach((dayData, dayIdx) => {
    dayData.forEach((cell, hourIdx) => {
      if (!cell) return;
      if (cell.conv_rate >= threshold && cell.conversions > 0) {
        peaks.push({ day: DAYS[dayIdx], hour: hourIdx, ...cell });
      }
      if (cell.cost > 0 && cell.conversions === 0) {
        deadZones.push({ day: DAYS[dayIdx], hour: hourIdx, wasted: cell.cost });
      }
    });
  });

  // Generate bid modifier recommendations
  const recommendations = [];

  if (peaks.length > 0) {
    const peakHours = [...new Set(peaks.map((p) => p.hour))].sort((a, b) => a - b);
    recommendations.push({
      type: 'increase',
      description: `Increase bids during peak hours (${peakHours.map((h) => `${h}:00`).join(', ')})`,
      modifier: '+20%',
    });
  }

  if (deadZones.length > 3) {
    const totalWasted = deadZones.reduce((sum, d) => sum + d.wasted, 0);
    recommendations.push({
      type: 'decrease',
      description: `Reduce bids during ${deadZones.length} zero-conversion time slots (saving ~$${totalWasted.toFixed(0)})`,
      modifier: '-30%',
    });
  }

  return {
    grid,
    peaks,
    deadZones,
    recommendations,
    totalConversions,
    days: DAYS,
  };
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx jest __tests__/analysis/dayparting.test.js --verbose`
Expected: All 8 tests PASS

- [ ] **Step 3: Commit**

```bash
git add lib/analysis/dayparting.js
git commit -m "feat: implement dayparting analysis with peak/dead zone detection"
```

---

## Task 3: Impression Share + Hourly GAQL Queries

Add two new query functions to the existing `lib/google-ads-query.js`. The existing `fetchCampaignMetrics()` only returns impressions, clicks, cost, conversions, ctr, avgCpc — no impression share fields.

**Files:**
- Modify: `lib/google-ads-query.js`

- [ ] **Step 1: Read `lib/google-ads-query.js` to find insertion point**

Read the file. Look for `fetchCampaignMetrics` and the end of the file. We'll add two new functions after the existing exports.

- [ ] **Step 2: Add `fetchCampaignMetricsWithIS()` function**

Append to the end of `lib/google-ads-query.js`:

```js
/**
 * Fetch campaign metrics INCLUDING impression share fields.
 * Used by Agent Controls campaign table.
 * Returns same shape as fetchCampaignMetrics() plus 3 IS fields.
 */
export async function fetchCampaignMetricsWithIS(client, dateRange = 'LAST_30_DAYS') {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign_budget.amount_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc,
      metrics.search_impression_share,
      metrics.search_top_impression_rate,
      metrics.search_absolute_top_impression_rate
    FROM campaign
    WHERE segments.date DURING ${dateRange}
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
  `;
  const rows = await queryGoogleAds(client, query);
  return (rows || []).map((row) => ({
    campaignId: row.campaign?.id,
    name: row.campaign?.name,
    status: row.campaign?.status,
    type: row.campaign?.advertisingChannelType,
    budget: row.campaignBudget?.amountMicros ? Number(row.campaignBudget.amountMicros) / 1_000_000 : null,
    impressions: Number(row.metrics?.impressions || 0),
    clicks: Number(row.metrics?.clicks || 0),
    spend: row.metrics?.costMicros ? Number(row.metrics.costMicros) / 1_000_000 : 0,
    conversions: Number(row.metrics?.conversions || 0),
    ctr: Number(row.metrics?.ctr || 0),
    avgCpc: row.metrics?.averageCpc ? Number(row.metrics.averageCpc) / 1_000_000 : 0,
    cpa: Number(row.metrics?.conversions || 0) > 0
      ? (Number(row.metrics?.costMicros || 0) / 1_000_000) / Number(row.metrics.conversions)
      : null,
    search_impression_share: row.metrics?.searchImpressionShare != null
      ? Number(row.metrics.searchImpressionShare) : null,
    search_top_impression_share: row.metrics?.searchTopImpressionRate != null
      ? Number(row.metrics.searchTopImpressionRate) : null,
    search_abs_top_impression_share: row.metrics?.searchAbsoluteTopImpressionRate != null
      ? Number(row.metrics.searchAbsoluteTopImpressionRate) : null,
  }));
}

/**
 * Fetch hourly performance data for dayparting analysis.
 * Returns one row per day_of_week × hour_of_day combination.
 * Used by lib/analysis/dayparting.js.
 */
export async function fetchHourlyPerformance(client, dateRange = 'LAST_30_DAYS') {
  const query = `
    SELECT
      segments.day_of_week,
      segments.hour,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE segments.date DURING ${dateRange}
      AND campaign.status = 'ENABLED'
  `;
  const DAY_MAP = {
    MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4,
    FRIDAY: 5, SATURDAY: 6, SUNDAY: 0,
  };
  const rows = await queryGoogleAds(client, query);
  return (rows || []).map((row) => ({
    day_of_week: DAY_MAP[row.segments?.dayOfWeek] ?? -1,
    hour_of_day: Number(row.segments?.hour ?? -1),
    impressions: Number(row.metrics?.impressions || 0),
    clicks: Number(row.metrics?.clicks || 0),
    conversions: Number(row.metrics?.conversions || 0),
    cost: row.metrics?.costMicros ? Number(row.metrics.costMicros) / 1_000_000 : 0,
  }));
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/google-ads-query.js
git commit -m "feat: add impression share and hourly performance GAQL queries"
```

---

## Task 4: Supabase Functions — Audit History + Schedule Config

**Files:**
- Modify: `lib/supabase.js`

- [ ] **Step 1: Read `lib/supabase.js` to find insertion point**

Read `lib/supabase.js`. Find the end of the agent-related functions section. We'll add 4 new functions.

- [ ] **Step 2: Add audit score history + schedule config functions**

Append to `lib/supabase.js`:

```js
// ─── Audit Score History ──────────────────────────────────────────────

export async function getAuditScoreHistory(accountId, limit = 12) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('report_analyses')
    .select('id, created_at, computed_data')
    .eq('account_id', accountId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) return [];
  return (data || []).map((row, i) => ({
    week: `W${i + 1}`,
    score: row.computed_data?.audit_score || row.computed_data?.overall_score || 0,
    date: row.created_at,
  }));
}

// ─── Agent Schedule Config ────────────────────────────────────────────

export async function getAccountSchedule(accountId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('accounts')
    .select('settings')
    .eq('id', accountId)
    .single();
  if (error || !data) return null;
  return data.settings?.agent_schedule || null;
}

export async function saveAccountSchedule(accountId, scheduleConfig) {
  if (!supabase) return null;
  // Merge into existing settings JSONB
  const { data: current } = await supabase
    .from('accounts')
    .select('settings')
    .eq('id', accountId)
    .single();
  const settings = current?.settings || {};
  settings.agent_schedule = scheduleConfig;
  const { data, error } = await supabase
    .from('accounts')
    .update({ settings })
    .eq('id', accountId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.js
git commit -m "feat: add audit score history and agent schedule config to supabase"
```

---

## Task 5: API Routes — Dayparting + Audit History

**Files:**
- Create: `app/api/accounts/[id]/dayparting/route.js`
- Create: `app/api/accounts/[id]/audit-history/route.js`

- [ ] **Step 1: Create dayparting API route**

Create `app/api/accounts/[id]/dayparting/route.js`:

```js
import { NextResponse } from 'next/server';
import { analyzeDayparting } from '@/lib/analysis/dayparting';
import { getAccount } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const account = await getAccount(id);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Hourly data comes from cached audit_data (populated by Google Ads sync)
    // or from a fresh API call if the account has a connected Google Ads client
    const hourlyData = account.audit_data?.hourly_performance || [];
    const analysis = analyzeDayparting(hourlyData);

    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create audit history API route**

Create `app/api/accounts/[id]/audit-history/route.js`:

```js
import { NextResponse } from 'next/server';
import { getAuditScoreHistory } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12', 10);

    const history = await getAuditScoreHistory(id, limit);
    return NextResponse.json({ history });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/accounts/[id]/dayparting/ app/api/accounts/[id]/audit-history/
git commit -m "feat: add dayparting and audit history API routes"
```

---

## Task 6: AgentCards + AuditMetrics Components

**Files:**
- Create: `components/agent-controls/AgentCards.js`
- Create: `components/agent-controls/AuditMetrics.js`

- [ ] **Step 1: Create AgentCards bento grid**

All 7 agent types, 4-across on xl screens. Uses centralized config from `lib/agent-config.js`. Alert state shows "Review Conflict" CTA. Idle state has reduced opacity. Running state has animated pulse.

Create `components/agent-controls/AgentCards.js`:

```js
import StatusBadge from '@/components/ui/StatusBadge';
import { AGENT_TYPES, AGENT_TYPE_KEYS } from '@/lib/agent-config';

export default function AgentCards({ latestRuns }) {
  function getAgentStatus(type) {
    const run = (latestRuns || []).find((r) => r.agent_type === type);
    if (!run) return { status: 'idle', description: 'Not yet configured', lastRun: null };
    if (run.status === 'running') return { status: 'running', description: run.summary || 'Processing...', lastRun: run.updated_at };
    if (run.status === 'error') return { status: 'alert', description: run.error || 'Error occurred', lastRun: run.updated_at };
    return { status: 'active', description: run.summary || 'Last run completed', lastRun: run.updated_at || run.completed_at };
  }

  function relativeTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {AGENT_TYPE_KEYS.map((type) => {
        const config = AGENT_TYPES[type];
        const { status, description, lastRun } = getAgentStatus(type);

        return (
          <div
            key={type}
            className={`bg-surface-container rounded-xl p-5 transition-opacity ${
              status === 'idle' ? 'opacity-75' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-xl">
                  {config.icon}
                </span>
              </div>
              <StatusBadge
                status={status}
                pulse={status === 'running'}
              />
            </div>
            <h3 className="text-sm font-semibold text-on-surface mb-1">{config.label}</h3>
            <p className="text-xs text-on-surface-variant mb-3 line-clamp-2">{description}</p>
            {lastRun && (
              <div className="text-label-sm text-on-surface-variant">
                Last run: {relativeTime(lastRun)}
              </div>
            )}
            {status === 'alert' && (
              <button className="mt-3 px-3 py-1.5 rounded-lg bg-error/15 text-error text-xs font-medium hover:bg-error/25 transition-colors">
                Review Conflict
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create AuditMetrics (3 hero metrics)**

Create `components/agent-controls/AuditMetrics.js`:

```js
import StatCard from '@/components/ui/StatCard';

export default function AuditMetrics({ auditScore, prevAuditScore, wastedSpend, optimizationUplift }) {
  const scoreDelta = prevAuditScore != null && prevAuditScore > 0
    ? ((auditScore - prevAuditScore) / prevAuditScore * 100).toFixed(1)
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Overall Audit Score"
        value={`${auditScore || 0}/100`}
        delta={scoreDelta ? `${scoreDelta > 0 ? '+' : ''}${scoreDelta}%` : null}
        deltaLabel="vs last week"
        icon="speed"
      />
      <StatCard
        label="Wasted Spend Detected"
        value={`$${(wastedSpend || 0).toLocaleString()}`}
        deltaLabel={wastedSpend > 0 ? 'Zero-conversion keywords flagged' : 'No waste detected'}
        icon="money_off"
        variant={wastedSpend > 100 ? 'warning' : 'default'}
      />
      <StatCard
        label="AI Optimization Uplift"
        value={`${(optimizationUplift || 0).toFixed(1)}%`}
        deltaLabel="Autonomous improvements"
        icon="auto_awesome"
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/agent-controls/AgentCards.js components/agent-controls/AuditMetrics.js
git commit -m "feat: add agent status cards (7 types) and audit hero metrics"
```

---

## Task 7: PerformanceDeltas Component

The 5 boss-requested performance metrics: CPL, Total Spend, Conversions, Budget Pacing, Avg CPC. Each with period-over-period delta.

**Files:**
- Create: `components/agent-controls/PerformanceDeltas.js`

- [ ] **Step 1: Create PerformanceDeltas component**

Create `components/agent-controls/PerformanceDeltas.js`:

```js
export default function PerformanceDeltas({ currentPeriod, previousPeriod }) {
  const curr = currentPeriod || {};
  const prev = previousPeriod || {};

  function delta(currVal, prevVal) {
    if (!prevVal || prevVal === 0) return null;
    return ((currVal - prevVal) / prevVal) * 100;
  }

  function fmtDelta(pct) {
    if (pct === null) return '—';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  }

  function fmtMoney(n) {
    if (n == null) return '$0';
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }

  const cplDelta = delta(curr.cost_per_lead, prev.cost_per_lead);
  const spendDelta = delta(curr.total_spend, prev.total_spend);
  const convDelta = delta(curr.conversions, prev.conversions);
  const cpcDelta = delta(curr.avg_cpc, prev.avg_cpc);

  // Budget pacing: spend / budget
  const budgetUsed = curr.budget > 0 ? (curr.total_spend / curr.budget) * 100 : 0;
  const pacingLabel = budgetUsed > 110 ? 'Overspending' : budgetUsed < 80 ? 'Underspending' : 'On Track';
  const pacingColor = budgetUsed > 110 ? 'text-error' : budgetUsed < 80 ? 'text-tertiary' : 'text-secondary';

  const metrics = [
    {
      label: 'CPL',
      value: fmtMoney(curr.cost_per_lead),
      delta: fmtDelta(cplDelta),
      isPositive: cplDelta !== null && cplDelta < 0, // lower CPL is better
      subtitle: 'vs last period',
    },
    {
      label: 'Total Spend',
      value: fmtMoney(curr.total_spend),
      delta: fmtDelta(spendDelta),
      isPositive: spendDelta !== null && spendDelta >= 0,
      subtitle: 'vs last period',
    },
    {
      label: 'Conversions',
      value: String(Math.round(curr.conversions || 0)),
      delta: fmtDelta(convDelta),
      isPositive: convDelta !== null && convDelta >= 0,
      subtitle: 'vs last period',
    },
    {
      label: 'Budget Pacing',
      value: `${budgetUsed.toFixed(0)}%`,
      customDelta: pacingLabel,
      pacingColor,
      subtitle: 'of budget used',
      showBar: true,
      barPct: Math.min(budgetUsed, 100),
    },
    {
      label: 'Avg. CPC',
      value: `$${(curr.avg_cpc || 0).toFixed(2)}`,
      delta: fmtDelta(cpcDelta),
      isPositive: cpcDelta !== null && cpcDelta < 0, // lower CPC is better
      subtitle: 'vs last period',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {metrics.map((m) => (
        <div key={m.label} className="bg-surface-container rounded-xl p-4">
          <div className="text-label-sm text-on-surface-variant mb-2">{m.label}</div>
          <div className="text-2xl font-bold text-on-surface">{m.value}</div>
          {m.showBar && (
            <div className="w-full h-1.5 rounded-full bg-surface-container-high mt-2 mb-1">
              <div
                className={`h-full rounded-full transition-all ${
                  m.barPct > 100 ? 'bg-error' : m.barPct < 80 ? 'bg-tertiary' : 'bg-secondary'
                }`}
                style={{ width: `${Math.min(m.barPct, 100)}%` }}
              />
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            {m.customDelta ? (
              <span className={`text-xs font-medium ${m.pacingColor}`}>{m.customDelta}</span>
            ) : m.delta !== '—' ? (
              <span className={`text-xs font-medium ${m.isPositive ? 'text-secondary' : 'text-error'}`}>
                <span className="material-symbols-outlined text-xs align-middle">
                  {m.isPositive ? 'trending_up' : 'trending_down'}
                </span>
                {' '}{m.delta}
              </span>
            ) : null}
            <span className="text-label-sm text-on-surface-variant">{m.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/agent-controls/PerformanceDeltas.js
git commit -m "feat: add 5-card performance deltas (CPL, spend, conversions, pacing, CPC)"
```

---

## Task 8: CampaignQuality + CampaignTable with Impression Share

**Files:**
- Create: `components/agent-controls/CampaignQuality.js`
- Create: `components/agent-controls/CampaignTable.js`

- [ ] **Step 1: Create CampaignQuality progress bars**

Create `components/agent-controls/CampaignQuality.js`:

```js
const SCORE_COLORS = {
  high: 'bg-secondary',      // 90+
  medium: 'bg-primary',      // 70-89
  low: 'bg-on-surface-variant', // <70
};

export default function CampaignQuality({ campaigns }) {
  if (!campaigns || campaigns.length === 0) return null;

  const scored = campaigns
    .filter((c) => c.quality_score != null)
    .sort((a, b) => b.quality_score - a.quality_score);

  if (scored.length === 0) return null;

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface">Campaign Quality Index</h3>
        <div className="flex items-center gap-4 text-label-sm text-on-surface-variant">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary" /> 90+</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> 70-89</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-on-surface-variant" /> &lt;70</span>
        </div>
      </div>

      <div className="space-y-3">
        {scored.slice(0, 8).map((c, i) => {
          const colorKey = c.quality_score >= 90 ? 'high' : c.quality_score >= 70 ? 'medium' : 'low';
          return (
            <div key={c.campaignId || i} className="flex items-center gap-4">
              <span className="text-sm text-on-surface-variant w-48 truncate">{c.name}</span>
              <div className="flex-1 h-2 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className={`h-full rounded-full ${SCORE_COLORS[colorKey]} transition-all`}
                  style={{ width: `${c.quality_score}%` }}
                />
              </div>
              <span className="text-sm text-on-surface font-medium w-10 text-right">{c.quality_score}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create CampaignTable with impression share columns**

The 3 boss-requested impression share columns: Search IS, Top IS, Abs. Top IS. Shows "—" when data not available (API not connected).

Create `components/agent-controls/CampaignTable.js`:

```js
'use client';

import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';

function fmtPct(val) {
  if (val == null) return '—';
  return `${(val * 100).toFixed(1)}%`;
}

function fmtMoney(val) {
  if (val == null) return '—';
  return `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function CampaignTable({ campaigns }) {
  const columns = [
    {
      key: 'name',
      label: 'Campaign',
      render: (val, row) => (
        <div>
          <div className="text-sm font-medium text-on-surface">{val}</div>
          <div className="text-xs text-on-surface-variant">{row.type || 'Search'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val === 'ENABLED' ? 'active' : 'idle'} label={val} />,
    },
    { key: 'budget', label: 'Budget', render: (val) => fmtMoney(val) },
    { key: 'spend', label: 'Spend', render: (val) => fmtMoney(val) },
    { key: 'conversions', label: 'Conv.', render: (val) => val != null ? Math.round(val) : '—' },
    {
      key: 'cpa',
      label: 'CPA',
      render: (val) => val != null ? `$${Number(val).toFixed(2)}` : '—',
    },
    {
      key: 'search_impression_share',
      label: 'Search IS',
      render: (val) => (
        <span className={val != null && val < 0.5 ? 'text-error' : 'text-on-surface'}>
          {fmtPct(val)}
        </span>
      ),
    },
    {
      key: 'search_top_impression_share',
      label: 'Top IS',
      render: (val) => fmtPct(val),
    },
    {
      key: 'search_abs_top_impression_share',
      label: 'Abs. Top IS',
      render: (val) => fmtPct(val),
    },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-lg">table_chart</span>
        Campaign Performance
      </h3>
      <DataTable
        columns={columns}
        rows={campaigns || []}
        emptyMessage="No campaign data available. Connect Google Ads to see live metrics."
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/agent-controls/CampaignQuality.js components/agent-controls/CampaignTable.js
git commit -m "feat: add campaign quality index and campaign table with impression share columns"
```

---

## Task 9: AuditTrending + DaypartingHeatmap + ActionTimeline + ScalingOpportunity

Four visualization/interaction components.

**Files:**
- Create: `components/agent-controls/AuditTrending.js`
- Create: `components/agent-controls/DaypartingHeatmap.js`
- Create: `components/agent-controls/ActionTimeline.js`
- Create: `components/agent-controls/ScalingOpportunity.js`

- [ ] **Step 1: Create AuditTrending (Recharts line chart)**

Create `components/agent-controls/AuditTrending.js`:

```js
'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area } from 'recharts';

export default function AuditTrending({ history }) {
  if (!history || history.length < 2) {
    return (
      <div className="bg-surface-container rounded-xl p-6">
        <h3 className="text-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">trending_up</span>
          Audit Score Trend
        </h3>
        <p className="text-xs text-on-surface-variant">Need at least 2 weekly audits to show trends.</p>
      </div>
    );
  }

  const first = history[0]?.score || 0;
  const last = history[history.length - 1]?.score || 0;
  const delta = last - first;

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">trending_up</span>
          Audit Score Trend
        </h3>
        <span className={`text-sm font-medium ${delta >= 0 ? 'text-secondary' : 'text-error'}`}>
          {delta >= 0 ? '+' : ''}{delta} pts over {history.length} weeks
        </span>
      </div>

      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <LineChart data={history}>
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface-container-high)',
                border: 'none',
                borderRadius: '8px',
                color: 'var(--on-surface)',
                fontSize: '12px',
              }}
            />
            <defs>
              <linearGradient id="auditScoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--secondary)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--secondary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="score" fill="url(#auditScoreGradient)" stroke="none" />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--secondary)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--secondary)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create DaypartingHeatmap**

The spec says: "Visualize as heatmap grid (hours x days)". 7 rows (days) × 24 columns (hours). Cell color intensity = conversion rate relative to max. Includes peak/dead zone badges and bid modifier recommendations.

Create `components/agent-controls/DaypartingHeatmap.js`:

```js
'use client';

import { useState, useEffect } from 'react';

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return '12a';
  if (i < 12) return `${i}a`;
  if (i === 12) return '12p';
  return `${i - 12}p`;
});

function getCellColor(convRate, maxConvRate) {
  if (convRate == null || maxConvRate === 0) return 'bg-surface-container-low';
  const intensity = convRate / maxConvRate;
  if (intensity >= 0.7) return 'bg-secondary/80';
  if (intensity >= 0.4) return 'bg-secondary/40';
  if (intensity > 0) return 'bg-secondary/15';
  return 'bg-surface-container-low';
}

function getDeadZoneColor(cell) {
  if (cell && cell.cost > 0 && cell.conversions === 0) return 'bg-error/30';
  return null;
}

export default function DaypartingHeatmap({ daypartingData }) {
  const [tooltip, setTooltip] = useState(null);

  if (!daypartingData || !daypartingData.grid) {
    return (
      <div className="bg-surface-container rounded-xl p-6">
        <h3 className="text-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">grid_on</span>
          Dayparting Analysis
        </h3>
        <p className="text-xs text-on-surface-variant">Connect Google Ads and run hourly data sync to see dayparting patterns.</p>
      </div>
    );
  }

  const { grid, peaks, deadZones, recommendations, days } = daypartingData;

  // Find max conv rate for color scaling
  let maxConvRate = 0;
  grid.forEach((dayData) => {
    dayData.forEach((cell) => {
      if (cell && cell.conv_rate > maxConvRate) maxConvRate = cell.conv_rate;
    });
  });

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">grid_on</span>
          Dayparting Analysis
        </h3>
        <div className="flex items-center gap-3 text-label-sm text-on-surface-variant">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-secondary/80" /> Peak</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-secondary/15" /> Low</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-error/30" /> Dead Zone</span>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Hour labels */}
          <div className="flex gap-px mb-px ml-20">
            {HOUR_LABELS.map((label, i) => (
              <div key={i} className="flex-1 text-center text-[10px] text-on-surface-variant">
                {i % 3 === 0 ? label : ''}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {days.map((day, dayIdx) => (
            <div key={day} className="flex gap-px mb-px">
              <div className="w-20 text-xs text-on-surface-variant flex items-center shrink-0">
                {day.slice(0, 3)}
              </div>
              {grid[dayIdx].map((cell, hourIdx) => {
                const deadColor = getDeadZoneColor(cell);
                const bgColor = deadColor || getCellColor(cell?.conv_rate, maxConvRate);

                return (
                  <div
                    key={hourIdx}
                    className={`flex-1 h-7 rounded-sm ${bgColor} cursor-pointer transition-all hover:ring-1 hover:ring-primary/50`}
                    onMouseEnter={() => setTooltip({ day, hour: hourIdx, cell })}
                    onMouseLeave={() => setTooltip(null)}
                    title={cell ? `${cell.conversions} conv, $${cell.cost.toFixed(0)} cost` : 'No data'}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-4 space-y-2">
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs ${
                rec.type === 'increase' ? 'text-secondary' : 'text-error'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {rec.type === 'increase' ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <span className="text-on-surface-variant">{rec.description}</span>
              <span className="font-medium">{rec.modifier}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary stats */}
      <div className="flex items-center gap-6 mt-4 text-label-sm text-on-surface-variant">
        <span>{peaks.length} peak windows</span>
        <span>{deadZones.length} dead zones</span>
        {deadZones.length > 0 && (
          <span className="text-error">
            ${deadZones.reduce((s, d) => s + d.wasted, 0).toFixed(0)} wasted in dead zones
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create ActionTimeline**

Colored by agent type. Shows undo button for reversible actions. Uses config from `lib/agent-config.js`.

Create `components/agent-controls/ActionTimeline.js`:

```js
'use client';

import { AGENT_TYPES } from '@/lib/agent-config';

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ActionTimeline({ actions, onUndo, onViewAll }) {
  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">history</span>
          Recent Agent Actions
        </h3>
      </div>

      <div className="relative">
        {/* Vertical connecting line */}
        <div className="absolute left-3 top-2 bottom-2 w-[2px] bg-outline-variant/15" />

        <div className="space-y-5">
          {(actions || []).slice(0, 8).map((action, i) => {
            const agentConfig = AGENT_TYPES[action.agent_type];
            const dotColor = agentConfig?.color || 'bg-on-surface-variant';

            return (
              <div key={action.id || i} className="relative pl-9">
                {/* Timeline dot */}
                <div className={`absolute left-1 top-1 w-4 h-4 rounded-full ring-4 ring-surface-container ${dotColor}`} />

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-on-surface">{action.description}</span>
                    {action.agent_type && (
                      <span className="text-label-sm text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded">
                        {agentConfig?.label || action.agent_type}
                      </span>
                    )}
                  </div>
                  {action.reasoning && (
                    <p className="text-xs text-on-surface-variant mt-0.5">{action.reasoning}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-label-sm text-on-surface-variant">
                      {relativeTime(action.created_at)}
                    </span>
                    {action.before_state && !action.undone_at && onUndo && (
                      <button
                        onClick={() => onUndo(action.id)}
                        className="text-label-sm text-primary hover:text-primary-container transition-colors"
                      >
                        Undo
                      </button>
                    )}
                    {action.undone_at && (
                      <span className="text-label-sm text-on-surface-variant italic">Undone</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full mt-5 text-center text-label-sm text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest"
        >
          View Full Action Audit
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create ScalingOpportunity banner**

Create `components/agent-controls/ScalingOpportunity.js`:

```js
'use client';

import { useState } from 'react';
import GradientButton from '@/components/ui/GradientButton';
import GhostButton from '@/components/ui/GhostButton';

export default function ScalingOpportunity({ opportunity }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !opportunity) return null;

  return (
    <div className="bg-surface-container-low rounded-xl p-6 flex items-center justify-between gap-6">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-secondary text-2xl">rocket_launch</span>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-on-surface mb-0.5">Autonomous Scaling Opportunity</h3>
          <p className="text-xs text-on-surface-variant truncate">{opportunity.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <GhostButton onClick={() => setDismissed(true)}>Dismiss</GhostButton>
        <GradientButton>Auto-Scale Campaign</GradientButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/agent-controls/AuditTrending.js components/agent-controls/DaypartingHeatmap.js components/agent-controls/ActionTimeline.js components/agent-controls/ScalingOpportunity.js
git commit -m "feat: add audit trending chart, dayparting heatmap, action timeline, scaling banner"
```

---

## Task 10: ScheduleConfig Component

Per-account agent scheduling + guardrails. The spec defines a table of 7 agents with default frequencies and a guardrails section (budget caps, bid ceilings, excluded campaigns).

**Files:**
- Create: `components/agent-controls/ScheduleConfig.js`

- [ ] **Step 1: Create ScheduleConfig panel**

Create `components/agent-controls/ScheduleConfig.js`:

```js
'use client';

import { useState, useEffect } from 'react';
import { AGENT_TYPES, AGENT_TYPE_KEYS, getDefaultScheduleConfig, GUARDRAIL_DEFAULTS } from '@/lib/agent-config';
import GradientButton from '@/components/ui/GradientButton';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'on-demand', label: 'On-demand' },
];

export default function ScheduleConfig({ accountId, initialConfig, onSave }) {
  const [config, setConfig] = useState(() => initialConfig || getDefaultScheduleConfig());
  const [guardrails, setGuardrails] = useState(() => initialConfig?.guardrails || { ...GUARDRAIL_DEFAULTS });
  const [saving, setSaving] = useState(false);

  function toggleAgent(type) {
    setConfig((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type]?.enabled },
    }));
  }

  function setFrequency(type, frequency) {
    setConfig((prev) => ({
      ...prev,
      [type]: { ...prev[type], frequency },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...config, guardrails };
      await onSave?.(payload);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-lg">schedule</span>
        Agent Scheduling &amp; Guardrails
      </h3>

      {/* Agent schedule table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-label-sm text-on-surface-variant">
              <th className="text-left py-2 pr-4">Agent</th>
              <th className="text-left py-2 pr-4">Enabled</th>
              <th className="text-left py-2 pr-4">Frequency</th>
              <th className="text-left py-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {AGENT_TYPE_KEYS.map((type) => {
              const agentDef = AGENT_TYPES[type];
              const agentConfig = config[type] || {};
              return (
                <tr key={type} className="border-t border-outline-variant/10">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-on-surface-variant">
                        {agentDef.icon}
                      </span>
                      <span className="text-on-surface font-medium">{agentDef.label}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => toggleAgent(type)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        agentConfig.enabled ? 'bg-secondary' : 'bg-surface-container-high'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${
                        agentConfig.enabled ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={agentConfig.frequency || agentDef.defaultFrequency}
                      onChange={(e) => setFrequency(type, e.target.value)}
                      disabled={type === 'brand'}
                      className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface text-sm outline-none disabled:opacity-50"
                    >
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 text-xs text-on-surface-variant">{agentDef.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Guardrails */}
      <div className="space-y-4 mb-6">
        <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Guardrails</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-on-surface-variant block mb-1">Max Daily Budget Cap ($)</label>
            <input
              type="number"
              value={guardrails.maxDailyBudgetCap || ''}
              onChange={(e) => setGuardrails((g) => ({ ...g, maxDailyBudgetCap: e.target.value ? Number(e.target.value) : null }))}
              placeholder="No cap"
              className="w-full px-3 py-2 rounded-lg bg-surface-container-high text-on-surface text-sm outline-none placeholder-on-surface-variant"
            />
          </div>
          <div>
            <label className="text-xs text-on-surface-variant block mb-1">Max Bid Ceiling ($ per click)</label>
            <input
              type="number"
              step="0.01"
              value={guardrails.maxBidCeiling || ''}
              onChange={(e) => setGuardrails((g) => ({ ...g, maxBidCeiling: e.target.value ? Number(e.target.value) : null }))}
              placeholder="No cap"
              className="w-full px-3 py-2 rounded-lg bg-surface-container-high text-on-surface text-sm outline-none placeholder-on-surface-variant"
            />
          </div>
          <div>
            <label className="text-xs text-on-surface-variant block mb-1">Require Approval Above ($)</label>
            <input
              type="number"
              value={guardrails.requireApprovalAbove || ''}
              onChange={(e) => setGuardrails((g) => ({ ...g, requireApprovalAbove: e.target.value ? Number(e.target.value) : null }))}
              placeholder="No threshold"
              className="w-full px-3 py-2 rounded-lg bg-surface-container-high text-on-surface text-sm outline-none placeholder-on-surface-variant"
            />
          </div>
          <div>
            <label className="text-xs text-on-surface-variant block mb-1">Excluded Campaign IDs (comma-separated)</label>
            <input
              type="text"
              value={(guardrails.excludedCampaignIds || []).join(', ')}
              onChange={(e) => setGuardrails((g) => ({
                ...g,
                excludedCampaignIds: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : [],
              }))}
              placeholder="None"
              className="w-full px-3 py-2 rounded-lg bg-surface-container-high text-on-surface text-sm outline-none placeholder-on-surface-variant"
            />
          </div>
        </div>
      </div>

      <GradientButton onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Schedule & Guardrails'}
      </GradientButton>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/agent-controls/ScheduleConfig.js
git commit -m "feat: add agent scheduling config with per-account guardrails"
```

---

## Task 11: Agent Controls Page — Full Rewrite

Assemble all components into the Agent Controls page. Replaces the existing `app/agents/page.js`.

**Files:**
- Modify: `app/agents/page.js`

- [ ] **Step 1: Read the existing `app/agents/page.js`**

Read the current file to understand what's there. The existing page has 6 agent types, a simple grid, cross-account runs table, and manual run buttons.

- [ ] **Step 2: Rewrite `app/agents/page.js`**

Replace the entire contents of `app/agents/page.js`:

```js
'use client';

import { useState, useEffect } from 'react';
import { getAccounts, getAuditScoreHistory, getAccountSchedule, saveAccountSchedule } from '@/lib/supabase';
import GradientButton from '@/components/ui/GradientButton';
import GhostButton from '@/components/ui/GhostButton';
import Skeleton from '@/components/ui/Skeleton';
import AgentCards from '@/components/agent-controls/AgentCards';
import AuditMetrics from '@/components/agent-controls/AuditMetrics';
import PerformanceDeltas from '@/components/agent-controls/PerformanceDeltas';
import CampaignQuality from '@/components/agent-controls/CampaignQuality';
import CampaignTable from '@/components/agent-controls/CampaignTable';
import ActionTimeline from '@/components/agent-controls/ActionTimeline';
import AuditTrending from '@/components/agent-controls/AuditTrending';
import DaypartingHeatmap from '@/components/agent-controls/DaypartingHeatmap';
import ScalingOpportunity from '@/components/agent-controls/ScalingOpportunity';
import ScheduleConfig from '@/components/agent-controls/ScheduleConfig';

export default function AgentControlsPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [campaigns, setCampaigns] = useState([]);
  const [actions, setActions] = useState([]);
  const [runs, setRuns] = useState([]);
  const [auditHistory, setAuditHistory] = useState([]);
  const [daypartingData, setDaypartingData] = useState(null);
  const [scheduleConfig, setScheduleConfig] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const accts = await getAccounts();
        setAccounts(accts || []);
        if (accts?.length > 0) {
          setSelectedAccount(accts[0]);
          await loadAccountData(accts[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function loadAccountData(accountId) {
    const [
      metricsRes,
      campaignsRes,
      actionsRes,
      runsRes,
      history,
      dayparting,
      schedule,
    ] = await Promise.all([
      fetch(`/api/accounts/${accountId}/metrics`).then((r) => r.ok ? r.json() : {}),
      fetch(`/api/accounts/${accountId}/campaigns`).then((r) => r.ok ? r.json() : { campaigns: [] }),
      fetch(`/api/accounts/${accountId}/actions?limit=10`).then((r) => r.ok ? r.json() : { actions: [] }),
      fetch(`/api/agents/runs?accountId=${accountId}`).then((r) => r.ok ? r.json() : { runs: [] }),
      getAuditScoreHistory(accountId),
      fetch(`/api/accounts/${accountId}/dayparting`).then((r) => r.ok ? r.json() : null),
      getAccountSchedule(accountId),
    ]);
    setMetrics(metricsRes);
    setCampaigns(campaignsRes.campaigns || []);
    setActions(actionsRes.actions || []);
    setRuns(runsRes.runs || []);
    setAuditHistory(history);
    setDaypartingData(dayparting);
    setScheduleConfig(schedule);
  }

  async function handleUndo(actionId) {
    if (!selectedAccount) return;
    const res = await fetch(`/api/accounts/${selectedAccount.id}/actions/${actionId}/undo`, { method: 'POST' });
    if (res.ok) {
      // Refresh actions
      const actionsRes = await fetch(`/api/accounts/${selectedAccount.id}/actions?limit=10`);
      if (actionsRes.ok) {
        const data = await actionsRes.json();
        setActions(data.actions || []);
      }
    }
  }

  async function handleSaveSchedule(config) {
    if (!selectedAccount) return;
    await saveAccountSchedule(selectedAccount.id, config);
    setScheduleConfig(config);
  }

  if (loading) {
    return (
      <div className="space-y-6 fade-up">
        <Skeleton variant="text" className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="card" className="h-36" />)}
        </div>
        <Skeleton variant="card" className="h-48" />
      </div>
    );
  }

  const auditScore = selectedAccount?.audit_data?.overall_score || 0;
  const prevAuditScore = auditHistory.length >= 2 ? auditHistory[auditHistory.length - 2]?.score : null;
  const wastedSpend = selectedAccount?.audit_data?.wasted_spend || 0;
  const optimizationUplift = selectedAccount?.audit_data?.optimization_uplift || 0;

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-secondary pulse-dot" />
            <span className="text-label-sm text-secondary">Autonomous Layer Active</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Agent Controls</h1>
        </div>
        <div className="flex items-center gap-3">
          {accounts.length > 1 && (
            <select
              value={selectedAccount?.id || ''}
              onChange={(e) => {
                const acct = accounts.find((a) => a.id === e.target.value);
                setSelectedAccount(acct);
                if (acct) loadAccountData(acct.id);
              }}
              className="px-3 py-2 rounded-xl bg-surface-container text-on-surface text-sm outline-none"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
          <GhostButton onClick={() => setShowSchedule((s) => !s)}>
            <span className="material-symbols-outlined text-lg">schedule</span>
            {showSchedule ? 'Hide Schedule' : 'Schedule'}
          </GhostButton>
          <GhostButton>
            <span className="material-symbols-outlined text-lg">pause_circle</span>
            Pause All Agents
          </GhostButton>
          <GradientButton>
            <span className="material-symbols-outlined text-lg">add</span>
            Deploy New Agent
          </GradientButton>
        </div>
      </div>

      {/* Agent Status Cards (7 types, 4-across) */}
      <AgentCards latestRuns={runs} />

      {/* Schedule Config (toggle) */}
      {showSchedule && (
        <ScheduleConfig
          accountId={selectedAccount?.id}
          initialConfig={scheduleConfig}
          onSave={handleSaveSchedule}
        />
      )}

      {/* Performance Deltas — 5 boss-requested metrics */}
      <PerformanceDeltas
        currentPeriod={metrics?.current || {}}
        previousPeriod={metrics?.previous || {}}
      />

      {/* Main content grid: 8 cols + 4 cols sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          {/* 3 Hero Audit Metrics */}
          <AuditMetrics
            auditScore={auditScore}
            prevAuditScore={prevAuditScore}
            wastedSpend={wastedSpend}
            optimizationUplift={optimizationUplift}
          />

          {/* Campaign Quality Index */}
          <CampaignQuality campaigns={campaigns} />

          {/* Audit Score Trending */}
          <AuditTrending history={auditHistory} />

          {/* Dayparting Heatmap */}
          <DaypartingHeatmap daypartingData={daypartingData} />

          {/* Campaign Table with Impression Share */}
          <CampaignTable campaigns={campaigns} />
        </div>

        {/* Right sidebar: Action Timeline */}
        <div className="xl:col-span-4">
          <ActionTimeline
            actions={actions}
            onUndo={handleUndo}
          />
        </div>
      </div>

      {/* Scaling Opportunity Banner */}
      <ScalingOpportunity
        opportunity={selectedAccount?.audit_data?.scaling_opportunity || null}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify and commit**

Run: `npx next build` (or `npm run build`) — check for import errors and type issues.

```bash
git add app/agents/page.js
git commit -m "feat: rewrite Agent Controls page with all Phase 4 components"
```

---

## Task 12: Sidebar Navigation Update

Update the sidebar to show Agent Controls with an active agent count badge.

**Files:**
- Modify: `components/Sidebar.js`

- [ ] **Step 1: Read `components/Sidebar.js`**

Read the file. Find the `MANAGEMENT_NAV` array which currently has: Dashboard, Accounts, Agents, Brand Lab.

- [ ] **Step 2: Update Agent Controls nav entry**

Find the Agents entry in the nav array. It should look something like:

```js
{ label: 'Agents', icon: 'smart_toy', href: '/agents' },
```

Update it to include a badge slot:

```js
{ label: 'Agent Controls', icon: 'smart_toy', href: '/agents', badge: 'agents' },
```

Then in the nav link rendering, add badge display logic. Find the mapping of nav items and add after the label:

```js
{item.badge === 'agents' && (
  <span className="ml-auto text-label-sm text-secondary bg-secondary/15 px-1.5 py-0.5 rounded-full">
    AI
  </span>
)}
```

The exact code depends on the current sidebar structure — read the file first and make the minimal change to rename "Agents" to "Agent Controls" and add the badge.

- [ ] **Step 3: Commit**

```bash
git add components/Sidebar.js
git commit -m "feat: update sidebar nav — rename Agents to Agent Controls with AI badge"
```

---

## Task 13: Verification

**Files:**
- All files created/modified in Tasks 0-12

- [ ] **Step 1: Run all tests**

Run: `npx jest --verbose`
Expected: All tests pass, including the dayparting tests from Task 1/2.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Visual QA checklist**

Start dev server and navigate to `/agents`. Verify each item:

1. [ ] Header shows green dot + "Autonomous Layer Active" label
2. [ ] "Pause All Agents" ghost button visible
3. [ ] "+ Deploy New Agent" gradient button visible
4. [ ] Account selector dropdown (if multiple accounts)
5. [ ] Schedule button toggles ScheduleConfig panel
6. [ ] 7 agent cards in bento grid (4 across on xl)
7. [ ] Idle cards have 0.75 opacity
8. [ ] Running cards show animated pulse on badge
9. [ ] Alert cards show red badge + "Review Conflict" CTA
10. [ ] ScheduleConfig panel: 7 agents with toggle, frequency dropdown, guardrails inputs
11. [ ] 5 performance delta cards: CPL, Total Spend, Conversions, Budget Pacing, Avg CPC
12. [ ] Budget Pacing card shows progress bar + On Track/Overspending/Underspending label
13. [ ] 3 hero audit metrics: audit score (/100), wasted spend ($), AI uplift (%)
14. [ ] Campaign Quality Index: horizontal bars, color-coded green/blue/muted
15. [ ] Audit Score Trending: line chart with week labels, delta summary
16. [ ] Dayparting Heatmap: 7×24 grid, green cells for peaks, red for dead zones
17. [ ] Dayparting recommendations shown below heatmap
18. [ ] Campaign Table: all standard columns + Search IS, Top IS, Abs. Top IS
19. [ ] Impression share shows "—" when no Google Ads data connected
20. [ ] Action Timeline: colored dots per agent type, undo button, relative timestamps
21. [ ] Scaling Opportunity banner at bottom (dismiss button works)
22. [ ] Sidebar shows "Agent Controls" with AI badge

- [ ] **Step 4: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: Phase 4 verification fixes"
```

---

## Self-Review Notes

**Spec coverage:**
- Agent Controls page header (green dot, pause, deploy) — Task 11
- Agent Status Cards (7 types, 4-across, all states) — Task 6
- 3 hero audit metrics (score, wasted, uplift) — Task 6
- 5 boss-requested performance metrics (CPL, spend, conversions, pacing, CPC) — Task 7
- Campaign Quality Index (progress bars, color-coded) — Task 8
- Campaign Table with impression share (3 IS columns) — Task 8
- Impression share GAQL queries — Task 3
- Audit Score Trending (line chart, weekly) — Task 9
- Recent Agent Actions timeline (colored, undo) — Task 9
- Autonomous Scaling Opportunity banner — Task 9
- Dayparting intelligence (analysis module) — Tasks 1-2
- Dayparting heatmap visualization — Task 9
- Dayparting API route — Task 5
- Autonomous Scheduling (per account, 7 agents, configurable) — Task 10
- Per-account guardrails (budget caps, bid ceilings, excluded campaigns) — Task 10
- Sidebar nav update — Task 12
- Hourly GAQL query for dayparting data — Task 3

**Type consistency:** `AGENT_TYPES` / `AGENT_TYPE_KEYS` used consistently across AgentCards, ActionTimeline, ScheduleConfig, and agent-config.js. `daypartingData` shape from `analyzeDayparting()` matches `DaypartingHeatmap` props.

**GA4 architecture slot:** Not needed in Phase 4 per spec — that's Phase 3 (`lib/data-sources/index.js` already has the slot).
