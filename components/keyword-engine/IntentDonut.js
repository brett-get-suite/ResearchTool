const INTENT_COLORS = {
  transactional: 'var(--primary)',
  informational: 'var(--secondary)',
  navigational: 'var(--tertiary)',
  commercial: 'var(--primary-container)',
};

export default function IntentDonut({ keywords }) {
  const counts = { transactional: 0, informational: 0, navigational: 0, commercial: 0 };
  (keywords || []).forEach((kw) => {
    const intent = (kw.intent || 'informational').toLowerCase();
    counts[intent] = (counts[intent] || 0) + (kw.volume || kw.monthly_searches || 1);
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const size = 180;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([intent, count]) => {
      const pct = count / total;
      const seg = { intent, count, pct, offset, length: pct * circumference };
      offset += seg.length;
      return seg;
    });

  function fmtTotal(n) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  }

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface">Intent Distribution</h3>
        <span className="material-symbols-outlined text-on-surface-variant">language</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            {segments.map((seg) => (
              <circle
                key={seg.intent}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={INTENT_COLORS[seg.intent]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.length} ${circumference - seg.length}`}
                strokeDashoffset={circumference - seg.offset}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-on-surface">{fmtTotal(total)}</span>
            <span className="text-label-sm text-on-surface-variant">Total Vol</span>
          </div>
        </div>

        <div className="space-y-2">
          {segments.map((seg) => (
            <div key={seg.intent} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: INTENT_COLORS[seg.intent] }}
              />
              <span className="text-sm text-on-surface-variant capitalize">{seg.intent}</span>
              <span className="text-sm text-on-surface font-medium ml-auto">
                {Math.round(seg.pct * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
