'use client';

import { formatPercent } from '@/lib/dashboard-utils';

function MoverItem({ item, isImprover }) {
  const color = isImprover ? 'text-secondary' : 'text-error';
  const bg = isImprover ? 'bg-secondary/5' : 'bg-error/5';
  const arrow = isImprover ? 'arrow_downward' : 'arrow_upward';
  const delta = Math.abs(item.costConvDelta || 0);
  const metricLabel = item.changedMetric || 'Cost/Conv';

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${bg} hover:bg-surface-container-high transition-colors cursor-pointer`}>
      <span className={`material-symbols-outlined text-base ${color}`}>{arrow}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-on-surface truncate">{item.name}</div>
        <div className="text-xs text-on-surface-variant truncate">{item.client_name}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`text-sm font-semibold ${color}`}>
          {isImprover ? '\u2212' : '+'}{formatPercent(delta, 0)}
        </div>
        <div className="text-[10px] text-on-surface-variant">{metricLabel}</div>
      </div>
    </div>
  );
}

export default function TopMovers({ improvers = [], decliners = [] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-surface-container rounded-xl p-5">
        <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-lg">trending_up</span>
          Top Performers
          <span className="text-xs font-normal text-on-surface-variant">Cost/Conv decreased</span>
        </h3>
        {improvers.length > 0 ? (
          <div className="space-y-2">
            {improvers.map((item, i) => <MoverItem key={item.id || i} item={item} isImprover />)}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant text-center py-8">
            No data yet — connect accounts and select a comparison period
          </p>
        )}
      </div>

      <div className="bg-surface-container rounded-xl p-5">
        <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-lg">trending_down</span>
          Top Decliners
          <span className="text-xs font-normal text-on-surface-variant">Cost/Conv increased</span>
        </h3>
        {decliners.length > 0 ? (
          <div className="space-y-2">
            {decliners.map((item, i) => <MoverItem key={item.id || i} item={item} />)}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant text-center py-8">
            No data yet — connect accounts and select a comparison period
          </p>
        )}
      </div>
    </div>
  );
}
