# Phase 3: Keyword Engine + Data Sources — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Keyword Intelligence Engine page with multi-source data integration (Google Trends, weather forecasts, Google Keyword Planner) for smarter, location-aware keyword recommendations. Includes trend sparklines, data source badges, Google Ads CSV export, and a GA4 integration architecture slot.

**Architecture:** The Keyword Engine lives at `/accounts/[id]/keywords` and is scoped to a specific client account. It pulls from three external data sources — Google Trends (seasonal patterns, already partially implemented in `app/api/trends/route.js`), OpenWeatherMap (demand surge correlation for service verticals), and Google Keyword Planner (real CPC/volume via existing `lib/google-ads.js`). Each source is encapsulated in `lib/data-sources/` with a common enrichment interface so new sources (like GA4) can be added later. A server-side aggregation layer merges all insights and feeds the keyword priority matrix. The existing trends API route is refactored to use the new data source module.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS (Intelligence Layer tokens from Phase 1), Supabase, Gemini 2.5 Flash, Google Trends (direct HTTP — existing `app/api/trends/route.js` approach), OpenWeatherMap free tier, existing Google Ads Keyword Planner integration (`lib/google-ads.js`), SVG sparklines (inline, no extra dependency), Jest 29

**Design Reference:** Read `docs/design-references/keyword_research_engine/code.html` for exact component patterns. Read `docs/design-references/synthetix_intelligence/DESIGN.md` for design rules.

**Prerequisite:** Phase 1 (design system, AppShell, SidebarNav, StatCard, StatusBadge, GhostButton, GradientButton, Skeleton) and Phase 2 (Analysis Hub, CircularGrade, TabNav) must be complete.

---

## File Map

**New files:**
- `lib/data-sources/trends.js` — Google Trends fetcher extracted from existing route + 24h cache
- `lib/data-sources/weather.js` — OpenWeatherMap client + demand surge triggers per vertical
- `lib/data-sources/index.js` — data source aggregation layer (enriches keywords with all sources)
- `lib/export-google-ads-csv.js` — Google Ads Editor CSV export builder
- `app/api/weather/route.js` — GET: fetch weather forecast for location
- `app/api/keywords/intelligence/route.js` — POST: merge all sources into keyword intelligence
- `components/keyword-engine/IntentDonut.js` — SVG donut chart for intent distribution
- `components/keyword-engine/KeywordMetrics.js` — 3 metric cards row (Avg CPC, Efficiency Score, Est. Conversions)
- `components/keyword-engine/PriorityMatrix.js` — sortable keyword table with competition bars, trend sparklines, data source badges, row actions
- `components/keyword-engine/TrendSparkline.js` — tiny SVG sparkline for 12-month trend data
- `components/keyword-engine/AiInsights.js` — insights sidebar with weather alerts, seasonal indicators, data source status
- `app/accounts/[id]/keywords/page.js` — Keyword Engine page
- `__tests__/data-sources/weather.test.js` — weather trigger tests
- `__tests__/data-sources/aggregation.test.js` — aggregation layer tests
- `__tests__/export-google-ads-csv.test.js` — CSV export tests

