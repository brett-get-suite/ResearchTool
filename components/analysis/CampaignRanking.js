// components/analysis/CampaignRanking.js
'use client';

export default function CampaignRanking({ campaigns = [], readyToScale = [], underperformers = [], mode = 'lead_gen', avgCpa, avgRoas }) {
  const primaryLabel = mode === 'ecommerce' ? 'ROAS' : 'CPA';

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {readyToScale.length > 0 && (
          <span className="text-xs font-label font-semibold px-3 py-1.5 rounded-full bg-secondary/15 text-secondary">
            {readyToScale.length} ready to scale
          </span>
        )}
        {underperformers.length > 0 && (
          <span className="text-xs font-label font-semibold px-3 py-1.5 rounded-full bg-error/15 text-error">
            {underperformers.length} underperforming
          </span>
        )}
        {avgCpa && mode === 'lead_gen' && (
          <span className="text-xs font-label text-on-surface-variant px-3 py-1.5 rounded-full bg-surface-container-low">
            Avg CPA: ${avgCpa}
          </span>
        )}
        {avgRoas && mode === 'ecommerce' && (
          <span className="text-xs font-label text-on-surface-variant px-3 py-1.5 rounded-full bg-surface-container-low">
            Avg ROAS: {avgRoas}×
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline-variant/15">
        <table className="w-full text-xs font-label">
          <thead>
            <tr className="border-b border-outline-variant/15 text-left">
              <th className="px-3 py-2.5 text-label-sm text-on-surface-variant">Campaign</th>
              <th className="px-3 py-2.5 text-label-sm text-on-surface-variant text-right">Spend</th>
              <th className="px-3 py-2.5 text-label-sm text-on-surface-variant text-right">Conv</th>
              <th className="px-3 py-2.5 text-label-sm text-on-surface-variant text-right">{primaryLabel}</th>
              <th className="px-3 py-2.5 text-label-sm text-on-surface-variant text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => {
              const isScalable    = readyToScale.some(s => s.campaign === c.campaign);
              const isUnderperform = underperformers.some(u => u.campaign === c.campaign);
              return (
                <tr key={i} className={`border-b border-outline-variant/5 hover:bg-surface-container-high ${
                  isScalable ? 'bg-secondary/5' : isUnderperform ? 'bg-error/5' : ''
                }`}>
                  <td className="px-3 py-2 text-on-surface font-medium max-w-[200px] truncate">{c.campaign}</td>
                  <td className="px-3 py-2 text-right text-on-surface">${(c.cost || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-on-surface">{c.conversions}</td>
                  <td className="px-3 py-2 text-right text-on-surface">
                    {mode === 'ecommerce'
                      ? (c.roas ? `${c.roas}×` : '—')
                      : (c.cpa  ? `$${c.cpa}` : '—')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isScalable     && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-bold">SCALE</span>}
                    {isUnderperform && <span className="text-[10px] px-2 py-0.5 rounded-full bg-error/15 text-error font-bold">REVIEW</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
