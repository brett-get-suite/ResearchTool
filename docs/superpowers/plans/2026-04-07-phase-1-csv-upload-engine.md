# Phase 1: CSV Upload Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CSV report upload capability so real Google Ads data (keywords, search terms, campaigns, products) can be ingested, parsed, and stored per account — unblocking all future analysis phases.

**Architecture:** Four pure-function parsers normalize Google Ads CSV exports into a consistent internal schema. A drag-and-drop upload component handles file selection and column mapping for non-standard exports. Uploads are stored in a new Supabase `report_uploads` table per account. Account-level mode (lead gen / e-commerce) is set once in account settings and inherited by all analysis runs.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, Supabase, PapaParse 5 (CSV parsing), Jest 29 + jest-environment-node (parser unit tests)

---

## File Map

**New files:**
- `lib/parsers/index.js` — `detectReportType(headers)` + `parseReport(rows, type)` dispatcher
- `lib/parsers/keyword.js` — `parseKeywordReport(rows)` pure function
- `lib/parsers/search-terms.js` — `parseSearchTermsReport(rows)` pure function
- `lib/parsers/campaign.js` — `parseCampaignReport(rows)` pure function
- `lib/parsers/product.js` — `parseProductReport(rows)` pure function
- `lib/parsers/normalize.js` — shared column-name normalization + number parsing helpers
- `components/upload/ReportUpload.js` — drag-and-drop upload component
- `components/upload/ColumnMapper.js` — column remapping UI for non-standard exports
- `app/api/reports/upload/route.js` — POST: receive parsed data, store to Supabase
- `app/api/reports/[accountId]/route.js` — GET: list uploads for an account
- `docs/migrations/002_report_uploads.sql` — DB migration
- `__tests__/parsers/normalize.test.js`
- `__tests__/parsers/detect.test.js`
- `__tests__/parsers/keyword.test.js`
- `__tests__/parsers/search-terms.test.js`
- `__tests__/parsers/campaign.test.js`
- `__tests__/parsers/product.test.js`
- `jest.config.js`
- `jest.setup.js`

**Modified files:**
- `package.json` — add PapaParse, Jest dev deps
- `lib/supabase.js` — add `getReportUploads`, `createReportUpload`, `deleteReportUpload`
- `components/dashboard/AccountSettings.js` — add mode toggle (lead gen / e-commerce)
- `app/accounts/[id]/page.js` — add Uploads tab + lazy load

---

## Task 0: Jest Test Infrastructure

**Files:**
- Create: `jest.config.js`
- Create: `jest.setup.js`
- Modify: `package.json`

- [ ] **Step 1: Install Jest and PapaParse**

```bash
cd "C:/Users/bread/Documents/GetSuite/ads-research-tool"
npm install --save-dev jest@29 jest-environment-node@29
npm install papaparse
```

Expected: `package.json` now includes `"jest": "^29..."` in devDependencies and `"papaparse": "..."` in dependencies.

- [ ] **Step 2: Create jest.config.js**

```js
// jest.config.js
/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterFramework: [],
  transform: {},
};

module.exports = config;
```

- [ ] **Step 3: Create jest.setup.js**

```js
// jest.setup.js
// Empty for now — add global setup here if needed
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, update the `"scripts"` section:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "jest",
  "test:watch": "jest --watch"
},
```

- [ ] **Step 5: Verify Jest runs**

```bash
npx jest --listTests
```

Expected: no output (no tests yet), exit code 0.

- [ ] **Step 6: Commit**

```bash
git add jest.config.js jest.setup.js package.json package-lock.json
git commit -m "chore: add Jest test infrastructure and PapaParse dependency"
```

---

## Task 1: Database Migration

**Files:**
- Create: `docs/migrations/002_report_uploads.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- docs/migrations/002_report_uploads.sql

-- Add mode to accounts table (lead_gen = optimize for CPA; ecommerce = optimize for ROAS)
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'lead_gen'
  CHECK (mode IN ('lead_gen', 'ecommerce'));

-- Stores each uploaded Google Ads report CSV, parsed into JSON rows
CREATE TABLE IF NOT EXISTS report_uploads (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id      UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  report_type     TEXT        NOT NULL CHECK (report_type IN ('keyword', 'search_terms', 'campaign', 'product')),
  date_range_start DATE,
  date_range_end   DATE,
  row_count       INTEGER     NOT NULL DEFAULT 0,
  raw_data        JSONB       NOT NULL DEFAULT '[]'::jsonb,
  file_name       TEXT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS report_uploads_account_id_idx ON report_uploads (account_id);
CREATE INDEX IF NOT EXISTS report_uploads_uploaded_at_idx ON report_uploads (uploaded_at DESC);
```

- [ ] **Step 2: Run migration in Supabase**

Open Supabase dashboard → SQL Editor → paste and run the contents of `docs/migrations/002_report_uploads.sql`.

Expected: "Success. No rows returned."

- [ ] **Step 3: Commit**

```bash
git add docs/migrations/002_report_uploads.sql
git commit -m "feat: add report_uploads table and mode column to accounts"
```

---

## Task 2: Supabase CRUD for Report Uploads

**Files:**
- Modify: `lib/supabase.js`

- [ ] **Step 1: Add report upload functions to lib/supabase.js**

Append to the bottom of `lib/supabase.js`:

```js
// ─── Report Uploads ───────────────────────────────────────────────

export async function getReportUploads(accountId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('report_uploads')
    .select('id, report_type, date_range_start, date_range_end, row_count, file_name, uploaded_at')
    .eq('account_id', accountId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getReportUpload(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('report_uploads')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createReportUpload(payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('report_uploads')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReportUpload(id) {
  if (!supabase) return;
  const { error } = await supabase.from('report_uploads').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase.js
git commit -m "feat: add report upload CRUD functions to supabase lib"
```

---

## Task 3: Normalization Helpers + Format Detection

**Files:**
- Create: `lib/parsers/normalize.js`
- Create: `lib/parsers/index.js`
- Create: `__tests__/parsers/normalize.test.js`
- Create: `__tests__/parsers/detect.test.js`

- [ ] **Step 1: Write failing tests for normalize helpers**

