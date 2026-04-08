const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AiInsights({ weatherAlerts, sourcesAvailable, keywords }) {
  const currentMonth = new Date().getMonth();

  // Find keywords with strong seasonal trends (current month multiplier > 1.3)
  const seasonalOpportunities = (keywords || [])
    .filter(kw => kw.trend_multipliers && kw.trend_multipliers[currentMonth] > 1.3)
    .slice(0, 3);

  // Find keywords with upcoming seasonal peaks (next 2 months)
  const upcomingPeaks = (keywords || [])
    .filter(kw => {
      if (!kw.trend_multipliers) return false;
      const next1 = kw.trend_multipliers[(currentMonth + 1) % 12];
      const next2 = kw.trend_multipliers[(currentMonth + 2) % 12];
      return next1 > 1.3 || next2 > 1.3;
    })
    .slice(0, 3);

  return (
    <div className="bg-surface-container rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-on-surface">AI Insights</h3>
        <span className="material-symbols-outlined text-tertiary text-xl">auto_awesome</span>
      </div>

      {/* Data source status */}
      <div className="space-y-2">
        <div className="text-label-sm text-on-surface-variant">Active Data Sources</div>
        {Object.entries(sourcesAvailable || {}).map(([source, active]) => (
          <div key={source} className="flex items-center gap-2 text-sm">
            <span className={`material-symbols-outlined text-base ${active ? 'text-secondary' : 'text-on-surface-variant'}`}>
              {active ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            <span className={active ? 'text-on-surface' : 'text-on-surface-variant'}>
              {source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
            {!active && source === 'website_analytics' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                Phase 8
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Seasonal trend opportunities */}
      {seasonalOpportunities.length > 0 && (
        <div className="space-y-3">
          <div className="text-label-sm text-on-surface-variant">Seasonal Opportunities — {MONTH_NAMES[currentMonth]}</div>
          {seasonalOpportunities.map((kw, i) => {
            const mult = kw.trend_multipliers[currentMonth];
            const pctAbove = Math.round((mult - 1) * 100);
            return (
              <div key={i} className="bg-surface-container-low rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-on-surface">{kw.keyword || kw.cluster}</span>
                  <span className="text-xs font-semibold text-secondary">+{pctAbove}%</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Search interest is {pctAbove}% above average this month
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming peaks */}
      {upcomingPeaks.length > 0 && (
        <div className="space-y-3">
          <div className="text-label-sm text-on-surface-variant">Upcoming Demand Peaks</div>
          {upcomingPeaks.map((kw, i) => {
            const next1Month = (currentMonth + 1) % 12;
            const next2Month = (currentMonth + 2) % 12;
            const peakMonth = (kw.trend_multipliers[next1Month] > kw.trend_multipliers[next2Month])
              ? next1Month : next2Month;
            const peakMult = kw.trend_multipliers[peakMonth];
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-primary text-base">schedule</span>
                <span className="text-on-surface-variant">
                  <span className="text-on-surface font-medium">{kw.keyword || kw.cluster}</span>
                  {' '}peaks in {MONTH_NAMES[peakMonth]} ({Math.round((peakMult - 1) * 100)}% above avg)
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Weather alerts */}
      {weatherAlerts && weatherAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="text-label-sm text-on-surface-variant">Weather Surge Alerts</div>
          {weatherAlerts.slice(0, 3).map((alert, i) => (
            <div key={i} className="bg-surface-container-low rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-secondary text-base">thunderstorm</span>
                <span className="text-xs font-medium text-secondary">{alert.temp_range}</span>
                <span className="text-[10px] text-on-surface-variant ml-auto">{alert.date}</span>
              </div>
              <p className="text-xs text-on-surface-variant">{alert.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {alert.affected_keywords?.slice(0, 3).map((kw, j) => (
                  <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {(!weatherAlerts || weatherAlerts.length === 0) &&
       seasonalOpportunities.length === 0 &&
       upcomingPeaks.length === 0 && (
        <div className="bg-surface-container-low rounded-xl p-4">
          <p className="text-xs text-on-surface-variant">
            Connect location data and run keyword research to see AI-powered insights here.
          </p>
        </div>
      )}
    </div>
  );
}
