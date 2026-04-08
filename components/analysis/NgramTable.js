// components/analysis/NgramTable.js
'use client';

import { useState, useMemo } from 'react';

const N_FILTERS = [
  { label: 'All', value: 0 },
  { label: '1-word', value: 1 },
  { label: '2-word', value: 2 },
  { label: '3-word', value: 3 },
];

const SORT_COLS = ['cost', 'conversions', 'cpa', 'pctOfSpend'];

export default function NgramTable({ table = [], accountAvgCpa, mode = 'lead_gen', onRowClick }) {
  const [nFilter, setNFilter] = useState(0);
  const [sortCol, setSortCol] = useState('cost');
  const [sortAsc, setSortAsc] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    let rows = nFilter === 0 ? table : table.filter(r => r.n === nFilter);
    rows = [...rows].sort((a, b) => {
      const av = a[sortCol] ?? -1;
      const bv = b[sortCol] ?? -1;
      return sortAsc ? av - bv : bv - av;
    });
    return showAll ? rows : rows.slice(0, 50);
  }, [table, nFilter, sortCol, sortAsc, showAll]);

  const totalRows = nFilter === 0 ? table.length : table.filter(r => r.n === nFilter).length;

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(p => !p);
    else { setSortCol(col); setSortAsc(false); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <span className="text-on-surface-variant/40 ml-0.5">↕</span>;
    return <span className="text-primary ml-0.5">{sortAsc ? '↑' : '↓'}</span>;
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-2 mb-3">
        {N_FILTERS.map(f => (
          <button key={f.value} onClick={() => setNFilter(f.value)}
            className={`text-xs font-label font-semibold px-3 py-1.5 rounded-xl transition-colors ${
              nFilter === f.value ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
            }`}>
            {f.label}
          </button>
        ))}
        <span className="text-xs text-on-surface-variant font-label ml-auto">{totalRows.toLocaleString()} phrases</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline-variant/15">
        <table className="w-full text-xs font-label">
          <thead>
            <tr className="border-b border-outline-variant/15 text-left">
              <th className="px-3 py-2.5 text-label-sm text-on-surface-variant w-8">n</th>
              <th className="px-3 py-2.5 text-label-sm text-on-surface-variant">Phrase</th>
              {['cost', 'conversions', 'cpa', 'pctOfSpend'].map(col => (
                <th key={col} onClick={() => handleSort(col)}
                  className="px-3 py-2.5 text-label-sm text-on-surface-variant cursor-pointer hover:text-on-surface text-right whitespace-nowrap">
                  {col === 'pctOfSpend' ? '% spend' : col === 'cpa' ? (mode === 'ecommerce' ? 'ROAS' : 'CPA') : col}
                  <SortIcon col={col} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={`${row.phrase}-${i}`}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-outline-variant/5 transition-colors cursor-pointer hover:bg-surface-container-high ${
                  row.isZeroConv ? 'bg-error/5' : row.isAboveAvgCpa ? 'bg-tertiary/5' : ''
                }`}>
                <td className="px-3 py-2 text-on-surface-variant">{row.n}</td>
                <td className="px-3 py-2 text-on-surface font-medium">
                  {row.phrase}
                  {row.isZeroConv && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-error/15 text-error font-bold">ZERO CONV</span>
                  )}
                  {!row.isZeroConv && row.isAboveAvgCpa && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-tertiary/15 text-tertiary font-bold">HIGH COST</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-on-surface">${row.cost.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-on-surface">{row.conversions}</td>
                <td className="px-3 py-2 text-right text-on-surface">{row.cpa !== null ? `$${row.cpa}` : '—'}</td>
                <td className="px-3 py-2 text-right text-on-surface-variant">{row.pctOfSpend}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!showAll && totalRows > 50 && (
        <button onClick={() => setShowAll(true)}
          className="mt-2 text-xs font-label text-on-surface-variant hover:text-primary">
          Show all {totalRows.toLocaleString()} phrases →
        </button>
      )}
    </div>
  );
}
