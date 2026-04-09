import { isGoogleAdsConfigured, enrichKeywordData } from '@/lib/google-ads';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

/**
 * Standalone enrichment endpoint.
 * POST { keywordData, serviceAreas }
 * Returns enriched keyword data with real Google metrics.
 * Used by the "Enrich with Google Data" button on existing clients.
 */
export const maxDuration = 60;

export async function POST(req) {
  const { allowed } = checkRateLimit(req, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests — please wait a moment' }, { status: 429 });
  }
  try {
    if (!isGoogleAdsConfigured()) {
      return NextResponse.json(
        { error: 'Google Ads API is not configured. Add GOOGLE_ADS_* environment variables.' },
        { status: 400 }
      );
    }

    const { keywordData, serviceAreas } = await req.json();

    if (!keywordData?.keyword_groups?.length) {
      return NextResponse.json(
        { error: 'Keyword data with keyword_groups is required' },
        { status: 400 }
      );
    }

    const enriched = await enrichKeywordData(
      JSON.parse(JSON.stringify(keywordData)),
      serviceAreas || []
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Keyword Planner enrichment error:', error);
    return NextResponse.json(
      { error: 'Failed to enrich keyword data' },
      { status: 500 }
    );
  }
}
