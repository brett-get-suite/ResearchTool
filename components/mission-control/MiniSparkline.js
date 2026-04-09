'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

export default function MiniSparkline({ data = [], color = '#4edea3', height = 32, width = 72 }) {
  if (!data.length) return <div style={{ width, height }} />;

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
