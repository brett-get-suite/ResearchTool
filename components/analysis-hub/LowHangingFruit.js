import StatusBadge from '@/components/ui/StatusBadge';

const INTENT_STYLES = {
  transactional: 'active',
  commercial: 'management',
  informational: 'running',
  navigational: 'pitching',
};

const ROI_COLORS = {
  'Very High': 'text-secondary font-semibold',
  'High': 'text-secondary',
  'Med': 'text-primary',
  'Low': 'text-on-surface-variant',
};

export default function LowHangingFruit({ keywords }) {
  if (!keywords || keywords.length === 0) {
    return (
      <div className="bg-surface-container rounded-xl p-6">
        <h3 className="text-sm font-semibold text-on-surface mb-4">Low-Hanging Fruit Keywords</h3>
        <p className="text-on-surface-variant text-sm">Run keyword research to discover opportunities.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-on-surface">Low-Hanging Fruit Keywords</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">High-value, low-competition opportunities</p>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant">auto_awesome</span>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-outline-variant/10">
            <th className="text-left px-0 py-3 text-label-sm text-on-surface-variant">Keyword Cluster</th>
            <th className="text-left px-3 py-3 text-label-sm text-on-surface-variant">Intent</th>
            <th className="text-right px-3 py-3 text-label-sm text-on-surface-variant">Avg. CPC</th>
            <th className="text-center px-3 py-3 text-label-sm text-on-surface-variant">Diff.</th>
            <th className="text-right px-0 py-3 text-label-sm text-on-surface-variant">Potential ROI</th>
          </tr>
        </thead>
        <tbody>
          {keywords.slice(0, 8).map((kw, i) => (
            <tr key={i} className="border-b border-outline-variant/5">
              <td className="py-3 pr-3">
                <div className="text-sm font-medium text-on-surface">{kw.keyword || kw.cluster}</div>
                {kw.subtext && <div className="text-xs text-on-surface-variant">{kw.subtext}</div>}
              </td>
              <td className="px-3 py-3">
                <StatusBadge
                  status={INTENT_STYLES[kw.intent?.toLowerCase()] || 'default'}
                  label={kw.intent}
                />
              </td>
              <td className="px-3 py-3 text-right text-sm text-on-surface">
                ${(kw.avg_cpc || kw.cpc || 0).toFixed(2)}
              </td>
              <td className="px-3 py-3">
                <div className="flex justify-center">
                  <div className="w-16 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        (kw.difficulty || 'low') === 'low' ? 'bg-secondary' : 'bg-primary'
                      }`}
                      style={{ width: `${kw.difficulty_pct || 30}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="py-3 pl-3 text-right">
                <span className={`text-sm ${ROI_COLORS[kw.roi] || ROI_COLORS['Med']}`}>
                  {kw.roi || 'Med'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
