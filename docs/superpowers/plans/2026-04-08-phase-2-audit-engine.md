# Phase 2: Audit Engine — Implementation Plan
**Date:** 2026-04-08
**Status:** Ready for implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn uploaded CSV data into a full, interactive account audit — computed n-gram analysis + AI-generated SWOT + prioritized action items + conversational chat panel. This is the first external demo milestone.

**Architecture:** Pure computation runs first (n-gram engine, keyword analysis, campaign analysis). Results stored in a new `report_analyses` table. SWOT + action items generated in a single Gemini call on demand. Conversational follow-up is stateless on the server — client sends full history + computed context each message.

**AI:** Gemini 2.5 Flash via existing `lib/gemini.js` (`callGemini` + `parseGeminiJSON`).

**Mode inheritance:** Lead gen vs. e-commerce is read from the account profile (set in Phase 1 settings). Affects metric labels, primary KPIs, SWOT framing, and action item categories throughout.

---

## File Map

**New files:**
- `lib/analysis/ngram.js` — `extractNgrams(text, n)`, `buildNgramTable(searchTermRows)`
- `lib/analysis/keywords.js` — `analyzeKeywords(keywordRows, searchTermRows, options)`
- `lib/analysis/campaigns.js` — `analyzeCampaigns(campaignRows, options)`
- `lib/analysis/index.js` — `runAudit(uploads, mode)` orchestrator
- `lib/prompts/swot.js` — Gemini prompt builder for SWOT + action items
- `app/api/reports/[accountId]/analyze/route.js` — POST: run analysis, store computed data
- `app/api/reports/[accountId]/swot/route.js` — POST: Gemini SWOT + action items
- `app/api/reports/[accountId]/chat/route.js` — POST: conversational follow-up
- `components/analysis/NgramTable.js` — sortable n-gram table with zero-conv flags
- `components/analysis/WastedSpend.js` — zero-conv theme breakdown grouped by top phrase
- `components/analysis/TopSpenders.js` — top 20 by spend, side-by-side spend/conv bars
- `components/analysis/CampaignRanking.js` — ROAS/CPA table with scaling badges
- `components/analysis/SwotPanel.js` — four-quadrant SWOT display, AI badge on each item
- `components/analysis/ActionItems.js` — prioritized list with confidence + category badges
- `components/analysis/AuditChat.js` — collapsible right-side chat panel
- `app/accounts/[id]/analysis/[analysisId]/page.js` — full audit results page
- `docs/migrations/003_report_analyses.sql` — DB migration

**Modified files:**
- `lib/supabase.js` — add `createReportAnalysis`, `getReportAnalysis`, `updateReportAnalysis`, `listReportAnalyses`
- `app/accounts/[id]/page.js` — Uploads tab: add multi-select + Run Analysis button + link to results
- `__tests__/analysis/ngram.test.js`
- `__tests__/analysis/keywords.test.js`
- `__tests__/analysis/campaigns.test.js`

---

## Task 0: Database Migration

**Files:**
- Create: `docs/migrations/003_report_analyses.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- docs/migrations/003_report_analyses.sql

-- Stores the full computed + AI-generated analysis for one or more uploads
CREATE TABLE IF NOT EXISTS report_analyses (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id      UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  upload_ids      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  mode            TEXT        NOT NULL DEFAULT 'lead_gen' CHECK (mode IN ('lead_gen', 'ecommerce')),
  computed_data   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  swot            JSONB,
  action_items    JSONB,
  data_sufficiency_warnings JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS report_analyses_account_id_idx ON report_analyses (account_id);
CREATE INDEX IF NOT EXISTS report_analyses_created_at_idx ON report_analyses (created_at DESC);
```

- [ ] **Step 2: Run migration in Supabase**

Supabase dashboard → SQL Editor → paste and run.

Expected: "Success. No rows returned."

- [ ] **Step 3: Commit**

```bash
git add docs/migrations/003_report_analyses.sql
git commit -m "feat: add report_analyses table for audit results"
```

---

## Task 1: Supabase CRUD for Analyses

**Files:**
- Modify: `lib/supabase.js`

- [ ] **Step 1: Append to lib/supabase.js**

```js
// ─── Report Analyses ──────────────────────────────────────────────

export async function createReportAnalysis(payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('report_analyses')
    .insert([{ ...payload, updated_at: new Date().toISOString() }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getReportAnalysis(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('report_analyses')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function updateReportAnalysis(id, payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('report_analyses')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listReportAnalyses(accountId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('report_analyses')
    .select('id, mode, upload_ids, created_at, data_sufficiency_warnings')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase.js
git commit -m "feat: add report analysis CRUD to supabase lib"
```

---

## Task 2: N-gram Engine

**Files:**
- Create: `lib/analysis/ngram.js`
- Create: `__tests__/analysis/ngram.test.js`

- [ ] **Step 1: Write failing tests**

```js
// __tests__/analysis/ngram.test.js
import { extractNgrams, buildNgramTable } from '../../lib/analysis/ngram';

describe('extractNgrams', () => {
  it('extracts 1-grams', () => {
    expect(extractNgrams('ac repair near me', 1)).toEqual(['ac', 'repair', 'near', 'me']);
  });

  it('extracts 2-grams', () => {
    expect(extractNgrams('ac repair near me', 2)).toEqual(['ac repair', 'repair near', 'near me']);
  });

  it('extracts 3-grams', () => {
    expect(extractNgrams('ac repair near me', 3)).toEqual(['ac repair near', 'repair near me']);
  });

  it('strips punctuation', () => {
    expect(extractNgrams('ac repair, near me!', 1)).toEqual(['ac', 'repair', 'near', 'me']);
  });

  it('lowercases', () => {
    expect(extractNgrams('AC Repair', 1)).toEqual(['ac', 'repair']);
  });

  it('returns empty array for short text', () => {
    expect(extractNgrams('ac', 2)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(extractNgrams('', 1)).toEqual([]);
  });
});

describe('buildNgramTable', () => {
  const rows = [
    { searchTerm: 'ac repair near me', cost: 40, clicks: 5, conversions: 1 },
    { searchTerm: 'ac repair cost',    cost: 30, clicks: 4, conversions: 0 },
    { searchTerm: 'hvac repair',       cost: 20, clicks: 3, conversions: 1 },
    { searchTerm: 'free ac repair',    cost: 10, clicks: 2, conversions: 0 },
  ];

  it('aggregates cost across all search terms containing "repair"', () => {
    const { table } = buildNgramTable(rows);
    const repair = table.find(r => r.phrase === 'repair');
    expect(repair).toBeDefined();
    expect(repair.cost).toBeCloseTo(100, 1); // all 4 rows contain "repair"
  });

  it('flags zero-conversion phrases', () => {
    const { table } = buildNgramTable(rows);
    const freeTerm = table.find(r => r.phrase === 'free');
    expect(freeTerm).toBeDefined();
    expect(freeTerm.isZeroConv).toBe(true);
  });

  it('calculates pctOfSpend', () => {
    const { table, totalCost } = buildNgramTable(rows);
    expect(totalCost).toBeCloseTo(100, 1);
    const repair = table.find(r => r.phrase === 'repair');
    expect(repair.pctOfSpend).toBeCloseTo(100, 0); // repair appears in all rows
  });

  it('sorts table by cost descending', () => {
    const { table } = buildNgramTable(rows);
    for (let i = 1; i < table.length; i++) {
      expect(table[i - 1].cost).toBeGreaterThanOrEqual(table[i].cost);
    }
  });

  it('calculates CPA only when conversions > 0', () => {
    const { table } = buildNgramTable(rows);
    const hvac = table.find(r => r.phrase === 'hvac');
    expect(hvac.cpa).toBeCloseTo(20, 1); // $20 cost / 1 conv
    const free = table.find(r => r.phrase === 'free');
    expect(free.cpa).toBeNull();
  });

  it('returns totalCost and accountAvgCpa', () => {
    const { totalCost, accountAvgCpa } = buildNgramTable(rows);
    expect(totalCost).toBeCloseTo(100, 1);
    expect(accountAvgCpa).toBeCloseTo(50, 1); // $100 total / 2 total conversions
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/analysis/ngram.test.js
```

Expected: FAIL — "Cannot find module '../../lib/analysis/ngram'"

- [ ] **Step 3: Implement lib/analysis/ngram.js**

