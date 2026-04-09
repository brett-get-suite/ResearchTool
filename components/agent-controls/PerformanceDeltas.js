export default function PerformanceDeltas({ currentPeriod, previousPeriod, pacingData }) {
  const curr = currentPeriod || {};
  const prev = previousPeriod || {};

  function delta(currVal, prevVal) {
    if (!prevVal || prevVal === 0) return null;
    return ((currVal - prevVal) / prevVal) * 100;
  }

  function fmtDelta(pct) {
    if (pct === null) return '—';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  }

  function fmtMoney(n) {
    if (n == null) return '$0';
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }

  const cplDelta = delta(curr.cost_per_lead, prev.cost_per_lead);
  const spendDelta = delta(curr.total_spend, prev.total_spend);
  const convDelta = delta(curr.conversions, prev.conversions);
  const cpcDelta = delta(curr.avg_cpc, prev.avg_cpc);

  // Budget pacing: prefer real pacing API data, fallback to simple spend/budget ratio
  const budgetUsed = pacingData
    ? pacingData.pacingPct
    : (curr.budget > 0 ? (curr.total_spend / curr.budget) * 100 : 0);
  const pacingStatus = pacingData?.status;
  const pacingLabel = pacingStatus === 'overspending' ? 'Overspending'
    : pacingStatus === 'underspending' ? 'Underspending'
    : budgetUsed > 110 ? 'Overspending'
    : budgetUsed < 80 ? 'Underspending'
    : 'On Track';
  const pacingColor = pacingLabel === 'Overspending' ? 'text-error'
    : pacingLabel === 'Underspending' ? 'text-tertiary'
    : 'text-secondary';

  const metrics = [
    {
      label: 'CPL',
      value: fmtMoney(curr.cost_per_lead),
      delta: fmtDelta(cplDelta),
      isPositive: cplDelta !== null && cplDelta < 0, // lower CPL is better
      subtitle: 'vs last period',
    },
    {
      label: 'Total Spend',
      value: fmtMoney(curr.total_spend),
      delta: fmtDelta(spendDelta),
      isNeutral: true, // spend direction depends on efficiency context
      subtitle: 'vs last period',
    },
    {
      label: 'Conversions',
      value: String(Math.round(curr.conversions || 0)),
      delta: fmtDelta(convDelta),
      isPositive: convDelta !== null && convDelta >= 0,
      subtitle: 'vs last period',
    },
    {
      label: 'Budget Pacing',
      value: `${budgetUsed.toFixed(0)}%`,
      customDelta: pacingLabel,
      pacingColor,
      subtitle: pacingData?.daysRemaining != null
        ? `${pacingData.daysRemaining}d remaining`
        : 'of budget used',
      showBar: true,
      barPct: Math.min(budgetUsed, 100),
    },
    {
      label: 'Avg. CPC',
      value: `$${(curr.avg_cpc || 0).toFixed(2)}`,
      delta: fmtDelta(cpcDelta),
      isPositive: cpcDelta !== null && cpcDelta < 0, // lower CPC is better
      subtitle: 'vs last period',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {metrics.map((m) => (
        <div key={m.label} className="bg-surface-container rounded-xl p-4">
          <div className="text-label-sm text-on-surface-variant mb-2">{m.label}</div>
          <div className="text-2xl font-bold text-on-surface">{m.value}</div>
          {m.showBar && (
            <div className="w-full h-1.5 rounded-full bg-surface-container-high mt-2 mb-1">
              <div
                className={`h-full rounded-full transition-all ${
                  m.barPct > 100 ? 'bg-error' : m.barPct < 80 ? 'bg-tertiary' : 'bg-secondary'
                }`}
                style={{ width: `${Math.min(m.barPct, 100)}%` }}
              />
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            {m.customDelta ? (
              <span className={`text-xs font-medium ${m.pacingColor}`}>{m.customDelta}</span>
            ) : m.delta !== '—' ? (
              <span className={`text-xs font-medium ${m.isNeutral ? 'text-on-surface-variant' : m.isPositive ? 'text-secondary' : 'text-error'}`}>
                <span className="material-symbols-outlined text-xs align-middle">
                  {m.isNeutral ? 'trending_flat' : m.isPositive ? 'trending_up' : 'trending_down'}
                </span>
                {' '}{m.delta}
              </span>
            ) : null}
            <span className="text-label-sm text-on-surface-variant">{m.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
