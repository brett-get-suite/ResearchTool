'use client';

import MiniSparkline from './MiniSparkline';
import { formatCurrency, formatPercent, formatNumber, calcDelta, generateSparklineData } from '@/lib/dashboard-utils';

function KPICard({ label, value, prevValue, format, icon, invertDelta, sparkData, spendAlert }) {
  const delta = calcDelta(
    typeof value === 'number' ? value : 0,
    typeof prevValue === 'number' ? prevValue : 0,
  );

  const isPositive = invertDelta ? delta < 0 : delta > 0;
  const isNegative = invertDelta ? delta > 0 : delta < 0;

  // Spend-specific: lower spend = yellow (underspending alert), not green
  let arrowColor, sparkColor;
  if (spendAlert && delta < 0) {
    arrowColor = 'text-amber-400';
    sparkColor = '#fbbf24';
  } else {
    arrowColor = isPositive ? 'text-secondary' : isNegative ? 'text-error' : 'text-on-surface-variant';
    sparkColor = isPositive ? '#4edea3' : isNegative ? '#ef4444' : '#8994a8';
  }

  const fmt = (v) => {
    if (v == null || isNaN(v)) return '—';
    switch (format) {
      case 'currency': return formatCurrency(v, true);
      case 'percent':  return formatPercent(v);
      default:         return formatNumber(v);
    }
  };

  return (
    <div className="bg-surface-card rounded-2xl p-5 flex flex-col justify-between gap-3 min-h-[130px]">
      <div className="flex items-center justify-between">
        <span className="ds-metric-label">{label}</span>
        <span className="material-symbols-outlined text-on-surface-variant/25 text-xl">{icon}</span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="ds-primary-metric leading-tight">{fmt(value)}</div>
          <div className="flex items-center gap-2 mt-2">
            {prevValue != null && (
              <>
                <span className={`ds-delta ${isPositive ? 'ds-delta--positive' : isNegative ? 'ds-delta--negative' : 'ds-delta--neutral'}`}>
                  <span className="material-symbols-outlined ds-delta__icon">
                    {isPositive ? 'arrow_upward' : isNegative ? 'arrow_downward' : 'remove'}
                  </span>
                  {isPositive ? '+' : isNegative ? '' : ''}{Math.abs(delta).toFixed(1)}%
                </span>
                <span className="text-[11px] text-on-surface-variant">vs {fmt(prevValue)}</span>
              </>
            )}
          </div>
        </div>

        {sparkData && sparkData.length > 0 && (
          <MiniSparkline data={sparkData} color={sparkColor} height={32} width={80} />
        )}
      </div>
    </div>
  );
}

export default function KPIStrip({ current = {}, previous = {}, sparklines = {} }) {
  const kpis = [
    { label: 'Total Spend',              key: 'total_spend',             format: 'currency', icon: 'payments',        invertDelta: false, spendAlert: true },
    { label: 'Total Conversions',        key: 'conversions',             format: 'number',   icon: 'conversion_path', invertDelta: false },
    { label: 'Avg. Cost/Conversion',     key: 'cost_per_lead',           format: 'currency', icon: 'target',          invertDelta: true },
    { label: 'Avg. CTR',                 key: 'ctr',                     format: 'percent',  icon: 'ads_click',       invertDelta: false },
    { label: 'Search Impression Share',  key: 'search_impression_share', format: 'percent',  icon: 'visibility',      invertDelta: false },
    { label: 'Budget Pacing',            key: 'budget_pacing',           format: 'percent',  icon: 'speed',           invertDelta: false, noPrev: true },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4" style={{ gap: '16px' }}>
      {kpis.map(kpi => (
        <KPICard
          key={kpi.label}
          label={kpi.label}
          value={current[kpi.key]}
          prevValue={kpi.noPrev ? null : previous[kpi.key]}
          format={kpi.format}
          icon={kpi.icon}
          invertDelta={kpi.invertDelta}
          sparkData={sparklines[kpi.label]}
          spendAlert={kpi.spendAlert}
        />
      ))}
    </div>
  );
}
