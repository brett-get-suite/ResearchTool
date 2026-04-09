'use client';

import { calculatePacing, formatCurrency, formatPercent } from '@/lib/dashboard-utils';

const STATUS_BAR = { 'on-track': 'bg-secondary', underspending: 'bg-amber-400', overspending: 'bg-error' };
const STATUS_TEXT = { 'on-track': 'text-secondary', underspending: 'text-amber-400', overspending: 'text-error' };
const STATUS_LABEL = { 'on-track': 'On Track', underspending: 'Under', overspending: 'Over' };

export default function SpendPacing({ accounts = [], metricsMap = {} }) {
  const pacingData = accounts
    .map(account => {
      const data = metricsMap[account.id];
      const spend = data?.current?.total_spend || 0;
      const dailyBudget = data?.current?.budget || 0;
      const monthlyBudget = dailyBudget * 30.4;
      if (monthlyBudget <= 0) return null;

      return { id: account.id, name: account.name, ...calculatePacing(spend, monthlyBudget) };
    })
    .filter(Boolean);

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">speed</span>
          Spend Pacing
        </h3>
        {pacingData.length > 0 && (
          <span className="text-xs text-on-surface-variant">
            {pacingData[0].daysRemaining}d remaining
          </span>
        )}
      </div>

      {pacingData.length === 0 ? (
        <div className="text-center py-10">
          <span className="material-symbols-outlined text-3xl text-on-surface-variant/20 block mb-2">speed</span>
          <p className="text-sm text-on-surface-variant mb-1">No budget data available</p>
          <p className="text-xs text-on-surface-variant/60">Set daily budgets on your campaigns to track spend pacing</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[380px] overflow-y-auto">
          {pacingData.map(item => (
            <div key={item.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface font-medium truncate max-w-[150px]">{item.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-on-surface-variant">
                    {formatCurrency(item.spent, true)} / {formatCurrency(item.budget, true)}
                  </span>
                  <span className={`font-semibold min-w-[40px] text-right ${STATUS_TEXT[item.status]}`}>
                    {formatPercent(item.percent, 0)}
                  </span>
                </div>
              </div>
              <div className="relative h-2 bg-surface-container-highest rounded-full overflow-hidden">
                {/* Expected pacing marker */}
                <div
                  className="absolute top-0 h-full w-px bg-on-surface-variant/30 z-10"
                  style={{ left: `${(item.daysInMonth - item.daysRemaining) / item.daysInMonth * 100}%` }}
                />
                <div
                  className={`h-full rounded-full transition-all duration-700 ${STATUS_BAR[item.status]}`}
                  style={{ width: `${Math.min(item.percent, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-on-surface-variant/60">
                <span className={`font-medium ${STATUS_TEXT[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                <span>{formatCurrency(item.spent, true)} of {formatCurrency(item.budget, true)} spent &middot; {item.daysRemaining}d remaining</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
