'use client';

export default function StatCard({ label, value, subvalue, color = 'primary', progress = null, progressColor = 'primary' }) {
  const colorMap = {
    primary: 'text-[var(--primary)]',
    gold: 'text-[#f5a623]',
    green: 'text-emerald-600',
    red: 'text-red-600',
  };
  const progressColorMap = {
    primary: 'bg-[var(--primary)]',
    red: 'bg-red-500',
    yellow: 'bg-amber-400',
    green: 'bg-emerald-500',
  };

  return (
    <div className="card p-5 flex flex-col gap-1.5">
      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-headline font-bold ${colorMap[color] || colorMap.primary}`}>
        {value ?? '—'}
      </p>
      {subvalue && <p className="text-xs text-secondary font-label">{subvalue}</p>}
      {progress !== null && (
        <div className="mt-2">
          <div className="h-1.5 rounded-full bg-surface-high overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressColorMap[progressColor]}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-secondary font-label mt-1">{Math.round(progress)}% of budget used</p>
        </div>
      )}
    </div>
  );
}
