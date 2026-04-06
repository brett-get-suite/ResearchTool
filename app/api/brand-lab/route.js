import { NextResponse } from 'next/server';
import { BrandAgent } from '@/lib/agents/brand';
import { getAccount } from '@/lib/supabase';

export async function POST(request) {
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
