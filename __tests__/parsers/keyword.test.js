// __tests__/parsers/keyword.test.js
import { parseKeywordReport } from '../../lib/parsers/keyword.js';

const makeRow = (overrides = {}) => ({
  'Campaign': 'HVAC - Search',
  'Ad group': 'AC Repair',
  'Keyword': 'ac repair near me',
  'Match type': 'Phrase',
  'Impressions': '450',
  'Clicks': '23',
  'Cost': '67.89',
  'Conversions': '3',
  'Conv. value': '450.00',
  'CTR': '5.11%',
  'Avg. CPC': '2.95',
  'Quality Score': '8',
  ...overrides,
});

describe('parseKeywordReport', () => {
  it('normalizes a standard keyword report row', () => {
    const result = parseKeywordReport([makeRow()]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      keyword: 'ac repair near me',
      matchType: 'phrase',
      campaign: 'HVAC - Search',
      adGroup: 'AC Repair',
      impressions: 450,
      clicks: 23,
      cost: 67.89,
      conversions: 3,
      conversionValue: 450.00,
      ctr: 5.11,
      avgCpc: 2.95,
      qualityScore: 8,
    });
  });

  it('strips total/summary rows', () => {
    const totalRow = makeRow({ 'Campaign': 'Total: account', 'Keyword': 'Total: account' });
    expect(parseKeywordReport([totalRow])).toHaveLength(0);
  });

  it('strips rows where keyword is empty', () => {
    const emptyKeyword = makeRow({ 'Keyword': '' });
    expect(parseKeywordReport([emptyKeyword])).toHaveLength(0);
  });

  it('handles missing Quality Score gracefully', () => {
    const row = makeRow();
    delete row['Quality Score'];
    const result = parseKeywordReport([row]);
    expect(result[0].qualityScore).toBeNull();
  });

  it('handles missing Conv. value gracefully', () => {
    const row = makeRow({ 'Conv. value': '--' });
    const result = parseKeywordReport([row]);
    expect(result[0].conversionValue).toBe(0);
  });

  it('normalizes match type to lowercase', () => {
    expect(parseKeywordReport([makeRow({ 'Match type': 'EXACT' })])[0].matchType).toBe('exact');
    expect(parseKeywordReport([makeRow({ 'Match type': 'Broad match' })])[0].matchType).toBe('broad match');
  });

  it('handles alternate column name "All conv." for conversions', () => {
    const row = { ...makeRow(), 'All conv.': '5' };
    delete row['Conversions'];
    const result = parseKeywordReport([row]);
    expect(result[0].conversions).toBe(5);
  });
});
