// lib/analysis/ngram.js

/**
 * Extract n-grams from a search term string.
 * Lowercases, strips punctuation, splits on whitespace.
 *
 * @param {string} text
 * @param {number} n - gram size (1, 2, or 3)
 * @returns {string[]}
 */
export function extractNgrams(text, n) {
  const tokens = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length < n) return [];

  const grams = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    grams.push(tokens.slice(i, i + n).join(' '));
  }
  return grams;
}

/**
 * Build a cost-sorted n-gram aggregation table from search term rows.
 *
 * @param {Array<{searchTerm, cost, clicks, conversions}>} searchTermRows
 * @param {{ maxN?: number }} options
 * @returns {{ table: NgramEntry[], totalCost: number, accountAvgCpa: number }}
 */
export function buildNgramTable(searchTermRows, { maxN = 3 } = {}) {
  const map = new Map(); // phrase → { n, cost, clicks, conversions }

  const totalCost = searchTermRows.reduce((s, r) => s + (r.cost || 0), 0);
  const totalConversions = searchTermRows.reduce((s, r) => s + (r.conversions || 0), 0);
  const accountAvgCpa = totalConversions > 0 ? totalCost / totalConversions : Infinity;

  for (const row of searchTermRows) {
    const { searchTerm, cost = 0, clicks = 0, conversions = 0 } = row;
    if (!searchTerm) continue;

    for (let n = 1; n <= maxN; n++) {
      for (const phrase of extractNgrams(searchTerm, n)) {
        const existing = map.get(phrase) || { n, cost: 0, clicks: 0, conversions: 0 };
        map.set(phrase, {
          n: existing.n,
          cost: existing.cost + cost,
          clicks: existing.clicks + clicks,
          conversions: existing.conversions + conversions,
        });
      }
    }
  }

  const table = Array.from(map.entries())
    .map(([phrase, { n, cost, clicks, conversions }]) => {
      const cpa = conversions > 0 ? cost / conversions : null;
      return {
        phrase,
        n,
        cost:          Math.round(cost * 100) / 100,
        clicks,
        conversions,
        cpa:           cpa !== null ? Math.round(cpa * 100) / 100 : null,
        pctOfSpend:    totalCost > 0 ? Math.round((cost / totalCost) * 10000) / 100 : 0,
        isZeroConv:    conversions === 0 && cost > 0,
        isAboveAvgCpa: cpa !== null && isFinite(accountAvgCpa) && cpa > accountAvgCpa,
      };
    })
    .sort((a, b) => b.cost - a.cost);

  return { table, totalCost: Math.round(totalCost * 100) / 100, accountAvgCpa };
}
