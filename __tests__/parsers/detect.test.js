// __tests__/parsers/detect.test.js
import { detectReportType } from '../../lib/parsers/index';

describe('detectReportType', () => {
  it('detects keyword report by "keyword" and "match type" headers', () => {
    const headers = ['Campaign', 'Ad group', 'Keyword', 'Match type', 'Clicks', 'Cost', 'Impressions', 'Conversions'];
    expect(detectReportType(headers)).toBe('keyword');
  });

  it('detects search terms report by "search term" header', () => {
    const headers = ['Campaign', 'Ad group', 'Search term', 'Match type', 'Clicks', 'Cost', 'Conversions'];
    expect(detectReportType(headers)).toBe('search_terms');
  });

  it('detects campaign report by "campaign" without keyword/search term/product headers', () => {
    const headers = ['Campaign', 'Campaign type', 'Campaign status', 'Budget', 'Clicks', 'Cost', 'Conversions'];
    expect(detectReportType(headers)).toBe('campaign');
  });

  it('detects product report by "product title" header', () => {
    const headers = ['Product title', 'Item ID', 'Category', 'Clicks', 'Cost', 'Conv value'];
    expect(detectReportType(headers)).toBe('product');
  });

  it('returns null for unrecognized headers', () => {
    const headers = ['foo', 'bar', 'baz'];
    expect(detectReportType(headers)).toBeNull();
  });
});
