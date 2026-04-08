// lib/prompts/swot.js

/**
 * Build the Gemini prompt for SWOT + action items from computed audit data.
 *
 * @param {object} computedData - output of runAudit()
 * @returns {string} prompt string
 */
export function buildSwotPrompt(computedData) {
  const { mode, summary, ngrams, keywords, campaigns } = computedData;
  const isEcom = mode === 'ecommerce';
  const primaryMetric = isEcom ? 'ROAS' : 'CPA';

  // Top 15 n-gram themes by spend
  const topNgrams = (ngrams.table || []).slice(0, 15).map((r, i) => {
    const cpaStr = r.cpa !== null ? `${primaryMetric}: $${r.cpa}` : '0 conv';
    const flag = r.isZeroConv ? ' ← ZERO CONV' : r.isAboveAvgCpa ? ' ← HIGH COST' : '';
    return `  ${i + 1}. "${r.phrase}" — $${r.cost} spend, ${r.conversions} conv, ${cpaStr}${flag}`;
  }).join('\n');

  // Zero-conv themes (top 10 by cost)
  const wastedThemes = (keywords.zeroConvTerms || []).slice(0, 10).map(t =>
    `  - "${t.searchTerm}" — $${t.cost} wasted`
  ).join('\n');

  // Campaign rankings (top 8)
  const campaignList = (campaigns.rankedCampaigns || []).slice(0, 8).map((c, i) => {
    const metric = isEcom ? `ROAS: ${c.roas}` : `CPA: $${c.cpa}`;
    const tag = campaigns.readyToScale?.some(s => s.campaign === c.campaign) ? ' ← SCALE' :
                campaigns.underperformers?.some(u => u.campaign === c.campaign) ? ' ← UNDERPERFORMING' : '';
    return `  ${i + 1}. ${c.campaign} — $${c.cost} spend, ${c.conversions} conv, ${metric}${tag}`;
  }).join('\n');

  return `You are a senior PPC account strategist. Analyze this Google Ads account data and generate a SWOT analysis plus prioritized action items.

ACCOUNT MODE: ${isEcom ? 'E-Commerce (optimize for ROAS, purchases)' : 'Lead Generation (optimize for CPA, calls & form fills)'}

ACCOUNT SUMMARY:
- Total Spend: $${summary.totalSpend}
- Total Conversions: ${summary.totalConversions}
- Average ${primaryMetric}: ${isEcom ? summary.avgRoas : '$' + summary.avgCpa}
- Wasted Spend (zero-conversion): $${summary.totalWasted} (${summary.wastedPct}% of total)
- Keywords analyzed: ${summary.keywordCount}
- Search terms analyzed: ${summary.searchTermCount}
- Campaigns: ${summary.campaignCount}

TOP N-GRAM THEMES BY SPEND:
${topNgrams || '  (no search term data)'}

ZERO-CONVERTING SEARCH TERMS (wasted spend sample):
${wastedThemes || '  (none found)'}

CAMPAIGN PERFORMANCE (ranked by ${primaryMetric}):
${campaignList || '  (no campaign data)'}

NEGATIVE KEYWORD GAPS (high-cost zero-conv terms flagged for review):
${(keywords.negativeGaps || []).slice(0, 8).map(g => `  - "${g.term}" — $${g.cost}`).join('\n') || '  (none identified)'}

Return ONLY valid JSON with this exact structure. No markdown, no explanation outside the JSON:
{
  "swot": {
    "strengths":     [{"title": "...", "detail": "...", "dataPoint": "..."}],
    "weaknesses":    [{"title": "...", "detail": "...", "dataPoint": "..."}],
    "opportunities": [{"title": "...", "detail": "...", "dataPoint": "..."}],
    "threats":       [{"title": "...", "detail": "...", "dataPoint": "..."}]
  },
  "actionItems": [
    {
      "description":    "...",
      "rationale":      "Reference specific data: term, cost, metric",
      "confidence":     "HIGH",
      "category":       "NEGATIVE_KEYWORD",
      "estimatedImpact":"..."
    }
  ]
}

Rules:
- Each SWOT quadrant: 2–4 items. No padding.
- Action items: 5–10, sorted by estimated impact (highest first).
- confidence: HIGH = 50+ data points, MEDIUM = 10–49, LOW = < 10
- category: NEGATIVE_KEYWORD | PAUSE_KEYWORD | SCALE_BUDGET | RESTRUCTURE | BID_ADJUSTMENT
- dataPoint: always cite a specific number from the data above (e.g. "$340 on zero-converting terms")
- Weaknesses and action items must be grounded in the data — no generic PPC advice`;
}
