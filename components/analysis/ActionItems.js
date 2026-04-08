// components/analysis/ActionItems.js
'use client';

const CONFIDENCE_STYLES = {
  HIGH:   'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW:    'bg-slate-100 text-slate-600',
};

const CATEGORY_LABELS = {
  NEGATIVE_KEYWORD: 'Add Negative',
  PAUSE_KEYWORD:    'Pause Keyword',
  SCALE_BUDGET:     'Scale Budget',
  RESTRUCTURE:      'Restructure',
  BID_ADJUSTMENT:   'Adjust Bid',
};

const CATEGORY_COLORS = {
  NEGATIVE_KEYWORD: 'bg-red-50 text-red-600',
  PAUSE_KEYWORD:    'bg-orange-50 text-orange-600',
  SCALE_BUDGET:     'bg-emerald-50 text-emerald-700',
  RESTRUCTURE:      'bg-blue-50 text-blue-600',
  BID_ADJUSTMENT:   'bg-purple-50 text-purple-600',
};

export default function ActionItems({ items = [], loading = false, warnings = [], onItemClick }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-4 bg-surface-high rounded w-3/4 mb-2" />
            <div className="h-3 bg-surface-high rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Data sufficiency warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs font-label text-amber-700">⚠ {w}</p>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <p className="text-sm text-secondary font-label">No action items yet. Generate SWOT to populate recommendations.</p>
      )}

      {items.map((item, i) => (
        <div key={i}
          onClick={() => onItemClick?.(item)}
          className="card p-4 cursor-pointer hover:border-[var(--primary)]/30 transition-colors">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-sm font-label font-semibold text-on-surface flex-1">{item.description}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-[10px] font-bold font-label px-2 py-0.5 rounded-full ${CONFIDENCE_STYLES[item.confidence] || CONFIDENCE_STYLES.LOW}`}>
                {item.confidence}
              </span>
              <span className={`text-[10px] font-bold font-label px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category] || 'bg-slate-100 text-slate-600'}`}>
                {CATEGORY_LABELS[item.category] || item.category}
              </span>
            </div>
          </div>
          <p className="text-xs text-secondary font-label">{item.rationale}</p>
          {item.estimatedImpact && (
            <p className="text-xs text-primary font-label font-semibold mt-1.5">
              Est. impact: {item.estimatedImpact}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
