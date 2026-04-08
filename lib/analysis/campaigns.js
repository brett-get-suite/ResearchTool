// lib/analysis/campaigns.js

/**
 * Analyze campaign performance rows.
 *
 * @param {object[]} campaignRows - from campaign parser
 * @param {{ mode?: string }} options
 * @returns {{ rankedCampaigns, readyToScale, underperformers, totalSpend, avgCpa, avgRoas }}
 */
export function analyzeCampaigns(campaignRows, { mode = 'lead_gen' } = {}) {
  const totalSpend = Math.round(
    campaignRows.reduce((s, c) => s + (c.cost || 0), 0) * 100
  ) / 100;

  const totalConversions = campaignRows.reduce((s, c) => s + (c.conversions || 0), 0);
  const totalConvValue   = campaignRows.reduce((s, c) => s + (c.conversionValue || 0), 0);

  const avgCpa  = totalConversions > 0 ? Math.round((totalSpend / totalConversions) * 100) / 100 : null;
  const avgRoas = totalSpend > 0       ? Math.round((totalConvValue / totalSpend) * 100) / 100 : null;

  // Sort by primary metric
  const rankedCampaigns = [...campaignRows].sort((a, b) => {
    if (mode === 'ecommerce') {
      return (b.roas || 0) - (a.roas || 0);
    }
    // Lead gen: ascending CPA. Zero-conv campaigns go last.
    if (a.conversions === 0 && b.conversions === 0) return (b.cost || 0) - (a.cost || 0);
    if (a.conversions === 0) return 1;
    if (b.conversions === 0) return -1;
    return (a.cpa || 0) - (b.cpa || 0);
  });

  // Ready to scale: performing better than account average
  const readyToScale = rankedCampaigns.filter(c => {
    if (mode === 'ecommerce') return avgRoas !== null && (c.roas || 0) > avgRoas;
    return avgCpa !== null && c.conversions > 0 && (c.cpa || 0) < avgCpa;
  });

  // Underperformers: campaigns burning money without conversions
  const underperformers = rankedCampaigns.filter(c => {
    if (mode === 'ecommerce') return avgRoas !== null && (c.roas || 0) < avgRoas * 0.5 && (c.cost || 0) > 0;
    return c.conversions === 0 && (c.cost || 0) > 0;
  });

  return { rankedCampaigns, readyToScale, underperformers, totalSpend, avgCpa, avgRoas };
}
