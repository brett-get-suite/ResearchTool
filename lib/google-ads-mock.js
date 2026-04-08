/**
 * Mock Google Ads data for demos and testing.
 * Activated by setting GOOGLE_ADS_MOCK_MODE=true in Vercel env vars.
 * All keyword metrics are deterministic based on keyword text so they
 * stay consistent across page loads.
 */

export const MOCK_MODE = process.env.GOOGLE_ADS_MOCK_MODE === 'true';

// ─── Seeded determinism ───────────────────────────────────────────

function hash(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function seededChoice(seed, arr) {
  return arr[hash(seed) % arr.length];
}

function seededRange(seed, min, max) {
  return min + (hash(seed) % (max - min + 1));
}

// ─── Keyword Planner ──────────────────────────────────────────────

export function mockResolveGeoTargets() {
  return ['geoTargetConstants/2840']; // US national
}

export function mockGetKeywordMetrics(keywords) {
  const map = {};
  for (const kw of keywords) {
    const key = kw.toLowerCase();
    const volume = seededChoice(key + 'vol', [590, 880, 1000, 1300, 1600, 2400, 3600, 4400, 5400, 8100, 9900, 12100]);
    const cpcBase = seededRange(key + 'cpc', 8, 38);
    map[key] = {
      search_volume: volume,
      avg_cpc: Math.round(cpcBase * 100) / 100,
      cpc_low: Math.round(cpcBase * 0.65 * 100) / 100,
      cpc_high: Math.round(cpcBase * 1.35 * 100) / 100,
      competition: seededChoice(key + 'comp', ['low', 'medium', 'high']),
      competition_index: seededRange(key + 'ci', 15, 90),
      monthly_search_volumes: mockMonthlyVolumes(volume, key),
      data_source: 'mock',
    };
  }
  return map;
}

function mockMonthlyVolumes(baseVolume, seed) {
  // HVAC-style seasonality: peaks in summer (AC) and winter (heating)
  const multipliers = [1.2, 0.9, 0.8, 0.9, 1.1, 1.4, 1.5, 1.4, 1.0, 0.9, 1.1, 1.3];
  const months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  return months.map((month, i) => ({
    year: 2025,
    month,
    searches: Math.round(baseVolume * multipliers[i] * (0.85 + seededRange(seed + month, 0, 30) / 100)),
  }));
}

export function mockGenerateKeywordIdeas(seedKeywords) {
  const suffixes = ['near me', 'cost', 'company', 'service', 'repair', 'installation', 'replacement', '24 hour', 'emergency', 'best'];
  const ideas = [];
  for (const seed of seedKeywords.slice(0, 5)) {
    for (const suffix of suffixes) {
      const kw = `${seed} ${suffix}`;
      const key = kw.toLowerCase();
      const volume = seededChoice(key + 'vol', [390, 590, 880, 1000, 1300, 1600, 2400]);
      ideas.push({
        keyword: kw,
        search_volume: volume,
        avg_cpc: Math.round(seededRange(key + 'cpc', 6, 32) * 100) / 100,
        competition: seededChoice(key + 'comp', ['low', 'medium', 'high']),
        competition_index: seededRange(key + 'ci', 15, 85),
      });
    }
  }
  return ideas;
}

// ─── Auth client ──────────────────────────────────────────────────

export function mockGetAccountClient() {
  return {
    accessToken: 'mock-token',
    customerId: '1234567890',
    loginCustomerId: null,
    headers: {
      'Authorization': 'Bearer mock-token',
      'developer-token': 'mock-dev-token',
      'Content-Type': 'application/json',
    },
  };
}

// ─── Campaign / account queries ───────────────────────────────────

export function mockFetchCampaigns() {
  return [
    {
      id: '11111111',
      name: 'HVAC Services - Search',
      status: 'ENABLED',
      type: 'SEARCH',
      biddingStrategy: 'MAXIMIZE_CONVERSIONS',
      budgetAmountMicros: '5000000000',
      resourceName: 'customers/1234567890/campaigns/11111111',
    },
    {
      id: '22222222',
      name: 'AC Repair - Brand',
      status: 'ENABLED',
      type: 'SEARCH',
      biddingStrategy: 'MANUAL_CPC',
      budgetAmountMicros: '2000000000',
      resourceName: 'customers/1234567890/campaigns/22222222',
    },
    {
      id: '33333333',
      name: 'Plumbing Services - Search',
      status: 'PAUSED',
      type: 'SEARCH',
      biddingStrategy: 'TARGET_CPA',
      budgetAmountMicros: '3000000000',
      resourceName: 'customers/1234567890/campaigns/33333333',
    },
  ];
}

export function mockFetchCampaignMetrics() {
  return [
    { campaignId: '11111111', campaignName: 'HVAC Services - Search', impressions: 18420, clicks: 1103, costMicros: 21847000000, cost: 21847.00, conversions: 84.0, ctr: 0.0599, avgCpc: 19.81 },
    { campaignId: '22222222', campaignName: 'AC Repair - Brand', impressions: 6840, clicks: 892, costMicros: 9640000000, cost: 9640.00, conversions: 61.0, ctr: 0.1304, avgCpc: 10.81 },
    { campaignId: '33333333', campaignName: 'Plumbing Services - Search', impressions: 0, clicks: 0, costMicros: 0, cost: 0, conversions: 0, ctr: 0, avgCpc: 0 },
  ];
}

export function mockFetchAccountMetrics() {
  return {
    impressions: 25260,
    clicks: 1995,
    costMicros: 31487000000,
    cost: 31487.00,
    conversions: 145.0,
    ctr: 0.0789,
  };
}

const MOCK_AD_GROUPS = [
  { id: '101', name: 'AC Repair', status: 'ENABLED', cpcBidMicros: '18000000', campaignId: '11111111', campaignName: 'HVAC Services - Search', resourceName: 'customers/1234567890/adGroups/101' },
  { id: '102', name: 'AC Installation', status: 'ENABLED', cpcBidMicros: '22000000', campaignId: '11111111', campaignName: 'HVAC Services - Search', resourceName: 'customers/1234567890/adGroups/102' },
  { id: '103', name: 'Furnace Repair', status: 'ENABLED', cpcBidMicros: '16000000', campaignId: '11111111', campaignName: 'HVAC Services - Search', resourceName: 'customers/1234567890/adGroups/103' },
  { id: '201', name: 'Brand Terms', status: 'ENABLED', cpcBidMicros: '5000000', campaignId: '22222222', campaignName: 'AC Repair - Brand', resourceName: 'customers/1234567890/adGroups/201' },
  { id: '301', name: 'Plumbing Repair', status: 'PAUSED', cpcBidMicros: '14000000', campaignId: '33333333', campaignName: 'Plumbing Services - Search', resourceName: 'customers/1234567890/adGroups/301' },
];

export function mockFetchAdGroups(campaignId) {
  if (campaignId) return MOCK_AD_GROUPS.filter(g => g.campaignId === campaignId);
  return MOCK_AD_GROUPS;
}

const MOCK_KEYWORDS = [
  { criterionId: '1001', keyword: 'ac repair near me', matchType: 'PHRASE', status: 'ENABLED', cpcBidMicros: '20000000', qualityScore: 8, adGroupId: '101', adGroupName: 'AC Repair', campaignId: '11111111', campaignName: 'HVAC Services - Search', resourceName: 'customers/1234567890/adGroupCriteria/101~1001' },
  { criterionId: '1002', keyword: 'air conditioner repair', matchType: 'BROAD', status: 'ENABLED', cpcBidMicros: '18000000', qualityScore: 7, adGroupId: '101', adGroupName: 'AC Repair', campaignId: '11111111', campaignName: 'HVAC Services - Search', resourceName: 'customers/1234567890/adGroupCriteria/101~1002' },
  { criterionId: '1003', keyword: 'hvac repair', matchType: 'EXACT', status: 'ENABLED', cpcBidMicros: '22000000', qualityScore: 9, adGroupId: '101', adGroupName: 'AC Repair', campaignId: '11111111', campaignName: 'HVAC Services - Search', resourceName: 'customers/1234567890/adGroupCriteria/101~1003' },
  { criterionId: '1021', keyword: 'ac installation cost', matchType: 'PHRASE', status: 'ENABLED', cpcBidMicros: '24000000', qualityScore: 7, adGroupId: '102', adGroupName: 'AC Installation', campaignId: '11111111', campaignName: 'HVAC Services - Search', resourceName: 'customers/1234567890/adGroupCriteria/102~1021' },
  { criterionId: '2011', keyword: '[brand name] hvac', matchType: 'EXACT', status: 'ENABLED', cpcBidMicros: '5000000', qualityScore: 10, adGroupId: '201', adGroupName: 'Brand Terms', campaignId: '22222222', campaignName: 'AC Repair - Brand', resourceName: 'customers/1234567890/adGroupCriteria/201~2011' },
];

export function mockFetchKeywords(adGroupId) {
  if (adGroupId) return MOCK_KEYWORDS.filter(k => k.adGroupId === adGroupId);
  return MOCK_KEYWORDS;
}

export function mockFetchAds(adGroupId) {
  const ads = [
    {
      id: '5001',
      name: null,
      type: 'RESPONSIVE_SEARCH_AD',
      headlines: [
        { text: 'Expert AC Repair Service', pinnedField: 'HEADLINE_1' },
        { text: 'Same-Day HVAC Repair' },
        { text: 'Licensed & Insured Technicians' },
        { text: 'Free Estimates Available' },
      ],
      descriptions: [
        { text: 'Fast, reliable AC repair by certified technicians. Call now for same-day service.' },
        { text: 'Trusted HVAC company with 20+ years experience. Financing available. Book online today.' },
      ],
      finalUrls: ['https://example.com/ac-repair'],
      status: 'ENABLED',
      adGroupId: '101',
      adGroupName: 'AC Repair',
      campaignId: '11111111',
      campaignName: 'HVAC Services - Search',
      resourceName: 'customers/1234567890/adGroupAds/101~5001',
    },
    {
      id: '5002',
      name: null,
      type: 'RESPONSIVE_SEARCH_AD',
      headlines: [
        { text: 'New AC Installation Experts', pinnedField: 'HEADLINE_1' },
        { text: 'Energy-Efficient Systems' },
        { text: 'Financing Options Available' },
      ],
      descriptions: [
        { text: 'Top-rated AC installation with competitive pricing. Get a free in-home estimate today.' },
        { text: 'Install a new energy-efficient system and save on utilities. Trusted by 5,000+ homeowners.' },
      ],
      finalUrls: ['https://example.com/ac-installation'],
      status: 'ENABLED',
      adGroupId: '102',
      adGroupName: 'AC Installation',
      campaignId: '11111111',
      campaignName: 'HVAC Services - Search',
      resourceName: 'customers/1234567890/adGroupAds/102~5002',
    },
  ];
  if (adGroupId) return ads.filter(a => a.adGroupId === adGroupId);
  return ads;
}

export function mockFetchKeywordMetrics() {
  return [
    { criterionId: '1001', keyword: 'ac repair near me', matchType: 'PHRASE', adGroupId: '101', campaignId: '11111111', impressions: 4820, clicks: 312, cost: 6182.40, conversions: 24, ctr: 0.0647, avgCpc: 19.81 },
    { criterionId: '1002', keyword: 'air conditioner repair', matchType: 'BROAD', adGroupId: '101', campaignId: '11111111', impressions: 3210, clicks: 198, cost: 3564.00, conversions: 15, ctr: 0.0617, avgCpc: 18.00 },
    { criterionId: '1003', keyword: 'hvac repair', matchType: 'EXACT', adGroupId: '101', campaignId: '11111111', impressions: 2840, clicks: 241, cost: 5302.00, conversions: 19, ctr: 0.0848, avgCpc: 22.00 },
    { criterionId: '1021', keyword: 'ac installation cost', matchType: 'PHRASE', adGroupId: '102', campaignId: '11111111', impressions: 1980, clicks: 142, cost: 3408.00, conversions: 12, ctr: 0.0717, avgCpc: 24.00 },
    { criterionId: '2011', keyword: '[brand name] hvac', matchType: 'EXACT', adGroupId: '201', campaignId: '22222222', impressions: 6840, clicks: 892, cost: 9640.00, conversions: 61, ctr: 0.1304, avgCpc: 10.81 },
  ];
}

export function mockFetchSearchTerms() {
  return [
    { searchTerm: 'ac repair near me', status: 'NONE', adGroupId: '101', campaignId: '11111111', impressions: 1240, clicks: 98, cost: 1940.40, conversions: 8 },
    { searchTerm: 'hvac company near me', status: 'NONE', adGroupId: '101', campaignId: '11111111', impressions: 880, clicks: 61, cost: 1208.60, conversions: 5 },
    { searchTerm: 'how much does hvac repair cost', status: 'NONE', adGroupId: '101', campaignId: '11111111', impressions: 640, clicks: 24, cost: 475.20, conversions: 1 },
    { searchTerm: 'ac not working', status: 'NONE', adGroupId: '101', campaignId: '11111111', impressions: 520, clicks: 18, cost: 356.40, conversions: 1 },
    { searchTerm: 'central air repair', status: 'NONE', adGroupId: '101', campaignId: '11111111', impressions: 410, clicks: 31, cost: 614.00, conversions: 2 },
  ];
}

// ─── Write no-ops ─────────────────────────────────────────────────

export function mockMutateResponse(operationType) {
  const id = Date.now();
  return {
    mutateOperationResponses: [{
      campaignBudgetResult: { resourceName: `customers/1234567890/campaignBudgets/${id}` },
      campaignResult: { resourceName: `customers/1234567890/campaigns/${id}` },
      adGroupResult: { resourceName: `customers/1234567890/adGroups/${id}` },
      adGroupCriterionResult: { resourceName: `customers/1234567890/adGroupCriteria/101~${id}` },
      adGroupAdResult: { resourceName: `customers/1234567890/adGroupAds/101~${id}` },
      campaignCriterionResult: { resourceName: `customers/1234567890/campaignCriteria/${id}` },
    }],
  };
}
