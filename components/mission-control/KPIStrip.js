'use client';

import MiniSparkline from './MiniSparkline';
import { formatCurrency, formatPercent, formatNumber, calcDelta, generateSparklineData } from '@/lib/dashboard-utils';

function KPICard({ label, value, prevValue, format, icon, invertDelta, sparkData }) {
  const delta = calcDelta(
    typeof value === 'number' ? value : 0,
    typeof prevValue === 'number' ? prevValue : 0,
  );

  const isPositive = invertDelta ? delta < 0 : delta > 0;
  const isNegative = invertDelta ? delta > 0 : delta < 0;
  const arrowColor = isPositive ? 'text-secondary' : isNegative ? 'text-error' : 'text-on-surface-variant';
  const sparkColor = isPositive ? '#4edea3' : isNegative ? '#ef4444' : '#8994a8';

  const fmt = (v) => {
    if (v == null || isNaN(v)) return '—';
    switch (format) {
      case 'currency': return formatCurrency(v, true);
      case 'percent':  return formatPercent(v);
      default:         return formatNumber(v);
    }
  };

  return (
    <div className="bg-surface-container rounded-xl p-5 flex flex-col justify-between gap-3 min-h-[120px]">
      <div className="flex items-center justify-between">
        <span className="text-label-sm text-on-surface-variant">{label}</span>
        <span className="material-symbols-outlined text-on-surface-variant/30 text-xl">{icon}</span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-2xl font-bold text-on-surface leading-tight">{fmt(value)}</div>
          <div className="flex items-center gap-2 mt-1.5">
            {prevValue != null && (
              <>
                <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${arrowColor}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                    {isPositive ? 'arrow_upward' : isNegative ? 'arrow_downward' : 'remove'}
                  </span>
                  {Math.abs(delta).toFixed(1)}%
                </span>
                <span className="text-[11px] text-on-surface-variant">vs {fmt(prevValue)}</span>
              </>
            )}
          </div>
        </div>

        {sparkData && sparkData.length > 0 && (
          <MiniSparkline data={sparkData} color={sparkColor} height={28} width={72} />
        )}
      </div>
    </div>
  );
}

export default function KPIStrip({ current = {}, previous = {}, sparklines = {} }) {
  const kpis = [
    { label: 'Total Spend',              key: 'total_spend',             format: 'currency', icon: 'payments',        invertDelta: false },
    { label: 'Total Conversions',        key: 'conversions',             format: 'number',   icon: 'conversion_path', invertDelta: false },
    { label: 'Avg. Cost/Conversion',     key: 'cost_per_lead',           format: 'currency', icon: 'target',          invertDelta: true },
    { label: 'Avg. CTR',                 key: 'ctr',                     format: 'percent',  icon: 'ads_click',       invertDelta: false },
    { label: 'Search Impression Share',  key: 'search_impression_share', format: 'percent',  icon: 'visibility',      invertDelta: false },
    { label: 'Budget Pacing',            key: 'budget_pacing',           format: 'percent',  icon: 'speed',           invertDelta: false, noPrev: true },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
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
        />
      ))}
    </div>
  );
}
