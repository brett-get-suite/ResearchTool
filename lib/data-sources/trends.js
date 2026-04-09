// In-memory cache with automatic eviction
const trendsCache = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_MAX_SIZE = 200;

function evictStaleEntries() {
  const keys = Object.keys(trendsCache);
  if (keys.length <= CACHE_MAX_SIZE) return;
  const now = Date.now();
  for (const k of keys) {
    if (now - trendsCache[k].cachedAt > CACHE_TTL) delete trendsCache[k];
  }
  // If still over limit, drop oldest
  const remaining = Object.keys(trendsCache);
  if (remaining.length > CACHE_MAX_SIZE) {
    remaining
      .sort((a, b) => trendsCache[a].cachedAt - trendsCache[b].cachedAt)
      .slice(0, remaining.length - CACHE_MAX_SIZE)
      .forEach((k) => delete trendsCache[k]);
  }
}

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
    evictStaleEntries();
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
