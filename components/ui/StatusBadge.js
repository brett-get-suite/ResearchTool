const VARIANTS = {
  active: 'bg-secondary/15 text-secondary',
  idle: 'bg-surface-variant text-on-surface-variant',
  running: 'bg-primary/15 text-primary',
  alert: 'bg-error/15 text-error',
  complete: 'bg-secondary/15 text-secondary',
  pitching: 'bg-tertiary/15 text-tertiary',
  management: 'bg-secondary/15 text-secondary',
  analysis: 'bg-primary/15 text-primary',
  default: 'bg-surface-variant text-on-surface-variant',
};

export default function StatusBadge({ status, label, pulse = false, className = '' }) {
  const key = status?.toLowerCase() || 'default';
  const variant = VARIANTS[key] || VARIANTS.default;
  const displayLabel = label || status;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-widest ${variant} ${className}`}>
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current pulse-dot" />
      )}
      {displayLabel}
    </span>
  );
}
