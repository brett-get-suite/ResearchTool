// __tests__/analysis/keywords.test.js
import { analyzeKeywords } from '../../lib/analysis/keywords.js';

const makeKeyword = (overrides = {}) => ({
  keyword: 'ac repair', matchType: 'phrase', campaign: 'HVAC', adGroup: 'AC',
  clicks: 10, cost: 50, conversions: 2, conversionValue: 300, ctr: 5, avgCpc: 5, qualityScore: 7,
  ...overrides,
});

const makeTerm = (overrides = {}) => ({
  searchTerm: 'ac repair near me', campaign: 'HVAC', adGroup: 'AC', matchType: 'phrase',
  clicks: 5, cost: 25, conversions: 1, conversionValue: 150,
  ...overrides,
});

describe('analyzeKeywords', () => {
  it('identifies zero-conversion keywords', () => {
    const kws = [makeKeyword(), makeKeyword({ keyword: 'diy ac fix', cost: 30, conversions: 0 })];
    const { zeroConvKeywords } = analyzeKeywords(kws, []);
    expect(zeroConvKeywords).toHaveLength(1);
    expect(zeroConvKeywords[0].keyword).toBe('diy ac fix');
  });

  it('excludes zero-cost keywords from zero-conv list', () => {
    const kws = [makeKeyword({ cost: 0, conversions: 0 })];
    const { zeroConvKeywords } = analyzeKeywords(kws, []);
    expect(zeroConvKeywords).toHaveLength(0);
  });

  it('calculates totalWastedOnKeywords', () => {
    const kws = [
      makeKeyword({ cost: 50, conversions: 2 }),
      makeKeyword({ keyword: 'free repair', cost: 30, conversions: 0 }),
    ];
    const { totalWastedOnKeywords } = analyzeKeywords(kws, []);
    expect(totalWastedOnKeywords).toBe(30);
  });

  it('calculates totalWastedOnTerms from search terms', () => {
    const terms = [
      makeTerm({ cost: 25, conversions: 1 }),
      makeTerm({ searchTerm: 'how to fix ac', cost: 15, conversions: 0 }),
    ];
    const { totalWastedOnTerms } = analyzeKeywords([], terms);
    expect(totalWastedOnTerms).toBe(15);
  });

  it('returns topSpenders sorted by cost descending', () => {
    const kws = [
      makeKeyword({ keyword: 'cheap', cost: 10 }),
      makeKeyword({ keyword: 'expensive', cost: 200 }),
      makeKeyword({ keyword: 'medium', cost: 50 }),
    ];
    const { topSpenders } = analyzeKeywords(kws, []);
    expect(topSpenders[0].keyword).toBe('expensive');
    expect(topSpenders[1].keyword).toBe('medium');
  });

  it('flags high-cost zero-conv terms as negative gaps', () => {
    const terms = [
      makeTerm({ searchTerm: 'normal term', cost: 10, conversions: 1 }),
      makeTerm({ searchTerm: 'diy repair', cost: 100, conversions: 0 }), // 10x avg → gap
    ];
    const { negativeGaps } = analyzeKeywords([], terms);
    expect(negativeGaps.some(g => g.term === 'diy repair')).toBe(true);
  });
});
