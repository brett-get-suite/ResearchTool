export default function Skeleton({ className = '', rows = 1, height = 'h-4' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`${height} rounded-lg bg-surface-high animate-pulse`} style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card p-5 space-y-2">
      <div className="h-3 w-24 bg-surface-high rounded animate-pulse" />
      <div className="h-8 w-20 bg-surface-high rounded animate-pulse" />
      <div className="h-3 w-16 bg-surface-high rounded animate-pulse" />
    </div>
  );
}

export function TableSkeleton({ rows = 3, cols = 5 }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-outline-variant/10">
        <div className="h-3 w-32 bg-surface-high rounded animate-pulse" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-5 py-4 border-b border-outline-variant/10 last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-3 bg-surface-high rounded animate-pulse" style={{ flex: j === 0 ? 2 : 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
