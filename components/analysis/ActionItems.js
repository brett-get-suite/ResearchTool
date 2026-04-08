// components/analysis/ActionItems.js
'use client';

const CONFIDENCE_STYLES = {
  HIGH:   'bg-secondary/15 text-secondary',
  MEDIUM: 'bg-tertiary/15 text-tertiary',
  LOW:    'bg-surface-variant text-on-surface-variant',
};

const CATEGORY_LABELS = {
  NEGATIVE_KEYWORD: 'Add Negative',
  PAUSE_KEYWORD:    'Pause Keyword',
  SCALE_BUDGET:     'Scale Budget',
  RESTRUCTURE:      'Restructure',
  BID_ADJUSTMENT:   'Adjust Bid',
};

const CATEGORY_COLORS = {
  NEGATIVE_KEYWORD: 'bg-error/10 text-error',
  PAUSE_KEYWORD:    'bg-error/10 text-error',
  SCALE_BUDGET:     'bg-secondary/10 text-secondary',
  RESTRUCTURE:      'bg-primary/10 text-primary',
  BID_ADJUSTMENT:   'bg-tertiary/10 text-tertiary',
};

export default function ActionItems({ items = [], loading = false, warnings = [], onItemClick }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="bg-surface-container rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-surface-container-high rounded w-3/4 mb-2" />
            <div className="h-3 bg-surface-container-high rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Data sufficiency warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl bg-tertiary/10 p-3 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs font-label text-tertiary">&#9888; {w}</p>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <p className="text-sm text-on-surface-variant font-label">No action items yet. Generate SWOT to populate recommendations.</p>
      )}

      {items.map((item, i) => (
        <div key={i}
          onClick={() => onItemClick?.(item)}
          className="bg-surface-container rounded-xl p-4 cursor-pointer hover:bg-surface-container-high transition-colors">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-sm font-label font-semibold text-on-surface flex-1">{item.description}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-[10px] font-bold font-label px-2 py-0.5 rounded-full ${CONFIDENCE_STYLES[item.confidence] || CONFIDENCE_STYLES.LOW}`}>
                {item.confidence}
              </span>
              <span className={`text-[10px] font-bold font-label px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category] || 'bg-surface-variant text-on-surface-variant'}`}>
                {CATEGORY_LABELS[item.category] || item.category}
              </span>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant font-label">{item.rationale}</p>
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
