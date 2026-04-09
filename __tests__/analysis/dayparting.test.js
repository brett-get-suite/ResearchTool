import { analyzeDayparting } from '../../lib/analysis/dayparting.js';

describe('analyzeDayparting', () => {
  test('returns empty grid structure with no data', () => {
    const result = analyzeDayparting([]);
    expect(result.grid).toHaveLength(7);          // 7 days
    expect(result.grid[0]).toHaveLength(24);       // 24 hours
    expect(result.peaks).toEqual([]);
    expect(result.deadZones).toEqual([]);
    expect(result.recommendations).toEqual([]);
    expect(result.totalConversions).toBe(0);
    expect(result.days).toEqual([
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
    ]);
  });

  test('populates grid cells from hourly rows', () => {
    const rows = [
      { day_of_week: 1, hour_of_day: 9, impressions: 100, clicks: 10, conversions: 2, cost: 50 },
      { day_of_week: 1, hour_of_day: 10, impressions: 120, clicks: 15, conversions: 3, cost: 60 },
    ];
    const result = analyzeDayparting(rows);

    // Monday (index 1), 9am
    const cell = result.grid[1][9];
    expect(cell).not.toBeNull();
    expect(cell.impressions).toBe(100);
    expect(cell.clicks).toBe(10);
    expect(cell.conversions).toBe(2);
    expect(cell.cost).toBe(50);
    expect(cell.ctr).toBeCloseTo(0.1);           // 10/100
    expect(cell.conv_rate).toBeCloseTo(0.2);      // 2/10
    expect(cell.cpa).toBeCloseTo(25);             // 50/2
  });

  test('ignores out-of-range day/hour values', () => {
    const rows = [
      { day_of_week: -1, hour_of_day: 9, impressions: 100, clicks: 10, conversions: 1, cost: 20 },
      { day_of_week: 7, hour_of_day: 9, impressions: 100, clicks: 10, conversions: 1, cost: 20 },
      { day_of_week: 1, hour_of_day: 24, impressions: 100, clicks: 10, conversions: 1, cost: 20 },
      { day_of_week: 1, hour_of_day: -1, impressions: 100, clicks: 10, conversions: 1, cost: 20 },
    ];
    const result = analyzeDayparting(rows);
    expect(result.totalConversions).toBe(0);
  });

  test('identifies peak conversion windows', () => {
    const rows = [
      // High conversion rate slot
      { day_of_week: 1, hour_of_day: 10, impressions: 200, clicks: 40, conversions: 10, cost: 100 },
      // Medium slot
      { day_of_week: 1, hour_of_day: 14, impressions: 200, clicks: 40, conversions: 8, cost: 100 },
      // Low slot
      { day_of_week: 1, hour_of_day: 22, impressions: 200, clicks: 40, conversions: 1, cost: 100 },
    ];
    const result = analyzeDayparting(rows);

    // Peak is 10am Mon (conv_rate = 10/40 = 0.25)
    // Threshold = 0.25 * 0.7 = 0.175
    // 14:00 has 8/40 = 0.2 → above threshold → also a peak
    // 22:00 has 1/40 = 0.025 → below threshold
    expect(result.peaks.length).toBeGreaterThanOrEqual(1);
    expect(result.peaks.some((p) => p.hour === 10 && p.day === 'Monday')).toBe(true);
  });

  test('identifies dead zones (cost with zero conversions)', () => {
    const rows = [
      { day_of_week: 0, hour_of_day: 2, impressions: 50, clicks: 5, conversions: 0, cost: 30 },
      { day_of_week: 0, hour_of_day: 3, impressions: 40, clicks: 4, conversions: 0, cost: 25 },
      { day_of_week: 0, hour_of_day: 4, impressions: 30, clicks: 3, conversions: 0, cost: 20 },
      { day_of_week: 0, hour_of_day: 5, impressions: 20, clicks: 2, conversions: 0, cost: 15 },
      // Need a conversion somewhere so maxConvRate > 0
      { day_of_week: 1, hour_of_day: 10, impressions: 100, clicks: 20, conversions: 5, cost: 50 },
    ];
    const result = analyzeDayparting(rows);

    expect(result.deadZones.length).toBe(4);
    expect(result.deadZones[0].day).toBe('Sunday');
    expect(result.deadZones[0].wasted).toBe(30);
  });

  test('generates bid increase recommendation for peaks', () => {
    const rows = [
      { day_of_week: 1, hour_of_day: 10, impressions: 200, clicks: 40, conversions: 10, cost: 100 },
      { day_of_week: 2, hour_of_day: 10, impressions: 200, clicks: 40, conversions: 8, cost: 100 },
    ];
    const result = analyzeDayparting(rows);

    const increaseRec = result.recommendations.find((r) => r.type === 'increase');
    expect(increaseRec).toBeDefined();
    expect(increaseRec.modifier).toBe('+20%');
  });

  test('generates bid decrease recommendation when >3 dead zones', () => {
    const rows = [
      { day_of_week: 0, hour_of_day: 1, impressions: 50, clicks: 5, conversions: 0, cost: 30 },
      { day_of_week: 0, hour_of_day: 2, impressions: 50, clicks: 5, conversions: 0, cost: 25 },
      { day_of_week: 0, hour_of_day: 3, impressions: 50, clicks: 5, conversions: 0, cost: 20 },
      { day_of_week: 0, hour_of_day: 4, impressions: 50, clicks: 5, conversions: 0, cost: 15 },
      { day_of_week: 1, hour_of_day: 10, impressions: 200, clicks: 40, conversions: 10, cost: 100 },
    ];
    const result = analyzeDayparting(rows);

    const decreaseRec = result.recommendations.find((r) => r.type === 'decrease');
    expect(decreaseRec).toBeDefined();
    expect(decreaseRec.modifier).toBe('-30%');
    expect(decreaseRec.description).toContain('4 zero-conversion');
    expect(decreaseRec.description).toContain('$90');
  });

  test('handles null/undefined input gracefully', () => {
    expect(() => analyzeDayparting(null)).not.toThrow();
    expect(() => analyzeDayparting(undefined)).not.toThrow();
    const result = analyzeDayparting(null);
    expect(result.grid).toHaveLength(7);
    expect(result.totalConversions).toBe(0);
  });

  test('CPA is null when zero conversions', () => {
    const rows = [
      { day_of_week: 3, hour_of_day: 15, impressions: 100, clicks: 10, conversions: 0, cost: 50 },
    ];
    const result = analyzeDayparting(rows);
    expect(result.grid[3][15].cpa).toBeNull();
  });
});
