const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Cache for 3 hours
const cache = new Map();
const CACHE_TTL = 3 * 60 * 60 * 1000;

/**
 * Demand surge triggers by vertical.
 * Each entry defines a weather condition, which verticals it affects,
 * a boost multiplier for affected keyword bids, and which keywords surge.
 */
const WEATHER_TRIGGERS = [
  {
    condition: (w) => w.temp_max >= 95,
    keyword_boost: 1.4,
    verticals: ['hvac'],
    description: 'Extreme heat — AC repair/install demand surge expected',
    affected_keywords: ['ac repair', 'ac installation', 'air conditioning', 'cooling'],
  },
  {
    condition: (w) => w.temp_min <= 32,
    keyword_boost: 1.35,
    verticals: ['hvac'],
    description: 'Freezing temps — heating system demand surge expected',
    affected_keywords: ['furnace repair', 'heating repair', 'heater', 'heat pump'],
  },
  {
    condition: (w) => w.temp_min <= 20,
    keyword_boost: 1.5,
    verticals: ['plumbing'],
    description: 'Pipe-freezing risk — emergency plumbing demand surge',
    affected_keywords: ['frozen pipes', 'pipe burst', 'emergency plumber', 'plumbing repair'],
  },
  {
    condition: (w) => w.weather_main === 'Thunderstorm' || w.wind_speed >= 40,
    keyword_boost: 1.3,
    verticals: ['roofing'],
    description: 'Storm activity — roof repair demand surge expected',
    affected_keywords: ['roof repair', 'roof leak', 'storm damage', 'emergency roofing'],
  },
  {
    condition: (w) => w.rain_mm >= 25,
    keyword_boost: 1.25,
    verticals: ['plumbing'],
    description: 'Heavy rain — drainage/flooding demand surge expected',
    affected_keywords: ['drain cleaning', 'sump pump', 'flood', 'water damage'],
  },
];

/**
 * Evaluate which weather triggers fire for a given day's conditions.
 * Exported for testing.
 */
export function evaluateWeatherTriggers(dayConditions) {
  return WEATHER_TRIGGERS.filter((t) => t.condition(dayConditions));
}

/**
 * Fetch 7-day forecast for a location.
 * Returns array of daily forecasts with demand triggers.
 * Returns null if API key not configured.
 */
export async function getWeatherForecast(lat, lon) {
  if (!API_KEY) return null;

  const key = `${lat},${lon}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;

  try {
    const res = await fetch(
      `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial&cnt=40`
    );
    if (!res.ok) throw new Error(`Weather API ${res.status}`);
    const data = await res.json();

    // Group 3-hour intervals by day
    const days = {};
    (data.list || []).forEach((entry) => {
      const date = entry.dt_txt.split(' ')[0];
      if (!days[date]) {
        days[date] = {
          date,
          temp_min: entry.main.temp_min,
          temp_max: entry.main.temp_max,
          weather_main: entry.weather?.[0]?.main,
          wind_speed: entry.wind?.speed || 0,
          rain_mm: entry.rain?.['3h'] || 0,
        };
      } else {
        days[date].temp_min = Math.min(days[date].temp_min, entry.main.temp_min);
        days[date].temp_max = Math.max(days[date].temp_max, entry.main.temp_max);
        days[date].rain_mm += entry.rain?.['3h'] || 0;
        days[date].wind_speed = Math.max(days[date].wind_speed, entry.wind?.speed || 0);
      }
    });

    const result = Object.values(days).map((day) => ({
      ...day,
      triggers: evaluateWeatherTriggers(day),
    }));

    cache.set(key, { data: result, time: Date.now() });
    return result;
  } catch (err) {
    console.error('Weather API error:', err.message);
    return null;
  }
}

/**
 * Get demand surge alerts for a specific vertical in a location.
 * Filters forecast triggers to only the given vertical.
 */
export async function getDemandSurgeAlerts(lat, lon, vertical) {
  const forecast = await getWeatherForecast(lat, lon);
  if (!forecast) return [];

  const alerts = [];
  forecast.forEach((day) => {
    day.triggers
      .filter((t) => t.verticals.includes(vertical))
      .forEach((trigger) => {
        alerts.push({
          date: day.date,
          boost: trigger.keyword_boost,
          description: trigger.description,
          affected_keywords: trigger.affected_keywords,
          temp_range: `${Math.round(day.temp_min)}°F - ${Math.round(day.temp_max)}°F`,
        });
      });
  });

  return alerts;
}

export { WEATHER_TRIGGERS };
