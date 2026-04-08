'use client';

import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';

const REPORT_TYPE_STYLES = {
  keyword: { label: 'Keyword Report', variant: 'active' },
  website: { label: 'Website Analysis', variant: 'analysis' },
  audit: { label: 'Full Audit', variant: 'running' },
  roas: { label: 'ROAS Strategy', variant: 'alert' },
  default: { label: 'Report', variant: 'default' },
};

function relativeTime(isoString) {
  if (!isoString) return '—';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RecentReports({ actions }) {
  const router = useRouter();

  const reports = (actions || []).slice(0, 5).map((action) => {
    const type = REPORT_TYPE_STYLES[action.agent_type] || REPORT_TYPE_STYLES.default;
    return { ...action, typeStyle: type };
  });

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-on-surface">Recent AI Reports</h3>
        <span className="material-symbols-outlined text-on-surface-variant text-xl">auto_awesome</span>
      </div>

      <div className="space-y-4">
        {reports.length === 0 ? (
          <p className="text-on-surface-variant text-sm">No recent reports</p>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              onClick={() => report.account_id && router.push(`/accounts/${report.account_id}`)}
              className="cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-1">
                <StatusBadge status={report.typeStyle.variant} label={report.typeStyle.label} />
                <span className="text-label-sm text-on-surface-variant">
                  {relativeTime(report.created_at)}
                </span>
              </div>
              <div className="text-sm font-medium text-on-surface mt-1.5 group-hover:text-primary transition-colors">
                {report.description}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
