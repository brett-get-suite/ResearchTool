// __tests__/parsers/product.test.js
import { parseProductReport } from '../../lib/parsers/product';

const makeRow = (overrides = {}) => ({
  'Product title': 'Carrier 24ACC636A003 3-Ton AC',
  'Item ID': 'sku-1234',
  'Product type (1st level)': 'HVAC > Central Air',
  'Brand': 'Carrier',
  'Custom label 0': 'seasonal-promo',
  'Impressions': '800',
  'Clicks': '45',
  'Cost': '135.90',
  'Conversions': '4',
  'Conv. value': '3200.00',
  ...overrides,
});

describe('parseProductReport', () => {
  it('normalizes a standard product row', () => {
    const result = parseProductReport([makeRow()]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      productTitle: 'Carrier 24ACC636A003 3-Ton AC',
      productId: 'sku-1234',
      category: 'HVAC > Central Air',
      brand: 'Carrier',
      customLabel: 'seasonal-promo',
      impressions: 800,
      clicks: 45,
      cost: 135.90,
      conversions: 4,
      conversionValue: 3200.00,
    });
  });

  it('calculates roas from conversionValue / cost', () => {
    const result = parseProductReport([makeRow()]);
    expect(result[0].roas).toBeCloseTo(3200 / 135.90, 1);
  });

  it('returns roas 0 when cost is 0', () => {
    const result = parseProductReport([makeRow({ 'Cost': '0', 'Conv. value': '0' })]);
    expect(result[0].roas).toBe(0);
  });

  it('strips summary rows', () => {
    const totalRow = makeRow({ 'Product title': 'Total: account' });
    expect(parseProductReport([totalRow])).toHaveLength(0);
  });

  it('handles missing category gracefully', () => {
    const row = makeRow();
    delete row['Product type (1st level)'];
    const result = parseProductReport([row]);
    expect(result[0].category).toBe('');
  });
});
