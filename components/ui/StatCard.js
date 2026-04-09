export default function StatCard({ label, value, delta, deltaLabel, icon, variant, className = '' }) {
  const numericDelta = delta ? parseFloat(delta) : 0;
  const isPositive = numericDelta > 0;
  const isNegative = numericDelta < 0;
  const deltaColor = isPositive ? 'text-ds-success' : isNegative ? 'text-ds-error' : 'text-ds-muted';
  const variantRing = variant === 'warning' ? 'ring-1 ring-ds-error/20' : '';

  return (
    <div className={`bg-surface-card rounded-2xl p-6 ${variantRing} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="ds-metric-label">{label}</span>
        {icon && (
          <span className="material-symbols-outlined text-on-surface-variant text-xl opacity-25">
            {icon}
          </span>
        )}
      </div>
      <div className="ds-primary-metric">{value}</div>
      {(delta || deltaLabel) && (
        <div className="flex items-center gap-2 mt-2">
          {delta && (
            <span className={`ds-delta ${isPositive ? 'ds-delta--positive' : isNegative ? 'ds-delta--negative' : 'ds-delta--neutral'}`}>
              <span className="material-symbols-outlined ds-delta__icon">
                {isPositive ? 'arrow_upward' : isNegative ? 'arrow_downward' : 'remove'}
              </span>
              {Math.abs(numericDelta).toFixed(1)}%
            </span>
          )}
          {deltaLabel && (
            <span className="text-xs text-on-surface-variant">{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
