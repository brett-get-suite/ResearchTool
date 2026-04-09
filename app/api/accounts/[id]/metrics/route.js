import { NextResponse } from 'next/server';
import { getAccountClient } from '@/lib/google-ads-auth';
import { fetchAccountMetrics, fetchCampaignMetricsWithIS } from '@/lib/google-ads-query';
import { getMetricsHistory, saveMetricsSnapshot } from '@/lib/supabase';

/**
 * Aggregate campaign-level metrics into account-level totals.
 */
function aggregateMetrics(campaignMetrics) {
  let totalSpend = 0;
  let totalConversions = 0;
  let totalClicks = 0;
  let totalBudget = 0;

  for (const c of campaignMetrics) {
    totalSpend += c.cost || 0;
    totalConversions += c.conversions || 0;
    totalClicks += c.clicks || 0;
    totalBudget += (c.budget || 0);
  }

  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const costPerLead = totalConversions > 0 ? totalSpend / totalConversions : 0;

  return {
    total_spend: totalSpend,
    conversions: totalConversions,
    clicks: totalClicks,
    avg_cpc: avgCpc,
    cost_per_lead: costPerLead,
    budget: totalBudget,
  };
}

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('range') || 'LAST_30_DAYS';

    const client = await getAccountClient(params.id);

    // Fetch current period metrics
    const [account, campaigns] = await Promise.all([
      fetchAccountMetrics(client),
      fetchCampaignMetricsWithIS(client, dateRange),
    ]);

    const current = aggregateMetrics(campaigns);

    // Save current snapshot for future comparisons (await to ensure ordering)
    await saveMetricsSnapshot(params.id, { ...current, account }).catch(() => {});

    // Get previous period from stored snapshots
    // history[0] is the one we just saved, history[1] is previous
    const history = await getMetricsHistory(params.id);
    const previousSnapshot = history.length >= 2 ? history[1] : null;
    const previous = previousSnapshot?.metrics_data || {};

    return NextResponse.json({
      account,
      campaigns,
      current,
      previous: {
        total_spend: previous.total_spend || 0,
        conversions: previous.conversions || 0,
        clicks: previous.clicks || 0,
        avg_cpc: previous.avg_cpc || 0,
        cost_per_lead: previous.cost_per_lead || 0,
        budget: previous.budget || 0,
      },
    });
  } catch (err) {
    console.error('Metrics GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
