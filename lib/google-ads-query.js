/**
 * GAQL read queries for Google Ads campaigns, ad groups, keywords, ads, and metrics.
 * All functions accept a client object from getAccountClient().
 */

import { ADS_API_BASE } from './google-ads-auth.js';

/**
 * Run any GAQL query against an account.
 * @param {object} client — from getAccountClient()
 * @param {string} query — GAQL query string
 * @returns {Array} rows
 */
export async function queryGoogleAds(client, query) {
  const res = await fetch(
    `${ADS_API_BASE}/customers/${client.customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: client.headers,
      body: JSON.stringify({ query }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err[0]?.error?.message || err.error?.message || res.statusText;
    throw new Error(`Google Ads query failed (${res.status}): ${msg}`);
  }

  // searchStream returns newline-delimited JSON objects
  const text = await res.text();
  const rows = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '[' || trimmed === ']') continue;
    try {
      const parsed = JSON.parse(trimmed.replace(/^,/, ''));
      if (parsed.results) rows.push(...parsed.results);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('GAQL stream parse error:', e.message, trimmed.slice(0, 120));
      }
    }
  }
  return rows;
}

export async function fetchCampaigns(client) {
  const rows = await queryGoogleAds(client, `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.bidding_strategy_type,
      campaign_budget.amount_micros,
      campaign_budget.resource_name
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.name
  `);
  return rows.map(r => ({
    id: r.campaign.id,
    name: r.campaign.name,
    status: r.campaign.status,
    type: r.campaign.advertisingChannelType,
    biddingStrategy: r.campaign.biddingStrategyType,
    budgetAmountMicros: r.campaignBudget?.amountMicros,
    budgetResource: r.campaignBudget?.resourceName,
    resourceName: `customers/${client.customerId}/campaigns/${r.campaign.id}`,
  }));
}

export async function fetchAdGroups(client, campaignId) {
  let whereClause = "ad_group.status != 'REMOVED'";
  if (campaignId) whereClause += ` AND campaign.id = ${campaignId}`;

  const rows = await queryGoogleAds(client, `
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group.cpc_bid_micros,
      campaign.id,
      campaign.name
    FROM ad_group
    WHERE ${whereClause}
    ORDER BY ad_group.name
  `);
  return rows.map(r => ({
    id: r.adGroup.id,
    name: r.adGroup.name,
    status: r.adGroup.status,
    cpcBidMicros: r.adGroup.cpcBidMicros,
    campaignId: r.campaign.id,
    campaignName: r.campaign.name,
    resourceName: `customers/${client.customerId}/adGroups/${r.adGroup.id}`,
  }));
}

export async function fetchKeywords(client, adGroupId) {
  let whereClause = "ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.status != 'REMOVED'";
  if (adGroupId) whereClause += ` AND ad_group.id = ${adGroupId}`;

  const rows = await queryGoogleAds(client, `
    SELECT
      ad_group_criterion.criterion_id,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status,
      ad_group_criterion.cpc_bid_micros,
      ad_group_criterion.quality_info.quality_score,
      ad_group.id,
      ad_group.name,
      campaign.id,
      campaign.name
    FROM ad_group_criterion
    WHERE ${whereClause}
    ORDER BY ad_group_criterion.keyword.text
  `);
  return rows.map(r => ({
    criterionId: r.adGroupCriterion.criterionId,
    keyword: r.adGroupCriterion.keyword?.text,
    matchType: r.adGroupCriterion.keyword?.matchType,
    status: r.adGroupCriterion.status,
    cpcBidMicros: r.adGroupCriterion.cpcBidMicros,
    qualityScore: r.adGroupCriterion.qualityInfo?.qualityScore,
    adGroupId: r.adGroup.id,
    adGroupName: r.adGroup.name,
    campaignId: r.campaign.id,
    campaignName: r.campaign.name,
    resourceName: `customers/${client.customerId}/adGroupCriteria/${r.adGroup.id}~${r.adGroupCriterion.criterionId}`,
  }));
}

export async function fetchAds(client, adGroupId) {
  let whereClause = "ad_group_ad.status != 'REMOVED'";
  if (adGroupId) whereClause += ` AND ad_group.id = ${adGroupId}`;

  const rows = await queryGoogleAds(client, `
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      ad_group_ad.ad.type,
      ad_group_ad.ad.responsive_search_ad.headlines,
      ad_group_ad.ad.responsive_search_ad.descriptions,
      ad_group_ad.ad.final_urls,
      ad_group_ad.status,
      ad_group.id,
      ad_group.name,
      campaign.id,
      campaign.name
    FROM ad_group_ad
    WHERE ${whereClause}
    ORDER BY ad_group_ad.ad.id
  `);
  return rows.map(r => ({
    id: r.adGroupAd.ad.id,
    name: r.adGroupAd.ad.name,
    type: r.adGroupAd.ad.type,
    headlines: r.adGroupAd.ad.responsiveSearchAd?.headlines || [],
    descriptions: r.adGroupAd.ad.responsiveSearchAd?.descriptions || [],
    finalUrls: r.adGroupAd.ad.finalUrls || [],
    status: r.adGroupAd.status,
    adGroupId: r.adGroup.id,
    adGroupName: r.adGroup.name,
    campaignId: r.campaign.id,
    campaignName: r.campaign.name,
    resourceName: `customers/${client.customerId}/adGroupAds/${r.adGroup.id}~${r.adGroupAd.ad.id}`,
  }));
}

export async function fetchCampaignMetrics(client, dateRange = 'LAST_30_DAYS') {
  const rows = await queryGoogleAds(client, `
    SELECT
      campaign.id,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE segments.date DURING ${dateRange}
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
  `);
  return rows.map(r => ({
    campaignId: r.campaign.id,
    campaignName: r.campaign.name,
    impressions: parseInt(r.metrics.impressions) || 0,
    clicks: parseInt(r.metrics.clicks) || 0,
    costMicros: parseInt(r.metrics.costMicros) || 0,
    cost: (parseInt(r.metrics.costMicros) || 0) / 1_000_000,
    conversions: parseFloat(r.metrics.conversions) || 0,
    ctr: parseFloat(r.metrics.ctr) || 0,
    avgCpc: (parseInt(r.metrics.averageCpc) || 0) / 1_000_000,
  }));
}

export async function fetchAccountMetrics(client) {
  const rows = await queryGoogleAds(client, `
    SELECT
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr
    FROM customer
  `);
  if (!rows.length) return { impressions: 0, clicks: 0, cost: 0, conversions: 0, ctr: 0 };
  const r = rows[0].metrics;
  return {
    impressions: parseInt(r.impressions) || 0,
    clicks: parseInt(r.clicks) || 0,
    costMicros: parseInt(r.costMicros) || 0,
    cost: (parseInt(r.costMicros) || 0) / 1_000_000,
    conversions: parseFloat(r.conversions) || 0,
    ctr: parseFloat(r.ctr) || 0,
  };
}

export async function fetchKeywordMetrics(client, dateRange = 'LAST_30_DAYS') {
  const rows = await queryGoogleAds(client, `
    SELECT
      ad_group_criterion.criterion_id,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group.id,
      campaign.id,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM keyword_view
    WHERE segments.date DURING ${dateRange}
      AND ad_group_criterion.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 1000
  `);
  return rows.map(r => ({
    criterionId: r.adGroupCriterion.criterionId,
    keyword: r.adGroupCriterion.keyword?.text,
    matchType: r.adGroupCriterion.keyword?.matchType,
    adGroupId: r.adGroup.id,
    campaignId: r.campaign.id,
    impressions: parseInt(r.metrics.impressions) || 0,
    clicks: parseInt(r.metrics.clicks) || 0,
    cost: (parseInt(r.metrics.costMicros) || 0) / 1_000_000,
    conversions: parseFloat(r.metrics.conversions) || 0,
    ctr: parseFloat(r.metrics.ctr) || 0,
    avgCpc: (parseInt(r.metrics.averageCpc) || 0) / 1_000_000,
  }));
}

export async function fetchSearchTerms(client, dateRange = 'LAST_30_DAYS') {
  const rows = await queryGoogleAds(client, `
    SELECT
      search_term_view.search_term,
      search_term_view.status,
      ad_group.id,
      campaign.id,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM search_term_view
    WHERE segments.date DURING ${dateRange}
    ORDER BY metrics.cost_micros DESC
    LIMIT 500
  `);
  return rows.map(r => ({
    searchTerm: r.searchTermView.searchTerm,
    status: r.searchTermView.status,
    adGroupId: r.adGroup.id,
    campaignId: r.campaign.id,
    impressions: parseInt(r.metrics.impressions) || 0,
    clicks: parseInt(r.metrics.clicks) || 0,
    cost: (parseInt(r.metrics.costMicros) || 0) / 1_000_000,
    conversions: parseFloat(r.metrics.conversions) || 0,
  }));
}
