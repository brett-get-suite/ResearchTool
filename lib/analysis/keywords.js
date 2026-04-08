// lib/analysis/keywords.js

/**
 * Analyze keyword and search term rows.
 *
 * @param {object[]} keywordRows - from keyword parser
 * @param {object[]} searchTermRows - from search terms parser
 * @param {{ mode?: string }} options
 * @returns {{ zeroConvKeywords, zeroConvTerms, totalWastedOnKeywords, totalWastedOnTerms,
 *             topSpenders, negativeGaps }}
 */
export function analyzeKeywords(keywordRows, searchTermRows, { mode = 'lead_gen' } = {}) {
  // Zero-converting keywords (cost > 0, no conversions)
  const zeroConvKeywords = keywordRows
    .filter(k => k.cost > 0 && k.conversions === 0)
    .sort((a, b) => b.cost - a.cost);

  const totalWastedOnKeywords = Math.round(
    zeroConvKeywords.reduce((s, k) => s + k.cost, 0) * 100
  ) / 100;

  // Zero-converting search terms
  const zeroConvTerms = searchTermRows
    .filter(t => t.cost > 0 && t.conversions === 0)
    .sort((a, b) => b.cost - a.cost);

  const totalWastedOnTerms = Math.round(
    zeroConvTerms.reduce((s, t) => s + t.cost, 0) * 100
  ) / 100;

  // Top 20 keywords by cost
  const topSpenders = [...keywordRows]
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 20);

  // Negative keyword gaps: zero-conv terms with cost > 2x average term cost
  const avgTermCost = searchTermRows.length > 0
    ? searchTermRows.reduce((s, t) => s + t.cost, 0) / searchTermRows.length
    : 0;

  const negativeGaps = zeroConvTerms
    .filter(t => t.cost > Math.max(avgTermCost * 2, 1)) // at least 2x avg, min $1
    .slice(0, 20)
    .map(t => ({ term: t.searchTerm, cost: t.cost, clicks: t.clicks }));

  return {
    zeroConvKeywords,
    zeroConvTerms,
    totalWastedOnKeywords,
    totalWastedOnTerms,
    topSpenders,
    negativeGaps,
  };
}
