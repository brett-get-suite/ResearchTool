'use client';

import { useState, useRef, useEffect } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import TrendSparkline from './TrendSparkline';

const INTENT_VARIANTS = {
  transactional: 'active',
  informational: 'running',
  navigational: 'pitching',
  commercial: 'management',
};

const COMPETITION_COLORS = {
  low: 'bg-secondary',
  medium: 'bg-primary',
  high: 'bg-error/70',
  critical: 'bg-error',
};

const COLUMNS = [
  { key: 'keyword', label: 'Keyword String' },
  { key: 'intent', label: 'Intent' },
  { key: 'monthly_searches', label: 'Monthly Searches' },
  { key: 'avg_cpc', label: 'CPC Estimate' },
  { key: 'competition', label: 'Competition Level' },
  { key: 'trend', label: 'Trend' },
  { key: 'actions', label: '' },
];

const INTENT_FILTERS = ['all', 'transactional', 'informational', 'navigational', 'commercial'];

export default function PriorityMatrix({ keywords, onAction }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [intentFilter, setIntentFilter] = useState('all');
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);
  const perPage = 10;

  // Close action menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSort(col) {
    if (col === 'trend' || col === 'actions') return;
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
    setPage(0);
  }

  // Filter by intent
  const filtered = intentFilter === 'all'
    ? keywords
    : keywords.filter(kw => (kw.intent || '').toLowerCase() === intentFilter);

  // Sort
  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        const av = a[sortCol] ?? a.volume ?? 0;
        const bv = b[sortCol] ?? b.volume ?? 0;
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : filtered;

  const paged = sorted.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(sorted.length / perPage);

  function handleAction(action, kw) {
    setOpenMenu(null);
    if (onAction) onAction(action, kw);
  }

  return (
    <div className="bg-surface-container rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-on-surface">Keyword Priority Matrix</h3>
          <span className="text-xs text-on-surface-variant">
            Showing {paged.length} of {sorted.length} results
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Intent filter pills */}
          {INTENT_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => { setIntentFilter(f); setPage(0); }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide transition-colors ${
                intentFilter === f
                  ? 'bg-primary/15 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-outline-variant/10">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`text-left px-6 py-3 text-label-sm text-on-surface-variant select-none ${
                  col.key !== 'trend' && col.key !== 'actions' ? 'cursor-pointer hover:text-on-surface' : ''
                }`}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {sortCol === col.key && (
                    <span className="material-symbols-outlined text-xs">
                      {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paged.map((kw, i) => {
            const competition = (kw.competition || 'medium').toLowerCase();
            const competitionPct = { low: 25, medium: 50, high: 75, critical: 95 }[competition] || 50;
            const isGoogle = kw.data_source === 'google';
            const globalIdx = page * perPage + i;

            return (
              <tr
                key={globalIdx}
                className="border-b border-outline-variant/5 hover:bg-surface-container-high transition-colors"
              >
                {/* Keyword */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-on-surface">
                      {kw.keyword || kw.cluster}
                    </span>
                    {isGoogle && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold uppercase tracking-wide">
                        Google Data
                      </span>
                    )}
                    {kw.weather_boost && (
                      <span className="material-symbols-outlined text-secondary text-sm" title={kw.weather_boost.reason}>
                        thunderstorm
                      </span>
                    )}
                  </div>
                </td>

                {/* Intent */}
                <td className="px-6 py-4">
                  <StatusBadge
                    status={INTENT_VARIANTS[(kw.intent || '').toLowerCase()] || 'default'}
                    label={kw.intent}
                  />
                </td>

                {/* Monthly Searches */}
                <td className="px-6 py-4 text-sm text-on-surface">
                  {(kw.monthly_searches || kw.volume || 0).toLocaleString()}
                </td>

                {/* CPC */}
                <td className="px-6 py-4 text-sm text-on-surface font-semibold">
                  ${(kw.avg_cpc || kw.cpc || 0).toFixed(2)}
                </td>

                {/* Competition */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 rounded-full bg-surface-container-high overflow-hidden">
                      <div
                        className={`h-full rounded-full ${COMPETITION_COLORS[competition] || 'bg-primary'}`}
                        style={{ width: `${competitionPct}%` }}
                      />
                    </div>
                    <span className="text-label-sm text-on-surface-variant capitalize">{competition}</span>
                  </div>
                </td>

                {/* Trend Sparkline */}
                <td className="px-6 py-4">
                  {kw.trend_multipliers ? (
                    <TrendSparkline multipliers={kw.trend_multipliers} />
                  ) : (
                    <span className="text-label-sm text-on-surface-variant">—</span>
                  )}
                </td>

                {/* Actions dropdown */}
                <td className="px-6 py-4 relative" ref={openMenu === globalIdx ? menuRef : null}>
                  <button
                    onClick={() => setOpenMenu(openMenu === globalIdx ? null : globalIdx)}
                    className="p-1 rounded-lg hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant text-lg">more_vert</span>
                  </button>
                  {openMenu === globalIdx && (
                    <div className="absolute right-6 top-10 z-10 bg-surface-container-high rounded-xl shadow-lg py-1 min-w-[180px]">
                      <button
                        onClick={() => handleAction('add_to_campaign', kw)}
                        className="w-full text-left px-4 py-2.5 text-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-base">add_circle</span>
                        Add to Campaign
                      </button>
                      <button
                        onClick={() => handleAction('mark_negative', kw)}
                        className="w-full text-left px-4 py-2.5 text-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-base">block</span>
                        Mark as Negative
                      </button>
                      <button
                        onClick={() => handleAction('view_trend', kw)}
                        className="w-full text-left px-4 py-2.5 text-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-base">trending_up</span>
                        View Trend Detail
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 flex items-center justify-center gap-1">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="w-8 h-8 rounded-lg text-xs font-medium transition-colors text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
            // Show pages around current page for large page counts
            let pageIdx = i;
            if (totalPages > 10) {
              const start = Math.min(Math.max(page - 4, 0), totalPages - 10);
              pageIdx = start + i;
            }
            return (
              <button
                key={pageIdx}
                onClick={() => setPage(pageIdx)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  page === pageIdx
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {pageIdx + 1}
              </button>
            );
          })}
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
            className="w-8 h-8 rounded-lg text-xs font-medium transition-colors text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}
