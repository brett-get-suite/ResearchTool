export default function Skeleton({ className = '', variant = 'rect', rows, height }) {
  const base = 'animate-pulse bg-surface-container-high rounded-xl';
  const variants = {
    rect: 'h-4 w-full',
    circle: 'h-10 w-10 rounded-full',
    card: 'h-32 w-full',
    text: 'h-3 w-3/4',
    stat: 'h-24 w-full',
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
  return <div className="animate-pulse bg-surface-container-high rounded-xl h-24 w-full" />;
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="animate-pulse bg-surface-container-high rounded h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
