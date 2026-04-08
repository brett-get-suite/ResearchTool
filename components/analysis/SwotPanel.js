// components/analysis/SwotPanel.js
'use client';

const QUADRANTS = [
  { key: 'strengths',     label: 'Strengths',     color: 'secondary', icon: 'trending_up' },
  { key: 'weaknesses',    label: 'Weaknesses',     color: 'error',     icon: 'trending_down' },
  { key: 'opportunities', label: 'Opportunities',  color: 'primary',    icon: 'lightbulb' },
  { key: 'threats',       label: 'Threats',        color: 'tertiary',   icon: 'warning' },
];

const COLOR_MAP = {
  secondary: 'bg-secondary/10 text-secondary',
  error:     'bg-error/10 text-error',
  primary:   'bg-primary/10 text-primary',
  tertiary:  'bg-tertiary/10 text-tertiary',
};

export default function SwotPanel({ swot, loading = false, onItemClick }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-surface-container rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-surface-container-high rounded w-24 mb-3" />
            {[1,2,3].map(j => <div key={j} className="h-3 bg-surface-container-high rounded mb-2" />)}
          </div>
        ))}
      </div>
    );
  }

  if (!swot) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-xs text-on-surface-variant font-label px-2 py-1 rounded-xl bg-surface-container-low">
          AI INTERPRETATION — based on computed data above
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {QUADRANTS.map(({ key, label, color, icon }) => (
          <div key={key} className={`rounded-xl p-4 ${COLOR_MAP[color]}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
              <p className="font-label font-bold text-sm">{label}</p>
            </div>
            <div className="space-y-3">
              {(swot[key] || []).map((item, i) => (
                <div key={i}
                  onClick={() => onItemClick?.({ ...item, quadrant: key })}
                  className="cursor-pointer group">
                  <p className="text-xs font-label font-semibold group-hover:underline">{item.title}</p>
                  <p className="text-xs opacity-80 mt-0.5">{item.detail}</p>
                  {item.dataPoint && (
                    <p className="text-[10px] opacity-60 mt-0.5 italic">{item.dataPoint}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
