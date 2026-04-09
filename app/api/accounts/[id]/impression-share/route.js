import { NextResponse } from 'next/server';
import { getAccountClient } from '@/lib/google-ads-auth';
import { fetchCampaignMetricsWithIS } from '@/lib/google-ads-query';
import { MOCK_MODE } from '@/lib/google-ads-mock';
import { mockFetchCampaignMetricsWithIS } from '@/lib/google-ads-mock';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('range') || 'LAST_30_DAYS';

    if (MOCK_MODE) {
      return NextResponse.json({ campaigns: mockFetchCampaignMetricsWithIS() });
    }

    const client = await getAccountClient(params.id);
    const campaigns = await fetchCampaignMetricsWithIS(client, dateRange);

    return NextResponse.json({ campaigns });
  } catch (err) {
    console.error('Impression share GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch impression share data' }, { status: 500 });
  }
}
