'use client';

import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';

function fmtPct(val) {
  if (val == null) return '—';
  return `${(val * 100).toFixed(1)}%`;
}

function fmtMoney(val) {
  if (val == null) return '—';
  return `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function CampaignTable({ campaigns }) {
  const columns = [
    {
      key: 'name',
      label: 'Campaign',
      render: (val, row) => (
        <div>
          <div className="text-sm font-medium text-on-surface">{val}</div>
          <div className="text-xs text-on-surface-variant">{row.type || 'Search'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val === 'ENABLED' ? 'active' : 'idle'} label={val} />,
    },
    { key: 'budget', label: 'Budget', render: (val) => fmtMoney(val) },
    { key: 'spend', label: 'Spend', render: (val) => fmtMoney(val) },
    { key: 'conversions', label: 'Conv.', render: (val) => val != null ? Math.round(val) : '—' },
    {
      key: 'cpa',
      label: 'CPA',
      render: (val) => val != null ? `$${Number(val).toFixed(2)}` : '—',
    },
    {
      key: 'search_impression_share',
      label: 'Search IS',
      render: (val) => (
        <span className={val != null && val < 0.5 ? 'text-error' : 'text-on-surface'}>
          {fmtPct(val)}
        </span>
      ),
    },
    {
      key: 'search_top_impression_share',
      label: 'Top IS',
      render: (val) => fmtPct(val),
    },
    {
      key: 'search_abs_top_impression_share',
      label: 'Abs. Top IS',
      render: (val) => fmtPct(val),
    },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-lg">table_chart</span>
        Campaign Performance
      </h3>
      <DataTable
        columns={columns}
        rows={campaigns || []}
        emptyMessage="No campaign data available. Connect Google Ads to see live metrics."
      />
    </div>
  );
}