```js
// lib/analysis/ngram.js

/**
 * Extract n-grams from a search term string.
 * Lowercases, strips punctuation, splits on whitespace.
 *
 * @param {string} text
 * @param {number} n - gram size (1, 2, or 3)
 * @returns {string[]}
 */
export function extractNgrams(text, n) {
  const tokens = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length < n) return [];

  const grams = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    grams.push(tokens.slice(i, i + n).join(' '));
  }
  return grams;
}

/**
 * Build a cost-sorted n-gram aggregation table from search term rows.
 *
 * @param {Array<{searchTerm, cost, clicks, conversions}>} searchTermRows
 * @param {{ maxN?: number }} options
 * @returns {{ table: NgramEntry[], totalCost: number, accountAvgCpa: number }}
 */
export function buildNgramTable(searchTermRows, { maxN = 3 } = {}) {
  const map = new Map(); // phrase → { n, cost, clicks, conversions }

  const totalCost = searchTermRows.reduce((s, r) => s + (r.cost || 0), 0);
  const totalConversions = searchTermRows.reduce((s, r) => s + (r.conversions || 0), 0);
  const accountAvgCpa = totalConversions > 0 ? totalCost / totalConversions : Infinity;

  for (const row of searchTermRows) {
    const { searchTerm, cost = 0, clicks = 0, conversions = 0 } = row;
    if (!searchTerm) continue;

    for (let n = 1; n <= maxN; n++) {
      for (const phrase of extractNgrams(searchTerm, n)) {
        const existing = map.get(phrase) || { n, cost: 0, clicks: 0, conversions: 0 };
        map.set(phrase, {
          n: existing.n,
          cost: existing.cost + cost,
          clicks: existing.clicks + clicks,
          conversions: existing.conversions + conversions,
        });
      }
    }
  }

  const table = Array.from(map.entries())
    .map(([phrase, { n, cost, clicks, conversions }]) => {
      const cpa = conversions > 0 ? cost / conversions : null;
      return {
        phrase,
        n,
        cost:          Math.round(cost * 100) / 100,
        clicks,
        conversions,
        cpa:           cpa !== null ? Math.round(cpa * 100) / 100 : null,
        pctOfSpend:    totalCost > 0 ? Math.round((cost / totalCost) * 10000) / 100 : 0,
        isZeroConv:    conversions === 0 && cost > 0,
        isAboveAvgCpa: cpa !== null && isFinite(accountAvgCpa) && cpa > accountAvgCpa,
      };
    })
    .sort((a, b) => b.cost - a.cost);

  return { table, totalCost: Math.round(totalCost * 100) / 100, accountAvgCpa };
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/analysis/ngram.test.js
```

Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/analysis/ngram.js __tests__/analysis/ngram.test.js
git commit -m "feat: n-gram extraction and aggregation engine"
```

---

## Task 3: Keyword Analysis

**Files:**
- Create: `lib/analysis/keywords.js`
- Create: `__tests__/analysis/keywords.test.js`

- [ ] **Step 1: Write failing tests**

```js
// __tests__/analysis/keywords.test.js
import { analyzeKeywords } from '../../lib/analysis/keywords';

const makeKeyword = (overrides = {}) => ({
  keyword: 'ac repair', matchType: 'phrase', campaign: 'HVAC', adGroup: 'AC',
  clicks: 10, cost: 50, conversions: 2, conversionValue: 300, ctr: 5, avgCpc: 5, qualityScore: 7,
  ...overrides,
});

const makeTerm = (overrides = {}) => ({
  searchTerm: 'ac repair near me', campaign: 'HVAC', adGroup: 'AC', matchType: 'phrase',
  clicks: 5, cost: 25, conversions: 1, conversionValue: 150,
  ...overrides,
});

