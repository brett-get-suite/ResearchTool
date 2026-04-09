/**
 * Dashboard utility functions for the Mission Control dashboard.
 * Formatting, health scoring, alert generation, pacing, top movers.
 */

/* ── Formatting ───────────────────────────────────────────── */

export function formatCurrency(value, compact = false) {
  if (value == null || isNaN(value)) return '$0';
  if (compact && Math.abs(value) >= 10000) {
    return '$' + (value / 1000).toFixed(1) + 'k';
  }
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatNumber(value, decimals = 0) {
  if (value == null || isNaN(value)) return '0';
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatPercent(value, decimals = 1) {
  if (value == null || isNaN(value)) return '0%';
  return value.toFixed(decimals) + '%';
}

export function formatCompact(value) {
  if (value == null || isNaN(value)) return '0';
  if (Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (Math.abs(value) >= 1000) return (value / 1000).toFixed(1) + 'k';
  return value.toFixed(0);
}

/* ── Delta / Change ───────────────────────────────────────── */

export function calcDelta(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/* ── Health Score ─────────────────────────────────────────── */

export function computeHealthScore(campaign) {
  if (!campaign.cost && !campaign.conversions) return 'healthy';

  const issues = [];

  // High spend with zero conversions
  if (campaign.cost > 100 && (!campaign.conversions || campaign.conversions === 0)) {
    issues.push('critical');
  }

  // Search impression share
  const searchIS = campaign.search_impression_share;
  if (searchIS != null) {
    if (searchIS < 0.3) issues.push('critical');
    else if (searchIS < 0.5) issues.push('warning');
  }

  // Budget pacing (rough check — daily budget vs spend)
  if (campaign.budget > 0 && campaign.cost > 0) {
    const ratio = campaign.cost / (campaign.budget * 30);
    if (ratio < 0.4) issues.push('warning');
    if (ratio > 1.2) issues.push('warning');
  }

  if (issues.includes('critical')) return 'critical';
  if (issues.includes('warning')) return 'warning';
  return 'healthy';
}

/* ── Alert Generation ─────────────────────────────────────── */

export function generateAlerts(accounts, metricsMap, campaignsMap = {}) {
  const alerts = [];
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  const expectedPacing = dayOfMonth / daysInMonth;

  for (const account of accounts) {
    const data = metricsMap[account.id];
    if (!data) continue;

    const { current, previous } = data;
    const campaigns = campaignsMap[account.id] || [];

    // Budget underspending
    if (current?.budget > 0) {
      const monthlyBudget = current.budget * 30.4;
      const pacing = current.total_spend / monthlyBudget;
      if (pacing < expectedPacing * 0.6 && daysRemaining > 7) {
        alerts.push({
          id: `underspend-${account.id}`,
          severity: 'warning',
          client: account.name,
          accountId: account.id,
          message: `${Math.round((1 - pacing / expectedPacing) * 100)}% underspending budget with ${daysRemaining} days left`,
          type: 'budget_pacing',
        });
      }
    }

    // Cost per conversion spike
    if (current?.cost_per_lead > 0 && previous?.cost_per_lead > 0) {
      const delta = calcDelta(current.cost_per_lead, previous.cost_per_lead);
      if (delta > 25) {
        alerts.push({
          id: `cpl-spike-${account.id}`,
          severity: delta > 50 ? 'critical' : 'warning',
          client: account.name,
          accountId: account.id,
          message: `Cost per conversion increased ${Math.round(delta)}% vs previous period`,
          type: 'cost_spike',
        });
      }
    }

    // High spend zero conversions
    const zeroCampaigns = campaigns.filter(c => c.cost > 500 && (!c.conversions || c.conversions === 0));
    if (zeroCampaigns.length > 0) {
      const totalWaste = zeroCampaigns.reduce((s, c) => s + (c.cost || 0), 0);
      alerts.push({
        id: `zero-conv-${account.id}`,
        severity: 'critical',
        client: account.name,
        accountId: account.id,
        message: `${zeroCampaigns.length} campaign${zeroCampaigns.length > 1 ? 's' : ''} with $${Math.round(totalWaste)}+ spend and 0 conversions`,
        type: 'zero_conversions',
      });
    }

    // Low impression share
    const lowIS = campaigns.filter(c => c.search_impression_share != null && c.search_impression_share < 0.3 && c.status === 'ENABLED');
    if (lowIS.length > 0) {
      alerts.push({
        id: `low-is-${account.id}`,
        severity: 'warning',
        client: account.name,
        accountId: account.id,
        message: `${lowIS.length} campaign${lowIS.length > 1 ? 's' : ''} with search impression share below 30%`,
        type: 'low_impression_share',
      });
    }
  }

  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => (order[a.severity] ?? 2) - (order[b.severity] ?? 2));
}

/* ── Budget Pacing ────────────────────────────────────────── */

export function calculatePacing(spend, monthlyBudget) {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  const expectedPacing = dayOfMonth / daysInMonth;
  const actualPacing = monthlyBudget > 0 ? spend / monthlyBudget : 0;

  let status = 'on-track';
  if (actualPacing < expectedPacing * 0.75) status = 'underspending';
  else if (actualPacing > expectedPacing * 1.15) status = 'overspending';

  return {
    spent: spend,
    budget: monthlyBudget,
    percent: Math.min(actualPacing * 100, 150),
    daysRemaining,
    daysInMonth,
    status,
  };
}

/* ── Top Movers ───────────────────────────────────────────── */

export function computeTopMovers(allCampaigns) {
  const scored = allCampaigns
    .filter(c => (c.conversions > 0 || c.prev_conversions > 0) && c.cost > 0)
    .map(c => {
      const costConv = c.conversions > 0 ? c.cost / c.conversions : Infinity;
      const prevCostConv = c.prev_conversions > 0 ? (c.prev_cost || 0) / c.prev_conversions : Infinity;
      const costConvDelta =
        prevCostConv !== Infinity && costConv !== Infinity
          ? calcDelta(costConv, prevCostConv)
          : null;
      return { ...c, costConvDelta };
    })
    .filter(c => c.costConvDelta != null);

  const improvers = [...scored]
    .filter(c => c.costConvDelta < 0)
    .sort((a, b) => a.costConvDelta - b.costConvDelta)
    .slice(0, 5);

  const decliners = [...scored]
    .filter(c => c.costConvDelta > 0)
    .sort((a, b) => b.costConvDelta - a.costConvDelta)
    .slice(0, 5);

  return { improvers, decliners };
}

/* ── Sparkline Data ───────────────────────────────────────── */

export function generateSparklineData(currentValue, trend = 0, points = 30) {
  const data = [];
  const dailyAvg = Math.abs(currentValue) / points || 1;

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const trendFactor = 1 + trend * (progress - 0.5) * 0.02;
    const noise = 1 + Math.sin(i * 1.7) * 0.15 + Math.cos(i * 2.3) * 0.1;
    data.push({ day: i + 1, value: Math.max(0, dailyAvg * trendFactor * noise) });
  }

  return data;
}

/* ── Date Range Presets ───────────────────────────────────── */

export const DATE_PRESETS = [
  { label: 'Last 7 Days vs Prior 7', key: 'week', range: 'LAST_7_DAYS' },
  { label: 'Last 30 Days vs Prior 30', key: 'month', range: 'LAST_30_DAYS' },
  { label: 'Last 90 Days vs Prior 90', key: 'quarter', range: 'LAST_90_DAYS' },
];
