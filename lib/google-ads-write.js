/**
 * Google Ads mutate operations.
 * All functions accept a client from getAccountClient() and return the resource name.
 */

import { ADS_API_BASE } from './google-ads-auth.js';

async function mutate(client, operations) {
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

export async function createCampaign(client, { name, budgetResourceName, biddingStrategy, networkSettings, status = 'PAUSED' }) {
  const campaign = {
    name,
    status,
    campaignBudget: budgetResourceName,
    advertisingChannelType: 'SEARCH',
    networkSettings: networkSettings || {
      targetGoogleSearch: true,
      targetSearchNetwork: true,
      targetContentNetwork: false,
    },
  };

  if (biddingStrategy === 'MAXIMIZE_CONVERSIONS') {
    campaign.maximizeConversions = {};
  } else if (biddingStrategy === 'TARGET_CPA') {
    campaign.targetCpa = { targetCpaMicros: String(5_000_000) };
  } else {
    campaign.manualCpc = { enhancedCpcEnabled: true };
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
            headlines: headlines.map((text, i) => ({ text, pinnedField: i < 1 ? 'HEADLINE_1' : null })),
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
