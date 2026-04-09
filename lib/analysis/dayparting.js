/**
 * Analyze conversion patterns by hour-of-day and day-of-week.
 * Input: array of hourly performance rows from Google Ads.
 * Output: heatmap grid, peak/dead zone identification, bid modifier recommendations.
 *
 * Used by:
 * - DaypartingHeatmap component (visualization)
 * - BidAgent (auto bid modifier adjustments)
 * - Campaign wizard Step 13 (schedule recommendations in Phase 6)
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function analyzeDayparting(hourlyData) {
  // Initialize 7×24 grid (days × hours), all null
  const grid = Array.from({ length: 7 }, () => Array(24).fill(null));

  // Fill grid with computed metrics per cell
  (hourlyData || []).forEach((row) => {
    const day = row.day_of_week;
    const hour = row.hour_of_day;
    if (day < 0 || day >= 7 || hour < 0 || hour >= 24) return;

    grid[day][hour] = {
      impressions: row.impressions || 0,
      clicks: row.clicks || 0,
      conversions: row.conversions || 0,
      cost: row.cost || 0,
      ctr: row.impressions > 0 ? (row.clicks || 0) / row.impressions : 0,
      conv_rate: (row.clicks || 0) > 0 ? (row.conversions || 0) / row.clicks : 0,
      cpa: (row.conversions || 0) > 0 ? (row.cost || 0) / row.conversions : null,
    };
  });

  // Find max conversion rate across entire grid
  let maxConvRate = 0;
  let totalConversions = 0;

  grid.forEach((dayData) => {
    dayData.forEach((cell) => {
      if (!cell) return;
      totalConversions += cell.conversions;
      if (cell.conv_rate > maxConvRate) maxConvRate = cell.conv_rate;
    });
  });

  // Identify peaks (≥70% of max conv rate) and dead zones (cost > 0, conversions === 0)
  const peaks = [];
  const deadZones = [];
  const threshold = maxConvRate * 0.7;

  grid.forEach((dayData, dayIdx) => {
    dayData.forEach((cell, hourIdx) => {
      if (!cell) return;
      if (cell.conv_rate >= threshold && cell.conversions > 0) {
        peaks.push({ day: DAYS[dayIdx], hour: hourIdx, ...cell });
      }
      if (cell.cost > 0 && cell.conversions === 0) {
        deadZones.push({ day: DAYS[dayIdx], hour: hourIdx, wasted: cell.cost });
      }
    });
  });

  // Generate bid modifier recommendations
  const recommendations = [];

  if (peaks.length > 0) {
    const peakHours = [...new Set(peaks.map((p) => p.hour))].sort((a, b) => a - b);
    recommendations.push({
      type: 'increase',
      description: `Increase bids during peak hours (${peakHours.map((h) => `${h}:00`).join(', ')})`,
      modifier: '+20%',
    });
  }

  if (deadZones.length > 3) {
    const totalWasted = deadZones.reduce((sum, d) => sum + d.wasted, 0);
    recommendations.push({
      type: 'decrease',
      description: `Reduce bids during ${deadZones.length} zero-conversion time slots (saving ~$${totalWasted.toFixed(0)})`,
      modifier: '-30%',
    });
  }

  return {
    grid,
    peaks,
    deadZones,
    recommendations,
    totalConversions,
    days: DAYS,
  };
}
