'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AuditTrending({ history }) {
  if (!history || history.length < 2) {
    return (
      <div className="bg-surface-container rounded-xl p-6">
        <h3 className="text-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">trending_up</span>
          Audit Score Trend
        </h3>
        <p className="text-xs text-on-surface-variant">Need at least 2 weekly audits to show trends.</p>
      </div>
    );
  }

  const first = history[0]?.score || 0;
  const last = history[history.length - 1]?.score || 0;
  const delta = last - first;

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">trending_up</span>
          Audit Score Trend
        </h3>
        <span className={`text-sm font-medium ${delta >= 0 ? 'text-secondary' : 'text-error'}`}>
          {delta >= 0 ? '+' : ''}{delta} pts over {history.length} weeks
        </span>
      </div>

      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <AreaChart data={history}>
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface-container-high)',
                border: 'none',
                borderRadius: '8px',
                color: 'var(--on-surface)',
                fontSize: '12px',
              }}
            />
            <defs>
              <linearGradient id="auditScoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--secondary)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--secondary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="score"
              fill="url(#auditScoreGradient)"
              stroke="var(--secondary)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--secondary)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
