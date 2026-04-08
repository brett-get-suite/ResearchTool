import { evaluateWeatherTriggers, WEATHER_TRIGGERS } from '../../lib/data-sources/weather';

describe('evaluateWeatherTriggers', () => {
  test('extreme heat triggers HVAC surge', () => {
    const day = { temp_max: 100, temp_min: 78, weather_main: 'Clear', wind_speed: 5, rain_mm: 0 };
    const triggers = evaluateWeatherTriggers(day);
    expect(triggers.length).toBeGreaterThan(0);
    expect(triggers[0].verticals).toContain('hvac');
    expect(triggers[0].keyword_boost).toBe(1.4);
  });

  test('freezing temps trigger HVAC heating surge', () => {
    const day = { temp_max: 28, temp_min: 15, weather_main: 'Snow', wind_speed: 10, rain_mm: 0 };
    const triggers = evaluateWeatherTriggers(day);
    const hvacTrigger = triggers.find(t => t.verticals.includes('hvac'));
    expect(hvacTrigger).toBeDefined();
    expect(hvacTrigger.affected_keywords).toContain('furnace repair');
  });

  test('pipe-freezing temps trigger plumbing surge', () => {
    const day = { temp_max: 18, temp_min: 5, weather_main: 'Snow', wind_speed: 15, rain_mm: 0 };
    const triggers = evaluateWeatherTriggers(day);
    const plumbingTrigger = triggers.find(t => t.verticals.includes('plumbing'));
    expect(plumbingTrigger).toBeDefined();
    expect(plumbingTrigger.keyword_boost).toBe(1.5);
  });

  test('thunderstorm triggers roofing surge', () => {
    const day = { temp_max: 85, temp_min: 70, weather_main: 'Thunderstorm', wind_speed: 35, rain_mm: 10 };
    const triggers = evaluateWeatherTriggers(day);
    const roofingTrigger = triggers.find(t => t.verticals.includes('roofing'));
    expect(roofingTrigger).toBeDefined();
  });

  test('heavy rain triggers plumbing drainage surge', () => {
    const day = { temp_max: 72, temp_min: 60, weather_main: 'Rain', wind_speed: 10, rain_mm: 30 };
    const triggers = evaluateWeatherTriggers(day);
    const plumbingTrigger = triggers.find(t =>
      t.verticals.includes('plumbing') && t.affected_keywords.includes('drain cleaning')
    );
    expect(plumbingTrigger).toBeDefined();
    expect(plumbingTrigger.keyword_boost).toBe(1.25);
  });

  test('mild weather triggers nothing', () => {
    const day = { temp_max: 75, temp_min: 55, weather_main: 'Clear', wind_speed: 5, rain_mm: 0 };
    const triggers = evaluateWeatherTriggers(day);
    expect(triggers).toHaveLength(0);
  });

  test('high wind triggers roofing surge', () => {
    const day = { temp_max: 70, temp_min: 55, weather_main: 'Clouds', wind_speed: 45, rain_mm: 0 };
    const triggers = evaluateWeatherTriggers(day);
    const roofingTrigger = triggers.find(t => t.verticals.includes('roofing'));
    expect(roofingTrigger).toBeDefined();
  });
});
