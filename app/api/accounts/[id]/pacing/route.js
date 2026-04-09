import { NextResponse } from 'next/server';
import { getAccountClient } from '@/lib/google-ads-auth';
import { fetchCampaigns, fetchCampaignMetrics } from '@/lib/google-ads-query';
import { MOCK_MODE } from '@/lib/google-ads-mock';

/**
 * Calculate budget pacing for an account.
 * Pacing = spend_to_date / (daily_budget * days_elapsed_in_period)
 */
function calculatePacing(campaigns, metrics, daysElapsed, daysInPeriod) {
  let totalBudget = 0;
  let totalSpend = 0;

  const metricsById = {};
  for (const m of metrics) metricsById[m.campaignId] = m;

  const campaignPacing = [];

  for (const campaign of campaigns) {
    if (campaign.status !== 'ENABLED') continue;

    const dailyBudget = campaign.budgetAmountMicros
      ? Number(campaign.budgetAmountMicros) / 1_000_000
      : 0;
    const m = metricsById[campaign.id] || {};
    const spend = m.cost || 0;

    const expectedSpend = dailyBudget * daysElapsed;
    const periodBudget = dailyBudget * daysInPeriod;
    const pacingPct = expectedSpend > 0 ? (spend / expectedSpend) * 100 : 0;

    let pacingStatus = 'on_track';
    if (pacingPct > 110) pacingStatus = 'overspending';
    else if (pacingPct < 80) pacingStatus = 'underspending';

    totalBudget += periodBudget;
    totalSpend += spend;

    campaignPacing.push({
      campaignId: campaign.id,
      name: campaign.name,
      dailyBudget,
      periodBudget,
      spend,
      expectedSpend,
      pacingPct: Math.round(pacingPct * 10) / 10,
      status: pacingStatus,
    });
  }

  const overallExpected = totalBudget > 0 ? (totalBudget / daysInPeriod) * daysElapsed : 0;
  const overallPacingPct = overallExpected > 0 ? (totalSpend / overallExpected) * 100 : 0;
  let overallStatus = 'on_track';
  if (overallPacingPct > 110) overallStatus = 'overspending';
  else if (overallPacingPct < 80) overallStatus = 'underspending';

  return {
    overall: {
      totalBudget,
      totalSpend,
      expectedSpend: overallExpected,
      pacingPct: Math.round(overallPacingPct * 10) / 10,
      status: overallStatus,
      daysElapsed,
      daysInPeriod,
      daysRemaining: daysInPeriod - daysElapsed,
    },
    campaigns: campaignPacing,
  };
}

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const periodDays = parseInt(searchParams.get('period') || '30', 10);
    const daysElapsed = parseInt(searchParams.get('elapsed') || String(Math.min(new Date().getDate(), periodDays)), 10);

    if (MOCK_MODE) {
      return NextResponse.json({
        overall: {
          totalBudget: 10000, totalSpend: 7200, expectedSpend: 7333,
          pacingPct: 98.2, status: 'on_track', daysElapsed: 22, daysInPeriod: 30, daysRemaining: 8,
        },
        campaigns: [
          { campaignId: '11111111', name: 'HVAC Services - Search', dailyBudget: 166.67, periodBudget: 5000, spend: 3800, expectedSpend: 3667, pacingPct: 103.6, status: 'on_track' },
          { campaignId: '22222222', name: 'AC Repair - Brand', dailyBudget: 66.67, periodBudget: 2000, spend: 1850, expectedSpend: 1467, pacingPct: 126.1, status: 'overspending' },
          { campaignId: '33333333', name: 'Plumbing Services - Search', dailyBudget: 100.00, periodBudget: 3000, spend: 1550, expectedSpend: 2200, pacingPct: 70.5, status: 'underspending' },
        ],
      });
    }

    const client = await getAccountClient(params.id);
    const [campaigns, metrics] = await Promise.all([
      fetchCampaigns(client),
      fetchCampaignMetrics(client, `LAST_${periodDays}_DAYS`),
    ]);

    const pacing = calculatePacing(campaigns, metrics, daysElapsed, periodDays);
    return NextResponse.json(pacing);
  } catch (err) {
    console.error('Pacing GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
