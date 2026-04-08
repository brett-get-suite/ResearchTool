export default function Skeleton({ className = '', variant = 'rect' }) {
  const base = 'animate-pulse bg-surface-container-high rounded-xl';
  const variants = {
    rect: 'h-4 w-full',
    circle: 'h-10 w-10 rounded-full',
    card: 'h-32 w-full',
    text: 'h-3 w-3/4',
    stat: 'h-24 w-full',
  };
  return <div className={`${base} ${variants[variant] || variants.rect} ${className}`} />;
}