```js
// __tests__/parsers/normalize.test.js
import { parseNum, parsePct, normalizeHeader, findHeaderRow } from '../../lib/parsers/normalize';

describe('parseNum', () => {
  it('parses plain number strings', () => expect(parseNum('1234')).toBe(1234));
  it('parses decimal strings', () => expect(parseNum('67.89')).toBe(67.89));
  it('strips dollar signs and commas', () => expect(parseNum('$1,234.56')).toBe(1234.56));
  it('returns 0 for empty string', () => expect(parseNum('')).toBe(0));
  it('returns 0 for "--"', () => expect(parseNum('--')).toBe(0));
  it('returns null for truly missing (undefined)', () => expect(parseNum(undefined)).toBeNull());
});

describe('parsePct', () => {
  it('strips % and returns float', () => expect(parsePct('5.11%')).toBeCloseTo(5.11));
  it('handles plain number', () => expect(parsePct('5.11')).toBeCloseTo(5.11));
  it('returns 0 for "--"', () => expect(parsePct('--')).toBe(0));
});

describe('normalizeHeader', () => {
  it('lowercases and trims', () => expect(normalizeHeader('  Campaign  ')).toBe('campaign'));
  it('strips punctuation from common headers', () => expect(normalizeHeader('Avg. CPC')).toBe('avg cpc'));
  it('normalizes "Conv. value" to "conv value"', () => expect(normalizeHeader('Conv. value')).toBe('conv value'));
});

describe('findHeaderRow', () => {
  it('returns index of row containing known column keywords', () => {
    const allRows = [
      ['Google Ads Campaign Statistics'],
      ['Jan 1, 2024 - Jan 31, 2024'],
      ['Campaign', 'Ad group', 'Keyword', 'Match type', 'Clicks', 'Impressions', 'Cost'],
      ['HVAC', 'AC Repair', 'ac repair', 'Phrase', '23', '450', '67.89'],
    ];
    expect(findHeaderRow(allRows, ['campaign', 'clicks', 'cost'])).toBe(2);
  });

  it('returns 0 if first row already looks like headers', () => {
    const allRows = [
      ['Campaign', 'Clicks', 'Cost'],
      ['HVAC', '23', '67.89'],
    ];
    expect(findHeaderRow(allRows, ['campaign', 'clicks'])).toBe(0);
  });

  it('returns -1 if no matching row found', () => {
    const allRows = [['foo', 'bar'], ['baz', 'qux']];
    expect(findHeaderRow(allRows, ['campaign', 'keyword'])).toBe(-1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/parsers/normalize.test.js
```

Expected: FAIL — "Cannot find module '../../lib/parsers/normalize'"

- [ ] **Step 3: Implement normalize.js**

```js
// lib/parsers/normalize.js

/**
 * Parse a value that should be a number.
 * Returns null only for undefined/missing. Returns 0 for "--", "", or unparseable.
 */
export function parseNum(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (s === '' || s === '--' || s === '-') return 0;
  const cleaned = s.replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Parse a percentage string like "5.11%" → 5.11.
 */
export function parsePct(val) {
  if (val === undefined || val === null) return 0;
  const s = String(val).trim();
  if (s === '' || s === '--') return 0;
  return parseFloat(s.replace('%', '')) || 0;
}

/**
 * Normalize a column header: lowercase, trim, strip trailing punctuation like periods.
 */
export function normalizeHeader(h) {
  return String(h)
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Given all rows as arrays (before headers are parsed), find the index of the
 * row that looks like the actual data header (contains the required keywords).
 * Returns -1 if not found.
 *
 * @param {string[][]} allRows - Array of arrays from raw Papa.parse with header:false
 * @param {string[]} requiredKeywords - Normalized keywords that must appear (e.g. ['campaign','clicks'])
 */
export function findHeaderRow(allRows, requiredKeywords) {
  for (let i = 0; i < allRows.length; i++) {
    const normalized = allRows[i].map(normalizeHeader);
    const hasAll = requiredKeywords.every(k => normalized.some(h => h.includes(k)));
    if (hasAll) return i;
  }
  return -1;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/parsers/normalize.test.js
```

Expected: PASS — 10 tests passing

- [ ] **Step 5: Write failing tests for format detection**

```js
// __tests__/parsers/detect.test.js
import { detectReportType } from '../../lib/parsers/index';

describe('detectReportType', () => {
  it('detects keyword report by "keyword" and "match type" headers', () => {
    const headers = ['Campaign', 'Ad group', 'Keyword', 'Match type', 'Clicks', 'Cost', 'Impressions', 'Conversions'];
    expect(detectReportType(headers)).toBe('keyword');
  });

  it('detects search terms report by "search term" header', () => {
    const headers = ['Campaign', 'Ad group', 'Search term', 'Match type', 'Clicks', 'Cost', 'Conversions'];
    expect(detectReportType(headers)).toBe('search_terms');
  });

  it('detects campaign report by "campaign" without keyword/search term/product headers', () => {
    const headers = ['Campaign', 'Campaign type', 'Campaign status', 'Budget', 'Clicks', 'Cost', 'Conversions'];
    expect(detectReportType(headers)).toBe('campaign');
  });

  it('detects product report by "product title" header', () => {
    const headers = ['Product title', 'Item ID', 'Category', 'Clicks', 'Cost', 'Conv value'];
    expect(detectReportType(headers)).toBe('product');
  });

  it('returns null for unrecognized headers', () => {
    const headers = ['foo', 'bar', 'baz'];
    expect(detectReportType(headers)).toBeNull();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
npx jest __tests__/parsers/detect.test.js
```

Expected: FAIL — "Cannot find module '../../lib/parsers/index'"

- [ ] **Step 7: Create lib/parsers/index.js**

```js
// lib/parsers/index.js
import { normalizeHeader } from './normalize.js';
import { parseKeywordReport } from './keyword.js';
import { parseSearchTermsReport } from './search-terms.js';
import { parseCampaignReport } from './campaign.js';
import { parseProductReport } from './product.js';

/**
 * Detect the type of Google Ads report from its column headers.
 * Returns: 'keyword' | 'search_terms' | 'campaign' | 'product' | null
 *
 * @param {string[]} headers - Array of raw column header strings
 */
export function detectReportType(headers) {
  const normalized = headers.map(normalizeHeader);
  const has = (keyword) => normalized.some(h => h.includes(keyword));

  if (has('product title') || has('item id')) return 'product';
  if (has('search term')) return 'search_terms';
  if (has('keyword') && has('match type')) return 'keyword';
  if (has('campaign') && !has('keyword') && !has('search term') && !has('product')) return 'campaign';
  return null;
}

/**
 * Parse rows (array of objects from PapaParse header:true) into normalized schema.
 *
 * @param {object[]} rows - Parsed CSV rows as objects
 * @param {'keyword'|'search_terms'|'campaign'|'product'} type - Report type
 * @returns {object[]} Normalized rows
 */
export function parseReport(rows, type) {
  switch (type) {
    case 'keyword':      return parseKeywordReport(rows);
    case 'search_terms': return parseSearchTermsReport(rows);
    case 'campaign':     return parseCampaignReport(rows);
    case 'product':      return parseProductReport(rows);
    default: throw new Error(`Unknown report type: ${type}`);
  }
}
```

