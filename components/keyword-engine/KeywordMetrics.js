export default function KeywordMetrics({ keywords, weatherAlerts, industryBenchmark }) {
  const avgCpc = keywords.length > 0
    ? keywords.reduce((sum, k) => sum + (k.avg_cpc || k.cpc || 0), 0) / keywords.length
    : 0;

  const totalVolume = keywords.reduce(
    (sum, k) => sum + (k.volume || k.monthly_searches || 0),
    0
  );

  // Efficiency: weighted by transactional intent ratio + keyword planner coverage
  const transactionalPct = keywords.filter(
    (k) => (k.intent || '').toLowerCase() === 'transactional'
  ).length / Math.max(keywords.length, 1);
  const plannerPct = keywords.filter(
    (k) => k.data_source === 'google'
  ).length / Math.max(keywords.length, 1);
  const efficiencyScore = Math.round(transactionalPct * 50 + plannerPct * 20 + 30);

  // CPC delta vs industry average (if benchmark provided)
  const industryCpc = industryBenchmark?.avgCpc || null;
  let cpcDelta = null;
  if (industryCpc && avgCpc > 0) {
    cpcDelta = Math.round(((avgCpc - industryCpc) / industryCpc) * 100);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-surface-container rounded-xl p-5 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
        <div className="text-label-sm text-on-surface-variant mb-1">Avg. CPC</div>
        <div className="text-3xl font-extrabold text-on-surface">${avgCpc.toFixed(2)}</div>
        {cpcDelta !== null && (
          <div className={`text-xs mt-1 ${cpcDelta <= 0 ? 'text-secondary' : 'text-error'}`}>
            {cpcDelta <= 0 ? `${Math.abs(cpcDelta)}% below` : `${cpcDelta}% above`} industry avg
          </div>
        )}
        {cpcDelta === null && (
          <div className="text-xs text-on-surface-variant mt-1">Connect Google Ads for comparison</div>
        )}
      </div>

      <div className="bg-surface-container rounded-xl p-5 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary" />
        <div className="text-label-sm text-on-surface-variant mb-1">Efficiency Score</div>
        <div className="text-3xl font-extrabold text-on-surface">{efficiencyScore}/100</div>
        <div className="flex items-center gap-1 text-xs text-tertiary mt-1">
          <span className="material-symbols-outlined text-xs">auto_awesome</span>
          AI Optimized Path
        </div>
      </div>

      <div className="bg-surface-container rounded-xl p-5 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-tertiary" />
        <div className="text-label-sm text-on-surface-variant mb-1">Total Search Volume</div>
        <div className="text-3xl font-extrabold text-on-surface">
          {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}
        </div>
        {weatherAlerts?.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-secondary mt-1">
            <span className="material-symbols-outlined text-xs">thunderstorm</span>
            {weatherAlerts.length} weather surge{weatherAlerts.length > 1 ? 's' : ''} detected
          </div>
        )}
        {(!weatherAlerts || weatherAlerts.length === 0) && (
          <div className="text-xs text-on-surface-variant mt-1">Based on keyword volume</div>
        )}
      </div>
    </div>
  );
}
