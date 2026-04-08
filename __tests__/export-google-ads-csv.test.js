import { buildGoogleAdsCsv, formatKeywordRow } from '../lib/export-google-ads-csv.js';

describe('formatKeywordRow', () => {
  test('formats keyword with broad match', () => {
    const row = formatKeywordRow({
      keyword: 'ac repair',
      match_type: 'Broad',
      avg_cpc: 12.50,
      campaign: 'HVAC Services',
      ad_group: 'AC Repair',
    });
    expect(row).toBe('HVAC Services,AC Repair,ac repair,Broad,12.50');
  });

  test('formats exact match with brackets', () => {
    const row = formatKeywordRow({
      keyword: 'emergency plumber',
      match_type: 'Exact',
      avg_cpc: 25.00,
      campaign: 'Plumbing',
      ad_group: 'Emergency',
    });
    expect(row).toBe('Plumbing,Emergency,[emergency plumber],Exact,25.00');
  });

  test('formats phrase match with quotes', () => {
    const row = formatKeywordRow({
      keyword: 'roof repair',
      match_type: 'Phrase',
      avg_cpc: 18.00,
      campaign: 'Roofing',
      ad_group: 'Repair',
    });
    expect(row).toBe('Roofing,Repair,"roof repair",Phrase,18.00');
  });

  test('defaults to Broad match when unspecified', () => {
    const row = formatKeywordRow({ keyword: 'hvac service', avg_cpc: 10 });
    expect(row).toContain(',Broad,');
  });
});

describe('buildGoogleAdsCsv', () => {
  test('builds CSV with header and rows', () => {
    const keywords = [
      { keyword: 'ac repair', intent: 'transactional', avg_cpc: 12.50 },
      { keyword: 'hvac tips', intent: 'informational', avg_cpc: 3.00 },
    ];
    const csv = buildGoogleAdsCsv(keywords, 'Test Campaign');
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Campaign,Ad Group,Keyword,Match Type,Max CPC');
    expect(lines.length).toBe(3); // header + 2 rows
    expect(lines[1]).toContain('ac repair');
    expect(lines[1]).toContain('Test Campaign');
  });

  test('groups keywords by intent into ad groups', () => {
    const keywords = [
      { keyword: 'ac repair cost', intent: 'transactional', avg_cpc: 12 },
      { keyword: 'what is hvac', intent: 'informational', avg_cpc: 3 },
    ];
    const csv = buildGoogleAdsCsv(keywords, 'HVAC');
    expect(csv).toContain('HVAC - Transactional');
    expect(csv).toContain('HVAC - Informational');
  });

  test('returns empty CSV for no keywords', () => {
    const csv = buildGoogleAdsCsv([], 'Empty');
    const lines = csv.split('\n').filter(Boolean);
    expect(lines.length).toBe(1); // header only
  });
});
