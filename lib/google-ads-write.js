/**
 * Google Ads mutate operations.
 * All functions accept a client from getAccountClient() and return the resource name.
 */

import { ADS_API_BASE } from './google-ads-auth.js';
import { MOCK_MODE, mockMutateResponse } from './google-ads-mock.js';

async function mutate(client, operations) {
  if (MOCK_MODE) return mockMutateResponse(operations.length);
  const res = await fetch(
    `${ADS_API_BASE}/customers/${client.customerId}/googleAds:mutate`,
    {
      method: 'POST',
      headers: client.headers,
      body: JSON.stringify({ mutateOperations: operations }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || err[0]?.error?.message || res.statusText;
    throw new Error(`Google Ads mutate failed (${res.status}): ${msg}`);
  }

  return res.json();
}

// ─── Campaign Operations ──────────────────────────────────────────

export async function createCampaignBudget(client, { name, amountMicros, deliveryMethod = 'STANDARD' }) {
  const result = await mutate(client, [{
    campaignBudgetOperation: {
      create: {
        name,
        amountMicros: String(amountMicros),
        deliveryMethod,
      },
    },
  }]);
  return result.mutateOperationResponses[0]?.campaignBudgetResult?.resourceName;
}

export async function createCampaign(client, { name, budgetResourceName, biddingStrategy, networkSettings, status = 'PAUSED', targetCpaMicros, targetRoas, maxCpcBidMicros, advertisingChannelType = 'SEARCH' }) {
  const campaign = {
    name,
    status,
    campaignBudget: budgetResourceName,
    advertisingChannelType,
  };

  // Only set network settings for SEARCH campaigns
  if (advertisingChannelType === 'SEARCH') {
    campaign.networkSettings = networkSettings || {
      targetGoogleSearch: true,
      targetSearchNetwork: true,
      targetContentNetwork: false,
    };
  }

  if (biddingStrategy === 'MAXIMIZE_CONVERSIONS') {
    campaign.maximizeConversions = {};
  } else if (biddingStrategy === 'MAXIMIZE_CLICKS') {
    campaign.maximizeClicks = {};
  } else if (biddingStrategy === 'TARGET_CPA') {
    campaign.targetCpa = { targetCpaMicros: String(targetCpaMicros || 5_000_000) };
  } else if (biddingStrategy === 'TARGET_ROAS') {
    campaign.targetRoas = { targetRoas: targetRoas || 3.0 };
  } else {
    campaign.manualCpc = { enhancedCpcEnabled: true };
    if (maxCpcBidMicros) campaign.manualCpc.maxCpcBidMicros = String(maxCpcBidMicros);
  }

  const result = await mutate(client, [{ campaignOperation: { create: campaign } }]);
  return result.mutateOperationResponses[0]?.campaignResult?.resourceName;
}

export async function updateCampaign(client, resourceName, updates) {
  const updateMask = Object.keys(updates).join(',');
  const result = await mutate(client, [{
    campaignOperation: {
      update: { resourceName, ...updates },
      updateMask,
    },
  }]);
  return result.mutateOperationResponses[0]?.campaignResult?.resourceName;
}

export async function setCampaignStatus(client, resourceName, status) {
  return updateCampaign(client, resourceName, { status });
}

export async function updateCampaignBudget(client, budgetResourceName, newAmountMicros) {
  const result = await mutate(client, [{
    campaignBudgetOperation: {
      update: { resourceName: budgetResourceName, amountMicros: String(newAmountMicros) },
      updateMask: 'amount_micros',
    },
  }]);
  return result.mutateOperationResponses[0]?.campaignBudgetResult?.resourceName;
}

// ─── Ad Group Operations ──────────────────────────────────────────

export async function createAdGroup(client, { campaignResourceName, name, cpcBidMicros }) {
  const result = await mutate(client, [{
    adGroupOperation: {
      create: {
        name,
        campaign: campaignResourceName,
        status: 'ENABLED',
        cpcBidMicros: String(cpcBidMicros || 1_000_000),
      },
    },
  }]);
  return result.mutateOperationResponses[0]?.adGroupResult?.resourceName;
}

export async function updateAdGroup(client, resourceName, updates) {
  const updateMask = Object.keys(updates).join(',');
  const result = await mutate(client, [{
    adGroupOperation: {
      update: { resourceName, ...updates },
      updateMask,
    },
  }]);
  return result.mutateOperationResponses[0]?.adGroupResult?.resourceName;
}

// ─── Keyword Operations ───────────────────────────────────────────

/**
 * @param {object} client
 * @param {string} adGroupResourceName
 * @param {Array<{text: string, matchType: string}>} keywords
 */
export async function addKeywords(client, adGroupResourceName, keywords) {
  const operations = keywords.map(kw => ({
    adGroupCriterionOperation: {
      create: {
        adGroup: adGroupResourceName,
        status: 'ENABLED',
        keyword: {
          text: kw.text,
          matchType: kw.matchType || 'BROAD',
        },
      },
    },
  }));
  const result = await mutate(client, operations);
  return result.mutateOperationResponses.map(r => r.adGroupCriterionResult?.resourceName);
}

export async function updateKeywordBid(client, resourceName, newBidMicros) {
  const result = await mutate(client, [{
    adGroupCriterionOperation: {
      update: { resourceName, cpcBidMicros: String(newBidMicros) },
      updateMask: 'cpc_bid_micros',
    },
  }]);
  return result.mutateOperationResponses[0]?.adGroupCriterionResult?.resourceName;
}

export async function setKeywordStatus(client, resourceName, status) {
  const result = await mutate(client, [{
    adGroupCriterionOperation: {
      update: { resourceName, status },
      updateMask: 'status',
    },
  }]);
  return result.mutateOperationResponses[0]?.adGroupCriterionResult?.resourceName;
}

export async function addNegativeKeywords(client, campaignResourceName, keywords) {
  const operations = keywords.map(kw => ({
    campaignCriterionOperation: {
      create: {
        campaign: campaignResourceName,
        negative: true,
        keyword: {
          text: kw.text,
          matchType: kw.matchType || 'BROAD',
        },
      },
    },
  }));
  const result = await mutate(client, operations);
  return result.mutateOperationResponses.map(r => r.campaignCriterionResult?.resourceName);
}

// ─── Ad Operations ────────────────────────────────────────────────

export async function createResponsiveSearchAd(client, { adGroupResourceName, headlines, descriptions, finalUrl }) {
  const result = await mutate(client, [{
    adGroupAdOperation: {
      create: {
        adGroup: adGroupResourceName,
        status: 'ENABLED',
        ad: {
          responsiveSearchAd: {
            headlines: headlines.map((text, i) => {
              const h = { text };
              if (i === 0) h.pinnedField = 'HEADLINE_1';
              return h;
            }),
            descriptions: descriptions.map(text => ({ text })),
          },
          finalUrls: [finalUrl],
        },
      },
    },
  }]);
  return result.mutateOperationResponses[0]?.adGroupAdResult?.resourceName;
}

export async function setAdStatus(client, resourceName, status) {
  const result = await mutate(client, [{
    adGroupAdOperation: {
      update: { resourceName, status },
      updateMask: 'status',
    },
  }]);
  return result.mutateOperationResponses[0]?.adGroupAdResult?.resourceName;
}

// ─── Location Targeting ──────────────────────────────────────────

/**
 * Set location targets on a campaign.
 * @param {object} client
 * @param {string} campaignResourceName
 * @param {Array<string>} locations — geo target constant IDs or free-text names
 */
export async function setCampaignLocations(client, campaignResourceName, locations) {
  if (!locations?.length) return [];
  const operations = locations.map(loc => ({
    campaignCriterionOperation: {
      create: {
        campaign: campaignResourceName,
        location: {
          geoTargetConstant: loc.startsWith('geoTargetConstants/')
            ? loc
            : `geoTargetConstants/${loc}`,
        },
      },
    },
  }));
  const result = await mutate(client, operations);
  return result.mutateOperationResponses.map(r => r.campaignCriterionResult?.resourceName);
}

/**
 * Set language targets on a campaign.
 * @param {object} client
 * @param {string} campaignResourceName
 * @param {Array<string>} languageCodes — e.g. ['en', 'es']
 */
const LANGUAGE_IDS = {
  en: '1000', es: '1003', fr: '1002', de: '1001', pt: '1014',
  zh: '1017', ja: '1005', ko: '1012', ar: '1019', hi: '1023',
};

export async function setCampaignLanguages(client, campaignResourceName, languageCodes) {
  if (!languageCodes?.length) return [];
  const operations = languageCodes
    .map(code => LANGUAGE_IDS[code])
    .filter(Boolean)
    .map(id => ({
      campaignCriterionOperation: {
        create: {
          campaign: campaignResourceName,
          language: { languageConstant: `languageConstants/${id}` },
        },
      },
    }));
  if (operations.length === 0) return [];
  const result = await mutate(client, operations);
  return result.mutateOperationResponses.map(r => r.campaignCriterionResult?.resourceName);
}

// ─── Ad Schedule (Dayparting) ────────────────────────────────────

/**
 * Set ad schedule criteria on a campaign.
 * @param {object} client
 * @param {string} campaignResourceName
 * @param {Object} daypartSchedule — { Monday: [8,9,10,...], Tuesday: [...] }
 */
const DAY_OF_WEEK_MAP = {
  Monday: 'MONDAY', Tuesday: 'TUESDAY', Wednesday: 'WEDNESDAY',
  Thursday: 'THURSDAY', Friday: 'FRIDAY', Saturday: 'SATURDAY', Sunday: 'SUNDAY',
};

export async function setCampaignAdSchedule(client, campaignResourceName, daypartSchedule) {
  if (!daypartSchedule) return [];
  const operations = [];
  for (const [day, hours] of Object.entries(daypartSchedule)) {
    if (!hours?.length || !DAY_OF_WEEK_MAP[day]) continue;
    // Collapse consecutive hours into ranges
    const ranges = [];
    let start = hours[0];
    let end = hours[0];
    for (let i = 1; i < hours.length; i++) {
      if (hours[i] === end + 1) {
        end = hours[i];
      } else {
        ranges.push([start, end + 1]);
        start = hours[i];
        end = hours[i];
      }
    }
    ranges.push([start, end + 1]);

    for (const [startHour, endHour] of ranges) {
      operations.push({
        campaignCriterionOperation: {
          create: {
            campaign: campaignResourceName,
            adSchedule: {
              dayOfWeek: DAY_OF_WEEK_MAP[day],
              startHour,
              startMinute: 'ZERO',
              endHour: Math.min(endHour, 24),
              endMinute: 'ZERO',
            },
          },
        },
      });
    }
  }
  if (operations.length === 0) return [];
  const result = await mutate(client, operations);
  return result.mutateOperationResponses.map(r => r.campaignCriterionResult?.resourceName);
}

// ─── Asset Operations (Sitelinks, Callouts, Structured Snippets) ─

export async function addSitelinkAssets(client, campaignResourceName, sitelinks) {
  if (!sitelinks?.length) return [];
  const operations = sitelinks.map(sl => ({
    campaignAssetOperation: {
      create: {
        campaign: campaignResourceName,
        fieldType: 'SITELINK',
        asset: {
          sitelinkAsset: {
            linkText: sl.headline,
            description1: sl.description1 || '',
            description2: sl.description2 || '',
          },
          finalUrls: sl.finalUrl ? [sl.finalUrl] : [],
        },
      },
    },
  }));
  const result = await mutate(client, operations);
  return result.mutateOperationResponses.map(r => r.campaignAssetResult?.resourceName);
}

export async function addCalloutAssets(client, campaignResourceName, callouts) {
  if (!callouts?.length) return [];
  const operations = callouts.map(text => ({
    campaignAssetOperation: {
      create: {
        campaign: campaignResourceName,
        fieldType: 'CALLOUT',
        asset: { calloutAsset: { calloutText: text } },
      },
    },
  }));
  const result = await mutate(client, operations);
  return result.mutateOperationResponses.map(r => r.campaignAssetResult?.resourceName);
}

export async function addStructuredSnippetAssets(client, campaignResourceName, snippets) {
  if (!snippets?.header || !snippets?.values?.length) return [];
  const result = await mutate(client, [{
    campaignAssetOperation: {
      create: {
        campaign: campaignResourceName,
        fieldType: 'STRUCTURED_SNIPPET',
        asset: {
          structuredSnippetAsset: {
            header: snippets.header,
            values: snippets.values,
          },
        },
      },
    },
  }]);
  return result.mutateOperationResponses.map(r => r.campaignAssetResult?.resourceName);
}
