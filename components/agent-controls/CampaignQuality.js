const SCORE_COLORS = {
  high: 'bg-secondary',      // 90+
  medium: 'bg-primary',      // 70-89
  low: 'bg-on-surface-variant', // <70
};

export default function CampaignQuality({ campaigns }) {
  if (!campaigns || campaigns.length === 0) return null;

  const scored = campaigns
    .filter((c) => c.quality_score != null)
    .sort((a, b) => b.quality_score - a.quality_score);

  if (scored.length === 0) return null;

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface">Campaign Quality Index</h3>
        <div className="flex items-center gap-4 text-label-sm text-on-surface-variant">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary" /> 90+</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> 70-89</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-on-surface-variant" /> &lt;70</span>
        </div>
      </div>

      <div className="space-y-3">
        {scored.slice(0, 8).map((c, i) => {
          const colorKey = c.quality_score >= 90 ? 'high' : c.quality_score >= 70 ? 'medium' : 'low';
          return (
            <div key={c.campaignId || i} className="flex items-center gap-4">
              <span className="text-sm text-on-surface-variant w-48 truncate">{c.name}</span>
              <div className="flex-1 h-2 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className={`h-full rounded-full ${SCORE_COLORS[colorKey]} transition-all`}
                  style={{ width: `${c.quality_score}%` }}
                />
              </div>
              <span className="text-sm text-on-surface font-medium w-10 text-right">{c.quality_score}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
