/**
 * Tiny SVG sparkline for 12-month trend multipliers.
 * Expects multipliers: number[12] where 1.0 = average.
 */
export default function TrendSparkline({ multipliers, width = 64, height = 20 }) {
  if (!multipliers || multipliers.length === 0) return null;

  const max = Math.max(...multipliers, 1.5);
  const min = Math.min(...multipliers, 0.5);
  const range = max - min || 1;
  const padding = 2;

  const points = multipliers.map((val, i) => {
    const x = padding + (i / (multipliers.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  // Current month highlight
  const currentMonth = new Date().getMonth();
  const cx = padding + (currentMonth / (multipliers.length - 1)) * (width - padding * 2);
  const cy = padding + (1 - (multipliers[currentMonth] - min) / range) * (height - padding * 2);

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={cx} cy={cy} r="2" fill="var(--secondary)" />
    </svg>
  );
}
