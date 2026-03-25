/**
 * Industry benchmarks for revenue & ROI projections.
 * Reused across: Revenue Projections (Feature 1), Seasonal Plan (Feature 3), TAM Calculator (Feature 4).
 *
 * Sources: Industry averages for home-service trades in the US.
 */

export const INDUSTRY_BENCHMARKS = {
  hvac: {
    closeRate: 0.45,
    avgJobValue: 2500,
    label: 'HVAC (blended avg)',
    note: 'Blends replacements (~$5k, 35% close) with repairs (~$350, 60% close)',
  },
  plumbing: {
    closeRate: 0.60,
    avgJobValue: 600,
    label: 'Plumbing (blended avg)',
    note: 'Blends emergency calls (~$300, 70% close) with water heater replacements (~$1,800, 45% close)',
  },
  electrical: {
    closeRate: 0.50,
    avgJobValue: 900,
    label: 'Electrical (blended avg)',
    note: 'Blends repairs (~$350, 65% close) with panel upgrades (~$3,000, 40% close)',
  },
  roofing: {
    closeRate: 0.30,
    avgJobValue: 9000,
    label: 'Roofing (blended avg)',
    note: 'Roof replacements avg $12k at 30% close; repairs avg $900 at 55% close',
  },
  landscaping: {
    closeRate: 0.45,
    avgJobValue: 1200,
    label: 'Landscaping',
    note: 'Blends ongoing maintenance contracts with one-time project installs',
  },
  pest_control: {
    closeRate: 0.60,
    avgJobValue: 350,
    label: 'Pest Control',
    note: 'High close rate — customers calling have already decided to treat',
  },
  garage_door: {
    closeRate: 0.65,
    avgJobValue: 600,
    label: 'Garage Door',
    note: 'Blends spring/cable repairs with full door replacements',
  },
  painting: {
    closeRate: 0.35,
    avgJobValue: 3500,
    label: 'Painting',
    note: 'Exterior painting avg $4k; interior avg $2k; quote-to-close ~35%',
  },
  default: {
    closeRate: 0.45,
    avgJobValue: 1000,
    label: 'General Services',
    note: 'Default blended average for home services. Set client-specific numbers above.',
  },
};

/**
 * Returns benchmark defaults for a given industry string.
 * Case-insensitive, spaces/hyphens normalized to underscores.
 */
export function getDefaultBenchmarks(industry = '') {
  const key = industry.toLowerCase().replace(/[\s-]+/g, '_');
  return INDUSTRY_BENCHMARKS[key] || INDUSTRY_BENCHMARKS.default;
}

/**
 * Seasonality multipliers by industry.
 * 12 values (Jan=0 → Dec=11). 1.0 = average month. Sum ≈ 12.0.
 */
export const SEASONALITY_MULTIPLIERS = {
  hvac:         [0.6, 0.6, 0.8, 0.9, 1.2, 1.6, 1.8, 1.7, 1.2, 0.9, 0.7, 0.6],
  plumbing:     [1.1, 1.1, 1.0, 1.0, 1.0, 0.9, 0.9, 0.9, 1.0, 1.0, 1.0, 1.1],
  electrical:   [0.8, 0.8, 1.0, 1.1, 1.2, 1.2, 1.1, 1.1, 1.0, 1.0, 0.9, 0.8],
  roofing:      [0.5, 0.6, 0.9, 1.4, 1.5, 1.4, 1.1, 1.0, 1.3, 1.3, 0.6, 0.4],
  landscaping:  [0.3, 0.4, 0.9, 1.4, 1.6, 1.5, 1.3, 1.2, 1.1, 0.9, 0.5, 0.3],
  pest_control: [0.6, 0.7, 1.0, 1.2, 1.4, 1.4, 1.3, 1.2, 1.0, 0.8, 0.7, 0.7],
  garage_door:  [0.9, 0.9, 1.0, 1.1, 1.1, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.9],
  painting:     [0.4, 0.5, 0.9, 1.3, 1.5, 1.5, 1.4, 1.3, 1.1, 0.9, 0.5, 0.3],
  default:      [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
};

export function getSeasonalMultipliers(industry = '') {
  const key = industry.toLowerCase().replace(/[\s-]+/g, '_');
  return SEASONALITY_MULTIPLIERS[key] || SEASONALITY_MULTIPLIERS.default;
}

/**
 * TAM (Total Addressable Market) constants.
 * Sources: US Census Bureau, industry reports.
 */
export const TAM_CONSTANTS = {
  homeownershipRate: 0.657,   // US avg (Census 2023)
  avgHouseholdSize: 2.53,     // US avg (Census 2023)
};

/**
 * Annual service frequency per household by industry.
 * How often the average homeowner needs this type of service per year.
 */
export const SERVICE_FREQUENCY = {
  hvac:         { frequency: 0.80, label: 'HVAC service (tune-ups + repairs + installs)' },
  plumbing:     { frequency: 0.50, label: 'Plumbing service (repairs + installs)' },
  electrical:   { frequency: 0.30, label: 'Electrical service (repairs + upgrades)' },
  roofing:      { frequency: 0.15, label: 'Roofing service (repairs + replacements)' },
  landscaping:  { frequency: 1.20, label: 'Landscaping service (maintenance + projects)' },
  pest_control: { frequency: 0.60, label: 'Pest control treatment' },
  garage_door:  { frequency: 0.20, label: 'Garage door service (repairs + replacements)' },
  painting:     { frequency: 0.12, label: 'Painting service (interior + exterior)' },
  default:      { frequency: 0.40, label: 'Home service call' },
};

export function getServiceFrequency(industry = '') {
  const key = industry.toLowerCase().replace(/[\s-]+/g, '_');
  return SERVICE_FREQUENCY[key] || SERVICE_FREQUENCY.default;
}
