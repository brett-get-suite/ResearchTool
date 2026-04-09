export default function Skeleton({ className = '', variant = 'rect', rows, height }) {
  const base = 'shimmer bg-surface-container-high rounded-xl';
  const variants = {
    rect: 'h-4 w-full',
    circle: 'h-10 w-10 rounded-full',
    card: 'h-32 w-full',
    text: 'h-3 w-3/4',
    stat: 'h-24 w-full',
    kpi: 'h-[120px] w-full',
    table_row: 'h-12 w-full',
  };

  if (rows) {
    return (
      <div className={className}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`${base} ${height || 'h-4'} w-full mb-2`} />
        ))}
      </div>
    );
  }

  return <div className={`${base} ${variants[variant] || variants.rect} ${className}`} />;
}

export function StatCardSkeleton() {
  return <div className="shimmer bg-surface-container-high rounded-xl h-24 w-full" />;
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-surface-container rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-outline-variant/10">
        <div className="shimmer bg-surface-container-high rounded h-4 w-48" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-5 py-3 border-b border-outline-variant/5">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="shimmer bg-surface-container-high rounded h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
