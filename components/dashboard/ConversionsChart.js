'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ConversionsChart({ data, loading }) {
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
      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-4">Conversions Over Time</p>
      {!data?.length ? (
        <div className="flex items-center justify-center h-32 text-xs text-secondary font-label">
          No conversion data yet
        </div>
      ) : !hasMultiple ? (
        <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
          <p className="text-2xl font-headline font-bold text-[#f5a623]">{data[0]?.conversions ?? 0}</p>
          <p className="text-xs text-secondary font-label">Leads this period</p>
          <p className="text-xs text-secondary font-label">Sync regularly to build history</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'Public Sans' }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fontFamily: 'Public Sans' }} tickLine={false} axisLine={false} width={32} />
            <Tooltip
              formatter={(v) => [v, 'Conversions']}
              contentStyle={{ fontSize: 12, fontFamily: 'Public Sans', borderRadius: 8, border: '1px solid var(--border)' }}
            />
            <Line dataKey="conversions" stroke="#f5a623" strokeWidth={2} dot={{ r: 3, fill: '#f5a623' }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
