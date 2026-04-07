// __tests__/parsers/normalize.test.js
import { parseNum, parsePct, normalizeHeader, findHeaderRow } from '../../lib/parsers/normalize';

describe('parseNum', () => {
  it('parses plain number strings', () => expect(parseNum('1234')).toBe(1234));
  it('parses decimal strings', () => expect(parseNum('67.89')).toBe(67.89));
  it('strips dollar signs and commas', () => expect(parseNum('$1,234.56')).toBe(1234.56));
  it('returns 0 for empty string', () => expect(parseNum('')).toBe(0));
  it('returns 0 for "--"', () => expect(parseNum('--')).toBe(0));
  it('returns null for truly missing (undefined)', () => expect(parseNum(undefined)).toBeNull());
});

describe('parsePct', () => {
  it('strips % and returns float', () => expect(parsePct('5.11%')).toBeCloseTo(5.11));
  it('handles plain number', () => expect(parsePct('5.11')).toBeCloseTo(5.11));
  it('returns 0 for "--"', () => expect(parsePct('--')).toBe(0));
});

describe('normalizeHeader', () => {
  it('lowercases and trims', () => expect(normalizeHeader('  Campaign  ')).toBe('campaign'));
  it('strips punctuation from common headers', () => expect(normalizeHeader('Avg. CPC')).toBe('avg cpc'));
  it('normalizes "Conv. value" to "conv value"', () => expect(normalizeHeader('Conv. value')).toBe('conv value'));
});

describe('findHeaderRow', () => {
  it('returns index of row containing known column keywords', () => {
    const allRows = [
      ['Google Ads Campaign Statistics'],
      ['Jan 1, 2024 - Jan 31, 2024'],
      ['Campaign', 'Ad group', 'Keyword', 'Match type', 'Clicks', 'Impressions', 'Cost'],
      ['HVAC', 'AC Repair', 'ac repair', 'Phrase', '23', '450', '67.89'],
    ];
    expect(findHeaderRow(allRows, ['campaign', 'clicks', 'cost'])).toBe(2);
  });

  it('returns 0 if first row already looks like headers', () => {
    const allRows = [
      ['Campaign', 'Clicks', 'Cost'],
      ['HVAC', '23', '67.89'],
    ];
    expect(findHeaderRow(allRows, ['campaign', 'clicks'])).toBe(0);
  });

  it('returns -1 if no matching row found', () => {
    const allRows = [['foo', 'bar'], ['baz', 'qux']];
    expect(findHeaderRow(allRows, ['campaign', 'keyword'])).toBe(-1);
  });
});
