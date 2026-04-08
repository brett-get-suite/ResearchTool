/**
 * Format a single keyword row for Google Ads Editor CSV import.
 * Applies match type formatting: Exact → [keyword], Phrase → "keyword", Broad → keyword
 */
export function formatKeywordRow({
  keyword,
  match_type = 'Broad',
  avg_cpc = 0,
  campaign = 'Campaign',
  ad_group = 'Ad Group',
}) {
  let formatted = keyword;
  if (match_type === 'Exact') formatted = `[${keyword}]`;
  else if (match_type === 'Phrase') formatted = `"${keyword}"`;

  const cpc = typeof avg_cpc === 'number' ? avg_cpc.toFixed(2) : '0.00';
  return `${campaign},${ad_group},${formatted},${match_type},${cpc}`;
}

/**
 * Build a complete Google Ads Editor CSV from a keyword list.
 * Groups keywords by intent into ad groups named "{campaign} - {Intent}".
 *
 * @param {Object[]} keywords - Array of { keyword, intent, avg_cpc, cpc, match_type }
 * @param {string} campaignName - Campaign name for the export
 * @returns {string} CSV string
 */
export function buildGoogleAdsCsv(keywords, campaignName = 'Campaign') {
  const header = 'Campaign,Ad Group,Keyword,Match Type,Max CPC';

  if (!keywords || keywords.length === 0) return header;

  const rows = keywords.map((kw) => {
    const intent = (kw.intent || 'general').charAt(0).toUpperCase() + (kw.intent || 'general').slice(1).toLowerCase();
    const adGroup = `${campaignName} - ${intent}`;

    return formatKeywordRow({
      keyword: kw.keyword || kw.cluster || '',
      match_type: kw.match_type || 'Broad',
      avg_cpc: kw.avg_cpc || kw.cpc || 0,
      campaign: campaignName,
      ad_group: adGroup,
    });
  });

  return [header, ...rows].join('\n');
}
