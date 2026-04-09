'use client';

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return '12a';
  if (i < 12) return `${i}a`;
  if (i === 12) return '12p';
  return `${i - 12}p`;
});

function getCellColor(convRate, maxConvRate) {
  if (convRate == null || maxConvRate === 0) return 'bg-surface-container-low';
  const intensity = convRate / maxConvRate;
  if (intensity >= 0.7) return 'bg-secondary/80';
  if (intensity >= 0.4) return 'bg-secondary/40';
  if (intensity > 0) return 'bg-secondary/15';
  return 'bg-surface-container-low';
}

function getDeadZoneColor(cell) {
  if (cell && cell.cost > 0 && cell.conversions === 0) return 'bg-error/30';
  return null;
}

export default function DaypartingHeatmap({ daypartingData }) {
  if (!daypartingData || !daypartingData.grid) {
    return (
      <div className="bg-surface-container rounded-xl p-6">
        <h3 className="text-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">grid_on</span>
          Dayparting Analysis
        </h3>
        <p className="text-xs text-on-surface-variant">Connect Google Ads and run hourly data sync to see dayparting patterns.</p>
      </div>
    );
  }

  const { grid, peaks, deadZones, recommendations, days } = daypartingData;

  // Find max conv rate for color scaling
  let maxConvRate = 0;
  grid.forEach((dayData) => {
    dayData.forEach((cell) => {
      if (cell && cell.conv_rate > maxConvRate) maxConvRate = cell.conv_rate;
    });
  });

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">grid_on</span>
          Dayparting Analysis
        </h3>
        <div className="flex items-center gap-3 text-label-sm text-on-surface-variant">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-secondary/80" /> Peak</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-secondary/15" /> Low</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-error/30" /> Dead Zone</span>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Hour labels */}
          <div className="flex gap-px mb-px ml-20">
            {HOUR_LABELS.map((label, i) => (
              <div key={i} className="flex-1 text-center text-[10px] text-on-surface-variant">
                {i % 3 === 0 ? label : ''}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {days.map((day, dayIdx) => (
            <div key={day} className="flex gap-px mb-px">
              <div className="w-20 text-xs text-on-surface-variant flex items-center shrink-0">
                {day.slice(0, 3)}
              </div>
              {grid[dayIdx].map((cell, hourIdx) => {
                const deadColor = getDeadZoneColor(cell);
                const bgColor = deadColor || getCellColor(cell?.conv_rate, maxConvRate);

                return (
                  <div
                    key={hourIdx}
                    className={`flex-1 h-7 rounded-sm ${bgColor} cursor-pointer transition-all hover:ring-1 hover:ring-primary/50`}
                    title={cell ? `${cell.conversions} conv, $${cell.cost.toFixed(0)} cost` : 'No data'}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-4 space-y-2">
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs ${
                rec.type === 'increase' ? 'text-secondary' : 'text-error'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {rec.type === 'increase' ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <span className="text-on-surface-variant">{rec.description}</span>
              <span className="font-medium">{rec.modifier}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary stats */}
      <div className="flex items-center gap-6 mt-4 text-label-sm text-on-surface-variant">
        <span>{peaks.length} peak windows</span>
        <span>{deadZones.length} dead zones</span>
        {deadZones.length > 0 && (
          <span className="text-error">
            ${deadZones.reduce((s, d) => s + d.wasted, 0).toFixed(0)} wasted in dead zones
          </span>
        )}
      </div>
    </div>
  );
}