describe('analyzeKeywords', () => {
  it('identifies zero-conversion keywords', () => {
    const kws = [makeKeyword(), makeKeyword({ keyword: 'diy ac fix', cost: 30, conversions: 0 })];
    const { zeroConvKeywords } = analyzeKeywords(kws, []);
    expect(zeroConvKeywords).toHaveLength(1);
    expect(zeroConvKeywords[0].keyword).toBe('diy ac fix');
  });

  it('excludes zero-cost keywords from zero-conv list', () => {
    const kws = [makeKeyword({ cost: 0, conversions: 0 })];
    const { zeroConvKeywords } = analyzeKeywords(kws, []);
    expect(zeroConvKeywords).toHaveLength(0);
  });

  it('calculates totalWastedOnKeywords', () => {
    const kws = [
      makeKeyword({ cost: 50, conversions: 2 }),
      makeKeyword({ keyword: 'free repair', cost: 30, conversions: 0 }),
    ];
    const { totalWastedOnKeywords } = analyzeKeywords(kws, []);
    expect(totalWastedOnKeywords).toBe(30);
  });

  it('calculates totalWastedOnTerms from search terms', () => {
    const terms = [
      makeTerm({ cost: 25, conversions: 1 }),
      makeTerm({ searchTerm: 'how to fix ac', cost: 15, conversions: 0 }),
    ];
    const { totalWastedOnTerms } = analyzeKeywords([], terms);
    expect(totalWastedOnTerms).toBe(15);
  });

  it('returns topSpenders sorted by cost descending', () => {
    const kws = [
      makeKeyword({ keyword: 'cheap', cost: 10 }),
      makeKeyword({ keyword: 'expensive', cost: 200 }),
      makeKeyword({ keyword: 'medium', cost: 50 }),
    ];
    const { topSpenders } = analyzeKeywords(kws, []);
    expect(topSpenders[0].keyword).toBe('expensive');
    expect(topSpenders[1].keyword).toBe('medium');
  });

  it('flags high-cost zero-conv terms as negative gaps', () => {
    const terms = [
      makeTerm({ searchTerm: 'normal term', cost: 10, conversions: 1 }),
      makeTerm({ searchTerm: 'diy repair', cost: 100, conversions: 0 }), // 10x avg → gap
    ];
    const { negativeGaps } = analyzeKeywords([], terms);
    expect(negativeGaps.some(g => g.term === 'diy repair')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest __tests__/analysis/keywords.test.js
```

- [ ] **Step 3: Implement lib/analysis/keywords.js**

```js
// lib/analysis/keywords.js

/**
 * Analyze keyword and search term rows.
 *
 * @param {object[]} keywordRows - from keyword parser
 * @param {object[]} searchTermRows - from search terms parser
 * @param {{ mode?: string }} options
 * @returns {{ zeroConvKeywords, zeroConvTerms, totalWastedOnKeywords, totalWastedOnTerms,
 *             topSpenders, negativeGaps }}
 */
export function analyzeKeywords(keywordRows, searchTermRows, { mode = 'lead_gen' } = {}) {
  // Zero-converting keywords (cost > 0, no conversions)
  const zeroConvKeywords = keywordRows
    .filter(k => k.cost > 0 && k.conversions === 0)
    .sort((a, b) => b.cost - a.cost);

  const totalWastedOnKeywords = Math.round(
    zeroConvKeywords.reduce((s, k) => s + k.cost, 0) * 100
  ) / 100;

  // Zero-converting search terms
  const zeroConvTerms = searchTermRows
    .filter(t => t.cost > 0 && t.conversions === 0)
    .sort((a, b) => b.cost - a.cost);

  const totalWastedOnTerms = Math.round(
    zeroConvTerms.reduce((s, t) => s + t.cost, 0) * 100
  ) / 100;

  // Top 20 keywords by cost
  const topSpenders = [...keywordRows]
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 20);

  // Negative keyword gaps: zero-conv terms with cost > 2x average term cost
  const avgTermCost = searchTermRows.length > 0
    ? searchTermRows.reduce((s, t) => s + t.cost, 0) / searchTermRows.length
    : 0;

  const negativeGaps = zeroConvTerms
    .filter(t => t.cost > Math.max(avgTermCost * 2, 1)) // at least 2x avg, min $1
    .slice(0, 20)
    .map(t => ({ term: t.searchTerm, cost: t.cost, clicks: t.clicks }));

  return {
    zeroConvKeywords,
    zeroConvTerms,
    totalWastedOnKeywords,
    totalWastedOnTerms,
    topSpenders,
    negativeGaps,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/analysis/keywords.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/analysis/keywords.js __tests__/analysis/keywords.test.js
git commit -m "feat: keyword + search term analysis (zero-conv, wasted spend, negative gaps)"
```

---

## Task 4: Campaign Analysis

**Files:**
- Create: `lib/analysis/campaigns.js`
- Create: `__tests__/analysis/campaigns.test.js`

- [ ] **Step 1: Write failing tests**

```js
// __tests__/analysis/campaigns.test.js
import { analyzeCampaigns } from '../../lib/analysis/campaigns';

const makeCampaign = (overrides = {}) => ({
  campaign: 'HVAC Search', campaignType: 'search', status: 'enabled',
  budget: 50, impressions: 3000, clicks: 150, cost: 400,
  conversions: 8, conversionValue: 1200, roas: 3.0, cpa: 50,
  ...overrides,
});

describe('analyzeCampaigns', () => {
  it('ranks campaigns by CPA ascending in lead gen mode', () => {
    const campaigns = [
      makeCampaign({ campaign: 'C1', cost: 300, conversions: 6, cpa: 50 }),
      makeCampaign({ campaign: 'C2', cost: 400, conversions: 4, cpa: 100 }),
      makeCampaign({ campaign: 'C3', cost: 200, conversions: 8, cpa: 25 }),
    ];
    const { rankedCampaigns } = analyzeCampaigns(campaigns, { mode: 'lead_gen' });
    expect(rankedCampaigns[0].campaign).toBe('C3'); // lowest CPA first
    expect(rankedCampaigns[1].campaign).toBe('C1');
    expect(rankedCampaigns[2].campaign).toBe('C2');
  });

  it('ranks campaigns by ROAS descending in ecommerce mode', () => {
    const campaigns = [
      makeCampaign({ campaign: 'C1', roas: 2.0 }),
      makeCampaign({ campaign: 'C2', roas: 5.0 }),
      makeCampaign({ campaign: 'C3', roas: 3.5 }),
    ];
    const { rankedCampaigns } = analyzeCampaigns(campaigns, { mode: 'ecommerce' });
    expect(rankedCampaigns[0].campaign).toBe('C2'); // highest ROAS first
  });

  it('identifies ready-to-scale campaigns (below avg CPA in lead gen)', () => {
    const campaigns = [
      makeCampaign({ campaign: 'Winner', cost: 100, conversions: 5, cpa: 20 }),  // CPA 20
      makeCampaign({ campaign: 'Loser',  cost: 300, conversions: 2, cpa: 150 }), // CPA 150
    ];
    // avgCpa = (100+300)/(5+2) = 57
    const { readyToScale } = analyzeCampaigns(campaigns, { mode: 'lead_gen' });
    expect(readyToScale).toHaveLength(1);
    expect(readyToScale[0].campaign).toBe('Winner');
  });

  it('identifies underperformers (zero conversions with cost > 0 in lead gen)', () => {
    const campaigns = [
      makeCampaign({ campaign: 'Good', conversions: 5 }),
      makeCampaign({ campaign: 'Dead', conversions: 0, cost: 200 }),
    ];
    const { underperformers } = analyzeCampaigns(campaigns, { mode: 'lead_gen' });
    expect(underperformers.some(c => c.campaign === 'Dead')).toBe(true);
  });

  it('returns correct totalSpend and avgCpa', () => {
    const campaigns = [
      makeCampaign({ cost: 200, conversions: 4 }),
      makeCampaign({ cost: 300, conversions: 6 }),
    ];
    const { totalSpend, avgCpa } = analyzeCampaigns(campaigns, { mode: 'lead_gen' });
    expect(totalSpend).toBe(500);
    expect(avgCpa).toBe(50); // 500 / 10
  });

  it('returns avgRoas for ecommerce mode', () => {
    const campaigns = [
      makeCampaign({ cost: 100, conversionValue: 400 }), // roas 4
      makeCampaign({ cost: 100, conversionValue: 200 }), // roas 2
    ];
    const { avgRoas } = analyzeCampaigns(campaigns, { mode: 'ecommerce' });
    expect(avgRoas).toBe(3); // 600/200
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest __tests__/analysis/campaigns.test.js
```

- [ ] **Step 3: Implement lib/analysis/campaigns.js**

```js
// lib/analysis/campaigns.js

/**
 * Analyze campaign performance rows.
 *
 * @param {object[]} campaignRows - from campaign parser
 * @param {{ mode?: string }} options
 * @returns {{ rankedCampaigns, readyToScale, underperformers, totalSpend, avgCpa, avgRoas }}
 */
export function analyzeCampaigns(campaignRows, { mode = 'lead_gen' } = {}) {
  const totalSpend = Math.round(
    campaignRows.reduce((s, c) => s + (c.cost || 0), 0) * 100
  ) / 100;

  const totalConversions = campaignRows.reduce((s, c) => s + (c.conversions || 0), 0);
  const totalConvValue   = campaignRows.reduce((s, c) => s + (c.conversionValue || 0), 0);

  const avgCpa  = totalConversions > 0 ? Math.round((totalSpend / totalConversions) * 100) / 100 : null;
  const avgRoas = totalSpend > 0       ? Math.round((totalConvValue / totalSpend) * 100) / 100 : null;

  // Sort by primary metric
  const rankedCampaigns = [...campaignRows].sort((a, b) => {
    if (mode === 'ecommerce') {
      return (b.roas || 0) - (a.roas || 0);
    }
    // Lead gen: ascending CPA. Zero-conv campaigns go last.
    if (a.conversions === 0 && b.conversions === 0) return (b.cost || 0) - (a.cost || 0);
    if (a.conversions === 0) return 1;
    if (b.conversions === 0) return -1;
    return (a.cpa || 0) - (b.cpa || 0);
  });

  // Ready to scale: performing better than account average
  const readyToScale = rankedCampaigns.filter(c => {
    if (mode === 'ecommerce') return avgRoas !== null && (c.roas || 0) > avgRoas;
    return avgCpa !== null && c.conversions > 0 && (c.cpa || 0) < avgCpa;
  });

  // Underperformers: campaigns burning money without conversions
  const underperformers = rankedCampaigns.filter(c => {
    if (mode === 'ecommerce') return avgRoas !== null && (c.roas || 0) < avgRoas * 0.5 && (c.cost || 0) > 0;
    return c.conversions === 0 && (c.cost || 0) > 0;
  });

  return { rankedCampaigns, readyToScale, underperformers, totalSpend, avgCpa, avgRoas };
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/analysis/campaigns.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/analysis/campaigns.js __tests__/analysis/campaigns.test.js
git commit -m "feat: campaign analysis with ROAS ranking and ready-to-scale detection"
```

---

## Task 5: Audit Orchestrator

**Files:**
- Create: `lib/analysis/index.js`

- [ ] **Step 1: Create the orchestrator**

```js
// lib/analysis/index.js
import { buildNgramTable } from './ngram.js';
import { analyzeKeywords } from './keywords.js';
import { analyzeCampaigns } from './campaigns.js';

/**
 * Run the full computed audit on a set of uploads.
 *
 * @param {Array<{ report_type, raw_data, date_range_start, date_range_end }>} uploads
 * @param {string} mode - 'lead_gen' | 'ecommerce'
 * @returns {object} computedData — stored in report_analyses.computed_data
 */
export function runAudit(uploads, mode = 'lead_gen') {
  // Separate uploads by type
  const byType = { keyword: [], search_terms: [], campaign: [], product: [] };
  for (const upload of uploads) {
    const rows = Array.isArray(upload.raw_data) ? upload.raw_data : [];
    if (byType[upload.report_type]) {
      byType[upload.report_type].push(...rows);
    }
  }

  const searchTermRows = byType.search_terms;
  const keywordRows    = byType.keyword;
  const campaignRows   = byType.campaign;

  // N-gram analysis (search terms required)
  const ngramResult = searchTermRows.length > 0
    ? buildNgramTable(searchTermRows)
    : { table: [], totalCost: 0, accountAvgCpa: null };

  // Keyword + search term analysis
  const keywordsResult = analyzeKeywords(keywordRows, searchTermRows, { mode });

  // Campaign analysis
  const campaignsResult = campaignRows.length > 0
    ? analyzeCampaigns(campaignRows, { mode })
    : { rankedCampaigns: [], readyToScale: [], underperformers: [], totalSpend: 0, avgCpa: null, avgRoas: null };

  // Account-level summary
  const totalSpend = campaignsResult.totalSpend ||
    [...keywordRows, ...searchTermRows].reduce((s, r) => s + (r.cost || 0), 0);
  const totalConversions = campaignRows.length > 0
    ? campaignRows.reduce((s, c) => s + (c.conversions || 0), 0)
    : keywordRows.reduce((s, k) => s + (k.conversions || 0), 0);
  const totalWasted = keywordsResult.totalWastedOnKeywords + keywordsResult.totalWastedOnTerms;

  // Data sufficiency warnings
  const dataSufficiencyWarnings = [];

  // Date range check
  const allDates = uploads
    .filter(u => u.date_range_start && u.date_range_end)
    .map(u => ({
      start: new Date(u.date_range_start),
      end:   new Date(u.date_range_end),
    }));

  if (allDates.length > 0) {
    const minStart = new Date(Math.min(...allDates.map(d => d.start)));
    const maxEnd   = new Date(Math.max(...allDates.map(d => d.end)));
    const days     = Math.round((maxEnd - minStart) / (1000 * 60 * 60 * 24));
    if (days < 14) {
      dataSufficiencyWarnings.push(
        `Short date window (${days} days) — recommendations may not reflect seasonal patterns. 14+ days recommended.`
      );
    }
  }

  if (totalConversions < 30) {
    dataSufficiencyWarnings.push(
      `Low conversion volume (${totalConversions} total) — statistical significance is limited. 30+ conversions recommended.`
    );
  }

  return {
    mode,
    summary: {
      totalSpend:      Math.round(totalSpend * 100) / 100,
      totalConversions,
      avgCpa:          campaignsResult.avgCpa,
      avgRoas:         campaignsResult.avgRoas,
      totalWasted:     Math.round(totalWasted * 100) / 100,
      wastedPct:       totalSpend > 0 ? Math.round((totalWasted / totalSpend) * 10000) / 100 : 0,
      keywordCount:    keywordRows.length,
      searchTermCount: searchTermRows.length,
      campaignCount:   campaignRows.length,
    },
    ngrams:    ngramResult,
    keywords:  keywordsResult,
    campaigns: campaignsResult,
    dataSufficiencyWarnings,
  };
}
```

- [ ] **Step 2: Verify all analysis tests still pass**

```bash
npx jest __tests__/analysis/
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/analysis/index.js
git commit -m "feat: runAudit orchestrator combining n-gram, keyword, and campaign analysis"
```

---

## Task 6: SWOT Prompt Builder

**Files:**
- Create: `lib/prompts/swot.js`

- [ ] **Step 1: Create the prompt builder**

```js
// lib/prompts/swot.js

/**
 * Build the Gemini prompt for SWOT + action items from computed audit data.
 *
 * @param {object} computedData - output of runAudit()
 * @returns {string} prompt string
 */
export function buildSwotPrompt(computedData) {
  const { mode, summary, ngrams, keywords, campaigns } = computedData;
  const isEcom = mode === 'ecommerce';
  const primaryMetric = isEcom ? 'ROAS' : 'CPA';

  // Top 15 n-gram themes by spend
  const topNgrams = (ngrams.table || []).slice(0, 15).map((r, i) => {
    const cpaStr = r.cpa !== null ? `${primaryMetric}: $${r.cpa}` : '0 conv';
    const flag = r.isZeroConv ? ' ← ZERO CONV' : r.isAboveAvgCpa ? ' ← HIGH COST' : '';
    return `  ${i + 1}. "${r.phrase}" — $${r.cost} spend, ${r.conversions} conv, ${cpaStr}${flag}`;
  }).join('\n');

  // Zero-conv themes (top 10 by cost)
  const wastedThemes = (keywords.zeroConvTerms || []).slice(0, 10).map(t =>
    `  - "${t.searchTerm}" — $${t.cost} wasted`
  ).join('\n');

  // Campaign rankings (top 8)
  const campaignList = (campaigns.rankedCampaigns || []).slice(0, 8).map((c, i) => {
    const metric = isEcom ? `ROAS: ${c.roas}` : `CPA: $${c.cpa}`;
    const tag = campaigns.readyToScale?.some(s => s.campaign === c.campaign) ? ' ← SCALE' :
                campaigns.underperformers?.some(u => u.campaign === c.campaign) ? ' ← UNDERPERFORMING' : '';
    return `  ${i + 1}. ${c.campaign} — $${c.cost} spend, ${c.conversions} conv, ${metric}${tag}`;
  }).join('\n');

  return `You are a senior PPC account strategist. Analyze this Google Ads account data and generate a SWOT analysis plus prioritized action items.

ACCOUNT MODE: ${isEcom ? 'E-Commerce (optimize for ROAS, purchases)' : 'Lead Generation (optimize for CPA, calls & form fills)'}

ACCOUNT SUMMARY:
- Total Spend: $${summary.totalSpend}
- Total Conversions: ${summary.totalConversions}
- Average ${primaryMetric}: ${isEcom ? summary.avgRoas : '$' + summary.avgCpa}
- Wasted Spend (zero-conversion): $${summary.totalWasted} (${summary.wastedPct}% of total)
- Keywords analyzed: ${summary.keywordCount}
- Search terms analyzed: ${summary.searchTermCount}
- Campaigns: ${summary.campaignCount}

TOP N-GRAM THEMES BY SPEND:
${topNgrams || '  (no search term data)'}

ZERO-CONVERTING SEARCH TERMS (wasted spend sample):
${wastedThemes || '  (none found)'}

CAMPAIGN PERFORMANCE (ranked by ${primaryMetric}):
${campaignList || '  (no campaign data)'}

NEGATIVE KEYWORD GAPS (high-cost zero-conv terms flagged for review):
${(keywords.negativeGaps || []).slice(0, 8).map(g => `  - "${g.term}" — $${g.cost}`).join('\n') || '  (none identified)'}

Return ONLY valid JSON with this exact structure. No markdown, no explanation outside the JSON:
{
  "swot": {
    "strengths":     [{"title": "...", "detail": "...", "dataPoint": "..."}],
    "weaknesses":    [{"title": "...", "detail": "...", "dataPoint": "..."}],
    "opportunities": [{"title": "...", "detail": "...", "dataPoint": "..."}],
    "threats":       [{"title": "...", "detail": "...", "dataPoint": "..."}]
  },
  "actionItems": [
    {
      "description":    "...",
      "rationale":      "Reference specific data: term, cost, metric",
      "confidence":     "HIGH",
      "category":       "NEGATIVE_KEYWORD",
      "estimatedImpact":"..."
    }
  ]
}

Rules:
- Each SWOT quadrant: 2–4 items. No padding.
- Action items: 5–10, sorted by estimated impact (highest first).
- confidence: HIGH = 50+ data points, MEDIUM = 10–49, LOW = < 10
- category: NEGATIVE_KEYWORD | PAUSE_KEYWORD | SCALE_BUDGET | RESTRUCTURE | BID_ADJUSTMENT
- dataPoint: always cite a specific number from the data above (e.g. "$340 on zero-converting terms")
- Weaknesses and action items must be grounded in the data — no generic PPC advice`;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/prompts/swot.js
git commit -m "feat: SWOT + action items prompt builder"
```

---

## Task 7: API Routes

**Files:**
- Create: `app/api/reports/[accountId]/analyze/route.js`
- Create: `app/api/reports/[accountId]/swot/route.js`
- Create: `app/api/reports/[accountId]/chat/route.js`

- [ ] **Step 1: Create analyze route**

```js
// app/api/reports/[accountId]/analyze/route.js
import { NextResponse } from 'next/server';
import { getReportUpload, createReportAnalysis, getAccount } from '@/lib/supabase';
import { runAudit } from '@/lib/analysis/index';

export async function POST(request, { params }) {
  const { accountId } = await params;
  try {
    const { uploadIds } = await request.json();

    if (!Array.isArray(uploadIds) || uploadIds.length === 0) {
      return NextResponse.json({ error: 'uploadIds must be a non-empty array' }, { status: 400 });
    }

    // Fetch uploads and account mode in parallel
    const [uploads, account] = await Promise.all([
      Promise.all(uploadIds.map(id => getReportUpload(id))),
      getAccount(accountId),
    ]);

    const validUploads = uploads.filter(Boolean);
    if (validUploads.length === 0) {
      return NextResponse.json({ error: 'No valid uploads found for provided IDs' }, { status: 404 });
    }

    const mode = account?.mode || 'lead_gen';

    // Run pure computation (no AI)
    const computedData = runAudit(validUploads, mode);

    // Store result
    const analysis = await createReportAnalysis({
      account_id:               accountId,
      upload_ids:               uploadIds,
      mode,
      computed_data:            computedData,
      data_sufficiency_warnings: computedData.dataSufficiencyWarnings,
    });

    return NextResponse.json({
      analysisId: analysis?.id,
      mode,
      summary:    computedData.summary,
      warnings:   computedData.dataSufficiencyWarnings,
    });
  } catch (err) {
    console.error('[reports/analyze] Error:', err);
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create SWOT route**

```js
// app/api/reports/[accountId]/swot/route.js
import { NextResponse } from 'next/server';
import { getReportAnalysis, updateReportAnalysis } from '@/lib/supabase';
import { callGemini, parseGeminiJSON } from '@/lib/gemini';
import { buildSwotPrompt } from '@/lib/prompts/swot';

export async function POST(request, { params }) {
  const { accountId } = await params;
  try {
    const { analysisId } = await request.json();

    if (!analysisId) {
      return NextResponse.json({ error: 'analysisId is required' }, { status: 400 });
    }

    const analysis = await getReportAnalysis(analysisId);
    if (!analysis || analysis.account_id !== accountId) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // If already generated, return cached
    if (analysis.swot) {
      return NextResponse.json({ swot: analysis.swot, actionItems: analysis.action_items });
    }

    const prompt = buildSwotPrompt(analysis.computed_data);

    const raw = await callGemini(process.env.GEMINI_API_KEY, prompt, {
      temperature: 0.3,
      maxTokens: 8192,
      thinkingBudget: 2048,
    });

    const parsed = parseGeminiJSON(raw);
    const { swot, actionItems } = parsed;

    // Cache on analysis record
    await updateReportAnalysis(analysisId, {
      swot,
      action_items: actionItems,
    });

    return NextResponse.json({ swot, actionItems });
  } catch (err) {
    console.error('[reports/swot] Error:', err);
    return NextResponse.json({ error: err.message || 'SWOT generation failed' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create chat route**

```js
// app/api/reports/[accountId]/chat/route.js
import { NextResponse } from 'next/server';
import { getReportAnalysis } from '@/lib/supabase';
import { callGemini, parseGeminiJSON } from '@/lib/gemini';

const SYSTEM_PROMPT = (mode, summary) => `You are an expert PPC account analyst. You're analyzing a Google Ads account in ${mode === 'ecommerce' ? 'e-commerce (ROAS-focused)' : 'lead generation (CPA-focused)'} mode.

Account summary: $${summary?.totalSpend} total spend, ${summary?.totalConversions} conversions, ${mode === 'ecommerce' ? 'avg ROAS ' + summary?.avgRoas : 'avg CPA $' + summary?.avgCpa}, $${summary?.totalWasted} wasted (${summary?.wastedPct}% of total).

You have the full computed analysis (n-gram table, keyword analysis, campaign data) as context. Answer questions precisely, cite specific numbers from the data, and give actionable recommendations. When the user asks about a specific term or theme, pull the exact data point. Keep responses concise — 2-4 sentences for simple questions, structured lists for complex ones.

Return JSON: {"response": "your answer here"}`;

export async function POST(request, { params }) {
  const { accountId } = await params;
  try {
    const { analysisId, messages, focusContext } = await request.json();

    if (!analysisId) {
      return NextResponse.json({ error: 'analysisId is required' }, { status: 400 });
    }

    const analysis = await getReportAnalysis(analysisId);
    if (!analysis || analysis.account_id !== accountId) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    const { computed_data: data, mode } = analysis;

    // Build context — compact summary of computed data (keep tokens manageable)
    const contextBlock = JSON.stringify({
      summary:  data.summary,
      topNgrams: (data.ngrams?.table || []).slice(0, 30),
      wastedTerms: (data.keywords?.zeroConvTerms || []).slice(0, 20),
      topSpenders: (data.keywords?.topSpenders || []).slice(0, 15),
      negativeGaps: data.keywords?.negativeGaps || [],
      campaigns: data.campaigns?.rankedCampaigns || [],
      swot: analysis.swot || null,
      actionItems: analysis.action_items || null,
    });

    const focusLine = focusContext
      ? `\n\nUSER IS FOCUSED ON: ${JSON.stringify(focusContext)}`
      : '';

    const systemMsg = SYSTEM_PROMPT(mode, data.summary) +
      `\n\nFULL COMPUTED DATA:\n${contextBlock}` +
      focusLine;

    // Build message history for Gemini
    const conversationHistory = (messages || [])
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `${systemMsg}\n\nCONVERSATION:\n${conversationHistory}\n\nRespond with JSON: {"response": "..."}`;

    const raw = await callGemini(process.env.GEMINI_API_KEY, prompt, {
      temperature: 0.4,
      maxTokens: 2048,
      thinkingBudget: 512,
    });

    const parsed = parseGeminiJSON(raw);
    return NextResponse.json({ response: parsed.response || raw });
  } catch (err) {
    console.error('[reports/chat] Error:', err);
    return NextResponse.json({ error: err.message || 'Chat failed' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/reports/[accountId]/analyze/route.js \
        app/api/reports/[accountId]/swot/route.js \
        app/api/reports/[accountId]/chat/route.js
git commit -m "feat: analyze, SWOT, and chat API routes"
```

---

## Task 8: UI Components

**Files:**
- Create: `components/analysis/NgramTable.js`
- Create: `components/analysis/WastedSpend.js`
- Create: `components/analysis/CampaignRanking.js`
- Create: `components/analysis/SwotPanel.js`
- Create: `components/analysis/ActionItems.js`
- Create: `components/analysis/AuditChat.js`

- [ ] **Step 1: NgramTable.js**

```jsx
// components/analysis/NgramTable.js
'use client';

import { useState, useMemo } from 'react';

const N_FILTERS = [
  { label: 'All', value: 0 },
  { label: '1-word', value: 1 },
  { label: '2-word', value: 2 },
  { label: '3-word', value: 3 },
];

const SORT_COLS = ['cost', 'conversions', 'cpa', 'pctOfSpend'];

export default function NgramTable({ table = [], accountAvgCpa, mode = 'lead_gen', onRowClick }) {
  const [nFilter, setNFilter] = useState(0);
  const [sortCol, setSortCol] = useState('cost');
  const [sortAsc, setSortAsc] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    let rows = nFilter === 0 ? table : table.filter(r => r.n === nFilter);
    rows = [...rows].sort((a, b) => {
      const av = a[sortCol] ?? -1;
      const bv = b[sortCol] ?? -1;
      return sortAsc ? av - bv : bv - av;
    });
    return showAll ? rows : rows.slice(0, 50);
  }, [table, nFilter, sortCol, sortAsc, showAll]);

  const totalRows = nFilter === 0 ? table.length : table.filter(r => r.n === nFilter).length;

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(p => !p);
    else { setSortCol(col); setSortAsc(false); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <span className="text-surface-high ml-0.5">↕</span>;
    return <span className="text-primary ml-0.5">{sortAsc ? '↑' : '↓'}</span>;
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-2 mb-3">
        {N_FILTERS.map(f => (
          <button key={f.value} onClick={() => setNFilter(f.value)}
            className={`text-xs font-label font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              nFilter === f.value ? 'bg-primary text-white' : 'bg-surface-low text-secondary hover:text-on-surface'
            }`}>
            {f.label}
          </button>
        ))}
        <span className="text-xs text-secondary font-label ml-auto">{totalRows.toLocaleString()} phrases</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline-variant/15">
        <table className="w-full text-xs font-label">
          <thead>
            <tr className="border-b border-outline-variant/15 text-left">
              <th className="px-3 py-2.5 text-secondary font-semibold w-8">n</th>
              <th className="px-3 py-2.5 text-secondary font-semibold">Phrase</th>
              {['cost', 'conversions', 'cpa', 'pctOfSpend'].map(col => (
                <th key={col} onClick={() => handleSort(col)}
                  className="px-3 py-2.5 text-secondary font-semibold cursor-pointer hover:text-on-surface text-right whitespace-nowrap">
                  {col === 'pctOfSpend' ? '% spend' : col === 'cpa' ? (mode === 'ecommerce' ? 'ROAS' : 'CPA') : col}
                  <SortIcon col={col} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={`${row.phrase}-${i}`}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-outline-variant/10 transition-colors cursor-pointer hover:bg-surface-low ${
                  row.isZeroConv ? 'bg-red-50/40' : row.isAboveAvgCpa ? 'bg-amber-50/40' : ''
                }`}>
                <td className="px-3 py-2 text-secondary">{row.n}</td>
                <td className="px-3 py-2 text-on-surface font-medium">
                  {row.phrase}
                  {row.isZeroConv && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">ZERO CONV</span>
                  )}
                  {!row.isZeroConv && row.isAboveAvgCpa && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">HIGH COST</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-on-surface">${row.cost.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-on-surface">{row.conversions}</td>
                <td className="px-3 py-2 text-right text-on-surface">{row.cpa !== null ? `$${row.cpa}` : '—'}</td>
                <td className="px-3 py-2 text-right text-secondary">{row.pctOfSpend}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!showAll && totalRows > 50 && (
        <button onClick={() => setShowAll(true)}
          className="mt-2 text-xs font-label text-secondary hover:text-primary">
          Show all {totalRows.toLocaleString()} phrases →
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: WastedSpend.js**

```jsx
// components/analysis/WastedSpend.js
'use client';

export default function WastedSpend({ keywords = [], terms = [], totalWastedOnKeywords = 0, totalWastedOnTerms = 0, onTermClick }) {
  const totalWasted = totalWastedOnKeywords + totalWastedOnTerms;

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center gap-4">
        <span className="material-symbols-outlined text-red-500 text-[28px]">money_off</span>
        <div>
          <p className="font-headline font-bold text-red-700 text-lg">${totalWasted.toLocaleString(undefined, { maximumFractionDigits: 0 })} wasted</p>
          <p className="text-xs text-red-600 font-label">
            ${totalWastedOnKeywords.toLocaleString(undefined, { maximumFractionDigits: 0 })} on zero-converting keywords
            {totalWastedOnTerms > 0 && ` · $${totalWastedOnTerms.toLocaleString(undefined, { maximumFractionDigits: 0 })} on zero-converting search terms`}
          </p>
        </div>
      </div>

      {/* Top wasted search terms */}
      {terms.length > 0 && (
        <div>
          <p className="font-label font-semibold text-on-surface text-sm mb-2">Top Zero-Converting Search Terms</p>
          <div className="space-y-1">
            {terms.slice(0, 15).map((t, i) => (
              <div key={i}
                onClick={() => onTermClick?.(t)}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-low hover:bg-red-50 cursor-pointer transition-colors">
                <span className="text-sm font-label text-on-surface">{t.searchTerm}</span>
                <div className="flex items-center gap-4 text-xs text-secondary font-label">
                  <span>{t.clicks} clicks</span>
                  <span className="font-semibold text-red-600">${t.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })} wasted</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top wasted keywords */}
      {keywords.length > 0 && (
        <div>
          <p className="font-label font-semibold text-on-surface text-sm mb-2">Zero-Converting Keywords</p>
          <div className="space-y-1">
            {keywords.slice(0, 10).map((k, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-low">
                <div>
                  <span className="text-sm font-label text-on-surface">{k.keyword}</span>
                  <span className="ml-2 text-[10px] text-secondary font-label capitalize">{k.matchType}</span>
                </div>
                <span className="text-xs font-semibold font-label text-red-600">
                  ${k.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })} wasted
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: CampaignRanking.js**

```jsx
// components/analysis/CampaignRanking.js
'use client';

export default function CampaignRanking({ campaigns = [], readyToScale = [], underperformers = [], mode = 'lead_gen', avgCpa, avgRoas }) {
  const primaryLabel = mode === 'ecommerce' ? 'ROAS' : 'CPA';

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {readyToScale.length > 0 && (
          <span className="text-xs font-label font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">
            {readyToScale.length} ready to scale
          </span>
        )}
        {underperformers.length > 0 && (
          <span className="text-xs font-label font-semibold px-3 py-1.5 rounded-full bg-red-100 text-red-600">
            {underperformers.length} underperforming
          </span>
        )}
        {avgCpa && mode === 'lead_gen' && (
          <span className="text-xs font-label text-secondary px-3 py-1.5 rounded-full bg-surface-low">
            Avg CPA: ${avgCpa}
          </span>
        )}
        {avgRoas && mode === 'ecommerce' && (
          <span className="text-xs font-label text-secondary px-3 py-1.5 rounded-full bg-surface-low">
            Avg ROAS: {avgRoas}×
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline-variant/15">
        <table className="w-full text-xs font-label">
          <thead>
            <tr className="border-b border-outline-variant/15 text-left">
              <th className="px-3 py-2.5 text-secondary font-semibold">Campaign</th>
              <th className="px-3 py-2.5 text-secondary font-semibold text-right">Spend</th>
              <th className="px-3 py-2.5 text-secondary font-semibold text-right">Conv</th>
              <th className="px-3 py-2.5 text-secondary font-semibold text-right">{primaryLabel}</th>
              <th className="px-3 py-2.5 text-secondary font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => {
              const isScalable    = readyToScale.some(s => s.campaign === c.campaign);
              const isUnderperform = underperformers.some(u => u.campaign === c.campaign);
              return (
                <tr key={i} className={`border-b border-outline-variant/10 ${
                  isScalable ? 'bg-emerald-50/30' : isUnderperform ? 'bg-red-50/30' : ''
                }`}>
                  <td className="px-3 py-2 text-on-surface font-medium max-w-[200px] truncate">{c.campaign}</td>
                  <td className="px-3 py-2 text-right text-on-surface">${(c.cost || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-on-surface">{c.conversions}</td>
                  <td className="px-3 py-2 text-right text-on-surface">
                    {mode === 'ecommerce'
                      ? (c.roas ? `${c.roas}×` : '—')
                      : (c.cpa  ? `$${c.cpa}` : '—')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isScalable     && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">SCALE</span>}
                    {isUnderperform && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">REVIEW</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: SwotPanel.js**

```jsx
// components/analysis/SwotPanel.js
'use client';

const QUADRANTS = [
  { key: 'strengths',     label: 'Strengths',     color: 'emerald', icon: 'trending_up' },
  { key: 'weaknesses',    label: 'Weaknesses',     color: 'red',     icon: 'trending_down' },
  { key: 'opportunities', label: 'Opportunities',  color: 'blue',    icon: 'lightbulb' },
  { key: 'threats',       label: 'Threats',        color: 'amber',   icon: 'warning' },
];

const COLOR_MAP = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  red:     'bg-red-50 border-red-200 text-red-700',
  blue:    'bg-blue-50 border-blue-200 text-blue-700',
  amber:   'bg-amber-50 border-amber-200 text-amber-700',
};

export default function SwotPanel({ swot, loading = false, onItemClick }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-4 bg-surface-high rounded w-24 mb-3" />
            {[1,2,3].map(j => <div key={j} className="h-3 bg-surface-high rounded mb-2" />)}
          </div>
        ))}
      </div>
    );
  }

  if (!swot) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-xs text-secondary font-label px-2 py-1 rounded bg-surface-low border border-outline-variant/15">
          AI INTERPRETATION — based on computed data above
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {QUADRANTS.map(({ key, label, color, icon }) => (
          <div key={key} className={`rounded-xl border p-4 ${COLOR_MAP[color]}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
              <p className="font-label font-bold text-sm">{label}</p>
            </div>
            <div className="space-y-3">
              {(swot[key] || []).map((item, i) => (
                <div key={i}
                  onClick={() => onItemClick?.({ ...item, quadrant: key })}
                  className="cursor-pointer group">
                  <p className="text-xs font-label font-semibold group-hover:underline">{item.title}</p>
                  <p className="text-xs opacity-80 mt-0.5">{item.detail}</p>
                  {item.dataPoint && (
                    <p className="text-[10px] opacity-60 mt-0.5 italic">{item.dataPoint}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: ActionItems.js**

```jsx
// components/analysis/ActionItems.js
'use client';

const CONFIDENCE_STYLES = {
  HIGH:   'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW:    'bg-slate-100 text-slate-600',
};

const CATEGORY_LABELS = {
  NEGATIVE_KEYWORD: 'Add Negative',
  PAUSE_KEYWORD:    'Pause Keyword',
  SCALE_BUDGET:     'Scale Budget',
  RESTRUCTURE:      'Restructure',
  BID_ADJUSTMENT:   'Adjust Bid',
};

const CATEGORY_COLORS = {
  NEGATIVE_KEYWORD: 'bg-red-50 text-red-600',
  PAUSE_KEYWORD:    'bg-orange-50 text-orange-600',
  SCALE_BUDGET:     'bg-emerald-50 text-emerald-700',
  RESTRUCTURE:      'bg-blue-50 text-blue-600',
  BID_ADJUSTMENT:   'bg-purple-50 text-purple-600',
};

export default function ActionItems({ items = [], loading = false, warnings = [], onItemClick }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-4 bg-surface-high rounded w-3/4 mb-2" />
            <div className="h-3 bg-surface-high rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Data sufficiency warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs font-label text-amber-700">⚠ {w}</p>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <p className="text-sm text-secondary font-label">No action items yet. Generate SWOT to populate recommendations.</p>
      )}

      {items.map((item, i) => (
        <div key={i}
          onClick={() => onItemClick?.(item)}
          className="card p-4 cursor-pointer hover:border-[var(--primary)]/30 transition-colors">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-sm font-label font-semibold text-on-surface flex-1">{item.description}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-[10px] font-bold font-label px-2 py-0.5 rounded-full ${CONFIDENCE_STYLES[item.confidence] || CONFIDENCE_STYLES.LOW}`}>
                {item.confidence}
              </span>
              <span className={`text-[10px] font-bold font-label px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category] || 'bg-slate-100 text-slate-600'}`}>
                {CATEGORY_LABELS[item.category] || item.category}
              </span>
            </div>
          </div>
          <p className="text-xs text-secondary font-label">{item.rationale}</p>
          {item.estimatedImpact && (
            <p className="text-xs text-primary font-label font-semibold mt-1.5">
              Est. impact: {item.estimatedImpact}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: AuditChat.js**

```jsx
// components/analysis/AuditChat.js
'use client';

import { useState, useRef, useEffect } from 'react';

export default function AuditChat({ accountId, analysisId, focusContext, onClearFocus }) {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/reports/${accountId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          messages: [...messages, userMsg],
          focusContext: focusContext || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 pill-btn-primary shadow-lg z-40 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">chat</span>
        Ask about this data
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-surface border-l border-outline-variant/20 flex flex-col z-40 shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-outline-variant/15 flex items-center justify-between">
        <div>
          <p className="font-label font-bold text-on-surface text-sm">Audit Assistant</p>
          <p className="text-[10px] text-secondary font-label">AI on computed data — not real-time</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-secondary hover:text-on-surface">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Focus context banner */}
      {focusContext && (
        <div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-center justify-between">
          <p className="text-[11px] font-label text-primary">
            Focused: {focusContext.phrase || focusContext.campaign || focusContext.searchTerm || JSON.stringify(focusContext).slice(0, 40)}
          </p>
          <button onClick={onClearFocus} className="text-secondary hover:text-primary text-[11px] font-label">clear</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <p className="text-xs text-secondary font-label">Ask anything about this account.</p>
            <div className="space-y-1.5">
              {['What's the biggest waste in this account?', 'Which campaign should I scale first?', 'What negatives am I missing?'].map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="block w-full text-left text-xs font-label px-3 py-2 rounded-lg bg-surface-low hover:bg-primary/5 text-secondary hover:text-primary transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs font-label leading-relaxed ${
              m.role === 'user'
                ? 'bg-primary text-white'
                : 'bg-surface-low text-on-surface'
            }`}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-low rounded-xl px-3 py-2">
              <span className="text-xs text-secondary font-label animate-pulse">Analyzing…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-outline-variant/15">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Ask about this account…"
            className="flex-1 text-xs font-label px-3 py-2 rounded-lg bg-surface-low border border-outline-variant/15 text-on-surface placeholder:text-secondary focus:outline-none focus:border-primary"
          />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
            className="pill-btn-primary text-xs px-3 disabled:opacity-50">
            <span className="material-symbols-outlined text-[16px]">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit all components**

```bash
git add components/analysis/
git commit -m "feat: audit analysis UI components (ngram table, wasted spend, campaigns, SWOT, actions, chat)"
```

---

## Task 9: Analysis Results Page

**Files:**
- Create: `app/accounts/[id]/analysis/[analysisId]/page.js`

- [ ] **Step 1: Create the page**

```jsx
// app/accounts/[id]/analysis/[analysisId]/page.js
'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import NgramTable       from '@/components/analysis/NgramTable';
import WastedSpend      from '@/components/analysis/WastedSpend';
import CampaignRanking  from '@/components/analysis/CampaignRanking';
import SwotPanel        from '@/components/analysis/SwotPanel';
import ActionItems      from '@/components/analysis/ActionItems';
import AuditChat        from '@/components/analysis/AuditChat';

const SECTIONS = [
  { id: 'summary',   label: 'Summary',   icon: 'dashboard' },
  { id: 'ngrams',    label: 'N-gram',     icon: 'workspaces' },
  { id: 'wasted',    label: 'Wasted',     icon: 'money_off' },
  { id: 'campaigns', label: 'Campaigns',  icon: 'campaign' },
  { id: 'swot',      label: 'SWOT',       icon: 'psychology' },
  { id: 'actions',   label: 'Actions',    icon: 'checklist' },
];

export default function AnalysisPage({ params }) {
  const { id: accountId, analysisId } = use(params);

  const [analysis,  setAnalysis]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [swot,      setSwot]      = useState(null);
  const [actions,   setActions]   = useState([]);
  const [swotLoading, setSwotLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('summary');
  const [focusContext,  setFocusContext]  = useState(null);

  useEffect(() => {
    fetch(`/api/reports/${accountId}/analyses/${analysisId}`)
      .then(r => r.json())
      .then(data => {
        setAnalysis(data);
        if (data.swot)         setSwot(data.swot);
        if (data.action_items) setActions(data.action_items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [accountId, analysisId]);

  const generateSwot = useCallback(async () => {
    if (swot || swotLoading) return;
    setSwotLoading(true);
    try {
      const res = await fetch(`/api/reports/${accountId}/swot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSwot(data.swot);
        setActions(data.actionItems || []);
      }
    } finally {
      setSwotLoading(false);
    }
  }, [accountId, analysisId, swot, swotLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined text-primary text-[40px] animate-spin">progress_activity</span>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="px-8 py-10 text-center">
        <p className="font-headline font-bold text-on-surface mb-2">Analysis not found</p>
        <Link href={`/accounts/${accountId}`} className="pill-btn-primary text-sm">Back to Account</Link>
      </div>
    );
  }

  const data     = analysis.computed_data || {};
  const summary  = data.summary  || {};
  const ngrams   = data.ngrams   || {};
  const keywords = data.keywords || {};
  const campaigns = data.campaigns || {};
  const warnings = analysis.data_sufficiency_warnings || [];
  const mode     = analysis.mode || 'lead_gen';
  const isEcom   = mode === 'ecommerce';

  return (
    <div className="px-8 py-10 pb-24">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/accounts/${accountId}`} className="flex items-center gap-1 text-xs text-secondary hover:text-primary mb-2 w-fit">
          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          Back to Account
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight">Account Audit</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-label font-bold px-2.5 py-1 rounded-full capitalize ${
                isEcom ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {isEcom ? 'E-Commerce' : 'Lead Gen'}
              </span>
              <span className="text-xs text-secondary font-label">
                {new Date(analysis.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
          {!swot && (
            <button onClick={generateSwot} disabled={swotLoading}
              className="pill-btn-primary disabled:opacity-60">
              {swotLoading
                ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Generating…</>
                : <><span className="material-symbols-outlined text-[16px]">psychology</span> Generate SWOT + Actions</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Data sufficiency warnings */}
      {warnings.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
          <p className="text-xs font-label font-bold text-amber-700 mb-1">Data Sufficiency</p>
          {warnings.map((w, i) => <p key={i} className="text-xs font-label text-amber-700">⚠ {w}</p>)}
        </div>
      )}

      {/* Section nav */}
      <div className="flex gap-1 mb-6 border-b border-outline-variant/15 overflow-x-auto">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-label font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
              activeSection === s.id ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-on-surface'
            }`}>
            <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Summary ── */}
      {activeSection === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Spend',    value: `$${(summary.totalSpend || 0).toLocaleString()}` },
              { label: 'Conversions',   value: (summary.totalConversions || 0).toLocaleString() },
              { label: isEcom ? 'Avg ROAS' : 'Avg CPA',
                value: isEcom ? `${summary.avgRoas || '—'}×` : `$${summary.avgCpa || '—'}` },
              { label: 'Wasted Spend',  value: `$${(summary.totalWasted || 0).toLocaleString()}`,
                sub: `${summary.wastedPct || 0}% of total`, color: 'text-red-600' },
            ].map(s => (
              <div key={s.label} className="card p-4">
                <p className={`text-2xl font-headline font-bold ${s.color || 'text-on-surface'}`}>{s.value}</p>
                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mt-1">{s.label}</p>
                {s.sub && <p className="text-xs font-label text-secondary mt-0.5">{s.sub}</p>}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Keywords analyzed',     value: summary.keywordCount || 0 },
              { label: 'Search terms analyzed', value: summary.searchTermCount || 0 },
              { label: 'Campaigns',             value: summary.campaignCount || 0 },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <p className="text-3xl font-headline font-bold text-on-surface">{s.value}</p>
                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── N-gram Table ── */}
      {activeSection === 'ngrams' && (
        <div>
          <p className="text-sm text-secondary font-label mb-4">
            Every phrase cluster across all search terms — sorted by spend. Red = zero conversions. Amber = above-average CPA.
            Click any row to focus the chat assistant on that phrase.
          </p>
          <NgramTable
            table={ngrams.table || []}
            accountAvgCpa={ngrams.accountAvgCpa}
            mode={mode}
            onRowClick={row => { setFocusContext(row); }}
          />
        </div>
      )}

      {/* ── Wasted Spend ── */}
      {activeSection === 'wasted' && (
        <WastedSpend
          keywords={keywords.zeroConvKeywords || []}
          terms={keywords.zeroConvTerms || []}
          totalWastedOnKeywords={keywords.totalWastedOnKeywords || 0}
          totalWastedOnTerms={keywords.totalWastedOnTerms || 0}
          onTermClick={t => setFocusContext(t)}
        />
      )}

      {/* ── Campaign Ranking ── */}
      {activeSection === 'campaigns' && (
        <CampaignRanking
          campaigns={campaigns.rankedCampaigns || []}
          readyToScale={campaigns.readyToScale || []}
          underperformers={campaigns.underperformers || []}
          mode={mode}
          avgCpa={campaigns.avgCpa}
          avgRoas={campaigns.avgRoas}
        />
      )}

      {/* ── SWOT ── */}
      {activeSection === 'swot' && (
        <div>
          {!swot && !swotLoading && (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-4xl text-secondary mb-3 block">psychology</span>
              <p className="font-label font-semibold text-on-surface mb-4">SWOT not generated yet</p>
              <button onClick={generateSwot} className="pill-btn-primary">
                Generate SWOT + Action Items
              </button>
            </div>
          )}
          <SwotPanel
            swot={swot}
            loading={swotLoading}
            onItemClick={item => setFocusContext(item)}
          />
        </div>
      )}

      {/* ── Action Items ── */}
      {activeSection === 'actions' && (
        <div>
          {!swot && !swotLoading && (
            <div className="mb-4">
              <button onClick={generateSwot} className="pill-btn-primary text-sm">
                Generate SWOT + Action Items first
              </button>
            </div>
          )}
          <ActionItems
            items={actions}
            loading={swotLoading}
            warnings={warnings}
            onItemClick={item => setFocusContext(item)}
          />
        </div>
      )}

      {/* Chat panel */}
      <AuditChat
        accountId={accountId}
        analysisId={analysisId}
        focusContext={focusContext}
        onClearFocus={() => setFocusContext(null)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add GET route for individual analysis**

The analysis page fetches `/api/reports/${accountId}/analyses/${analysisId}`. Add this route:

```js
// app/api/reports/[accountId]/analyses/[analysisId]/route.js
import { NextResponse } from 'next/server';
import { getReportAnalysis } from '@/lib/supabase';

export async function GET(request, { params }) {
  const { accountId, analysisId } = await params;
  try {
    const analysis = await getReportAnalysis(analysisId);
    if (!analysis || analysis.account_id !== accountId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/accounts/[id]/analysis/ app/api/reports/[accountId]/analyses/
git commit -m "feat: audit results page with sections, SWOT generation, and chat panel"
```

---

## Task 10: Wire Up Uploads Tab

**Files:**
- Modify: `app/accounts/[id]/page.js`

The Uploads tab needs: multi-select checkboxes per upload, a "Run Analysis" button that appears when 1+ are selected, and a list of past analyses linking to results.

- [ ] **Step 1: Add analysis state and load function**

In the state block, after `const [uploads, setUploads] = useState([]);`, add:

```js
const [analyses,       setAnalyses]       = useState([]);
const [selectedUploads, setSelectedUploads] = useState(new Set());
const [analyzing,      setAnalyzing]      = useState(false);
```

- [ ] **Step 2: Load analyses alongside uploads in loadTabData**

In the `if (tab === 'uploads')` block, replace with:

```js
if (tab === 'uploads') {
  Promise.all([
    fetch(`/api/reports/${id}`).then(r => r.json()).catch(() => []),
    fetch(`/api/reports/${id}/analyses`).then(r => r.json()).catch(() => []),
  ]).then(([u, a]) => {
    setUploads(Array.isArray(u) ? u : []);
    setAnalyses(Array.isArray(a) ? a : []);
  });
}
```

- [ ] **Step 3: Add analyses list API route**

```js
// app/api/reports/[accountId]/analyses/route.js
import { NextResponse } from 'next/server';
import { listReportAnalyses } from '@/lib/supabase';

export async function GET(request, { params }) {
  const { accountId } = await params;
  try {
    const analyses = await listReportAnalyses(accountId);
    return NextResponse.json(analyses);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Replace the Uploads tab JSX**

Find the `{activeTab === 'uploads' && (` block and replace its entire contents with:

```jsx
{activeTab === 'uploads' && (
  <div className="space-y-8">
    <div>
      <p className="font-headline font-bold text-on-surface text-lg mb-1">Report Uploads</p>
      <p className="text-sm text-secondary font-label">
        Upload Google Ads CSV exports to enable data-driven analysis. Select one or more uploads and run an audit to combine them.
      </p>
    </div>

    <ReportUpload
      accountId={id}
      onUploadComplete={() => {
        Promise.all([
          fetch(`/api/reports/${id}`).then(r => r.json()).catch(() => []),
          fetch(`/api/reports/${id}/analyses`).then(r => r.json()).catch(() => []),
        ]).then(([u, a]) => {
          setUploads(Array.isArray(u) ? u : []);
          setAnalyses(Array.isArray(a) ? a : []);
        });
      }}
    />

    {/* Upload history with multi-select */}
    {uploads.length > 0 && (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-label font-semibold text-on-surface text-sm">
            Upload History
            {selectedUploads.size > 0 && (
              <span className="ml-2 text-secondary font-normal">({selectedUploads.size} selected)</span>
            )}
          </p>
          {selectedUploads.size > 0 && (
            <button
              disabled={analyzing}
              onClick={async () => {
                setAnalyzing(true);
                try {
                  const res = await fetch(`/api/reports/${id}/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uploadIds: Array.from(selectedUploads) }),
                  });
                  const data = await res.json();
                  if (res.ok && data.analysisId) {
                    window.location.href = `/accounts/${id}/analysis/${data.analysisId}`;
                  }
                } finally {
                  setAnalyzing(false);
                }
              }}
              className="pill-btn-primary text-sm disabled:opacity-60"
            >
              {analyzing
                ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Analyzing…</>
                : <><span className="material-symbols-outlined text-[16px]">query_stats</span> Run Analysis ({selectedUploads.size})</>
              }
            </button>
          )}
        </div>

        <div className="space-y-2">
          {uploads.map(upload => (
            <div key={upload.id}
              className={`card p-3 flex items-center gap-3 cursor-pointer transition-all ${
                selectedUploads.has(upload.id) ? 'border-[var(--primary)] bg-[var(--primary)]/5' : ''
              }`}
              onClick={() => setSelectedUploads(prev => {
                const next = new Set(prev);
                next.has(upload.id) ? next.delete(upload.id) : next.add(upload.id);
                return next;
              })}
            >
              <input type="checkbox" readOnly checked={selectedUploads.has(upload.id)}
                className="accent-[var(--primary)] w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-label font-semibold text-on-surface capitalize">
                  {upload.report_type.replace('_', ' ')} Report
                </p>
                <p className="text-xs text-secondary font-label mt-0.5 truncate">
                  {upload.row_count.toLocaleString()} rows
                  {upload.file_name ? ` · ${upload.file_name}` : ''}
                  {' · '}
                  {new Date(upload.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await fetch(`/api/reports/${id}?uploadId=${upload.id}`, { method: 'DELETE' });
                  setUploads(prev => prev.filter(u => u.id !== upload.id));
                  setSelectedUploads(prev => { const n = new Set(prev); n.delete(upload.id); return n; });
                }}
                className="text-xs text-secondary hover:text-red-500 font-label transition-colors shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    )}

    {uploads.length === 0 && loadedTabs.has('uploads') && (
      <p className="text-sm text-secondary font-label">No uploads yet. Upload a Google Ads CSV to get started.</p>
    )}

    {/* Past analyses */}
    {analyses.length > 0 && (
      <div>
        <p className="font-label font-semibold text-on-surface text-sm mb-3">Past Analyses</p>
        <div className="space-y-2">
          {analyses.map(a => (
            <a key={a.id} href={`/accounts/${id}/analysis/${a.id}`}
              className="card p-3 flex items-center justify-between hover:border-[var(--primary)]/30 transition-colors block">
              <div>
                <p className="text-sm font-label font-semibold text-on-surface capitalize">
                  {a.mode?.replace('_', ' ')} Audit · {(a.upload_ids || []).length} upload{(a.upload_ids || []).length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-secondary font-label mt-0.5">
                  {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className="material-symbols-outlined text-secondary text-[20px]">arrow_forward</span>
            </a>
          ))}
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 5: Run full test suite**

```bash
npx jest
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/accounts/\[id\]/page.js app/api/reports/
git commit -m "feat: uploads tab with multi-select, run analysis CTA, and past analyses list"
```

---

## Self-Review

**Spec coverage check:**
- ✅ N-gram analysis (1/2/3-word) — Task 2 (`buildNgramTable`)
- ✅ Engram-by-cost table with zero-conv + above-avg-CPA flags — `NgramTable.js`
- ✅ Top-performing + wasted keyword themes — Task 3 + `WastedSpend.js`
- ✅ Biggest spenders (keywords) — `analyzeKeywords` → `topSpenders`
- ✅ Negative keyword gap analysis — `negativeGaps` in keywords analysis
- ✅ Account-wide summary snapshot — Task 5 orchestrator → summary section
- ✅ Campaign-by-campaign breakdown + ROAS ranking — Task 4 + `CampaignRanking.js`
- ✅ Ready to Scale identification — `readyToScale` in campaign analysis
- ✅ Data sufficiency warnings — Task 5 orchestrator (date range + conversion count)
- ✅ SWOT generation (AI, labeled) — Task 6 + Task 7 SWOT route
- ✅ Action items (AI, prioritized, confidence-rated, human-reviewed) — SWOT prompt + `ActionItems.js`
- ✅ Conversational follow-up (click-to-focus, computed context injected) — `AuditChat.js` + chat route
- ✅ Multiple report types combined in one analysis — `runAudit` takes array of uploads
- ✅ Analysis page with sections + chat panel — Task 9

**Out of scope confirmed absent (correct for Phase 2):**
- XLSX export — Phase 3
- Product/shopping analysis — Phase 3
- Week-over-week trends — Phase 3
- Keyword recommendation engine — Phase 4
- Brand identity / landing page — Phase 4

**Computed vs. AI separation maintained:**
- All n-gram, keyword, campaign numbers: computed, no LLM
- SWOT + action items: Gemini, clearly labeled in UI with "AI INTERPRETATION" badge
- Chat: AI operating on computed data, not generating new numbers

**Type consistency:**
- `runAudit(uploads, mode)` → `computed_data` stored in `report_analyses`
- `buildSwotPrompt(computedData)` reads from same structure
- Chat route reads `analysis.computed_data` — same shape
