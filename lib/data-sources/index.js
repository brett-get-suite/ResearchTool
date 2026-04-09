import { batchFetchTrends } from './trends.js';
import { getDemandSurgeAlerts } from './weather.js';

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
export function classifyDataSources(kw) {
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
        { ...kw, trend_multipliers: trendEntry ? trendEntry[1].multipliers : null }
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