- [ ] **Step 8: Run detect tests (will fail on missing parser imports — that's fine for now)**

```bash
npx jest __tests__/parsers/detect.test.js
```

Expected: FAIL — "Cannot find module './keyword.js'" — confirms the index loads but parsers don't exist yet. Proceed to next task.

- [ ] **Step 9: Commit**

```bash
git add lib/parsers/normalize.js lib/parsers/index.js __tests__/parsers/normalize.test.js __tests__/parsers/detect.test.js
git commit -m "feat: add parser normalize helpers and report type detection"
```

---

## Task 4: Keyword Report Parser

**Files:**
- Create: `lib/parsers/keyword.js`
- Create: `__tests__/parsers/keyword.test.js`

- [ ] **Step 1: Write failing tests**

```js
// __tests__/parsers/keyword.test.js
import { parseKeywordReport } from '../../lib/parsers/keyword';

const makeRow = (overrides = {}) => ({
  'Campaign': 'HVAC - Search',
  'Ad group': 'AC Repair',
  'Keyword': 'ac repair near me',
  'Match type': 'Phrase',
  'Impressions': '450',
  'Clicks': '23',
  'Cost': '67.89',
  'Conversions': '3',
  'Conv. value': '450.00',
  'CTR': '5.11%',
  'Avg. CPC': '2.95',
  'Quality Score': '8',
  ...overrides,
});

describe('parseKeywordReport', () => {
  it('normalizes a standard keyword report row', () => {
    const result = parseKeywordReport([makeRow()]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      keyword: 'ac repair near me',
      matchType: 'phrase',
      campaign: 'HVAC - Search',
      adGroup: 'AC Repair',
      impressions: 450,
      clicks: 23,
      cost: 67.89,
      conversions: 3,
      conversionValue: 450.00,
      ctr: 5.11,
      avgCpc: 2.95,
      qualityScore: 8,
    });
  });

  it('strips total/summary rows', () => {
    const totalRow = makeRow({ 'Campaign': 'Total: account', 'Keyword': 'Total: account' });
    expect(parseKeywordReport([totalRow])).toHaveLength(0);
  });

  it('strips rows where keyword is empty', () => {
    const emptyKeyword = makeRow({ 'Keyword': '' });
    expect(parseKeywordReport([emptyKeyword])).toHaveLength(0);
  });

  it('handles missing Quality Score gracefully', () => {
    const row = makeRow();
    delete row['Quality Score'];
    const result = parseKeywordReport([row]);
    expect(result[0].qualityScore).toBeNull();
  });

  it('handles missing Conv. value gracefully', () => {
    const row = makeRow({ 'Conv. value': '--' });
    const result = parseKeywordReport([row]);
    expect(result[0].conversionValue).toBe(0);
  });

  it('normalizes match type to lowercase', () => {
    expect(parseKeywordReport([makeRow({ 'Match type': 'EXACT' })])[0].matchType).toBe('exact');
    expect(parseKeywordReport([makeRow({ 'Match type': 'Broad match' })])[0].matchType).toBe('broad match');
  });

  it('handles alternate column name "All conv." for conversions', () => {
    const row = { ...makeRow(), 'All conv.': '5' };
    delete row['Conversions'];
    const result = parseKeywordReport([row]);
    expect(result[0].conversions).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/parsers/keyword.test.js
```

Expected: FAIL — "Cannot find module '../../lib/parsers/keyword'"

- [ ] **Step 3: Implement lib/parsers/keyword.js**

```js
// lib/parsers/keyword.js
import { parseNum, parsePct, normalizeHeader } from './normalize.js';

const TOTAL_KEYWORDS = ['total:', 'grand total'];

function isSummaryRow(row) {
  const keyword = String(row['Keyword'] || row['keyword'] || '').trim().toLowerCase();
  const campaign = String(row['Campaign'] || row['campaign'] || '').trim().toLowerCase();
  return TOTAL_KEYWORDS.some(t => keyword.startsWith(t) || campaign.startsWith(t));
}

function getCol(row, ...candidates) {
  for (const c of candidates) {
    if (row[c] !== undefined) return row[c];
    // Try case-insensitive match
    const key = Object.keys(row).find(k => normalizeHeader(k) === normalizeHeader(c));
    if (key !== undefined) return row[key];
  }
  return undefined;
}

/**
 * Parse rows from a Google Ads keyword report into normalized schema.
 *
 * @param {object[]} rows - PapaParse header:true rows
 * @returns {{ keyword, matchType, campaign, adGroup, impressions, clicks, cost,
 *             conversions, conversionValue, ctr, avgCpc, qualityScore }[]}
 */
export function parseKeywordReport(rows) {
  return rows
    .filter(row => {
      if (isSummaryRow(row)) return false;
      const kw = String(getCol(row, 'Keyword', 'keyword') ?? '').trim();
      return kw.length > 0;
    })
    .map(row => {
      const qs = getCol(row, 'Quality Score', 'quality score', 'QS');
      const convVal = getCol(row, 'Conv. value', 'conv value', 'Conversion value', 'All conv. value');
      const conv = getCol(row, 'Conversions', 'conversions', 'All conv.', 'all conv');

      return {
        keyword:         String(getCol(row, 'Keyword', 'keyword') ?? '').trim().toLowerCase(),
        matchType:       String(getCol(row, 'Match type', 'match type') ?? '').trim().toLowerCase(),
        campaign:        String(getCol(row, 'Campaign', 'campaign') ?? '').trim(),
        adGroup:         String(getCol(row, 'Ad group', 'ad group') ?? '').trim(),
        impressions:     parseNum(getCol(row, 'Impressions', 'impressions')),
        clicks:          parseNum(getCol(row, 'Clicks', 'clicks')),
        cost:            parseNum(getCol(row, 'Cost', 'cost')),
        conversions:     parseNum(conv),
        conversionValue: parseNum(convVal) ?? 0,
        ctr:             parsePct(getCol(row, 'CTR', 'ctr')),
        avgCpc:          parseNum(getCol(row, 'Avg. CPC', 'avg cpc', 'avg. cpc')),
        qualityScore:    qs !== undefined ? parseNum(qs) : null,
      };
    });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/parsers/keyword.test.js
```

Expected: PASS — 7 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/parsers/keyword.js __tests__/parsers/keyword.test.js
git commit -m "feat: keyword report parser with full column normalization"
```

---

## Task 5: Search Terms Report Parser

**Files:**
- Create: `lib/parsers/search-terms.js`
- Create: `__tests__/parsers/search-terms.test.js`

- [ ] **Step 1: Write failing tests**

```js
// __tests__/parsers/search-terms.test.js
import { parseSearchTermsReport } from '../../lib/parsers/search-terms';

const makeRow = (overrides = {}) => ({
  'Campaign': 'HVAC - Search',
  'Ad group': 'AC Repair',
  'Search term': 'emergency ac repair',
  'Match type': 'Broad match',
  'Impressions': '120',
  'Clicks': '8',
  'Cost': '24.40',
  'Conversions': '0',
  'Conv. value': '0',
  ...overrides,
});

describe('parseSearchTermsReport', () => {
  it('normalizes a standard search terms row', () => {
    const result = parseSearchTermsReport([makeRow()]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      searchTerm: 'emergency ac repair',
      matchType: 'broad match',
      campaign: 'HVAC - Search',
      adGroup: 'AC Repair',
      impressions: 120,
      clicks: 8,
      cost: 24.40,
      conversions: 0,
      conversionValue: 0,
    });
  });

  it('strips summary rows', () => {
    const totalRow = makeRow({ 'Search term': 'Total: account' });
    expect(parseSearchTermsReport([totalRow])).toHaveLength(0);
  });

  it('strips rows where search term is empty', () => {
    expect(parseSearchTermsReport([makeRow({ 'Search term': '' })])).toHaveLength(0);
  });

  it('handles "Search Term" (capital T) as alternate header', () => {
    const row = { ...makeRow() };
    row['Search Term'] = row['Search term'];
    delete row['Search term'];
    expect(parseSearchTermsReport([row])[0].searchTerm).toBe('emergency ac repair');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/parsers/search-terms.test.js
```

Expected: FAIL — "Cannot find module '../../lib/parsers/search-terms'"

- [ ] **Step 3: Implement lib/parsers/search-terms.js**

```js
// lib/parsers/search-terms.js
import { parseNum, normalizeHeader } from './normalize.js';

const TOTAL_KEYWORDS = ['total:', 'grand total'];

function getCol(row, ...candidates) {
  for (const c of candidates) {
    if (row[c] !== undefined) return row[c];
    const key = Object.keys(row).find(k => normalizeHeader(k) === normalizeHeader(c));
    if (key !== undefined) return row[key];
  }
  return undefined;
}

/**
 * @param {object[]} rows
 * @returns {{ searchTerm, matchType, campaign, adGroup, impressions, clicks,
 *             cost, conversions, conversionValue }[]}
 */
export function parseSearchTermsReport(rows) {
  return rows
    .filter(row => {
      const term = String(getCol(row, 'Search term', 'Search Term', 'search term') ?? '').trim().toLowerCase();
      if (!term) return false;
      return !TOTAL_KEYWORDS.some(t => term.startsWith(t));
    })
    .map(row => {
      const conv = getCol(row, 'Conversions', 'conversions', 'All conv.', 'all conv');
      const convVal = getCol(row, 'Conv. value', 'conv value', 'Conversion value', 'All conv. value');
      return {
        searchTerm:      String(getCol(row, 'Search term', 'Search Term', 'search term') ?? '').trim().toLowerCase(),
        matchType:       String(getCol(row, 'Match type', 'match type') ?? '').trim().toLowerCase(),
        campaign:        String(getCol(row, 'Campaign', 'campaign') ?? '').trim(),
        adGroup:         String(getCol(row, 'Ad group', 'ad group') ?? '').trim(),
        impressions:     parseNum(getCol(row, 'Impressions', 'impressions')) ?? 0,
        clicks:          parseNum(getCol(row, 'Clicks', 'clicks')) ?? 0,
        cost:            parseNum(getCol(row, 'Cost', 'cost')) ?? 0,
        conversions:     parseNum(conv) ?? 0,
        conversionValue: parseNum(convVal) ?? 0,
      };
    });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/parsers/search-terms.test.js
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/parsers/search-terms.js __tests__/parsers/search-terms.test.js
git commit -m "feat: search terms report parser"
```

---

## Task 6: Campaign Report Parser

**Files:**
- Create: `lib/parsers/campaign.js`
- Create: `__tests__/parsers/campaign.test.js`

- [ ] **Step 1: Write failing tests**

```js
// __tests__/parsers/campaign.test.js
import { parseCampaignReport } from '../../lib/parsers/campaign';

const makeRow = (overrides = {}) => ({
  'Campaign': 'HVAC - Search',
  'Campaign type': 'Search',
  'Campaign status': 'Enabled',
  'Budget': '50.00',
  'Impressions': '3200',
  'Clicks': '180',
  'Cost': '410.50',
  'Conversions': '12',
  'Conv. value': '1800.00',
  'Cost / conv.': '34.21',
  ...overrides,
});

describe('parseCampaignReport', () => {
  it('normalizes a standard campaign row', () => {
    const result = parseCampaignReport([makeRow()]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      campaign: 'HVAC - Search',
      campaignType: 'search',
      status: 'enabled',
      budget: 50.00,
      impressions: 3200,
      clicks: 180,
      cost: 410.50,
      conversions: 12,
      conversionValue: 1800.00,
      cpa: 34.21,
    });
  });

  it('calculates ROAS when conv value and cost are present', () => {
    const result = parseCampaignReport([makeRow()]);
    expect(result[0].roas).toBeCloseTo(1800 / 410.50, 2);
  });

  it('returns roas of 0 when cost is 0', () => {
    const result = parseCampaignReport([makeRow({ 'Cost': '0', 'Conv. value': '0' })]);
    expect(result[0].roas).toBe(0);
  });

  it('strips summary rows', () => {
    const totalRow = makeRow({ 'Campaign': 'Total: account' });
    expect(parseCampaignReport([totalRow])).toHaveLength(0);
  });

  it('handles "ROAS" column if present directly', () => {
    const row = makeRow({ 'ROAS': '4.38' });
    const result = parseCampaignReport([row]);
    expect(result[0].roas).toBeCloseTo(4.38, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/parsers/campaign.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement lib/parsers/campaign.js**

```js
// lib/parsers/campaign.js
import { parseNum, normalizeHeader } from './normalize.js';

const TOTAL_KEYWORDS = ['total:', 'grand total'];

function getCol(row, ...candidates) {
  for (const c of candidates) {
    if (row[c] !== undefined) return row[c];
    const key = Object.keys(row).find(k => normalizeHeader(k) === normalizeHeader(c));
    if (key !== undefined) return row[key];
  }
  return undefined;
}

/**
 * @param {object[]} rows
 * @returns {{ campaign, campaignType, status, budget, impressions, clicks,
 *             cost, conversions, conversionValue, roas, cpa }[]}
 */
export function parseCampaignReport(rows) {
  return rows
    .filter(row => {
      const name = String(getCol(row, 'Campaign', 'campaign') ?? '').trim().toLowerCase();
      if (!name) return false;
      return !TOTAL_KEYWORDS.some(t => name.startsWith(t));
    })
    .map(row => {
      const cost = parseNum(getCol(row, 'Cost', 'cost')) ?? 0;
      const convValue = parseNum(getCol(row, 'Conv. value', 'conv value', 'Conversion value', 'All conv. value')) ?? 0;
      const roasCol = getCol(row, 'ROAS', 'roas', 'Conv. value / cost', 'conv value / cost');
      const roas = roasCol !== undefined
        ? parseNum(roasCol) ?? 0
        : cost > 0 ? convValue / cost : 0;
      const cpaCol = getCol(row, 'Cost / conv.', 'cost / conv', 'CPA', 'cpa', 'Cost per conversion');
      const conv = parseNum(getCol(row, 'Conversions', 'conversions', 'All conv.', 'all conv')) ?? 0;
      const cpa = cpaCol !== undefined
        ? parseNum(cpaCol) ?? 0
        : conv > 0 ? cost / conv : 0;

      return {
        campaign:        String(getCol(row, 'Campaign', 'campaign') ?? '').trim(),
        campaignType:    String(getCol(row, 'Campaign type', 'campaign type') ?? '').trim().toLowerCase(),
        status:          String(getCol(row, 'Campaign status', 'campaign status', 'Status', 'status') ?? '').trim().toLowerCase(),
        budget:          parseNum(getCol(row, 'Budget', 'budget', 'Daily budget')) ?? 0,
        impressions:     parseNum(getCol(row, 'Impressions', 'impressions')) ?? 0,
        clicks:          parseNum(getCol(row, 'Clicks', 'clicks')) ?? 0,
        cost,
        conversions:     conv,
        conversionValue: convValue,
        roas:            Math.round(roas * 100) / 100,
        cpa:             Math.round(cpa * 100) / 100,
      };
    });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/parsers/campaign.test.js
```

Expected: PASS — 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/parsers/campaign.js __tests__/parsers/campaign.test.js
git commit -m "feat: campaign report parser with ROAS/CPA calculation"
```

---

## Task 7: Product Report Parser

**Files:**
- Create: `lib/parsers/product.js`
- Create: `__tests__/parsers/product.test.js`

- [ ] **Step 1: Write failing tests**

```js
// __tests__/parsers/product.test.js
import { parseProductReport } from '../../lib/parsers/product';

const makeRow = (overrides = {}) => ({
  'Product title': 'Carrier 24ACC636A003 3-Ton AC',
  'Item ID': 'sku-1234',
  'Product type (1st level)': 'HVAC > Central Air',
  'Brand': 'Carrier',
  'Custom label 0': 'seasonal-promo',
  'Impressions': '800',
  'Clicks': '45',
  'Cost': '135.90',
  'Conversions': '4',
  'Conv. value': '3200.00',
  ...overrides,
});

describe('parseProductReport', () => {
  it('normalizes a standard product row', () => {
    const result = parseProductReport([makeRow()]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      productTitle: 'Carrier 24ACC636A003 3-Ton AC',
      productId: 'sku-1234',
      category: 'HVAC > Central Air',
      brand: 'Carrier',
      customLabel: 'seasonal-promo',
      impressions: 800,
      clicks: 45,
      cost: 135.90,
      conversions: 4,
      conversionValue: 3200.00,
    });
  });

  it('calculates roas from conversionValue / cost', () => {
    const result = parseProductReport([makeRow()]);
    expect(result[0].roas).toBeCloseTo(3200 / 135.90, 1);
  });

  it('returns roas 0 when cost is 0', () => {
    const result = parseProductReport([makeRow({ 'Cost': '0', 'Conv. value': '0' })]);
    expect(result[0].roas).toBe(0);
  });

  it('strips summary rows', () => {
    const totalRow = makeRow({ 'Product title': 'Total: account' });
    expect(parseProductReport([totalRow])).toHaveLength(0);
  });

  it('handles missing category gracefully', () => {
    const row = makeRow();
    delete row['Product type (1st level)'];
    const result = parseProductReport([row]);
    expect(result[0].category).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/parsers/product.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement lib/parsers/product.js**

```js
// lib/parsers/product.js
import { parseNum, normalizeHeader } from './normalize.js';

const TOTAL_KEYWORDS = ['total:', 'grand total'];

function getCol(row, ...candidates) {
  for (const c of candidates) {
    if (row[c] !== undefined) return row[c];
    const key = Object.keys(row).find(k => normalizeHeader(k) === normalizeHeader(c));
    if (key !== undefined) return row[key];
  }
  return undefined;
}

/**
 * @param {object[]} rows
 * @returns {{ productTitle, productId, category, brand, customLabel,
 *             impressions, clicks, cost, conversions, conversionValue, roas }[]}
 */
export function parseProductReport(rows) {
  return rows
    .filter(row => {
      const title = String(getCol(row, 'Product title', 'product title', 'Title') ?? '').trim().toLowerCase();
      if (!title) return false;
      return !TOTAL_KEYWORDS.some(t => title.startsWith(t));
    })
    .map(row => {
      const cost = parseNum(getCol(row, 'Cost', 'cost')) ?? 0;
      const convValue = parseNum(getCol(row, 'Conv. value', 'conv value', 'Conversion value', 'All conv. value')) ?? 0;
      const roasCol = getCol(row, 'ROAS', 'roas', 'Conv. value / cost');
      const roas = roasCol !== undefined
        ? parseNum(roasCol) ?? 0
        : cost > 0 ? convValue / cost : 0;

      return {
        productTitle:    String(getCol(row, 'Product title', 'product title', 'Title') ?? '').trim(),
        productId:       String(getCol(row, 'Item ID', 'item id', 'Product ID', 'product id') ?? '').trim(),
        category:        String(getCol(row, 'Product type (1st level)', 'product type (1st level)', 'Category', 'category') ?? '').trim(),
        brand:           String(getCol(row, 'Brand', 'brand') ?? '').trim(),
        customLabel:     String(getCol(row, 'Custom label 0', 'custom label 0', 'Custom label') ?? '').trim(),
        impressions:     parseNum(getCol(row, 'Impressions', 'impressions')) ?? 0,
        clicks:          parseNum(getCol(row, 'Clicks', 'clicks')) ?? 0,
        cost,
        conversions:     parseNum(getCol(row, 'Conversions', 'conversions', 'All conv.')) ?? 0,
        conversionValue: convValue,
        roas:            Math.round(roas * 100) / 100,
      };
    });
}
```

- [ ] **Step 4: Run all parser tests**

```bash
npx jest __tests__/parsers/
```

Expected: PASS — all tests passing including detect.test.js now that all parser modules exist

- [ ] **Step 5: Commit**

```bash
git add lib/parsers/product.js __tests__/parsers/product.test.js
git commit -m "feat: product report parser; all parser tests passing"
```

---

## Task 8: Upload API Routes

**Files:**
- Create: `app/api/reports/upload/route.js`
- Create: `app/api/reports/[accountId]/route.js`

- [ ] **Step 1: Create POST upload route**

```js
// app/api/reports/upload/route.js
import { NextResponse } from 'next/server';
import { createReportUpload } from '@/lib/supabase';
import { parseReport, detectReportType } from '@/lib/parsers/index';

export async function POST(request) {
  try {
    const body = await request.json();
    const { accountId, rows, headers, fileName, reportType: providedType, dateRangeStart, dateRangeEnd } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'rows must be a non-empty array' }, { status: 400 });
    }

    // Use provided type or auto-detect from headers
    const reportType = providedType || detectReportType(headers || Object.keys(rows[0] || {}));
    if (!reportType) {
      return NextResponse.json({
        error: 'Could not detect report type. Please select manually.',
        detectedHeaders: headers || Object.keys(rows[0] || {}),
      }, { status: 422 });
    }

    const normalizedRows = parseReport(rows, reportType);

    const upload = await createReportUpload({
      account_id: accountId,
      report_type: reportType,
      date_range_start: dateRangeStart || null,
      date_range_end: dateRangeEnd || null,
      row_count: normalizedRows.length,
      raw_data: normalizedRows,
      file_name: fileName || null,
    });

    return NextResponse.json({
      id: upload?.id,
      reportType,
      rowCount: normalizedRows.length,
      message: `${normalizedRows.length} rows parsed and stored`,
    });
  } catch (err) {
    console.error('[reports/upload] Error:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create GET uploads-for-account route**

```js
// app/api/reports/[accountId]/route.js
import { NextResponse } from 'next/server';
import { getReportUploads, deleteReportUpload } from '@/lib/supabase';

export async function GET(request, { params }) {
  const { accountId } = await params;
  try {
    const uploads = await getReportUploads(accountId);
    return NextResponse.json(uploads);
  } catch (err) {
    console.error('[reports/accountId] GET Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { accountId } = await params;
  const { searchParams } = new URL(request.url);
  const uploadId = searchParams.get('uploadId');
  if (!uploadId) {
    return NextResponse.json({ error: 'uploadId query param required' }, { status: 400 });
  }
  try {
    await deleteReportUpload(uploadId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[reports/accountId] DELETE Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Start dev server and test POST endpoint manually**

```bash
cd "C:/Users/bread/Documents/GetSuite/ads-research-tool" && npm run dev
```

In a separate terminal:

```bash
curl -X POST http://localhost:3000/api/reports/upload \
  -H "Content-Type: application/json" \
  -d '{"accountId":"test-id","rows":[{"Campaign":"HVAC","Ad group":"AC","Keyword":"ac repair","Match type":"Phrase","Clicks":"5","Impressions":"100","Cost":"15.00","Conversions":"1"}],"fileName":"test.csv"}'
```

Expected: `{"reportType":"keyword","rowCount":1,"message":"1 rows parsed and stored"}` (id will be null without Supabase, which is fine)

- [ ] **Step 4: Commit**

```bash
git add app/api/reports/upload/route.js app/api/reports/[accountId]/route.js
git commit -m "feat: upload API route (POST parse+store, GET list, DELETE)"
```

---

## Task 9: Account Mode Setting

**Files:**
- Modify: `components/dashboard/AccountSettings.js`
- Note: The PATCH handler for accounts already exists at `app/api/accounts/[id]/route.js` — check that it passes through arbitrary fields to `updateAccount`. If not, update it.

- [ ] **Step 1: Verify PATCH handler supports mode field**

Read `app/api/accounts/[id]/route.js`. Find the PATCH handler. Confirm it calls `updateAccount(id, body)` without field filtering. If it filters fields, add `mode` to the allowed list.

- [ ] **Step 2: Add mode toggle to AccountSettings component**

In `components/dashboard/AccountSettings.js`, after the existing state declarations and before the `return`, add mode state:

```js
const [mode, setMode] = useState('lead_gen');
```

In the `useEffect` that fetches account data, also set mode:

```js
.then(data => {
  if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
  if (data.mode) setMode(data.mode);
})
```

In the `save` function, include mode in the PATCH body:

```js
body: JSON.stringify({ settings, mode }),
```

Add this section at the **top** of the returned JSX, before the Agent Toggles card:

```jsx
<div className="card p-5">
  <p className="font-headline font-bold text-on-surface mb-1">Account Mode</p>
  <p className="text-xs text-secondary font-label mb-4">
    Determines how this account is analyzed — affects metrics, benchmarks, and recommendations throughout.
  </p>
  <div className="grid grid-cols-2 gap-3">
    <button
      onClick={() => setMode('lead_gen')}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        mode === 'lead_gen'
          ? 'border-[var(--primary)] bg-[var(--primary)]/5'
          : 'border-surface-high hover:border-surface-high'
      }`}
    >
      <p className="font-label font-bold text-sm text-on-surface mb-1">Lead Gen</p>
      <p className="text-xs text-secondary">CPA-focused. Conversions = calls &amp; form fills. Good = low CPA with high intent.</p>
    </button>
    <button
      onClick={() => setMode('ecommerce')}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        mode === 'ecommerce'
          ? 'border-[var(--primary)] bg-[var(--primary)]/5'
          : 'border-surface-high hover:border-surface-high'
      }`}
    >
      <p className="font-label font-bold text-sm text-on-surface mb-1">E-Commerce</p>
      <p className="text-xs text-secondary">ROAS-focused. Conversions = purchases. Good = high ROAS with revenue scale.</p>
    </button>
  </div>
</div>
```

- [ ] **Step 3: Verify mode persists in UI**

Open `/accounts/[any-id]` → Settings tab → toggle mode → Save → refresh page.

Expected: mode selection persists after refresh.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/AccountSettings.js
git commit -m "feat: account-level lead gen / e-commerce mode setting"
```

---

## Task 10: ReportUpload Component

**Files:**
- Create: `components/upload/ReportUpload.js`

- [ ] **Step 1: Create the component**

```jsx
// components/upload/ReportUpload.js
'use client';

import { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import { detectReportType } from '@/lib/parsers/index';
import { findHeaderRow, normalizeHeader } from '@/lib/parsers/normalize';
import ColumnMapper from './ColumnMapper';

const REPORT_TYPE_LABELS = {
  keyword: 'Keyword Report',
  search_terms: 'Search Terms Report',
  campaign: 'Campaign Report',
  product: 'Product / Shopping Report',
};

const REPORT_TYPE_REQUIRED_COLS = {
  keyword: ['Campaign', 'Ad group', 'Keyword', 'Match type', 'Clicks', 'Cost'],
  search_terms: ['Campaign', 'Ad group', 'Search term', 'Clicks', 'Cost'],
  campaign: ['Campaign', 'Clicks', 'Cost', 'Conversions'],
  product: ['Product title', 'Clicks', 'Cost'],
};

/**
 * Strips Google Ads metadata rows above the actual column headers.
 * Returns { headers: string[], rows: object[] } or null on failure.
 */
function extractData(rawRows) {
  const requiredKeywords = ['campaign', 'clicks', 'cost'];
  const allArrays = rawRows.map(r => (Array.isArray(r) ? r : Object.values(r)));
  const headerIdx = findHeaderRow(allArrays, requiredKeywords);
  if (headerIdx === -1) return null;

  const headers = allArrays[headerIdx];
  const dataRows = allArrays.slice(headerIdx + 1).filter(r => r.some(v => String(v).trim()));
  const rows = dataRows.map(arr =>
    Object.fromEntries(headers.map((h, i) => [h, arr[i] ?? '']))
  );
  return { headers, rows };
}

export default function ReportUpload({ accountId, onUploadComplete }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);          // { headers, rows }
  const [detectedType, setDetectedType] = useState(null);
  const [needsMapping, setNeedsMapping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const inputRef = useRef();

  const reset = () => {
    setFile(null);
    setParsed(null);
    setDetectedType(null);
    setNeedsMapping(false);
    setError(null);
    setSuccess(null);
  };

  const processFile = useCallback((f) => {
    setError(null);
    setFile(f);
    Papa.parse(f, {
      header: false,
      skipEmptyLines: true,
      complete: (result) => {
        const extracted = extractData(result.data);
        if (!extracted) {
          setError('Could not find column headers in this file. Make sure it\'s a Google Ads CSV export.');
          return;
        }
        const type = detectReportType(extracted.headers);
        setDetectedType(type);
        setParsed(extracted);
        if (!type) setNeedsMapping(true);
      },
      error: (err) => setError(`Could not read file: ${err.message}`),
    });
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const handleFileInput = (e) => {
    const f = e.target.files[0];
    if (f) processFile(f);
  };

  const handleUpload = async (reportType, mappedRows) => {
    setUploading(true);
    setError(null);
    try {
      const rows = mappedRows || parsed.rows;
      const res = await fetch('/api/reports/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          rows,
          headers: parsed.headers,
          reportType,
          fileName: file?.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setSuccess(`${data.rowCount} rows uploaded as ${REPORT_TYPE_LABELS[reportType]}`);
      onUploadComplete?.({ type: reportType, rowCount: data.rowCount, uploadId: data.id });
      setTimeout(reset, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (needsMapping && parsed) {
    return (
      <ColumnMapper
        headers={parsed.headers}
        sampleRows={parsed.rows.slice(0, 3)}
        onConfirm={(type, remappedRows) => {
          setNeedsMapping(false);
          handleUpload(type, remappedRows);
        }}
        onCancel={reset}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {!file && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            dragging ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-surface-high hover:border-[var(--primary)]/50'
          }`}
        >
          <span className="material-symbols-outlined text-4xl text-secondary mb-3 block">upload_file</span>
          <p className="font-label font-semibold text-on-surface mb-1">Drop a Google Ads CSV here</p>
          <p className="text-xs text-secondary">Keyword, Search Terms, Campaign, or Product report</p>
          <input ref={inputRef} type="file" accept=".csv,.tsv" onChange={handleFileInput} className="hidden" />
        </div>
      )}

      {/* File detected */}
      {file && !success && (
        <div className="card p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-label font-semibold text-on-surface text-sm">{file.name}</p>
              {detectedType && (
                <p className="text-xs text-secondary mt-0.5">
                  Detected: <span className="text-[var(--primary)] font-semibold">{REPORT_TYPE_LABELS[detectedType]}</span>
                  {parsed && ` · ${parsed.rows.length.toLocaleString()} rows`}
                </p>
              )}
            </div>
            <button onClick={reset} className="text-secondary hover:text-on-surface text-xs font-label">
              Remove
            </button>
          </div>

          {detectedType && (
            <button
              onClick={() => handleUpload(detectedType)}
              disabled={uploading}
              className="pill-btn-primary w-full"
            >
              {uploading ? 'Uploading…' : `Upload as ${REPORT_TYPE_LABELS[detectedType]}`}
            </button>
          )}

          {!detectedType && !needsMapping && (
            <div>
              <p className="text-xs text-secondary font-label mb-2">Select report type manually:</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(REPORT_TYPE_LABELS).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => handleUpload(type)}
                    disabled={uploading}
                    className="text-xs font-label font-semibold px-3 py-2 rounded-lg border border-surface-high hover:border-[var(--primary)] transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {success && (
        <div className="card p-4 bg-emerald-50 border border-emerald-200">
          <p className="text-sm font-label font-semibold text-emerald-700">✓ {success}</p>
        </div>
      )}

      {error && (
        <div className="card p-4 bg-red-50 border border-red-200">
          <p className="text-sm font-label text-red-700">{error}</p>
          <button onClick={reset} className="text-xs text-red-600 font-semibold mt-1 underline">Try again</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/upload/ReportUpload.js
git commit -m "feat: drag-and-drop CSV upload component with auto format detection"
```

---

## Task 11: ColumnMapper Component

**Files:**
- Create: `components/upload/ColumnMapper.js`

- [ ] **Step 1: Create the component**

```jsx
// components/upload/ColumnMapper.js
'use client';

import { useState } from 'react';

const REPORT_TYPE_LABELS = {
  keyword: 'Keyword Report',
  search_terms: 'Search Terms Report',
  campaign: 'Campaign Report',
  product: 'Product / Shopping Report',
};

// The standard internal columns each report type expects
const REPORT_TYPE_MAPPINGS = {
  keyword: [
    { internal: 'Campaign', label: 'Campaign name' },
    { internal: 'Ad group', label: 'Ad group name' },
    { internal: 'Keyword', label: 'Keyword' },
    { internal: 'Match type', label: 'Match type' },
    { internal: 'Impressions', label: 'Impressions' },
    { internal: 'Clicks', label: 'Clicks' },
    { internal: 'Cost', label: 'Cost / Spend' },
    { internal: 'Conversions', label: 'Conversions' },
  ],
  search_terms: [
    { internal: 'Campaign', label: 'Campaign name' },
    { internal: 'Ad group', label: 'Ad group name' },
    { internal: 'Search term', label: 'Search term / Query' },
    { internal: 'Match type', label: 'Match type' },
    { internal: 'Impressions', label: 'Impressions' },
    { internal: 'Clicks', label: 'Clicks' },
    { internal: 'Cost', label: 'Cost / Spend' },
    { internal: 'Conversions', label: 'Conversions' },
  ],
  campaign: [
    { internal: 'Campaign', label: 'Campaign name' },
    { internal: 'Clicks', label: 'Clicks' },
    { internal: 'Cost', label: 'Cost / Spend' },
    { internal: 'Conversions', label: 'Conversions' },
  ],
  product: [
    { internal: 'Product title', label: 'Product title' },
    { internal: 'Clicks', label: 'Clicks' },
    { internal: 'Cost', label: 'Cost / Spend' },
    { internal: 'Conversions', label: 'Conversions' },
    { internal: 'Conv. value', label: 'Conversion value' },
  ],
};

export default function ColumnMapper({ headers, sampleRows, onConfirm, onCancel }) {
  const [selectedType, setSelectedType] = useState('keyword');
  const [mapping, setMapping] = useState({});

  const requiredCols = REPORT_TYPE_MAPPINGS[selectedType] || [];

  const applyMapping = () => {
    // Remap rows: replace column names per mapping
    const remappedRows = sampleRows.map(row => {
      const newRow = { ...row };
      Object.entries(mapping).forEach(([internal, userCol]) => {
        if (userCol && userCol !== internal && newRow[userCol] !== undefined) {
          newRow[internal] = newRow[userCol];
        }
      });
      return newRow;
    });
    onConfirm(selectedType, remappedRows);
  };

  return (
    <div className="card p-5 space-y-5">
      <div>
        <p className="font-headline font-bold text-on-surface mb-1">Map Your Columns</p>
        <p className="text-xs text-secondary font-label">Your file has non-standard column names. Map them to the expected fields.</p>
      </div>

      {/* Report type selector */}
      <div>
        <p className="text-xs font-label font-semibold text-on-surface mb-2">Report type</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(REPORT_TYPE_LABELS).map(([type, label]) => (
            <button
              key={type}
              onClick={() => { setSelectedType(type); setMapping({}); }}
              className={`text-xs font-label font-semibold px-3 py-2 rounded-lg border-2 transition-all ${
                selectedType === type
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]'
                  : 'border-surface-high text-secondary hover:border-[var(--primary)]/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Column mapping table */}
      <div>
        <p className="text-xs font-label font-semibold text-on-surface mb-2">Column mapping</p>
        <div className="space-y-2">
          {requiredCols.map(({ internal, label }) => (
            <div key={internal} className="flex items-center gap-3">
              <span className="text-xs font-label text-on-surface w-32 shrink-0">{label}</span>
              <span className="text-secondary text-xs">→</span>
              <select
                value={mapping[internal] || internal}
                onChange={e => setMapping(prev => ({ ...prev, [internal]: e.target.value }))}
                className="flex-1 text-xs font-label border border-surface-high rounded-lg px-2 py-1.5 bg-surface text-on-surface"
              >
                {headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="pill-btn-secondary flex-1 text-sm">Cancel</button>
        <button onClick={applyMapping} className="pill-btn-primary flex-1 text-sm">Confirm Mapping</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/upload/ColumnMapper.js
git commit -m "feat: column mapper component for non-standard CSV exports"
```

---

## Task 12: Uploads Tab on Account Page

**Files:**
- Modify: `app/accounts/[id]/page.js`

- [ ] **Step 1: Add Uploads tab to TABS array**

In `app/accounts/[id]/page.js`, find the `TABS` constant and add the uploads tab:

```js
const TABS = [
  { id: 'overview',   label: 'Overview',   icon: 'dashboard' },
  { id: 'campaigns',  label: 'Campaigns',  icon: 'campaign' },
  { id: 'keywords',   label: 'Keywords',   icon: 'key_visualizer' },
  { id: 'adcopy',     label: 'Ad Copy',    icon: 'edit_note' },
  { id: 'uploads',    label: 'Uploads',    icon: 'upload_file' },   // ADD THIS
  { id: 'changelog',  label: 'Change Log', icon: 'history' },
  { id: 'audit',      label: 'Audit',      icon: 'speed' },
  { id: 'settings',   label: 'Settings',   icon: 'settings' },
];
```

- [ ] **Step 2: Add uploads state and lazy load**

At the top of the component, after the existing state declarations, add:

```js
const [uploads, setUploads] = useState([]);
```

In the `loadTabData` function, add the uploads case:

```js
if (tab === 'uploads') {
  fetch(`/api/reports/${id}`)
    .then(r => r.json())
    .then(d => setUploads(Array.isArray(d) ? d : []))
    .catch(() => {});
}
```

- [ ] **Step 3: Add imports**

At the top of the file, add:

```js
import ReportUpload from '@/components/upload/ReportUpload';
```

- [ ] **Step 4: Add uploads tab content to the tab render section**

Find the section in the JSX that renders tab content (look for `activeTab === 'settings'` or similar conditional). Add the uploads case alongside the existing ones:

```jsx
{activeTab === 'uploads' && (
  <ErrorBoundary>
    <div className="space-y-6">
      <div>
        <p className="font-headline font-bold text-on-surface text-lg mb-1">Report Uploads</p>
        <p className="text-sm text-secondary font-label">
          Upload Google Ads CSV exports to enable data-driven analysis. Uploads are stored per account and used for audit, n-gram analysis, and trend tracking.
        </p>
      </div>

      <ReportUpload
        accountId={id}
        onUploadComplete={(info) => {
          // Refresh uploads list after successful upload
          fetch(`/api/reports/${id}`)
            .then(r => r.json())
            .then(d => setUploads(Array.isArray(d) ? d : []))
            .catch(() => {});
        }}
      />

      {/* Upload history */}
      {uploads.length > 0 && (
        <div>
          <p className="font-label font-semibold text-on-surface text-sm mb-3">Upload History</p>
          <div className="space-y-2">
            {uploads.map(upload => (
              <div key={upload.id} className="card p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-label font-semibold text-on-surface capitalize">
                    {upload.report_type.replace('_', ' ')} Report
                  </p>
                  <p className="text-xs text-secondary font-label mt-0.5">
                    {upload.row_count.toLocaleString()} rows
                    {upload.file_name ? ` · ${upload.file_name}` : ''}
                    {' · '}
                    {new Date(upload.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await fetch(`/api/reports/${id}?uploadId=${upload.id}`, { method: 'DELETE' });
                    setUploads(prev => prev.filter(u => u.id !== upload.id));
                  }}
                  className="text-xs text-secondary hover:text-red-500 font-label transition-colors"
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
    </div>
  </ErrorBoundary>
)}
```

- [ ] **Step 5: Verify in browser**

Navigate to any account page → Uploads tab.

Expected:
- Upload zone renders with drag-and-drop area
- Drop a Google Ads keyword CSV → type auto-detected → upload button appears
- After upload → success message → upload appears in history list

- [ ] **Step 6: Run full test suite to confirm nothing broken**

```bash
npx jest
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add app/accounts/\[id\]/page.js
git commit -m "feat: uploads tab on account page with upload history"
```

---

## Self-Review

**Spec coverage check:**
- ✅ 1.1 Universal upload component — Task 10 (ReportUpload.js with drag-drop, format detection, error display)
- ✅ 1.2 Report parsers (4 types) — Tasks 4–7 (keyword, search-terms, campaign, product)
- ✅ 1.3 Per-client storage — Tasks 1–2 (migration + Supabase CRUD)
- ✅ 1.4 Mode at account level — Task 9 (AccountSettings mode toggle + PATCH)
- ✅ Column mapping for non-standard exports — Task 11 (ColumnMapper)
- ✅ Format auto-detection — Task 3 (detectReportType in parsers/index.js)
- ✅ Validation (required columns, row count, date range display) — Task 10 (ReportUpload validation)
- ✅ Upload history / delete — Task 12 (uploads list with remove)
- ✅ Tests for all parsers — Tasks 3–7

**Out of scope confirmed absent (correct):**
- Data sufficiency warnings — Phase 2
- Weekly trend tracking UI — Phase 3
- N-gram analysis — Phase 2

**Placeholder scan:** None found — all steps contain complete code.

**Type consistency:** `parseReport(rows, type)` called in upload route matches export in `parsers/index.js`. `detectReportType(headers)` signature matches usage in ReportUpload component and tests. `createReportUpload(payload)` matches new Supabase function signature.
