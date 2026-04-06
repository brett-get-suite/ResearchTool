'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function formatDollar(v) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v}`;
}

export default function SpendChart({ data, loading }) {
  if (loading) {
    return (
      <div className="card p-5 h-56 flex items-center justify-center">
        <div className="w-full h-32 bg-surface-high rounded-lg animate-pulse" />
      </div>
    );
  }

  const hasMultiple = data && data.length >= 2;

  return (
    <div className="card p-5">
      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-4">Spend Over Time</p>
      {!hasMultiple && data?.length === 1 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
          <BarChart width={80} height={60} data={data}>
            <Bar dataKey="spend" fill="#2d5be3" radius={[4,4,0,0]} />
          </BarChart>
          <p className="text-xs text-secondary font-label">Sync regularly to build history</p>
        </div>
      ) : !data?.length ? (
        <div className="flex items-center justify-center h-32 text-xs text-secondary font-label">
          No data yet — click Sync to pull from Google Ads
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'Public Sans' }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatDollar} tick={{ fontSize: 10, fontFamily: 'Public Sans' }} tickLine={false} axisLine={false} width={48} />
            <Tooltip
              formatter={(v) => [`$${v.toFixed(2)}`, 'Spend']}
              contentStyle={{ fontSize: 12, fontFamily: 'Public Sans', borderRadius: 8, border: '1px solid var(--border)' }}
            />
            <Bar dataKey="spend" fill="#2d5be3" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
