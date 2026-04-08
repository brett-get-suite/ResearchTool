// lib/parsers/product.js
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
 * @returns {{ productTitle, productId, category, brand, customLabel,
 *             impressions, clicks, cost, conversions, conversionValue, roas }[]}
 */
export function parseProductReport(rows) {
  return rows
    .filter(row => {
      const title = String(getCol(row, 'Product title', 'product title', 'Title') ?? '').trim().toLowerCase();
      if (!title) return false;
      return !TOTAL_KEYWORDS.some(t => title.startsWith(t));
    })
    .map(row => {
      const cost = parseNum(getCol(row, 'Cost', 'cost')) ?? 0;
      const convValue = parseNum(getCol(row, 'Conv. value', 'conv value', 'Conversion value', 'All conv. value')) ?? 0;
      const roasCol = getCol(row, 'ROAS', 'roas', 'Conv. value / cost');
      const roas = roasCol !== undefined
        ? parseNum(roasCol) ?? 0
        : cost > 0 ? convValue / cost : 0;

      return {
        productTitle:    String(getCol(row, 'Product title', 'product title', 'Title') ?? '').trim(),
        productId:       String(getCol(row, 'Item ID', 'item id', 'Product ID', 'product id') ?? '').trim(),
        category:        String(getCol(row, 'Product type (1st level)', 'product type (1st level)', 'Category', 'category') ?? '').trim(),
        brand:           String(getCol(row, 'Brand', 'brand') ?? '').trim(),
        customLabel:     String(getCol(row, 'Custom label 0', 'custom label 0', 'Custom label') ?? '').trim(),
        impressions:     parseNum(getCol(row, 'Impressions', 'impressions')) ?? 0,
        clicks:          parseNum(getCol(row, 'Clicks', 'clicks')) ?? 0,
        cost,
        conversions:     parseNum(getCol(row, 'Conversions', 'conversions', 'All conv.')) ?? 0,
        conversionValue: convValue,
        roas:            Math.round(roas * 100) / 100,
      };
    });
}
