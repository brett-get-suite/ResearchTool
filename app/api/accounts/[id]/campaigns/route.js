import { NextResponse } from 'next/server';
import { getAccountClient } from '@/lib/google-ads-auth';
import { fetchCampaigns, fetchCampaignMetrics } from '@/lib/google-ads-query';
import {
  createCampaign,
  createCampaignBudget,
  createAdGroup,
  addKeywords,
  addNegativeKeywords,
  createResponsiveSearchAd,
  setCampaignLocations,
  setCampaignLanguages,
  setCampaignAdSchedule,
  addSitelinkAssets,
  addCalloutAssets,
  addStructuredSnippetAssets,
} from '@/lib/google-ads-write';

export async function GET(request, { params }) {
  try {
    const client = await getAccountClient(params.id);

    const [campaigns, metrics] = await Promise.all([
      fetchCampaigns(client),
      fetchCampaignMetrics(client),
    ]);

    const metricsById = {};
    for (const m of metrics) {
      metricsById[m.campaignId] = m;
    }

    const merged = campaigns.map((campaign) => ({
      ...campaign,
      ...(metricsById[campaign.id] || {}),
    }));

    return NextResponse.json(merged);
  } catch (err) {
    console.error('Campaigns GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const body = await request.json();

    // Support both legacy simple payload and new wizard payload
    const isWizardPayload = body.campaign && body.adGroups;

    if (isWizardPayload) {
      return handleWizardCreate(params.id, body);
    }
    return handleSimpleCreate(params.id, body);
  } catch (err) {
    console.error('Campaigns POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Simple create (legacy 4-step wizard) ────────────────────────────────────

async function handleSimpleCreate(accountId, { name, budgetAmountMicros, biddingStrategy, status }) {
  if (!name || !budgetAmountMicros) {
    return NextResponse.json({ error: 'name and budgetAmountMicros are required' }, { status: 400 });
  }

  const client = await getAccountClient(accountId);

  const budgetResource = await createCampaignBudget(client, {
    name: name + ' Budget',
    amountMicros: budgetAmountMicros,
  });

  if (!budgetResource) throw new Error('Budget creation returned no resource name');

  const campaignResource = await createCampaign(client, {
    name,
    budgetResourceName: budgetResource,
    biddingStrategy,
    status,
  });

  return NextResponse.json({ campaignResource, budgetResource });
}

// ─── Wizard create (14-step campaign builder payload) ────────────────────────

async function handleWizardCreate(accountId, payload) {
  const { campaign, adGroups, negativeKeywords, assets, targeting } = payload;

  if (!campaign.name || !campaign.budgetAmountMicros) {
    return NextResponse.json(
      { error: 'Campaign name and budget are required' },
      { status: 400 }
    );
  }

  const client = await getAccountClient(accountId);
  const results = { campaign: null, adGroups: [], errors: [] };

  // 1. Create budget
  const budgetResource = await createCampaignBudget(client, {
    name: campaign.name + ' Budget',
    amountMicros: campaign.budgetAmountMicros,
  });

  if (!budgetResource) throw new Error('Budget creation returned no resource name');

  // 2. Create campaign
  const bidding = campaign.bidding || {};
  const campaignResource = await createCampaign(client, {
    name: campaign.name,
    budgetResourceName: budgetResource,
    biddingStrategy: bidding.strategy || 'MAXIMIZE_CONVERSIONS',
    status: campaign.status || 'PAUSED',
    advertisingChannelType: campaign.advertisingChannelType || 'SEARCH',
    targetCpaMicros: bidding.targetCpaMicros,
    targetRoas: bidding.targetRoas,
    maxCpcBidMicros: bidding.maxCpcBidMicros,
  });

  results.campaign = campaignResource;

  // 3. Create ad groups with keywords and ads
  for (const ag of adGroups || []) {
    try {
      const agResource = await createAdGroup(client, {
        campaignResourceName: campaignResource,
        name: ag.name,
      });

      // Add keywords
      if (ag.keywords?.length > 0) {
        await addKeywords(client, agResource, ag.keywords);
      }

      // Create ads
      for (const ad of ag.ads || []) {
        if (ad.headlines?.length >= 3 && ad.descriptions?.length >= 2) {
          await createResponsiveSearchAd(client, {
            adGroupResourceName: agResource,
            headlines: ad.headlines,
            descriptions: ad.descriptions,
            finalUrl: ad.finalUrl,
          });
        }
      }

      results.adGroups.push({ name: ag.name, resource: agResource });
    } catch (err) {
      results.errors.push({ adGroup: ag.name, error: err.message });
    }
  }

  // 4. Add campaign-level negative keywords
  if (negativeKeywords?.length > 0) {
    try {
      await addNegativeKeywords(client, campaignResource, negativeKeywords);
    } catch (err) {
      results.errors.push({ negativeKeywords: true, error: err.message });
    }
  }

  // 5. Set targeting (locations, languages, ad schedule)
  if (targeting) {
    try {
      if (targeting.locations?.length > 0) {
        await setCampaignLocations(client, campaignResource, targeting.locations);
      }
      if (targeting.languages?.length > 0) {
        await setCampaignLanguages(client, campaignResource, targeting.languages);
      }
      const hasSchedule = Object.values(targeting.daypartSchedule || {}).some(h => h?.length > 0);
      if (hasSchedule) {
        await setCampaignAdSchedule(client, campaignResource, targeting.daypartSchedule);
      }
    } catch (err) {
      results.errors.push({ targeting: true, error: err.message });
    }
  }

  // 6. Add ad assets (sitelinks, callouts, structured snippets)
  if (assets) {
    try {
      if (assets.sitelinks?.length > 0) {
        await addSitelinkAssets(client, campaignResource, assets.sitelinks);
      }
      if (assets.callouts?.length > 0) {
        await addCalloutAssets(client, campaignResource, assets.callouts);
      }
      if (assets.structuredSnippets?.header) {
        await addStructuredSnippetAssets(client, campaignResource, assets.structuredSnippets);
      }
    } catch (err) {
      results.errors.push({ assets: true, error: err.message });
    }
  }

  return NextResponse.json(results);
}
