import { NextResponse } from 'next/server';
import { syncAccount } from '@/lib/google-ads-sync';
import { checkRateLimit } from '@/lib/rateLimit';
import { MOCK_MODE } from '@/lib/google-ads-mock';

export async function POST(request, { params }) {
  const { allowed } = checkRateLimit(request, { limit: 5, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests — please wait a moment' }, { status: 429 });
  }

  if (MOCK_MODE) {
    return NextResponse.json({ success: true, counts: { campaigns: 3, adGroups: 5, keywords: 5, ads: 2, searchTerms: 5, hourlyRows: 168, changeEvents: 3 } });
  }

  try {
    const result = await syncAccount(params.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Sync error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
