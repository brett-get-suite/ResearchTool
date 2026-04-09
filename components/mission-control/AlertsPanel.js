'use client';

import { useRouter } from 'next/navigation';

const SEV = {
  critical: {
    icon: 'error',
    bg: 'bg-error/5',
    border: 'border-error/20',
    text: 'text-error',
    badge: 'bg-error/15 text-error',
    label: 'Critical',
  },
  warning: {
    icon: 'warning',
    bg: 'bg-amber-400/5',
    border: 'border-amber-400/20',
    text: 'text-amber-400',
    badge: 'bg-amber-400/15 text-amber-400',
    label: 'Warning',
  },
  info: {
    icon: 'info',
    bg: 'bg-primary/5',
    border: 'border-primary/20',
    text: 'text-primary',
    badge: 'bg-primary/15 text-primary',
    label: 'Info',
  },
};

export default function AlertsPanel({ alerts = [], onDismiss, onApproveAiFix }) {
  const router = useRouter();

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">notifications_active</span>
          Alerts &amp; Attention Needed
        </h3>
        {alerts.length > 0 && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-error/10 text-error">
            {alerts.filter(a => a.severity === 'critical').length} critical
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-10">
          <span className="material-symbols-outlined text-4xl text-secondary/30 block mb-2">check_circle</span>
          <p className="text-sm text-on-surface-variant">All clear — no issues detected</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto">
          {alerts.map(alert => {
            const cfg = SEV[alert.severity] || SEV.info;

            return (
              <div key={alert.id} className={`${cfg.bg} border ${cfg.border} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <span className={`material-symbols-outlined text-lg mt-0.5 ${cfg.text}`}>{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-on-surface-variant font-medium">{alert.client}</span>
                    </div>
                    <p className="text-sm text-on-surface leading-snug">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => router.push(`/accounts/${alert.accountId}`)}
                        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        View Details
                      </button>
                      {alert.severity !== 'info' && (
                        <>
                          <span className="text-outline-variant/40">|</span>
                          <button
                            onClick={() => onApproveAiFix?.(alert)}
                            className="text-xs font-medium text-tertiary hover:text-tertiary/80 transition-colors"
                          >
                            Approve AI Fix
                          </button>
                        </>
                      )}
                      <span className="text-outline-variant/40">|</span>
                      <button
                        onClick={() => onDismiss?.(alert.id)}
                        className="text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
