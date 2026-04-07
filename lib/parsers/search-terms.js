// lib/parsers/search-terms.js
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
 * @returns {{ searchTerm, matchType, campaign, adGroup, impressions, clicks,
 *             cost, conversions, conversionValue }[]}
 */
export function parseSearchTermsReport(rows) {
  return rows
    .filter(row => {
      const term = String(getCol(row, 'Search term', 'Search Term', 'search term') ?? '').trim().toLowerCase();
      if (!term) return false;
      return !TOTAL_KEYWORDS.some(t => term.startsWith(t));
    })
    .map(row => {
      const conv = getCol(row, 'Conversions', 'conversions', 'All conv.', 'all conv');
      const convVal = getCol(row, 'Conv. value', 'conv value', 'Conversion value', 'All conv. value');
      return {
        searchTerm:      String(getCol(row, 'Search term', 'Search Term', 'search term') ?? '').trim().toLowerCase(),
        matchType:       String(getCol(row, 'Match type', 'match type') ?? '').trim().toLowerCase(),
        campaign:        String(getCol(row, 'Campaign', 'campaign') ?? '').trim(),
        adGroup:         String(getCol(row, 'Ad group', 'ad group') ?? '').trim(),
        impressions:     parseNum(getCol(row, 'Impressions', 'impressions')) ?? 0,
        clicks:          parseNum(getCol(row, 'Clicks', 'clicks')) ?? 0,
        cost:            parseNum(getCol(row, 'Cost', 'cost')) ?? 0,
        conversions:     parseNum(conv) ?? 0,
        conversionValue: parseNum(convVal) ?? 0,
      };
    });
}
