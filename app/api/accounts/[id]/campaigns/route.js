import { NextResponse } from 'next/server';
import { getAccountClient } from '@/lib/google-ads-auth';
import { fetchCampaigns, fetchCampaignMetrics } from '@/lib/google-ads-query';
import { createCampaign, createCampaignBudget } from '@/lib/google-ads-write';

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
    const { name, budgetAmountMicros, biddingStrategy, status } = await request.json();

    if (!name || !budgetAmountMicros) {
      return NextResponse.json({ error: 'name and budgetAmountMicros are required' }, { status: 400 });
    }

    const client = await getAccountClient(params.id);

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
  } catch (err) {
    console.error('Campaigns POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
