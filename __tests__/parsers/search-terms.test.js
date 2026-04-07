// __tests__/parsers/search-terms.test.js
import { parseSearchTermsReport } from '../../lib/parsers/search-terms.js';

const makeRow = (overrides = {}) => ({
  'Campaign': 'HVAC - Search',
  'Ad group': 'AC Repair',
  'Search term': 'emergency ac repair',
  'Match type': 'Broad match',
  'Impressions': '120',
  'Clicks': '8',
  'Cost': '24.40',
  'Conversions': '0',
  'Conv. value': '0',
  ...overrides,
});

describe('parseSearchTermsReport', () => {
  it('normalizes a standard search terms row', () => {
    const result = parseSearchTermsReport([makeRow()]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      searchTerm: 'emergency ac repair',
      matchType: 'broad match',
      campaign: 'HVAC - Search',
      adGroup: 'AC Repair',
      impressions: 120,
      clicks: 8,
      cost: 24.40,
      conversions: 0,
      conversionValue: 0,
    });
  });

  it('strips summary rows', () => {
    const totalRow = makeRow({ 'Search term': 'Total: account' });
    expect(parseSearchTermsReport([totalRow])).toHaveLength(0);
  });

  it('strips rows where search term is empty', () => {
    expect(parseSearchTermsReport([makeRow({ 'Search term': '' })])).toHaveLength(0);
  });

  it('handles "Search Term" (capital T) as alternate header', () => {
    const row = { ...makeRow() };
    row['Search Term'] = row['Search term'];
    delete row['Search term'];
    expect(parseSearchTermsReport([row])[0].searchTerm).toBe('emergency ac repair');
  });
});
