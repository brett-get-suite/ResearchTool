import { NextResponse } from 'next/server';
import { getAccountClient } from '@/lib/google-ads-auth';
import { fetchCampaigns, fetchAdGroups, fetchKeywords, fetchCampaignMetrics } from '@/lib/google-ads-query';
import { saveSnapshot, updateAccount } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rateLimit';
import { MOCK_MODE } from '@/lib/google-ads-mock';

export async function POST(request, { params }) {
  const { allowed } = checkRateLimit(request, { limit: 5, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests — please wait a moment' }, { status: 429 });
  }

  if (MOCK_MODE) {
    return NextResponse.json({ campaigns: 3, adGroups: 5, keywords: 5 });
  }

  try {
    const client = await getAccountClient(params.id);

    const [campaigns, adGroups, keywords, metrics] = await Promise.all([
      fetchCampaigns(client),
      fetchAdGroups(client),
      fetchKeywords(client),
      fetchCampaignMetrics(client),
    ]);

    const snapshotData = { campaigns, adGroups, keywords };
    const metricsData = { campaigns: metrics };

    await saveSnapshot(params.id, snapshotData, metricsData);
    await updateAccount(params.id, { last_synced_at: new Date().toISOString() });

    return NextResponse.json({
      campaigns: campaigns.length,
      adGroups: adGroups.length,
      keywords: keywords.length,
    });
  } catch (err) {
    console.error('Sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
