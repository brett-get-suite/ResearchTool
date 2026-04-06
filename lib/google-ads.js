/**
 * Google Ads API client for Keyword Planner data.
 * Uses REST API directly — no extra dependencies needed.
 * Falls back gracefully if not configured.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ADS_API_VERSION = 'v19';
const ADS_API_BASE = `https://googleads.googleapis.com/${ADS_API_VERSION}`;

// In-memory token cache (per serverless invocation)
let cachedToken = null;
let tokenExpiry = 0;

// ─── Config check ─────────────────────────────────────────────────

export function isGoogleAdsConfigured() {
  return !!(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_CLIENT_SECRET &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN &&
    process.env.GOOGLE_ADS_CUSTOMER_ID
  );
}

// ─── Auth ─────────────────────────────────────────────────────────

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Google OAuth error: ${err.error_description || err.error || res.statusText}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

function getCustomerId() {
  return (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/-/g, '');
}

function apiHeaders(accessToken) {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    'Content-Type': 'application/json',
  };
}

// ─── Geo targeting ────────────────────────────────────────────────

const US_NATIONAL = 'geoTargetConstants/2840';

export async function resolveGeoTargets(serviceAreas) {
  if (!serviceAreas || serviceAreas.length === 0) return [US_NATIONAL];

  try {
    const accessToken = await getAccessToken();
    const res = await fetch(`${ADS_API_BASE}/geoTargetConstants:suggest`, {
      method: 'POST',
      headers: apiHeaders(accessToken),
      body: JSON.stringify({
        locale: 'en',
        countryCode: 'US',
        locationNames: { names: serviceAreas.slice(0, 25) },
      }),
    });

    if (!res.ok) {
      console.warn('Geo target resolution failed, using US national:', res.statusText);
      return [US_NATIONAL];
    }

    const data = await res.json();
    const targets = (data.geoTargetConstantSuggestions || [])
      .map(s => s.geoTargetConstant?.resourceName)
      .filter(Boolean);

    return targets.length > 0 ? targets : [US_NATIONAL];
  } catch (err) {
    console.warn('Geo target resolution error, using US national:', err.message);
    return [US_NATIONAL];
  }
}

// ─── Keyword Historical Metrics ───────────────────────────────────

function normalizeCompetition(comp) {
  if (!comp || comp === 'UNSPECIFIED' || comp === 'UNKNOWN') return 'low';
  return comp.toLowerCase();
}

/**
 * Get real search volume, CPC, and competition for a list of keywords.
 * Returns a map: { "keyword lowercase": { search_volume, avg_cpc, ... } }
 */
