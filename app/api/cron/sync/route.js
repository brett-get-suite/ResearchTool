import { NextResponse } from 'next/server';
import { syncAllAccounts } from '@/lib/google-ads-sync';

/**
 * Vercel Cron handler — syncs all connected Google Ads accounts.
 * Configured in vercel.json to run every 6 hours.
 *
 * Protected by CRON_SECRET to prevent unauthorized invocations.
 */
export async function GET(request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncAllAccounts();

    console.log(
      `[Cron Sync] Completed: ${result.synced} synced, ${result.failed || 0} failed`
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error('[Cron Sync] Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
