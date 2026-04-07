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