**Modified files:**
- `app/api/trends/route.js` — refactor to use `lib/data-sources/trends.js` (preserve existing behavior)
- `components/Sidebar.js` — add Keyword Engine nav entry (context-aware: links to current account's keywords page when on an account route)
- `.env.example` — add `OPENWEATHERMAP_API_KEY`

**Preserved (logic untouched):**
- `lib/google-ads.js` — existing Keyword Planner integration (`enrichKeywordData`, `getKeywordMetrics`)
- `app/api/keyword-planner/route.js` — existing standalone enrichment endpoint
- `app/api/keyword-research/route.js` — existing Gemini keyword research + Planner enrichment
- `lib/benchmarks.js` — existing `SEASONALITY_MULTIPLIERS` (used as fallback when Trends unavailable)

---

## Task 0: Environment Setup

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add weather API key to .env.example**

Read `.env.example` and append:

```
# OpenWeatherMap (free tier — https://openweathermap.org/api)
OPENWEATHERMAP_API_KEY=your_key_here
```

No npm packages need to be installed — the existing trends implementation uses direct HTTP (not the `google-trends-api` npm package), and OpenWeatherMap uses `fetch` which is built into Node.js 18+.

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "feat: add OpenWeatherMap API key placeholder to .env.example"
```

---

## Task 1: Extract Trends Data Source

The existing `app/api/trends/route.js` has Google Trends fetching logic inlined. We extract the core logic into `lib/data-sources/trends.js` so the aggregation layer can call it server-side without going through HTTP.

**Files:**
- Create: `lib/data-sources/trends.js`
- Modify: `app/api/trends/route.js`

- [ ] **Step 1: Create trends data source module**

Read the existing `app/api/trends/route.js` to understand the current implementation. It uses:
- In-memory cache with 24h TTL keyed by `"keyword|GEO"`
- `normalizeToMultipliers(values)` — divides each value by the 12-month average
- `fetchGoogleTrends(keyword, geo)` — scrapes `trends.google.com/trends/api/widgetdata/multiline`
- Returns `{ multipliers: number[12], source: 'google_trends' | 'benchmark_fallback' }`

Create `lib/data-sources/trends.js` by extracting the core logic:

```js
import { getSeasonalMultipliers as getBenchmarkMultipliers } from '@/lib/benchmarks';

// In-memory cache: { [key]: { data, cachedAt } }
const trendsCache = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(keyword, geo) {
  return `${keyword.toLowerCase()}|${geo}`;
}

function isStale(entry) {
  return !entry || Date.now() - entry.cachedAt > CACHE_TTL;
}

/**
 * Normalize an array of interest values to multipliers (1.0 = average month).
 */
export function normalizeToMultipliers(values) {
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  if (avg === 0) return values.map(() => 1);
  return values.map(v => parseFloat((v / avg).toFixed(3)));
}

/**
 * Fetch 12-month trend multipliers for a keyword from Google Trends.
 * Returns { multipliers: number[12], source: 'google_trends' | 'benchmark_fallback', keyword, geo }
 * Falls back to flat [1,1,...1] with source 'benchmark_fallback' on failure.
 */
export async function fetchTrendMultipliers(keyword, geo = 'US') {
  const key = getCacheKey(keyword, geo);

  // Check cache
  if (trendsCache[key] && !isStale(trendsCache[key])) {
    return trendsCache[key].data;
  }

  try {
    // Step 1: Get the explore page to obtain widget tokens
    const exploreUrl = `https://trends.google.com/trends/api/explore?hl=en-US&tz=240&req=${encodeURIComponent(
      JSON.stringify({
        comparisonItem: [{ keyword, geo, time: 'today 12-m' }],
        category: 0,
        property: '',
      })
    )}`;

    const exploreRes = await fetch(exploreUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!exploreRes.ok) throw new Error(`Explore ${exploreRes.status}`);

    const exploreText = await exploreRes.text();
    const exploreJson = JSON.parse(exploreText.substring(exploreText.indexOf('{')));
    const widget = exploreJson.widgets?.find(w => w.id === 'TIMESERIES');
    if (!widget?.token) throw new Error('No TIMESERIES widget');

    // Step 2: Fetch the actual time series data
    const timeseriesUrl = `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=240&req=${encodeURIComponent(
      JSON.stringify(widget.request)
    )}&token=${widget.token}`;

    const tsRes = await fetch(timeseriesUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!tsRes.ok) throw new Error(`Timeseries ${tsRes.status}`);

    const tsText = await tsRes.text();
    const tsJson = JSON.parse(tsText.substring(tsText.indexOf('{')));
    const timelineData = tsJson.default?.timelineData || [];

    if (timelineData.length === 0) throw new Error('Empty timeline');

    // Group by month (0-11) and average
    const monthBuckets = Array.from({ length: 12 }, () => []);
    timelineData.forEach(point => {
      const ts = parseInt(point.time, 10) * 1000;
      const month = new Date(ts).getMonth();
      const value = point.value?.[0] ?? 0;
      monthBuckets[month].push(value);
    });

    const monthlyAvgs = monthBuckets.map(bucket =>
      bucket.length > 0 ? bucket.reduce((a, b) => a + b, 0) / bucket.length : 0
    );

    const multipliers = normalizeToMultipliers(monthlyAvgs);

    const result = { multipliers, source: 'google_trends', keyword, geo };
    trendsCache[key] = { data: result, cachedAt: Date.now() };
    return result;
  } catch (err) {
    console.error(`Google Trends error for "${keyword}" (${geo}):`, err.message);

    // Fallback to flat multipliers
    const result = {
      multipliers: Array(12).fill(1.0),
      source: 'benchmark_fallback',
      keyword,
      geo,
      fallback_reason: err.message,
    };
    trendsCache[key] = { data: result, cachedAt: Date.now() };
    return result;
  }
}

/**
 * Batch fetch trends for multiple keywords. Returns Map<keyword, multipliers[]>.
 * Limits to top N keywords to avoid rate limiting.
 */
export async function batchFetchTrends(keywords, geo = 'US', limit = 5) {
  const top = keywords.slice(0, limit);
  const results = new Map();

  // Sequential to avoid Google rate limiting
  for (const kw of top) {
    const result = await fetchTrendMultipliers(kw, geo);
    results.set(kw, result);
  }

  return results;
}
```

- [ ] **Step 2: Refactor existing trends API route**

Read `app/api/trends/route.js`. Replace its implementation to delegate to the new module. The route's external API contract stays identical: `GET /api/trends?keyword=...&geo=...` returns `{ multipliers, source, keyword, geo }`.

Replace `app/api/trends/route.js`:

```js
import { NextResponse } from 'next/server';
import { fetchTrendMultipliers } from '@/lib/data-sources/trends';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword');
  const geo = searchParams.get('geo') || 'US';

  if (!keyword) {
    return NextResponse.json({ error: 'keyword parameter is required' }, { status: 400 });
  }

  const result = await fetchTrendMultipliers(keyword, geo);
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/data-sources/trends.js app/api/trends/route.js
git commit -m "feat: extract Google Trends logic into data-sources/trends module"
```

---

## Task 2: Weather Data Source + Tests

**Files:**
- Create: `lib/data-sources/weather.js`
- Create: `app/api/weather/route.js`
- Create: `__tests__/data-sources/weather.test.js`

- [ ] **Step 1: Write the weather trigger tests**

Create `__tests__/data-sources/weather.test.js`:

```js
import { evaluateWeatherTriggers, WEATHER_TRIGGERS } from '../../lib/data-sources/weather';

describe('evaluateWeatherTriggers', () => {
  test('extreme heat triggers HVAC surge', () => {
    const day = { temp_max: 100, temp_min: 78, weather_main: 'Clear', wind_speed: 5, rain_mm: 0 };
    const triggers = evaluateWeatherTriggers(day);
    expect(triggers.length).toBeGreaterThan(0);
    expect(triggers[0].verticals).toContain('hvac');
    expect(triggers[0].keyword_boost).toBe(1.4);
  });

  test('freezing temps trigger HVAC heating surge', () => {
    const day = { temp_max: 28, temp_min: 15, weather_main: 'Snow', wind_speed: 10, rain_mm: 0 };
    const triggers = evaluateWeatherTriggers(day);
    const hvacTrigger = triggers.find(t => t.verticals.includes('hvac'));
    expect(hvacTrigger).toBeDefined();
    expect(hvacTrigger.affected_keywords).toContain('furnace repair');
  });

  test('pipe-freezing temps trigger plumbing surge', () => {
    const day = { temp_max: 18, temp_min: 5, weather_main: 'Snow', wind_speed: 15, rain_mm: 0 };
    const triggers = evaluateWeatherTriggers(day);
    const plumbingTrigger = triggers.find(t => t.verticals.includes('plumbing'));
    expect(plumbingTrigger).toBeDefined();
    expect(plumbingTrigger.keyword_boost).toBe(1.5);
  });

  test('thunderstorm triggers roofing surge', () => {
    const day = { temp_max: 85, temp_min: 70, weather_main: 'Thunderstorm', wind_speed: 35, rain_mm: 10 };
    const triggers = evaluateWeatherTriggers(day);
    const roofingTrigger = triggers.find(t => t.verticals.includes('roofing'));
    expect(roofingTrigger).toBeDefined();
  });

  test('heavy rain triggers plumbing drainage surge', () => {
    const day = { temp_max: 72, temp_min: 60, weather_main: 'Rain', wind_speed: 10, rain_mm: 30 };
    const triggers = evaluateWeatherTriggers(day);
    const plumbingTrigger = triggers.find(t =>
      t.verticals.includes('plumbing') && t.affected_keywords.includes('drain cleaning')
    );
    expect(plumbingTrigger).toBeDefined();
    expect(plumbingTrigger.keyword_boost).toBe(1.25);
  });

  test('mild weather triggers nothing', () => {
    const day = { temp_max: 75, temp_min: 55, weather_main: 'Clear', wind_speed: 5, rain_mm: 0 };
    const triggers = evaluateWeatherTriggers(day);
    expect(triggers).toHaveLength(0);
  });

  test('high wind triggers roofing surge', () => {
    const day = { temp_max: 70, temp_min: 55, weather_main: 'Clouds', wind_speed: 45, rain_mm: 0 };
    const triggers = evaluateWeatherTriggers(day);
    const roofingTrigger = triggers.find(t => t.verticals.includes('roofing'));
    expect(roofingTrigger).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/data-sources/weather.test.js --verbose`

Expected: FAIL — `Cannot find module '../../lib/data-sources/weather'`

- [ ] **Step 3: Create weather data source module**

Create `lib/data-sources/weather.js`:

```js
const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Cache for 3 hours
const cache = new Map();
const CACHE_TTL = 3 * 60 * 60 * 1000;

/**
 * Demand surge triggers by vertical.
 * Each entry defines a weather condition, which verticals it affects,
 * a boost multiplier for affected keyword bids, and which keywords surge.
 */
const WEATHER_TRIGGERS = [
  {
    condition: (w) => w.temp_max >= 95,
    keyword_boost: 1.4,
    verticals: ['hvac'],
    description: 'Extreme heat — AC repair/install demand surge expected',
    affected_keywords: ['ac repair', 'ac installation', 'air conditioning', 'cooling'],
  },
  {
    condition: (w) => w.temp_min <= 32,
    keyword_boost: 1.35,
    verticals: ['hvac'],
    description: 'Freezing temps — heating system demand surge expected',
    affected_keywords: ['furnace repair', 'heating repair', 'heater', 'heat pump'],
  },
  {
    condition: (w) => w.temp_min <= 20,
    keyword_boost: 1.5,
    verticals: ['plumbing'],
    description: 'Pipe-freezing risk — emergency plumbing demand surge',
    affected_keywords: ['frozen pipes', 'pipe burst', 'emergency plumber', 'plumbing repair'],
  },
  {
    condition: (w) => w.weather_main === 'Thunderstorm' || w.wind_speed >= 40,
    keyword_boost: 1.3,
    verticals: ['roofing'],
    description: 'Storm activity — roof repair demand surge expected',
    affected_keywords: ['roof repair', 'roof leak', 'storm damage', 'emergency roofing'],
  },
  {
    condition: (w) => w.rain_mm >= 25,
    keyword_boost: 1.25,
    verticals: ['plumbing'],
    description: 'Heavy rain — drainage/flooding demand surge expected',
    affected_keywords: ['drain cleaning', 'sump pump', 'flood', 'water damage'],
  },
];

/**
 * Evaluate which weather triggers fire for a given day's conditions.
 * Exported for testing.
 */
export function evaluateWeatherTriggers(dayConditions) {
  return WEATHER_TRIGGERS.filter((t) => t.condition(dayConditions));
}

/**
 * Fetch 7-day forecast for a location.
 * Returns array of daily forecasts with demand triggers.
 * Returns null if API key not configured.
 */
export async function getWeatherForecast(lat, lon) {
  if (!API_KEY) return null;

  const key = `${lat},${lon}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;

  try {
    const res = await fetch(
      `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial&cnt=40`
    );
    if (!res.ok) throw new Error(`Weather API ${res.status}`);
    const data = await res.json();

    // Group 3-hour intervals by day
    const days = {};
    (data.list || []).forEach((entry) => {
      const date = entry.dt_txt.split(' ')[0];
      if (!days[date]) {
        days[date] = {
          date,
          temp_min: entry.main.temp_min,
          temp_max: entry.main.temp_max,
          weather_main: entry.weather?.[0]?.main,
          wind_speed: entry.wind?.speed || 0,
          rain_mm: entry.rain?.['3h'] || 0,
        };
      } else {
        days[date].temp_min = Math.min(days[date].temp_min, entry.main.temp_min);
        days[date].temp_max = Math.max(days[date].temp_max, entry.main.temp_max);
        days[date].rain_mm += entry.rain?.['3h'] || 0;
        days[date].wind_speed = Math.max(days[date].wind_speed, entry.wind?.speed || 0);
      }
    });

    const result = Object.values(days).map((day) => ({
      ...day,
      triggers: evaluateWeatherTriggers(day),
    }));

    cache.set(key, { data: result, time: Date.now() });
    return result;
  } catch (err) {
    console.error('Weather API error:', err.message);
    return null;
  }
}

/**
 * Get demand surge alerts for a specific vertical in a location.
 * Filters forecast triggers to only the given vertical.
 */
export async function getDemandSurgeAlerts(lat, lon, vertical) {
  const forecast = await getWeatherForecast(lat, lon);
  if (!forecast) return [];

  const alerts = [];
  forecast.forEach((day) => {
    day.triggers
      .filter((t) => t.verticals.includes(vertical))
      .forEach((trigger) => {
        alerts.push({
          date: day.date,
          boost: trigger.keyword_boost,
          description: trigger.description,
          affected_keywords: trigger.affected_keywords,
          temp_range: `${Math.round(day.temp_min)}°F - ${Math.round(day.temp_max)}°F`,
        });
      });
  });

  return alerts;
}

export { WEATHER_TRIGGERS };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/data-sources/weather.test.js --verbose`

Expected: All 7 tests PASS.

- [ ] **Step 5: Create weather API route**

Create `app/api/weather/route.js`:

```js
import { NextResponse } from 'next/server';
import { getWeatherForecast, getDemandSurgeAlerts } from '@/lib/data-sources/weather';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const vertical = searchParams.get('vertical');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon parameters required' }, { status: 400 });
  }

  try {
    if (vertical) {
      const alerts = await getDemandSurgeAlerts(parseFloat(lat), parseFloat(lon), vertical);
      return NextResponse.json({ alerts });
    }

    const forecast = await getWeatherForecast(parseFloat(lat), parseFloat(lon));
    return NextResponse.json({ forecast });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/data-sources/weather.js app/api/weather/route.js __tests__/data-sources/weather.test.js
git commit -m "feat: add weather data source with demand surge triggers per vertical"
```

---

## Task 3: Data Source Aggregation Layer + Tests

The aggregation layer merges keyword data with Google Trends (seasonal multipliers for top keywords), weather (demand surge alerts), and Keyword Planner (data source flags). It also defines the extensible data source interface with a slot for GA4.

**Files:**
- Create: `lib/data-sources/index.js`
- Create: `app/api/keywords/intelligence/route.js`
- Create: `__tests__/data-sources/aggregation.test.js`

- [ ] **Step 1: Write aggregation tests**

Create `__tests__/data-sources/aggregation.test.js`:

```js
import { buildWeatherBoostMap, applyWeatherBoosts, classifyDataSources } from '../../lib/data-sources/index';

describe('buildWeatherBoostMap', () => {
  test('builds map from alerts', () => {
    const alerts = [
      {
        date: '2026-04-10',
        boost: 1.4,
        description: 'Heat surge',
        affected_keywords: ['ac repair', 'cooling'],
      },
    ];
    const map = buildWeatherBoostMap(alerts);
    expect(map['ac repair']).toEqual({ boost: 1.4, reason: 'Heat surge', date: '2026-04-10' });
    expect(map['cooling']).toEqual({ boost: 1.4, reason: 'Heat surge', date: '2026-04-10' });
  });

  test('returns empty map for empty alerts', () => {
    expect(buildWeatherBoostMap([])).toEqual({});
  });
});

describe('applyWeatherBoosts', () => {
  test('matches keywords containing trigger terms', () => {
    const keywords = [
      { keyword: 'emergency ac repair near me', avg_cpc: 12 },
      { keyword: 'plumber cost', avg_cpc: 8 },
    ];
    const boostMap = {
      'ac repair': { boost: 1.4, reason: 'Heat', date: '2026-04-10' },
    };
    const result = applyWeatherBoosts(keywords, boostMap);
    expect(result[0].weather_boost).toEqual({ boost: 1.4, reason: 'Heat', date: '2026-04-10' });
    expect(result[1].weather_boost).toBeNull();
  });
});

describe('classifyDataSources', () => {
  test('identifies keyword planner data', () => {
    const kw = { keyword: 'ac repair', data_source: 'google' };
    const sources = classifyDataSources(kw, true, true);
    expect(sources).toContain('keyword_planner');
  });

  test('identifies weather data', () => {
    const kw = { keyword: 'ac repair', weather_boost: { boost: 1.4 } };
    const sources = classifyDataSources(kw, false, false);
    expect(sources).toContain('weather');
  });

  test('returns empty for no sources', () => {
    const kw = { keyword: 'ac repair' };
    const sources = classifyDataSources(kw, false, false);
    expect(sources).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/data-sources/aggregation.test.js --verbose`

Expected: FAIL — `Cannot find module '../../lib/data-sources/index'`

- [ ] **Step 3: Create aggregation module**

Create `lib/data-sources/index.js`:

```js
import { batchFetchTrends } from './trends';
import { getDemandSurgeAlerts } from './weather';

/**
 * Data source types — extensible. GA4 is a future slot.
 */
export const DATA_SOURCE_TYPES = {
  KEYWORD_PLANNER: 'keyword_planner',
  GOOGLE_TRENDS: 'google_trends',
  WEATHER: 'weather',
  WEBSITE_ANALYTICS: 'website_analytics', // GA4 — Phase 8 architecture slot
};

/**
 * Build a lookup map from weather alerts: { "keyword lowercase": { boost, reason, date } }
 */
export function buildWeatherBoostMap(alerts) {
  const map = {};
  alerts.forEach((alert) => {
    (alert.affected_keywords || []).forEach((kw) => {
      map[kw.toLowerCase()] = {
        boost: alert.boost,
        reason: alert.description,
        date: alert.date,
      };
    });
  });
  return map;
}

/**
 * Apply weather boosts to keywords. Checks if keyword text contains any trigger term.
 */
export function applyWeatherBoosts(keywords, boostMap) {
  return keywords.map((kw) => {
    const kwLower = (kw.keyword || kw.cluster || '').toLowerCase();
    const match = Object.entries(boostMap).find(([trigger]) => kwLower.includes(trigger));
    return {
      ...kw,
      weather_boost: match ? match[1] : null,
    };
  });
}

/**
 * Classify which data sources contributed to a keyword's data.
 */
export function classifyDataSources(kw, hasTrends, hasWeather) {
  const sources = [];
  if (kw.data_source === 'google' || kw.google_data) sources.push('keyword_planner');
  if (kw.trend_multipliers) sources.push('google_trends');
  if (kw.weather_boost) sources.push('weather');
  return sources;
}

/**
 * Merge keyword data with all external data sources.
 * Returns enriched keywords with trend multipliers, weather boosts, and data source flags.
 *
 * @param {Object[]} keywords - Array of keyword objects
 * @param {Object} options - { geo, lat, lon, vertical }
 * @returns {{ keywords: Object[], weather_alerts: Object[], trend_data: Map, sources_available: Object }}
 */
export async function enrichKeywords(keywords, options = {}) {
  const { geo, lat, lon, vertical } = options;

  // 1. Fetch weather alerts (if location + vertical provided)
  const weatherAlerts = (lat && lon && vertical)
    ? await getDemandSurgeAlerts(parseFloat(lat), parseFloat(lon), vertical)
    : [];

  // 2. Fetch Google Trends for top keywords by volume (limit 5 to avoid rate limiting)
  const topKeywords = [...keywords]
    .sort((a, b) => (b.volume || b.monthly_searches || 0) - (a.volume || a.monthly_searches || 0))
    .slice(0, 5)
    .map(k => k.keyword || k.cluster)
    .filter(Boolean);

  let trendData = new Map();
  if (geo && topKeywords.length > 0) {
    try {
      trendData = await batchFetchTrends(topKeywords, geo, 5);
    } catch (err) {
      console.error('Trends batch fetch error:', err.message);
    }
  }

  // 3. Build weather boost map
  const boostMap = buildWeatherBoostMap(weatherAlerts);

  // 4. Apply weather boosts
  let enriched = applyWeatherBoosts(keywords, boostMap);

  // 5. Apply trend multipliers to keywords that were fetched
  enriched = enriched.map((kw) => {
    const kwName = (kw.keyword || kw.cluster || '').toLowerCase();
    const trendEntry = [...trendData.entries()].find(([k]) => k.toLowerCase() === kwName);
    return {
      ...kw,
      trend_multipliers: trendEntry ? trendEntry[1].multipliers : null,
      trend_source: trendEntry ? trendEntry[1].source : null,
      data_sources: classifyDataSources(
        { ...kw, trend_multipliers: trendEntry ? trendEntry[1].multipliers : null },
        trendData.size > 0,
        weatherAlerts.length > 0
      ),
    };
  });

  return {
    keywords: enriched,
    weather_alerts: weatherAlerts,
    sources_available: {
      google_trends: trendData.size > 0,
      weather: weatherAlerts.length > 0,
      keyword_planner: keywords.some((k) => k.data_source === 'google' || k.google_data),
      website_analytics: false, // GA4 — Phase 8
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/data-sources/aggregation.test.js --verbose`

Expected: All 6 tests PASS.

- [ ] **Step 5: Create intelligence API route**

Create `app/api/keywords/intelligence/route.js`:

```js
import { NextResponse } from 'next/server';
import { enrichKeywords } from '@/lib/data-sources/index';

export const maxDuration = 30;

export async function POST(request) {
  try {
    const body = await request.json();
    const { keywords, geo, lat, lon, vertical } = body;

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json({ error: 'keywords array required' }, { status: 400 });
    }

    const result = await enrichKeywords(keywords, { geo, lat, lon, vertical });
    return NextResponse.json(result);
  } catch (err) {
    console.error('Keywords intelligence error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/data-sources/index.js app/api/keywords/intelligence/route.js __tests__/data-sources/aggregation.test.js
git commit -m "feat: add keyword intelligence aggregation layer with trends + weather enrichment"
```

---

## Task 4: Google Ads CSV Export + Tests

Implements the "Export to Google Ads CSV" button. Generates a CSV file formatted for Google Ads Editor import.

**Files:**
- Create: `lib/export-google-ads-csv.js`
- Create: `__tests__/export-google-ads-csv.test.js`

- [ ] **Step 1: Write export tests**

Create `__tests__/export-google-ads-csv.test.js`:

```js
import { buildGoogleAdsCsv, formatKeywordRow } from '../../lib/export-google-ads-csv';

describe('formatKeywordRow', () => {
  test('formats keyword with broad match', () => {
    const row = formatKeywordRow({
      keyword: 'ac repair',
      match_type: 'Broad',
      avg_cpc: 12.50,
      campaign: 'HVAC Services',
      ad_group: 'AC Repair',
    });
    expect(row).toBe('HVAC Services,AC Repair,ac repair,Broad,12.50');
  });

  test('formats exact match with brackets', () => {
    const row = formatKeywordRow({
      keyword: 'emergency plumber',
      match_type: 'Exact',
      avg_cpc: 25.00,
      campaign: 'Plumbing',
      ad_group: 'Emergency',
    });
    expect(row).toBe('Plumbing,Emergency,[emergency plumber],Exact,25.00');
  });

  test('formats phrase match with quotes', () => {
    const row = formatKeywordRow({
      keyword: 'roof repair',
      match_type: 'Phrase',
      avg_cpc: 18.00,
      campaign: 'Roofing',
      ad_group: 'Repair',
    });
    expect(row).toBe('Roofing,Repair,"roof repair",Phrase,18.00');
  });

  test('defaults to Broad match when unspecified', () => {
    const row = formatKeywordRow({ keyword: 'hvac service', avg_cpc: 10 });
    expect(row).toContain(',Broad,');
  });
});

describe('buildGoogleAdsCsv', () => {
  test('builds CSV with header and rows', () => {
    const keywords = [
      { keyword: 'ac repair', intent: 'transactional', avg_cpc: 12.50 },
      { keyword: 'hvac tips', intent: 'informational', avg_cpc: 3.00 },
    ];
    const csv = buildGoogleAdsCsv(keywords, 'Test Campaign');
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Campaign,Ad Group,Keyword,Match Type,Max CPC');
    expect(lines.length).toBe(3); // header + 2 rows
    expect(lines[1]).toContain('ac repair');
    expect(lines[1]).toContain('Test Campaign');
  });

  test('groups keywords by intent into ad groups', () => {
    const keywords = [
      { keyword: 'ac repair cost', intent: 'transactional', avg_cpc: 12 },
      { keyword: 'what is hvac', intent: 'informational', avg_cpc: 3 },
    ];
    const csv = buildGoogleAdsCsv(keywords, 'HVAC');
    expect(csv).toContain('HVAC - Transactional');
    expect(csv).toContain('HVAC - Informational');
  });

  test('returns empty CSV for no keywords', () => {
    const csv = buildGoogleAdsCsv([], 'Empty');
    const lines = csv.split('\n').filter(Boolean);
    expect(lines.length).toBe(1); // header only
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/export-google-ads-csv.test.js --verbose`

Expected: FAIL — `Cannot find module '../../lib/export-google-ads-csv'`

- [ ] **Step 3: Create export module**

Create `lib/export-google-ads-csv.js`:

```js
/**
 * Format a single keyword row for Google Ads Editor CSV import.
 * Applies match type formatting: Exact → [keyword], Phrase → "keyword", Broad → keyword
 */
export function formatKeywordRow({
  keyword,
  match_type = 'Broad',
  avg_cpc = 0,
  campaign = 'Campaign',
  ad_group = 'Ad Group',
}) {
  let formatted = keyword;
  if (match_type === 'Exact') formatted = `[${keyword}]`;
  else if (match_type === 'Phrase') formatted = `"${keyword}"`;

  const cpc = typeof avg_cpc === 'number' ? avg_cpc.toFixed(2) : '0.00';
  return `${campaign},${ad_group},${formatted},${match_type},${cpc}`;
}

/**
 * Build a complete Google Ads Editor CSV from a keyword list.
 * Groups keywords by intent into ad groups named "{campaign} - {Intent}".
 *
 * @param {Object[]} keywords - Array of { keyword, intent, avg_cpc, cpc, match_type }
 * @param {string} campaignName - Campaign name for the export
 * @returns {string} CSV string
 */
export function buildGoogleAdsCsv(keywords, campaignName = 'Campaign') {
  const header = 'Campaign,Ad Group,Keyword,Match Type,Max CPC';

  if (!keywords || keywords.length === 0) return header;

  const rows = keywords.map((kw) => {
    const intent = (kw.intent || 'general').charAt(0).toUpperCase() + (kw.intent || 'general').slice(1).toLowerCase();
    const adGroup = `${campaignName} - ${intent}`;

    return formatKeywordRow({
      keyword: kw.keyword || kw.cluster || '',
      match_type: kw.match_type || 'Broad',
      avg_cpc: kw.avg_cpc || kw.cpc || 0,
      campaign: campaignName,
      ad_group: adGroup,
    });
  });

  return [header, ...rows].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/export-google-ads-csv.test.js --verbose`

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/export-google-ads-csv.js __tests__/export-google-ads-csv.test.js
git commit -m "feat: add Google Ads Editor CSV export builder"
```

---

## Task 5: TrendSparkline + IntentDonut Components

**Files:**
- Create: `components/keyword-engine/TrendSparkline.js`
- Create: `components/keyword-engine/IntentDonut.js`

- [ ] **Step 1: Create TrendSparkline SVG component**

This is a tiny inline SVG sparkline that renders 12 monthly data points. Used in the Priority Matrix table rows.

Create `components/keyword-engine/TrendSparkline.js`:

```js
/**
 * Tiny SVG sparkline for 12-month trend multipliers.
 * Expects multipliers: number[12] where 1.0 = average.
 */
export default function TrendSparkline({ multipliers, width = 64, height = 20 }) {
  if (!multipliers || multipliers.length === 0) return null;

  const max = Math.max(...multipliers, 1.5);
  const min = Math.min(...multipliers, 0.5);
  const range = max - min || 1;
  const padding = 2;

  const points = multipliers.map((val, i) => {
    const x = padding + (i / (multipliers.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  // Current month highlight
  const currentMonth = new Date().getMonth();
  const cx = padding + (currentMonth / (multipliers.length - 1)) * (width - padding * 2);
  const cy = padding + (1 - (multipliers[currentMonth] - min) / range) * (height - padding * 2);

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={cx} cy={cy} r="2" fill="var(--secondary)" />
    </svg>
  );
}
```

- [ ] **Step 2: Create IntentDonut SVG component**

Reference: `docs/design-references/keyword_research_engine/code.html` — the donut chart.

Create `components/keyword-engine/IntentDonut.js`:

```js
const INTENT_COLORS = {
  transactional: 'var(--primary)',
  informational: 'var(--secondary)',
  navigational: 'var(--tertiary)',
  commercial: 'var(--primary-container)',
};

export default function IntentDonut({ keywords }) {
  const counts = { transactional: 0, informational: 0, navigational: 0, commercial: 0 };
  (keywords || []).forEach((kw) => {
    const intent = (kw.intent || 'informational').toLowerCase();
    counts[intent] = (counts[intent] || 0) + (kw.volume || kw.monthly_searches || 1);
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const size = 180;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([intent, count]) => {
      const pct = count / total;
      const seg = { intent, count, pct, offset, length: pct * circumference };
      offset += seg.length;
      return seg;
    });

  function fmtTotal(n) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  }

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface">Intent Distribution</h3>
        <span className="material-symbols-outlined text-on-surface-variant">language</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            {segments.map((seg) => (
              <circle
                key={seg.intent}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={INTENT_COLORS[seg.intent]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.length} ${circumference - seg.length}`}
                strokeDashoffset={-seg.offset}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-on-surface">{fmtTotal(total)}</span>
            <span className="text-label-sm text-on-surface-variant">Total Vol</span>
          </div>
        </div>

        <div className="space-y-2">
          {segments.map((seg) => (
            <div key={seg.intent} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: INTENT_COLORS[seg.intent] }}
              />
              <span className="text-sm text-on-surface-variant capitalize">{seg.intent}</span>
              <span className="text-sm text-on-surface font-medium ml-auto">
                {Math.round(seg.pct * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/keyword-engine/TrendSparkline.js components/keyword-engine/IntentDonut.js
git commit -m "feat: add TrendSparkline and IntentDonut components"
```

---

## Task 6: KeywordMetrics Component

**Files:**
- Create: `components/keyword-engine/KeywordMetrics.js`

- [ ] **Step 1: Create KeywordMetrics component**

Three metric cards with left border accents matching the design reference. Shows industry CPC comparison, AI efficiency score, and estimated conversions with weather surge indicator.

Create `components/keyword-engine/KeywordMetrics.js`:

```js
export default function KeywordMetrics({ keywords, weatherAlerts, industryBenchmark }) {
  const avgCpc = keywords.length > 0
    ? keywords.reduce((sum, k) => sum + (k.avg_cpc || k.cpc || 0), 0) / keywords.length
    : 0;

  const totalVolume = keywords.reduce(
    (sum, k) => sum + (k.volume || k.monthly_searches || 0),
    0
  );

  // Efficiency: weighted by transactional intent ratio + keyword planner coverage
  const transactionalPct = keywords.filter(
    (k) => (k.intent || '').toLowerCase() === 'transactional'
  ).length / Math.max(keywords.length, 1);
  const plannerPct = keywords.filter(
    (k) => k.data_source === 'google'
  ).length / Math.max(keywords.length, 1);
  const efficiencyScore = Math.round(transactionalPct * 50 + plannerPct * 20 + 30);

  // CPC delta vs industry average (if benchmark provided)
  const industryCpc = industryBenchmark?.avgCpc || null;
  let cpcDelta = null;
  if (industryCpc && avgCpc > 0) {
    cpcDelta = Math.round(((avgCpc - industryCpc) / industryCpc) * 100);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-surface-container rounded-xl p-5 border-l-4 border-primary">
        <div className="text-label-sm text-on-surface-variant mb-1">Avg. CPC</div>
        <div className="text-3xl font-extrabold text-on-surface">${avgCpc.toFixed(2)}</div>
        {cpcDelta !== null && (
          <div className={`text-xs mt-1 ${cpcDelta <= 0 ? 'text-secondary' : 'text-error'}`}>
            {cpcDelta <= 0 ? `${Math.abs(cpcDelta)}% below` : `${cpcDelta}% above`} industry avg
          </div>
        )}
        {cpcDelta === null && (
          <div className="text-xs text-on-surface-variant mt-1">Connect Google Ads for comparison</div>
        )}
      </div>

      <div className="bg-surface-container rounded-xl p-5 border-l-4 border-secondary">
        <div className="text-label-sm text-on-surface-variant mb-1">Efficiency Score</div>
        <div className="text-3xl font-extrabold text-on-surface">{efficiencyScore}/100</div>
        <div className="flex items-center gap-1 text-xs text-tertiary mt-1">
          <span className="material-symbols-outlined text-xs">auto_awesome</span>
          AI Optimized Path
        </div>
      </div>

      <div className="bg-surface-container rounded-xl p-5 border-l-4 border-tertiary">
        <div className="text-label-sm text-on-surface-variant mb-1">Est. Conversions</div>
        <div className="text-3xl font-extrabold text-on-surface">
          {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}
        </div>
        {weatherAlerts?.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-secondary mt-1">
            <span className="material-symbols-outlined text-xs">thunderstorm</span>
            {weatherAlerts.length} weather surge{weatherAlerts.length > 1 ? 's' : ''} detected
          </div>
        )}
        {(!weatherAlerts || weatherAlerts.length === 0) && (
          <div className="text-xs text-on-surface-variant mt-1">Based on keyword volume</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/keyword-engine/KeywordMetrics.js
git commit -m "feat: add KeywordMetrics component with CPC delta and weather indicator"
```

---

## Task 7: PriorityMatrix Component

Full-featured keyword table with: sortable columns, competition color bars, trend sparklines, "GOOGLE DATA" badges, intent filter, row action dropdown, and pagination.

**Files:**
- Create: `components/keyword-engine/PriorityMatrix.js`

- [ ] **Step 1: Create PriorityMatrix component**

Create `components/keyword-engine/PriorityMatrix.js`:

```js
'use client';

import { useState, useRef, useEffect } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import TrendSparkline from './TrendSparkline';

const INTENT_VARIANTS = {
  transactional: 'active',
  informational: 'running',
  navigational: 'pitching',
  commercial: 'management',
};

const COMPETITION_COLORS = {
  low: 'bg-secondary',
  medium: 'bg-primary',
  high: 'bg-error/70',
  critical: 'bg-error',
};

const COLUMNS = [
  { key: 'keyword', label: 'Keyword String' },
  { key: 'intent', label: 'Intent' },
  { key: 'monthly_searches', label: 'Monthly Searches' },
  { key: 'avg_cpc', label: 'CPC Estimate' },
  { key: 'competition', label: 'Competition Level' },
  { key: 'trend', label: 'Trend' },
  { key: 'actions', label: '' },
];

const INTENT_FILTERS = ['all', 'transactional', 'informational', 'navigational', 'commercial'];

export default function PriorityMatrix({ keywords, onAction }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [intentFilter, setIntentFilter] = useState('all');
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);
  const perPage = 10;

  // Close action menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSort(col) {
    if (col === 'trend' || col === 'actions') return;
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
    setPage(0);
  }

  // Filter by intent
  const filtered = intentFilter === 'all'
    ? keywords
    : keywords.filter(kw => (kw.intent || '').toLowerCase() === intentFilter);

  // Sort
  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        const av = a[sortCol] ?? a.volume ?? 0;
        const bv = b[sortCol] ?? b.volume ?? 0;
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : filtered;

  const paged = sorted.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(sorted.length / perPage);

  function handleAction(action, kw) {
    setOpenMenu(null);
    if (onAction) onAction(action, kw);
  }

  return (
    <div className="bg-surface-container rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-on-surface">Keyword Priority Matrix</h3>
          <span className="text-xs text-on-surface-variant">
            Showing {paged.length} of {sorted.length} results
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Intent filter pills */}
          {INTENT_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => { setIntentFilter(f); setPage(0); }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide transition-colors ${
                intentFilter === f
                  ? 'bg-primary/15 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-outline-variant/10">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`text-left px-6 py-3 text-label-sm text-on-surface-variant select-none ${
                  col.key !== 'trend' && col.key !== 'actions' ? 'cursor-pointer hover:text-on-surface' : ''
                }`}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {sortCol === col.key && (
                    <span className="material-symbols-outlined text-xs">
                      {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paged.map((kw, i) => {
            const competition = (kw.competition || 'medium').toLowerCase();
            const competitionPct = { low: 25, medium: 50, high: 75, critical: 95 }[competition] || 50;
            const isGoogle = kw.data_source === 'google';
            const globalIdx = page * perPage + i;

            return (
              <tr
                key={globalIdx}
                className="border-b border-outline-variant/5 hover:bg-surface-container-high transition-colors"
              >
                {/* Keyword */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-on-surface">
                      {kw.keyword || kw.cluster}
                    </span>
                    {isGoogle && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold uppercase tracking-wide">
                        Google Data
                      </span>
                    )}
                    {kw.weather_boost && (
                      <span className="material-symbols-outlined text-secondary text-sm" title={kw.weather_boost.reason}>
                        thunderstorm
                      </span>
                    )}
                  </div>
                </td>

                {/* Intent */}
                <td className="px-6 py-4">
                  <StatusBadge
                    status={INTENT_VARIANTS[(kw.intent || '').toLowerCase()] || 'default'}
                    label={kw.intent}
                  />
                </td>

                {/* Monthly Searches */}
                <td className="px-6 py-4 text-sm text-on-surface">
                  {(kw.monthly_searches || kw.volume || 0).toLocaleString()}
                </td>

                {/* CPC */}
                <td className="px-6 py-4 text-sm text-on-surface font-semibold">
                  ${(kw.avg_cpc || kw.cpc || 0).toFixed(2)}
                </td>

                {/* Competition */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 rounded-full bg-surface-container-high overflow-hidden">
                      <div
                        className={`h-full rounded-full ${COMPETITION_COLORS[competition] || 'bg-primary'}`}
                        style={{ width: `${competitionPct}%` }}
                      />
                    </div>
                    <span className="text-label-sm text-on-surface-variant capitalize">{competition}</span>
                  </div>
                </td>

                {/* Trend Sparkline */}
                <td className="px-6 py-4">
                  {kw.trend_multipliers ? (
                    <TrendSparkline multipliers={kw.trend_multipliers} />
                  ) : (
                    <span className="text-label-sm text-on-surface-variant">—</span>
                  )}
                </td>

                {/* Actions dropdown */}
                <td className="px-6 py-4 relative" ref={openMenu === globalIdx ? menuRef : null}>
                  <button
                    onClick={() => setOpenMenu(openMenu === globalIdx ? null : globalIdx)}
                    className="p-1 rounded-lg hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant text-lg">more_vert</span>
                  </button>
                  {openMenu === globalIdx && (
                    <div className="absolute right-6 top-10 z-10 bg-surface-container-high rounded-xl shadow-lg py-1 min-w-[180px]">
                      <button
                        onClick={() => handleAction('add_to_campaign', kw)}
                        className="w-full text-left px-4 py-2.5 text-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-base">add_circle</span>
                        Add to Campaign
                      </button>
                      <button
                        onClick={() => handleAction('mark_negative', kw)}
                        className="w-full text-left px-4 py-2.5 text-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-base">block</span>
                        Mark as Negative
                      </button>
                      <button
                        onClick={() => handleAction('view_trend', kw)}
                        className="w-full text-left px-4 py-2.5 text-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-base">trending_up</span>
                        View Trend Detail
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 flex items-center justify-center gap-1">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                page === i
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/keyword-engine/PriorityMatrix.js
git commit -m "feat: add PriorityMatrix with sparklines, Google Data badges, actions menu"
```

---

## Task 8: AiInsights Component

Sidebar with weather surge alerts, seasonal trend indicators, data source status, and opportunity recommendations.

**Files:**
- Create: `components/keyword-engine/AiInsights.js`

- [ ] **Step 1: Create AiInsights component**

Create `components/keyword-engine/AiInsights.js`:

```js
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AiInsights({ weatherAlerts, sourcesAvailable, keywords }) {
  const currentMonth = new Date().getMonth();

  // Find keywords with strong seasonal trends (current month multiplier > 1.3)
  const seasonalOpportunities = (keywords || [])
    .filter(kw => kw.trend_multipliers && kw.trend_multipliers[currentMonth] > 1.3)
    .slice(0, 3);

  // Find keywords with upcoming seasonal peaks (next 2 months)
  const upcomingPeaks = (keywords || [])
    .filter(kw => {
      if (!kw.trend_multipliers) return false;
      const next1 = kw.trend_multipliers[(currentMonth + 1) % 12];
      const next2 = kw.trend_multipliers[(currentMonth + 2) % 12];
      return next1 > 1.3 || next2 > 1.3;
    })
    .slice(0, 3);

  return (
    <div className="bg-surface-container rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-on-surface">AI Insights</h3>
        <span className="material-symbols-outlined text-tertiary text-xl">auto_awesome</span>
      </div>

      {/* Data source status */}
      <div className="space-y-2">
        <div className="text-label-sm text-on-surface-variant">Active Data Sources</div>
        {Object.entries(sourcesAvailable || {}).map(([source, active]) => (
          <div key={source} className="flex items-center gap-2 text-sm">
            <span className={`material-symbols-outlined text-base ${active ? 'text-secondary' : 'text-on-surface-variant'}`}>
              {active ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            <span className={active ? 'text-on-surface' : 'text-on-surface-variant'}>
              {source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
            {!active && source === 'website_analytics' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                Phase 8
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Seasonal trend opportunities */}
      {seasonalOpportunities.length > 0 && (
        <div className="space-y-3">
          <div className="text-label-sm text-on-surface-variant">Seasonal Opportunities — {MONTH_NAMES[currentMonth]}</div>
          {seasonalOpportunities.map((kw, i) => {
            const mult = kw.trend_multipliers[currentMonth];
            const pctAbove = Math.round((mult - 1) * 100);
            return (
              <div key={i} className="bg-surface-container-low rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-on-surface">{kw.keyword || kw.cluster}</span>
                  <span className="text-xs font-semibold text-secondary">+{pctAbove}%</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Search interest is {pctAbove}% above average this month
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming peaks */}
      {upcomingPeaks.length > 0 && (
        <div className="space-y-3">
          <div className="text-label-sm text-on-surface-variant">Upcoming Demand Peaks</div>
          {upcomingPeaks.map((kw, i) => {
            const next1Month = (currentMonth + 1) % 12;
            const next2Month = (currentMonth + 2) % 12;
            const peakMonth = (kw.trend_multipliers[next1Month] > kw.trend_multipliers[next2Month])
              ? next1Month : next2Month;
            const peakMult = kw.trend_multipliers[peakMonth];
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-primary text-base">schedule</span>
                <span className="text-on-surface-variant">
                  <span className="text-on-surface font-medium">{kw.keyword || kw.cluster}</span>
                  {' '}peaks in {MONTH_NAMES[peakMonth]} ({Math.round((peakMult - 1) * 100)}% above avg)
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Weather alerts */}
      {weatherAlerts && weatherAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="text-label-sm text-on-surface-variant">Weather Surge Alerts</div>
          {weatherAlerts.slice(0, 3).map((alert, i) => (
            <div key={i} className="bg-surface-container-low rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-secondary text-base">thunderstorm</span>
                <span className="text-xs font-medium text-secondary">{alert.temp_range}</span>
                <span className="text-[10px] text-on-surface-variant ml-auto">{alert.date}</span>
              </div>
              <p className="text-xs text-on-surface-variant">{alert.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {alert.affected_keywords?.slice(0, 3).map((kw, j) => (
                  <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {(!weatherAlerts || weatherAlerts.length === 0) &&
       seasonalOpportunities.length === 0 &&
       upcomingPeaks.length === 0 && (
        <div className="bg-surface-container-low rounded-xl p-4">
          <p className="text-xs text-on-surface-variant">
            Connect location data and run keyword research to see AI-powered insights here.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/keyword-engine/AiInsights.js
git commit -m "feat: add AiInsights sidebar with seasonal trends and weather alerts"
```

---

## Task 9: Keyword Engine Page

Wire up all components into the Keyword Engine page at `/accounts/[id]/keywords`. Loads account data, fetches keyword intelligence enrichment, and handles CSV export.

**Files:**
- Create: `app/accounts/[id]/keywords/page.js`

- [ ] **Step 1: Create the Keyword Engine page**

Create `app/accounts/[id]/keywords/page.js`:

```js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAccount } from '@/lib/supabase';
import { buildGoogleAdsCsv } from '@/lib/export-google-ads-csv';
import GhostButton from '@/components/ui/GhostButton';
import Skeleton from '@/components/ui/Skeleton';
import IntentDonut from '@/components/keyword-engine/IntentDonut';
import KeywordMetrics from '@/components/keyword-engine/KeywordMetrics';
import PriorityMatrix from '@/components/keyword-engine/PriorityMatrix';
import AiInsights from '@/components/keyword-engine/AiInsights';

export default function KeywordEnginePage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id;

  const [account, setAccount] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [sourcesAvailable, setSourcesAvailable] = useState({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const acct = await getAccount(accountId);
      setAccount(acct);

      // Collect keywords from all available sources on the account
      // Priority: audit keywords > brand profile keywords > empty
      const auditKws = acct?.audit_data?.keywords || [];
      const brandKws = acct?.brand_profile?.keywords || [];
      // Flatten keyword_groups if present (from Gemini research format)
      const groupKws = (acct?.brand_profile?.keyword_groups || []).flatMap(g =>
        (g.keywords || []).map(k => ({
          keyword: k.keyword || k,
          intent: g.intent || k.intent || 'informational',
          avg_cpc: k.estimated_cpc || k.avg_cpc || 0,
          monthly_searches: k.estimated_monthly_searches || k.monthly_searches || 0,
          volume: k.estimated_monthly_searches || k.volume || 0,
          competition: k.competition || 'medium',
          data_source: k.data_source || 'estimated',
          google_data: k.data_source === 'google',
        }))
      );

      const rawKws = groupKws.length > 0 ? groupKws : (auditKws.length > 0 ? auditKws : brandKws);

      if (rawKws.length > 0) {
        // Enrich with intelligence layer (trends + weather)
        try {
          const res = await fetch('/api/keywords/intelligence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              keywords: rawKws,
              geo: acct?.settings?.geo || 'US',
              lat: acct?.settings?.lat,
              lon: acct?.settings?.lon,
              vertical: acct?.settings?.vertical || acct?.brand_profile?.industry,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setKeywords(data.keywords || rawKws);
            setWeatherAlerts(data.weather_alerts || []);
            setSourcesAvailable(data.sources_available || {});
          } else {
            setKeywords(rawKws);
          }
        } catch (_) {
          setKeywords(rawKws);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { loadData(); }, [loadData]);

  function handleExportCsv() {
    if (keywords.length === 0) return;
    const campaignName = account?.name || 'Campaign';
    const csv = buildGoogleAdsCsv(keywords, campaignName);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaignName.replace(/\s+/g, '_')}_keywords.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleKeywordAction(action, kw) {
    // Action stubs — wired to real functionality in Phase 6 (campaign creation)
    if (action === 'view_trend') {
      // Fetch individual trend data for modal — future enhancement
      console.log('View trend for:', kw.keyword);
    }
    // add_to_campaign and mark_negative will be wired in Phase 4/6
  }

  if (loading) {
    return (
      <div className="space-y-6 fade-up">
        <Skeleton variant="text" className="h-8 w-64" />
        <div className="grid grid-cols-12 gap-6">
          <Skeleton variant="card" className="col-span-4 h-48" />
          <Skeleton variant="card" className="col-span-8 h-48" />
        </div>
        <Skeleton variant="card" className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-label-sm text-on-surface-variant flex items-center gap-1 mb-1">
            <span className="material-symbols-outlined text-xs">settings</span>
            Strategy Module
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Keyword Intelligence Engine</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Surface high-intent opportunities with real-time data integration
          </p>
        </div>
        <GhostButton onClick={handleExportCsv} disabled={keywords.length === 0}>
          <span className="material-symbols-outlined text-lg">download</span>
          Export to Google Ads CSV
        </GhostButton>
      </div>

      {/* Empty state */}
      {keywords.length === 0 && (
        <div className="bg-surface-container rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-5xl mb-4">search</span>
          <h2 className="text-lg font-semibold text-on-surface mb-2">No Keywords Yet</h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
            Run keyword research from the Analysis Hub or upload a CSV keyword report to populate the Keyword Engine.
          </p>
          <button
            onClick={() => router.push(`/accounts/${accountId}`)}
            className="px-4 py-2 rounded-xl bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors"
          >
            Go to Analysis Hub
          </button>
        </div>
      )}

      {/* Top row: Donut + Metrics */}
      {keywords.length > 0 && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-4">
              <IntentDonut keywords={keywords} />
            </div>
            <div className="xl:col-span-8">
              <KeywordMetrics keywords={keywords} weatherAlerts={weatherAlerts} />
            </div>
          </div>

          {/* Main content: Priority Matrix + Insights */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8">
              <PriorityMatrix keywords={keywords} onAction={handleKeywordAction} />
            </div>
            <div className="xl:col-span-4">
              <AiInsights
                weatherAlerts={weatherAlerts}
                sourcesAvailable={sourcesAvailable}
                keywords={keywords}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the Keyword Engine renders**

Run: `npm run dev`

Navigate to `/accounts/{account-id}/keywords`. You should see:
- "Keyword Intelligence Engine" heading with export button
- If keywords exist: donut chart, metric cards, priority matrix with sparklines + badges, AI insights sidebar
- If no keywords: empty state with link to Analysis Hub

- [ ] **Step 3: Commit**

```bash
git add app/accounts/[id]/keywords/
git commit -m "feat: add Keyword Engine page with multi-source intelligence integration"
```

---

## Task 10: Update Sidebar Navigation

Add a Keyword Engine entry to the sidebar that is context-aware — when viewing an account, it links to that account's keywords page. Otherwise it links to the accounts list.

**Files:**
- Modify: `components/Sidebar.js`

- [ ] **Step 1: Read and update the sidebar**

Read `components/Sidebar.js`. Find the `MANAGEMENT_NAV` array. Add a Keyword Engine entry between Accounts and Agents:

In `MANAGEMENT_NAV`, add after the `Accounts` entry:

```js
{ href: '/keywords', label: 'Keyword Engine', icon: 'analytics' },
```

Then in the sidebar's nav link rendering, make this entry context-aware. Find where the `MANAGEMENT_NAV.map()` renders `<Link>` elements and update the Keyword Engine href to be dynamic:

```js
// In the map that renders nav items, replace the static href for Keyword Engine:
const pathname = usePathname();

// Extract account ID from current URL if on an account page
const accountIdMatch = pathname.match(/\/accounts\/([^/]+)/);
const currentAccountId = accountIdMatch ? accountIdMatch[1] : null;

// When rendering each nav item:
const resolvedHref = item.href === '/keywords' && currentAccountId
  ? `/accounts/${currentAccountId}/keywords`
  : item.href;
```

Apply this change inline where nav items are rendered. The `isActive` check should also consider the keyword engine route:

```js
const isActive = item.href === '/'
  ? pathname === '/'
  : item.href === '/keywords'
    ? pathname.includes('/keywords')
    : pathname.startsWith(item.href);
```

- [ ] **Step 2: Verify navigation works**

Run: `npm run dev`

1. Navigate to `/accounts/{id}` — click Keyword Engine in sidebar → should go to `/accounts/{id}/keywords`
2. Navigate to `/` (Dashboard) — click Keyword Engine → should go to `/keywords` (which will be a placeholder until they pick an account)
3. Active highlight should appear when on any `/keywords` route

- [ ] **Step 3: Commit**

```bash
git add components/Sidebar.js
git commit -m "feat: add context-aware Keyword Engine entry to sidebar navigation"
```

---

## Task 11: Verify Full Phase 3 Delivery

- [ ] **Step 1: Run all tests**

```bash
npx jest --verbose
```

Expected: All tests pass, including:
- Existing parser and analysis tests
- New weather trigger tests (`__tests__/data-sources/weather.test.js`)
- New aggregation tests (`__tests__/data-sources/aggregation.test.js`)
- New CSV export tests (`__tests__/export-google-ads-csv.test.js`)

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Manual QA**

1. [ ] Keyword Engine page (`/accounts/{id}/keywords`) renders with Intelligence Layer design
2. [ ] Intent Distribution donut chart shows correct percentages
3. [ ] Three metric cards display: Avg CPC with industry comparison, Efficiency Score, Est. Conversions
4. [ ] Keyword Priority Matrix is sortable by all columns
5. [ ] Intent filter pills filter the table correctly
6. [ ] Pagination works (if >10 keywords)
7. [ ] "GOOGLE DATA" blue badge appears on keywords with `data_source: 'google'`
8. [ ] Trend sparkline renders for top keywords (if Trends API available)
9. [ ] Weather surge icon (thunderstorm) appears on weather-boosted keywords
10. [ ] Row action menu opens with 3 options: Add to Campaign, Mark as Negative, View Trend Detail
11. [ ] AI Insights sidebar shows data source status with check/unchecked icons
12. [ ] Seasonal opportunities section appears when relevant trend data exists
13. [ ] Weather alerts section appears when OPENWEATHERMAP_API_KEY is configured and triggers fire
14. [ ] "Export to Google Ads CSV" button downloads a valid CSV file
15. [ ] Empty state shows when account has no keywords, with link to Analysis Hub
16. [ ] Sidebar "Keyword Engine" entry navigates to correct account-scoped URL
17. [ ] All cards use tonal layering (no 1px borders), design tokens match Intelligence Layer
18. [ ] Existing Trends API route (`GET /api/trends?keyword=...`) still works (backward compatible)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Phase 3 complete — Keyword Intelligence Engine with multi-source data integration"
```
