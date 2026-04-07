// lib/parsers/normalize.js

/**
 * Parse a value that should be a number.
 * Returns null only for undefined/missing. Returns 0 for "--", "", or unparseable.
 */
export function parseNum(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (s === '' || s === '--' || s === '-') return 0;
  const cleaned = s.replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Parse a percentage string like "5.11%" → 5.11.
 */
export function parsePct(val) {
  if (val === undefined || val === null) return 0;
  const s = String(val).trim();
  if (s === '' || s === '--') return 0;
  return parseFloat(s.replace('%', '')) || 0;
}

/**
 * Normalize a column header: lowercase, trim, strip trailing punctuation like periods.
 */
export function normalizeHeader(h) {
  return String(h)
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Given all rows as arrays (before headers are parsed), find the index of the
 * row that looks like the actual data header (contains the required keywords).
 * Returns -1 if not found.
 *
 * @param {string[][]} allRows - Array of arrays from raw Papa.parse with header:false
 * @param {string[]} requiredKeywords - Normalized keywords that must appear (e.g. ['campaign','clicks'])
 */
export function findHeaderRow(allRows, requiredKeywords) {
  for (let i = 0; i < allRows.length; i++) {
    const normalized = allRows[i].map(normalizeHeader);
    const hasAll = requiredKeywords.every(k => normalized.some(h => h.includes(k)));
    if (hasAll) return i;
  }
  return -1;
}
