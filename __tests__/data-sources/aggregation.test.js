import { buildWeatherBoostMap, applyWeatherBoosts, classifyDataSources } from '../../lib/data-sources/index.js';

describe('buildWeatherBoostMap', () => {
  test('builds map from alerts', () => {
    const alerts = [
      {
        date: '2026-04-10',
        boost: 1.4,
        description: 'Heat surge',
        affected_keywords: ['ac repair', 'cooling'],
      },
    ];
    const map = buildWeatherBoostMap(alerts);
    expect(map['ac repair']).toEqual({ boost: 1.4, reason: 'Heat surge', date: '2026-04-10' });
    expect(map['cooling']).toEqual({ boost: 1.4, reason: 'Heat surge', date: '2026-04-10' });
  });

  test('returns empty map for empty alerts', () => {
    expect(buildWeatherBoostMap([])).toEqual({});
  });
});

describe('applyWeatherBoosts', () => {
  test('matches keywords containing trigger terms', () => {
    const keywords = [
      { keyword: 'emergency ac repair near me', avg_cpc: 12 },
      { keyword: 'plumber cost', avg_cpc: 8 },
    ];
    const boostMap = {
      'ac repair': { boost: 1.4, reason: 'Heat', date: '2026-04-10' },
    };
    const result = applyWeatherBoosts(keywords, boostMap);
    expect(result[0].weather_boost).toEqual({ boost: 1.4, reason: 'Heat', date: '2026-04-10' });
    expect(result[1].weather_boost).toBeNull();
  });
});

describe('classifyDataSources', () => {
  test('identifies keyword planner data', () => {
    const kw = { keyword: 'ac repair', data_source: 'google' };
    const sources = classifyDataSources(kw, true, true);
    expect(sources).toContain('keyword_planner');
  });

  test('identifies weather data', () => {
    const kw = { keyword: 'ac repair', weather_boost: { boost: 1.4 } };
    const sources = classifyDataSources(kw, false, false);
    expect(sources).toContain('weather');
  });

  test('returns empty for no sources', () => {
    const kw = { keyword: 'ac repair' };
    const sources = classifyDataSources(kw, false, false);
    expect(sources).toEqual([]);
  });
});
