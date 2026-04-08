export default function StatCard({ label, value, delta, deltaLabel, icon, className = '' }) {
  const numericDelta = delta ? parseFloat(delta) : 0;
  const isPositive = numericDelta > 0;
  const isNegative = numericDelta < 0;
  const deltaColor = isPositive ? 'text-secondary' : isNegative ? 'text-error' : 'text-on-surface-variant';

  return (
    <div className={`bg-surface-container rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-label-sm text-on-surface-variant">{label}</span>
        {icon && (
          <span className="material-symbols-outlined text-on-surface-variant text-2xl opacity-30">
            {icon}
          </span>
        )}
      </div>
      <div className="text-display-lg text-on-surface">{value}</div>
      {(delta || deltaLabel) && (
        <div className="flex items-center gap-2 mt-2">
          {delta && (
            <span className={`flex items-center gap-0.5 text-sm font-medium ${deltaColor}`}>
              <span className="material-symbols-outlined text-base">
                {isPositive ? 'trending_up' : isNegative ? 'trending_down' : 'trending_flat'}
              </span>
              {delta}
            </span>
          )}
          {deltaLabel && (
            <span className="text-label-sm text-on-surface-variant">{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
