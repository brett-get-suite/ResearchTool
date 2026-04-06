import { NextResponse } from 'next/server';
import { BrandAgent } from '@/lib/agents/brand';
import { getAccount } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(request) {
  const { allowed } = checkRateLimit(request, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests — please wait a moment' }, { status: 429 });
  }
  try {
    const { accountId, url } = await request.json();
    if (!accountId || !url) {
      return NextResponse.json({ error: 'accountId and url are required' }, { status: 400 });
    }

    const agent = new BrandAgent(accountId, 'manual');
    agent.websiteUrl = url;
    await agent.run();

    const account = await getAccount(accountId);
    return NextResponse.json({ success: true, brandProfile: account.brand_profile });
  } catch (err) {
    console.error('Brand lab error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
