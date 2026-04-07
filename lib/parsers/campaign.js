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
