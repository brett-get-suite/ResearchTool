// __tests__/analysis/campaigns.test.js
import { analyzeCampaigns } from '../../lib/analysis/campaigns.js';

const makeCampaign = (overrides = {}) => ({
  campaign: 'HVAC Search', campaignType: 'search', status: 'enabled',
  budget: 50, impressions: 3000, clicks: 150, cost: 400,
  conversions: 8, conversionValue: 1200, roas: 3.0, cpa: 50,
  ...overrides,
});

describe('analyzeCampaigns', () => {
  it('ranks campaigns by CPA ascending in lead gen mode', () => {
    const campaigns = [
      makeCampaign({ campaign: 'C1', cost: 300, conversions: 6, cpa: 50 }),
      makeCampaign({ campaign: 'C2', cost: 400, conversions: 4, cpa: 100 }),
      makeCampaign({ campaign: 'C3', cost: 200, conversions: 8, cpa: 25 }),
    ];
    const { rankedCampaigns } = analyzeCampaigns(campaigns, { mode: 'lead_gen' });
    expect(rankedCampaigns[0].campaign).toBe('C3'); // lowest CPA first
    expect(rankedCampaigns[1].campaign).toBe('C1');
    expect(rankedCampaigns[2].campaign).toBe('C2');
  });

  it('ranks campaigns by ROAS descending in ecommerce mode', () => {
    const campaigns = [
      makeCampaign({ campaign: 'C1', roas: 2.0 }),
      makeCampaign({ campaign: 'C2', roas: 5.0 }),
      makeCampaign({ campaign: 'C3', roas: 3.5 }),
    ];
    const { rankedCampaigns } = analyzeCampaigns(campaigns, { mode: 'ecommerce' });
    expect(rankedCampaigns[0].campaign).toBe('C2'); // highest ROAS first
  });

  it('identifies ready-to-scale campaigns (below avg CPA in lead gen)', () => {
    const campaigns = [
      makeCampaign({ campaign: 'Winner', cost: 100, conversions: 5, cpa: 20 }),  // CPA 20
      makeCampaign({ campaign: 'Loser',  cost: 300, conversions: 2, cpa: 150 }), // CPA 150
    ];
    // avgCpa = (100+300)/(5+2) = 57
    const { readyToScale } = analyzeCampaigns(campaigns, { mode: 'lead_gen' });
    expect(readyToScale).toHaveLength(1);
    expect(readyToScale[0].campaign).toBe('Winner');
  });

  it('identifies underperformers (zero conversions with cost > 0 in lead gen)', () => {
    const campaigns = [
      makeCampaign({ campaign: 'Good', conversions: 5 }),
      makeCampaign({ campaign: 'Dead', conversions: 0, cost: 200 }),
    ];
    const { underperformers } = analyzeCampaigns(campaigns, { mode: 'lead_gen' });
    expect(underperformers.some(c => c.campaign === 'Dead')).toBe(true);
  });

  it('returns correct totalSpend and avgCpa', () => {
    const campaigns = [
      makeCampaign({ cost: 200, conversions: 4 }),
      makeCampaign({ cost: 300, conversions: 6 }),
    ];
    const { totalSpend, avgCpa } = analyzeCampaigns(campaigns, { mode: 'lead_gen' });
    expect(totalSpend).toBe(500);
    expect(avgCpa).toBe(50); // 500 / 10
  });

  it('returns avgRoas for ecommerce mode', () => {
    const campaigns = [
      makeCampaign({ cost: 100, conversionValue: 400 }), // roas 4
      makeCampaign({ cost: 100, conversionValue: 200 }), // roas 2
    ];
    const { avgRoas } = analyzeCampaigns(campaigns, { mode: 'ecommerce' });
    expect(avgRoas).toBe(3); // 600/200
  });
});