export async function getKeywordMetrics(keywords, geoTargets = [US_NATIONAL]) {
  if (!keywords || keywords.length === 0) return {};

  const accessToken = await getAccessToken();
  const customerId = getCustomerId();

  // Batch in chunks of 2000 (API safety)
  const BATCH = 2000;
  const metricsMap = {};

  for (let i = 0; i < keywords.length; i += BATCH) {
    const batch = keywords.slice(i, i + BATCH);

    const res = await fetch(
      `${ADS_API_BASE}/customers/${customerId}:generateKeywordHistoricalMetrics`,
      {
        method: 'POST',
        headers: apiHeaders(accessToken),
        body: JSON.stringify({
          keywords: batch,
          language: 'languageConstants/1000',
          geoTargetConstants: geoTargets,
          keywordPlanNetwork: 'GOOGLE_SEARCH',
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || err.error?.status || res.statusText;
      throw new Error(`Keyword Planner API error (${res.status}): ${msg}`);
    }

    const data = await res.json();

    for (const result of data.results || []) {
      const kw = (result.text || '').toLowerCase();
      const m = result.keywordMetrics || {};

      const lowBid = parseInt(m.lowTopOfPageBidMicros) || 0;
      const highBid = parseInt(m.highTopOfPageBidMicros) || 0;

      metricsMap[kw] = {
        search_volume: parseInt(m.avgMonthlySearches) || 0,
        avg_cpc: highBid > 0 ? (lowBid + highBid) / 2_000_000 : 0,
        cpc_low: lowBid / 1_000_000,
        cpc_high: highBid / 1_000_000,
        competition: normalizeCompetition(m.competition),
        competition_index: parseInt(m.competitionIndex) || 0,
        monthly_search_volumes: (m.monthlySearchVolumes || []).map(v => ({
          year: v.year,
          month: v.month,
          searches: parseInt(v.monthlySearches) || 0,
        })),
      };
    }
  }

  return metricsMap;
}

// ─── Keyword Ideas ────────────────────────────────────────────────

/**
 * Discover new keyword ideas from seed keywords.
 * Returns an array of { keyword, search_volume, avg_cpc, competition }.
 */
export async function generateKeywordIdeas(seedKeywords, geoTargets = [US_NATIONAL], pageSize = 100) {
  if (!seedKeywords || seedKeywords.length === 0) return [];

  const accessToken = await getAccessToken();
  const customerId = getCustomerId();

  const res = await fetch(
    `${ADS_API_BASE}/customers/${customerId}:generateKeywordIdeas`,
    {
      method: 'POST',
      headers: apiHeaders(accessToken),
      body: JSON.stringify({
        keywordSeed: { keywords: seedKeywords.slice(0, 20) },
        language: 'languageConstants/1000',
        geoTargetConstants: geoTargets,
        keywordPlanNetwork: 'GOOGLE_SEARCH',
        pageSize,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || err.error?.status || res.statusText;
    throw new Error(`Keyword Ideas API error (${res.status}): ${msg}`);
  }

  const data = await res.json();

  return (data.results || []).map(r => {
    const m = r.keywordIdeaMetrics || {};
    const lowBid = parseInt(m.lowTopOfPageBidMicros) || 0;
    const highBid = parseInt(m.highTopOfPageBidMicros) || 0;

    return {
      keyword: r.text,
      search_volume: parseInt(m.avgMonthlySearches) || 0,
      avg_cpc: highBid > 0 ? (lowBid + highBid) / 2_000_000 : 0,
      competition: normalizeCompetition(m.competition),
      competition_index: parseInt(m.competitionIndex) || 0,
    };
  });
}

// ─── Enrichment helper ────────────────────────────────────────────

/**
 * Takes Gemini keyword_data and enriches it with real Google metrics.
 * Modifies keyword objects in-place and returns the enriched data.
 */
export async function enrichKeywordData(keywordData, serviceAreas) {
  if (!keywordData?.keyword_groups) return keywordData;

  const allKeywords = keywordData.keyword_groups
    .flatMap(g => (g.keywords || []).map(k => k.keyword))
    .filter(Boolean);

  if (allKeywords.length === 0) return keywordData;

  const geoTargets = await resolveGeoTargets(serviceAreas);
  const metrics = await getKeywordMetrics(allKeywords, geoTargets);

  let enrichedCount = 0;

  for (const group of keywordData.keyword_groups) {
    for (const kw of group.keywords || []) {
      const real = metrics[kw.keyword?.toLowerCase()];
      if (real && real.search_volume > 0) {
        kw.estimated_monthly_searches = real.search_volume;
        kw.estimated_cpc = Math.round(real.avg_cpc * 100) / 100;
        kw.competition = real.competition;
        kw.competition_index = real.competition_index;
        kw.cpc_low = real.cpc_low;
        kw.cpc_high = real.cpc_high;
        kw.data_source = 'google';
        enrichedCount++;
      } else {
        kw.data_source = kw.data_source || 'estimated';
      }
    }
  }

  keywordData.data_source = enrichedCount > 0 ? 'google_enriched' : 'estimated';
  keywordData.google_enriched_count = enrichedCount;
  keywordData.google_enriched_at = new Date().toISOString();

  return keywordData;
}

// ─── Multi-account client factory ────────────────────────────────

export { getAccountClient } from './google-ads-auth.js';
