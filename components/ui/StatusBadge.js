const VARIANTS = {
  active:     'ds-status-badge--success',
  healthy:    'ds-status-badge--success',
  complete:   'ds-status-badge--success',
  done:       'ds-status-badge--success',
  connected:  'ds-status-badge--success',
  management: 'ds-status-badge--success',
  running:    'ds-status-badge--info',
  analysis:   'ds-status-badge--info',
  pitching:   'ds-status-badge--info',
  warning:    'ds-status-badge--warning',
  paused:     'ds-status-badge--warning',
  alert:      'ds-status-badge--error',
  error:      'ds-status-badge--error',
  critical:   'ds-status-badge--error',
  idle:       'ds-status-badge--muted',
  inactive:   'ds-status-badge--muted',
  default:    'ds-status-badge--muted',
};

export default function StatusBadge({ status, label, pulse = false, className = '' }) {
  const key = status?.toLowerCase() || 'default';
  const variant = VARIANTS[key] || VARIANTS.default;
  const displayLabel = label || status;

  return (
    <span className={`ds-status-badge ${variant} ${className}`}>
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current pulse-dot" />
      )}
      {displayLabel}
    </span>
  );
}
