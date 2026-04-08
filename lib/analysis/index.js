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
