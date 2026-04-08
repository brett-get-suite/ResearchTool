// __tests__/analysis/ngram.test.js
import { extractNgrams, buildNgramTable } from '../../lib/analysis/ngram.js';

describe('extractNgrams', () => {
  it('extracts 1-grams', () => {
    expect(extractNgrams('ac repair near me', 1)).toEqual(['ac', 'repair', 'near', 'me']);
  });

  it('extracts 2-grams', () => {
    expect(extractNgrams('ac repair near me', 2)).toEqual(['ac repair', 'repair near', 'near me']);
  });

  it('extracts 3-grams', () => {
    expect(extractNgrams('ac repair near me', 3)).toEqual(['ac repair near', 'repair near me']);
  });

  it('strips punctuation', () => {
    expect(extractNgrams('ac repair, near me!', 1)).toEqual(['ac', 'repair', 'near', 'me']);
  });

  it('lowercases', () => {
    expect(extractNgrams('AC Repair', 1)).toEqual(['ac', 'repair']);
  });

  it('returns empty array for short text', () => {
    expect(extractNgrams('ac', 2)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(extractNgrams('', 1)).toEqual([]);
  });
});

describe('buildNgramTable', () => {
  const rows = [
    { searchTerm: 'ac repair near me', cost: 40, clicks: 5, conversions: 1 },
    { searchTerm: 'ac repair cost',    cost: 30, clicks: 4, conversions: 0 },
    { searchTerm: 'hvac repair',       cost: 20, clicks: 3, conversions: 1 },
    { searchTerm: 'free ac repair',    cost: 10, clicks: 2, conversions: 0 },
  ];

  it('aggregates cost across all search terms containing "repair"', () => {
    const { table } = buildNgramTable(rows);
    const repair = table.find(r => r.phrase === 'repair');
    expect(repair).toBeDefined();
    expect(repair.cost).toBeCloseTo(100, 1); // all 4 rows contain "repair"
  });

  it('flags zero-conversion phrases', () => {
    const { table } = buildNgramTable(rows);
    const freeTerm = table.find(r => r.phrase === 'free');
    expect(freeTerm).toBeDefined();
    expect(freeTerm.isZeroConv).toBe(true);
  });

  it('calculates pctOfSpend', () => {
    const { table, totalCost } = buildNgramTable(rows);
    expect(totalCost).toBeCloseTo(100, 1);
    const repair = table.find(r => r.phrase === 'repair');
    expect(repair.pctOfSpend).toBeCloseTo(100, 0); // repair appears in all rows
  });

  it('sorts table by cost descending', () => {
    const { table } = buildNgramTable(rows);
    for (let i = 1; i < table.length; i++) {
      expect(table[i - 1].cost).toBeGreaterThanOrEqual(table[i].cost);
    }
  });

  it('calculates CPA only when conversions > 0', () => {
    const { table } = buildNgramTable(rows);
    const hvac = table.find(r => r.phrase === 'hvac');
    expect(hvac.cpa).toBeCloseTo(20, 1); // $20 cost / 1 conv
    const free = table.find(r => r.phrase === 'free');
    expect(free.cpa).toBeNull();
  });

  it('returns totalCost and accountAvgCpa', () => {
    const { totalCost, accountAvgCpa } = buildNgramTable(rows);
    expect(totalCost).toBeCloseTo(100, 1);
    expect(accountAvgCpa).toBeCloseTo(50, 1); // $100 total / 2 total conversions
  });
});
