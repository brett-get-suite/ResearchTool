import { NextResponse } from 'next/server';
import { analyzeDayparting } from '@/lib/analysis/dayparting';
import { getAccount } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const id = params.id;
    const account = await getAccount(id);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Hourly data comes from cached audit_data (populated by Google Ads sync)
    // or from a fresh API call if the account has a connected Google Ads client
    const hourlyData = account.audit_data?.hourly_performance || [];
    const analysis = analyzeDayparting(hourlyData);

    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
