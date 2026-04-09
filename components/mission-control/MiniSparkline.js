'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

export default function MiniSparkline({ data = [], color = '#4edea3', height = 32, width = 72 }) {
  // Check if data is empty or all values are the same (flat placeholder)
  const hasRealData = data.length > 1 && !data.every(d => d.value === data[0]?.value);

  if (!data.length || !hasRealData) {
    return (
      <div style={{ width, height }} className="relative flex items-center">
        <svg width={width} height={height} className="opacity-30">
          <line
            x1={0} y1={height / 2} x2={width} y2={height / 2}
            stroke="#8994a8"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        </svg>
      </div>
    );
  }

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
