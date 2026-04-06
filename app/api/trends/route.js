import { NextResponse } from 'next/server';

// In-memory cache: { [key]: { data, cachedAt } }
const trendsCache = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(keyword, geo) {
  return `${keyword.toLowerCase()}|${geo}`;
}

function isStale(entry) {
  return !entry || Date.now() - entry.cachedAt > CACHE_TTL;
}

// Normalize an array of interest values to multipliers (1.0 = average month)
function normalizeToMultipliers(values) {
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  if (avg === 0) return values.map(() => 1);
  return values.map(v => parseFloat((v / avg).toFixed(3)));
}

async function fetchGoogleTrends(keyword, geo) {
  // Step 1: get widget token from explore endpoint
  const comparisonItem = [{ keyword, geo, time: 'today 12-m' }];
  const exploreParams = new URLSearchParams({
    hl: 'en-US',
    tz: '-300',
    req: JSON.stringify({ comparisonItem, category: 0, property: '' }),
  });

  const exploreUrl = `https://trends.google.com/trends/api/explore?${exploreParams}`;
  const exploreRes = await fetch(exploreUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://trends.google.com/',
    },
  });
  if (!exploreRes.ok) throw new Error(`Trends explore failed: ${exploreRes.status}`);

  const exploreText = await exploreRes.text();
  // Strip XSSI prefix ")]}'\n"
  const exploreJson = JSON.parse(exploreText.replace(/^\)\]\}',?\n/, ''));
  const widgets = exploreJson[0]?.widgets || [];
  const timelineWidget = widgets.find(w => w.title === 'Interest over time');
  if (!timelineWidget) throw new Error('No timeline widget found');

  // Step 2: fetch monthly time series data
  const timeReq = JSON.stringify({
    time: 'today 12-m',
    resolution: 'MONTH',
    locale: 'en-US',
    comparisonItem: [{
      geo,
      complexKeywordsRestriction: {
        keyword: [{ type: 'BROAD', value: keyword }],
      },
    }],
    requestOptions: { property: '', backend: 'IZG', category: 0 },
  });

  const timeUrl = `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=-300&req=${encodeURIComponent(timeReq)}&token=${encodeURIComponent(timelineWidget.token)}&user_type=PUBLIC_USER`;
  const timeRes = await fetch(timeUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://trends.google.com/',
    },
  });
  if (!timeRes.ok) throw new Error(`Trends widgetdata failed: ${timeRes.status}`);

  const timeText = await timeRes.text();
  const timeJson = JSON.parse(timeText.replace(/^\)\]\}',?\n/, ''));
  const timelineData = timeJson.default?.timelineData || [];

  return timelineData.map(entry => entry.value?.[0] ?? 0);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword')?.trim();
  const geo = (searchParams.get('geo') || 'US').toUpperCase().replace(/[^A-Z-]/g, '');

  if (!keyword) {
    return NextResponse.json({ error: 'keyword required' }, { status: 400 });
  }

  const cacheKey = getCacheKey(keyword, geo);

  if (!isStale(trendsCache[cacheKey])) {
    return NextResponse.json({ ...trendsCache[cacheKey].data, cached: true });
  }

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Trends request timed out')), 10000)
    );
    const rawValues = await Promise.race([fetchGoogleTrends(keyword, geo), timeoutPromise]);
    if (rawValues.length < 12) throw new Error(`Insufficient data: only ${rawValues.length} months`);

    const multipliers = normalizeToMultipliers(rawValues.slice(-12));
    const result = { multipliers, source: 'google_trends', keyword, geo };

    trendsCache[cacheKey] = { data: result, cachedAt: Date.now() };
    return NextResponse.json(result);
  } catch (err) {
    console.warn('Google Trends fetch failed, falling back to benchmarks:', err.message);

    // Fall back to flat multipliers (actual benchmarks will be applied client-side)
    return NextResponse.json({
      multipliers: Array(12).fill(1.0),
      source: 'benchmark_fallback',
      keyword,
      geo,
      fallback_reason: err.message,
    });
  }
}
