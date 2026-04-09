'use client';

import { useRouter } from 'next/navigation';

const ACTIONS = [
  { label: 'Run Full Audit', icon: 'fact_check', href: '/agents', color: 'text-primary' },
  { label: 'Pause All Agents', icon: 'pause_circle', href: '/agents', color: 'text-amber-400' },
  { label: 'Generate Report', icon: 'summarize', href: '/reports', color: 'text-tertiary' },
  { label: 'Sync All Accounts', icon: 'sync', action: 'sync_all', color: 'text-secondary' },
];

export default function QuickActions({ onAction }) {
  const router = useRouter();

  return (
    <div className="bg-surface-container-low/80 backdrop-blur-sm border border-outline-variant/15 rounded-xl px-5 py-3 flex items-center gap-3 flex-wrap">
      <span className="text-label-sm text-on-surface-variant mr-1">Quick Actions</span>
      {ACTIONS.map(act => (
        <button
          key={act.label}
          onClick={() => act.href && !act.action ? router.push(act.href) : onAction?.(act.action)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/10 transition-colors"
        >
          <span className={`material-symbols-outlined text-base ${act.color}`}>{act.icon}</span>
          <span className="text-on-surface text-xs font-medium">{act.label}</span>
        </button>
      ))}
    </div>
  );
}
