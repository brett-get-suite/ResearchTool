/**
 * Pre-built negative keyword lists by industry.
 * Used in the Keywords tab to show recommended negatives + export for Google Ads Editor.
 */

const UNIVERSAL_NEGATIVES = [
  // DIY / How-to
  'diy', 'how to', 'tutorial', 'guide', 'instructions', 'steps', 'yourself', 'homemade',
  // Jobs / Careers
  'jobs', 'job', 'salary', 'hiring', 'career', 'careers', 'employment', 'resume', 'apply',
  'apprentice', 'apprenticeship', 'certification', 'license', 'exam', 'training', 'school',
  'degree', 'course', 'classes',
  // Free / Cheap
  'free', 'cheap', 'cheapest', 'discount', 'coupon', 'deal',
  // Education / Research
  'what is', 'definition', 'meaning', 'wikipedia', 'history of', 'science',
  // Unrelated
  'youtube', 'video', 'reddit', 'forum', 'blog', 'pinterest', 'tiktok',
  'amazon', 'home depot', 'lowes', 'walmart',
  'parts', 'supplies', 'tools', 'wholesale', 'manufacturer',
  'used', 'refurbished', 'rental', 'rent',
  'complaint', 'lawsuit', 'scam',
];

const INDUSTRY_NEGATIVES = {
  hvac: [
    'hvac school', 'hvac degree', 'hvac technician salary', 'hvac certification',
    'portable ac', 'window unit', 'space heater', 'diy furnace',
    'hvac tools', 'refrigerant', 'r410a', 'freon',
    'hvac parts', 'condenser unit price', 'evaporator coil',
  ],
  plumbing: [
    'plumbing school', 'plumber salary', 'plumber apprenticeship',
    'diy plumbing', 'plumbing tools', 'pvc pipe', 'copper pipe',
    'plumbing parts', 'toilet parts', 'faucet parts',
    'plumbing code', 'plumbing diagram', 'plumbing snake rental',
  ],
  electrical: [
    'electrician school', 'electrician salary', 'electrical engineering',
    'diy electrical', 'wiring diagram', 'circuit breaker types',
    'electrical parts', 'wire gauge', 'outlet types',
    'electrical code', 'nec code',
  ],
  roofing: [
    'roofing jobs', 'roofer salary', 'roofing school',
    'diy roofing', 'roofing materials', 'shingles price per bundle',
    'metal roofing diy', 'roof tar', 'roof cement',
    'roofing nailer', 'roofing felt',
  ],
  landscaping: [
    'landscaping jobs', 'landscaper salary',
    'diy landscaping', 'landscaping ideas', 'garden design',
    'lawn mower', 'seed', 'fertilizer', 'mulch price',
    'landscaping software', 'landscape architecture degree',
  ],
  pest_control: [
    'diy pest control', 'homemade bug spray', 'natural pest control',
    'pest control products', 'raid', 'ortho',
    'pest control license', 'exterminator salary',
    'identify bug', 'what bug is this',
  ],
  garage_door: [
    'garage door parts', 'garage door spring diy', 'garage door opener manual',
    'garage door sizes', 'garage door insulation kit',
    'garage door technician salary',
  ],
  painting: [
    'paint colors', 'paint brands', 'sherwin williams', 'benjamin moore',
    'diy painting tips', 'painting tools', 'paint roller',
    'painter salary', 'painting jobs',
    'face painting', 'body painting', 'art painting',
  ],
};

/**
 * Returns combined negative keyword list for an industry.
 * Merges universal negatives + industry-specific negatives.
 */
export function getNegativeKeywords(industry = '') {
  const key = industry.toLowerCase().replace(/[\s-]+/g, '_');
  const industrySpecific = INDUSTRY_NEGATIVES[key] || [];
  return {
    universal: [...UNIVERSAL_NEGATIVES],
    industry: industrySpecific,
    combined: [...new Set([...UNIVERSAL_NEGATIVES, ...industrySpecific])].sort(),
  };
}

/**
 * Builds a CSV string for Google Ads Editor negative keyword import.
 * Format: Campaign, Keyword, Match Type
 */
export function buildNegativeKeywordCSV(keywords, campaignName = 'All Campaigns') {
  let csv = 'Campaign,Keyword,Criterion Type\n';
  keywords.forEach(kw => {
    csv += `"${campaignName}","${kw}","Broad"\n`;
  });
  return csv;
}
