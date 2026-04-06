import { NextResponse } from 'next/server';
import { getAccountClient } from '@/lib/google-ads-auth';
import { fetchAccountMetrics, fetchCampaignMetrics } from '@/lib/google-ads-query';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('range') || 'LAST_30_DAYS';

    const client = await getAccountClient(params.id);
    const [account, campaigns] = await Promise.all([
      fetchAccountMetrics(client),
      fetchCampaignMetrics(client, dateRange),
    ]);

    return NextResponse.json({ account, campaigns });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
