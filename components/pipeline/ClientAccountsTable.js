'use client';

import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';

function relativeTime(isoString) {
  if (!isoString) return '—';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function getStatusVariant(account) {
  if (account.settings?.agents_enabled) return 'management';
  if (account.audit_data) return 'analysis';
  return 'pitching';
}

function getStatusLabel(account) {
  if (account.settings?.agents_enabled) return 'Active Management';
  if (account.audit_data) return 'Analysis Hub';
  return 'Pitching';
}

export default function ClientAccountsTable({ accounts }) {
  const router = useRouter();

  const columns = [
    {
      key: 'name',
      label: 'Client & Source',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant text-lg">diamond</span>
          </div>
          <div>
            <div className="text-on-surface font-medium">{row.name}</div>
            <div className="text-on-surface-variant text-xs">{row.google_customer_id || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => (
        <StatusBadge status={getStatusVariant(row)} label={getStatusLabel(row)} />
      ),
    },
    {
      key: 'monthly_fee',
      label: 'Fee',
      render: (val) => val ? `$${Number(val).toLocaleString()}/mo` : '—',
    },
    {
      key: 'updated_at',
      label: 'Last Activity',
      render: (val) => (
        <span className="text-on-surface-variant text-sm">{relativeTime(val)}</span>
      ),
    },
  ];

  const rows = accounts.map((a) => ({
    ...a,
    monthly_fee: a.monthly_mgmt_fee || a.settings?.monthly_fee,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-headline-sm text-on-surface">Client Accounts</h2>
        <span className="text-label-sm text-on-surface-variant">
          Showing {accounts.length} total entities
        </span>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        onRowClick={(row) => router.push(`/accounts/${row.id}`)}
        emptyMessage="No accounts connected yet. Click 'New Analysis' to get started."
      />
      {accounts.length > 5 && (
        <div className="text-center mt-4">
          <button className="text-label-sm text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest">
            View Full Portfolio
          </button>
        </div>
      )}
    </div>
  );
}
