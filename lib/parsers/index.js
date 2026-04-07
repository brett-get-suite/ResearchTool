// lib/parsers/index.js
import { normalizeHeader } from './normalize.js';
import { parseKeywordReport } from './keyword.js';
import { parseSearchTermsReport } from './search-terms.js';
import { parseCampaignReport } from './campaign.js';
import { parseProductReport } from './product.js';

/**
 * Detect the type of Google Ads report from its column headers.
 * Returns: 'keyword' | 'search_terms' | 'campaign' | 'product' | null
 *
 * @param {string[]} headers - Array of raw column header strings
 */
export function detectReportType(headers) {
  const normalized = headers.map(normalizeHeader);
  const has = (keyword) => normalized.some(h => h.includes(keyword));

  if (has('product title') || has('item id')) return 'product';
  if (has('search term')) return 'search_terms';
  if (has('keyword') && has('match type')) return 'keyword';
  if (has('campaign') && !has('keyword') && !has('search term') && !has('product')) return 'campaign';
  return null;
}

/**
 * Parse rows (array of objects from PapaParse header:true) into normalized schema.
 *
 * @param {object[]} rows - Parsed CSV rows as objects
 * @param {'keyword'|'search_terms'|'campaign'|'product'} type - Report type
 * @returns {object[]} Normalized rows
 */
export function parseReport(rows, type) {
  switch (type) {
    case 'keyword':      return parseKeywordReport(rows);
    case 'search_terms': return parseSearchTermsReport(rows);
    case 'campaign':     return parseCampaignReport(rows);
    case 'product':      return parseProductReport(rows);
    default: throw new Error(`Unknown report type: ${type}`);
  }
}
