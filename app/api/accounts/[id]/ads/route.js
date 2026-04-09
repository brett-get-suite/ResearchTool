import { NextResponse } from 'next/server';
import { getAccountClient } from '@/lib/google-ads-auth';
import { fetchAds } from '@/lib/google-ads-query';
import { createResponsiveSearchAd } from '@/lib/google-ads-write';

export async function GET(request, { params }) {
  try {
    const client = await getAccountClient(params.id);

    const ads = await fetchAds(client);

    return NextResponse.json(ads);
  } catch (err) {
    console.error('Ads GET error:', err);
    return NextResponse.json({ error: 'Failed to process ads request' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { adGroupResourceName, headlines, descriptions, finalUrl } = await request.json();

    if (!adGroupResourceName || !Array.isArray(headlines) || !Array.isArray(descriptions) || !finalUrl) {
      return NextResponse.json({ error: 'adGroupResourceName, headlines[], descriptions[], and finalUrl are required' }, { status: 400 });
    }

    const client = await getAccountClient(params.id);

    const resourceName = await createResponsiveSearchAd(client, {
      adGroupResourceName,
      headlines,
      descriptions,
      finalUrl,
    });

    return NextResponse.json({ resourceName });
  } catch (err) {
    console.error('Ads POST error:', err);
    return NextResponse.json({ error: 'Failed to process ads request' }, { status: 500 });
  }
}
