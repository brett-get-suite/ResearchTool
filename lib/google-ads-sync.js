/**
 * Scheduled sync orchestrator for Google Ads data.
 * Pulls all data types for an account and stores snapshots in Supabase.
 * Used by the Vercel Cron route and on-demand sync.
 */

import { getAccountClient, invalidateTokenCache } from './google-ads-auth.js';
import {
  fetchCampaigns,
  fetchAdGroups,
  fetchKeywords,
  fetchAds,
  fetchCampaignMetrics,
  fetchCampaignMetricsWithIS,
  fetchHourlyPerformance,
  fetchSearchTerms,
  fetchChangeHistory,
} from './google-ads-query.js';
import {
  saveSnapshot,
  saveMetricsSnapshot,
  updateAccount,
  getAccounts,
} from './supabase.js';
import { MOCK_MODE } from './google-ads-mock.js';

/**
 * Run a full sync for a single account.
 * Pulls campaigns, ad groups, keywords, ads, metrics (with IS), hourly data,
 * search terms, and change history. Stores everything in snapshots.
 *
 * @param {string} accountId — Supabase UUID
 * @returns {{ success: boolean, counts: object, error?: string }}
 */
export async function syncAccount(accountId) {
  try {
    const client = await getAccountClient(accountId);

    // Fetch all data types in parallel — non-critical fetches use .catch()
    const [
      campaigns,
      adGroups,
      keywords,
      ads,
      metrics,
      metricsWithIS,
      hourly,
      searchTerms,
      changeHistory,
    ] = await Promise.all([
      fetchCampaigns(client),
      fetchAdGroups(client),
      fetchKeywords(client),
      fetchAds(client).catch(() => []),
      fetchCampaignMetrics(client),
      fetchCampaignMetricsWithIS(client).catch(() => []),
      fetchHourlyPerformance(client).catch(() => []),
      fetchSearchTerms(client).catch(() => []),
      fetchChangeHistory(client).catch(() => []),
    ]);

    // Build snapshot payloads
    const snapshotData = {
      campaigns,
      adGroups,
      keywords,
      ads,
      searchTerms,
      changeHistory,
    };

    const metricsData = {
      campaigns: metrics,
      campaignsWithIS: metricsWithIS,
      hourly,
    };

    // Aggregate for period-over-period tracking
    let totalSpend = 0;
    let totalConversions = 0;
    let totalClicks = 0;
    let totalBudget = 0;
    for (const c of metrics) {
      totalSpend += c.cost || 0;
      totalConversions += c.conversions || 0;
      totalClicks += c.clicks || 0;
    }
    for (const c of campaigns) {
      if (c.status === 'ENABLED' && c.budgetAmountMicros) {
        totalBudget += Number(c.budgetAmountMicros) / 1_000_000;
      }
    }

    const aggregated = {
      total_spend: totalSpend,
      conversions: totalConversions,
      clicks: totalClicks,
      avg_cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      cost_per_lead: totalConversions > 0 ? totalSpend / totalConversions : 0,
      budget: totalBudget,
    };

    // Save snapshots
    await Promise.all([
      saveSnapshot(accountId, snapshotData, metricsData),
      saveMetricsSnapshot(accountId, aggregated),
    ]);

    // Update account last sync timestamp
    await updateAccount(accountId, { last_synced_at: new Date().toISOString() });

    const counts = {
      campaigns: campaigns.length,
      adGroups: adGroups.length,
      keywords: keywords.length,
      ads: ads.length,
      searchTerms: searchTerms.length,
      hourlyRows: hourly.length,
      changeEvents: changeHistory.length,
    };

    return { success: true, counts };
  } catch (err) {
    // If auth failed, invalidate cached token so next attempt refreshes
    if (err.code === 'invalid_grant' || err.message?.includes('401')) {
      invalidateTokenCache(accountId);
    }
    return { success: false, counts: {}, error: err.message };
  }
}

/**
 * Sync all connected accounts.
 * Filters to accounts that have a Google Ads refresh token.
 * Returns per-account results.
 */
export async function syncAllAccounts() {
  if (MOCK_MODE) {
    return { synced: 0, results: [], mock: true };
  }

  const accounts = await getAccounts();
  const connected = accounts.filter(a => a.google_refresh_token);

  const results = [];
  // Sync sequentially to avoid rate-limiting across accounts
  for (const account of connected) {
    const result = await syncAccount(account.id);
    results.push({ accountId: account.id, name: account.name, ...result });
  }

  return {
    synced: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
}
