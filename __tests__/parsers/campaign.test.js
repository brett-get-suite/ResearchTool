// __tests__/parsers/campaign.test.js
import { parseCampaignReport } from '../../lib/parsers/campaign';

const makeRow = (overrides = {}) => ({
  'Campaign': 'HVAC - Search',
  'Campaign type': 'Search',
  'Campaign status': 'Enabled',
  'Budget': '50.00',
  'Impressions': '3200',
  'Clicks': '180',
  'Cost': '410.50',
  'Conversions': '12',
  'Conv. value': '1800.00',
  'Cost / conv.': '34.21',
  ...overrides,
});

describe('parseCampaignReport', () => {
  it('normalizes a standard campaign row', () => {
    const result = parseCampaignReport([makeRow()]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      campaign: 'HVAC - Search',
      campaignType: 'search',
      status: 'enabled',
      budget: 50.00,
      impressions: 3200,
      clicks: 180,
      cost: 410.50,
      conversions: 12,
      conversionValue: 1800.00,
      cpa: 34.21,
    });
  });

  it('calculates ROAS when conv value and cost are present', () => {
    const result = parseCampaignReport([makeRow()]);
    expect(result[0].roas).toBeCloseTo(1800 / 410.50, 2);
  });

  it('returns roas of 0 when cost is 0', () => {
    const result = parseCampaignReport([makeRow({ 'Cost': '0', 'Conv. value': '0' })]);
    expect(result[0].roas).toBe(0);
  });

  it('strips summary rows', () => {
    const totalRow = makeRow({ 'Campaign': 'Total: account' });
    expect(parseCampaignReport([totalRow])).toHaveLength(0);
  });

  it('handles "ROAS" column if present directly', () => {
    const row = makeRow({ 'ROAS': '4.38' });
    const result = parseCampaignReport([row]);
    expect(result[0].roas).toBeCloseTo(4.38, 1);
  });
});
