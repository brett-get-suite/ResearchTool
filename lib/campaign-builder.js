/**
 * Campaign Builder — assembles wizard form data into a Google Ads API payload
 * or a Google Ads Editor-compatible CSV export.
 */

// ─── Google Ads API Payload ──────────────────────────────────────────────────

export function buildCampaignPayload(form) {
  const keywords = (form.keywords || '')
    .split('\n')
    .map((k) => k.trim())
    .filter(Boolean);

  const negatives = (form.negativeKeywords || '')
    .split('\n')
    .map((k) => k.trim())
    .filter(Boolean);

  const headlines = form.headlines.filter(Boolean);
  const descriptions = form.descriptions.filter(Boolean);

  // Budget in micros (Google Ads uses micros = dollars * 1,000,000)
  const budgetAmountMicros = Math.round(Number(form.dailyBudget) * 1_000_000);

  // Build bidding config
  const bidding = { strategy: form.biddingStrategy };
  if (form.biddingStrategy === 'TARGET_CPA' && form.targetCpaMicros) {
    bidding.targetCpaMicros = Math.round(Number(form.targetCpaMicros) * 1_000_000);
  }
  if (form.biddingStrategy === 'TARGET_ROAS' && form.targetRoas) {
    bidding.targetRoas = Number(form.targetRoas) / 100; // 300% → 3.0
  }
  if (form.biddingStrategy === 'MANUAL_CPC' && form.maxCpcBid) {
    bidding.maxCpcBidMicros = Math.round(Number(form.maxCpcBid) * 1_000_000);
  }

  // Build ad groups based on structure
  let adGroups;
  if (form.structure === 'skag') {
    // One keyword per ad group
    adGroups = keywords.map((kw) => ({
      name: kw.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 60),
      keywords: [{ text: kw, matchType: form.matchType || 'PHRASE' }],
      ads: [{
        headlines,
        descriptions,
        finalUrl: form.finalUrl || form.landingPageUrl,
      }],
    }));
  } else {
    // STAG: all keywords in one group
    adGroups = [{
      name: form.name ? `${form.name} - Ad Group 1` : 'Ad Group 1',
      keywords: keywords.map((kw) => ({ text: kw, matchType: form.matchType || 'PHRASE' })),
      ads: [{
        headlines,
        descriptions,
        finalUrl: form.finalUrl || form.landingPageUrl,
      }],
    }];
  }

  // Build sitelinks
  const sitelinks = (form.sitelinks || [])
    .filter((s) => s.headline)
    .map((s) => ({
      headline: s.headline,
      description1: s.description1,
      description2: s.description2,
      finalUrl: s.finalUrl,
    }));

  const callouts = (form.callouts || []).filter(Boolean);

  const structuredSnippets =
    form.structuredSnippets?.header
      ? {
          header: form.structuredSnippets.header,
          values: form.structuredSnippets.values.filter(Boolean),
        }
      : null;

  return {
    campaign: {
      name: form.name,
      status: form.status || 'PAUSED',
      advertisingChannelType: form.campaignType || 'SEARCH',
      strategy: form.strategy,
      budgetAmountMicros,
      bidding,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    },
    targeting: {
      locations: form.locations || [],
      languages: form.languages || ['en'],
      ageRanges: form.ageRanges || [],
      genders: form.genders || [],
      householdIncomes: form.householdIncomes || [],
      daypartSchedule: form.daypartSchedule || {},
    },
    adGroups,
    negativeKeywords: negatives.map((kw) => ({ text: kw, matchType: 'BROAD' })),
    assets: {
      sitelinks,
      callouts,
      structuredSnippets,
    },
  };
}

// ─── Google Ads Editor CSV Export ─────────────────────────────────────────────

export function buildEditorCSV(form) {
  const payload = buildCampaignPayload(form);
  const rows = [];

  // Header
  rows.push([
    'Campaign', 'Campaign Type', 'Campaign Daily Budget', 'Bid Strategy Type',
    'Campaign Status', 'Ad Group', 'Keyword', 'Match Type',
    'Headline 1', 'Headline 2', 'Headline 3', 'Description 1', 'Description 2',
    'Final URL', 'Negative Keyword',
  ].join(','));

  // Ad group rows
  for (const ag of payload.adGroups) {
    for (const kw of ag.keywords) {
      const ad = ag.ads[0] || {};
      rows.push([
        csvEscape(payload.campaign.name),
        payload.campaign.advertisingChannelType,
        Number(payload.campaign.budgetAmountMicros / 1_000_000).toFixed(2),
        payload.campaign.bidding.strategy,
        payload.campaign.status,
        csvEscape(ag.name),
        csvEscape(kw.text),
        kw.matchType,
        csvEscape(ad.headlines?.[0] || ''),
        csvEscape(ad.headlines?.[1] || ''),
        csvEscape(ad.headlines?.[2] || ''),
        csvEscape(ad.descriptions?.[0] || ''),
        csvEscape(ad.descriptions?.[1] || ''),
        csvEscape(ad.finalUrl || ''),
        '',
      ].join(','));
    }
  }

  // Negative keyword rows
  for (const neg of payload.negativeKeywords) {
    rows.push([
      csvEscape(payload.campaign.name),
      '', '', '', '', '', '', '',
      '', '', '', '', '', '',
      csvEscape(neg.text),
    ].join(','));
  }

  return rows.join('\n');
}

function csvEscape(val) {
  if (!val) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
