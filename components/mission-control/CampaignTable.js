'use client';

import { useState, useMemo, Fragment } from 'react';
import { formatCurrency, formatPercent, formatNumber, computeHealthScore } from '@/lib/dashboard-utils';

const HEALTH_COLORS = { healthy: 'bg-secondary', warning: 'bg-amber-400', critical: 'bg-error' };

function HealthDot({ status }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${HEALTH_COLORS[status] || 'bg-on-surface-variant/30'}`}
      title={status}
    />
  );
}

export default function CampaignTable({ campaigns = [], selectedAccount }) {
  const [sortCol, setSortCol] = useState('cost');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedRow, setExpandedRow] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  function handleSort(col) {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  const filtered = useMemo(() => {
    let result = [...campaigns];

    if (statusFilter !== 'all') {
      result = result.filter(c => (c.status || '').toLowerCase() === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.client_name || '').toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      let aVal = a[sortCol];
      let bVal = b[sortCol];
      // Derived columns
      if (sortCol === 'cost_per_conv') {
        aVal = a.conversions > 0 ? a.cost / a.conversions : Infinity;
        bVal = b.conversions > 0 ? b.cost / b.conversions : Infinity;
      }
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [campaigns, sortCol, sortDir, statusFilter, searchQuery]);

  // Column definitions
  const cols = [
    { key: '_health', label: '', nosort: true, w: 'w-8' },
    ...(!selectedAccount ? [{ key: 'client_name', label: 'Client', w: 'min-w-[110px]' }] : []),
    { key: 'name', label: 'Campaign', w: 'min-w-[170px]' },
    { key: 'status', label: 'Status', w: 'w-24' },
    { key: 'budget', label: 'Daily Budget', w: 'w-28' },
    { key: 'cost', label: 'Spend', w: 'w-28' },
    { key: 'conversions', label: 'Conv.', w: 'w-20' },
    { key: 'cost_per_conv', label: 'Cost/Conv', w: 'w-28' },
    { key: 'ctr', label: 'CTR', w: 'w-20' },
    { key: 'search_impression_share', label: 'Search IS', w: 'w-24' },
    { key: 'top_impression_rate', label: 'Top IS', w: 'w-20' },
    { key: 'absolute_top_impression_rate', label: 'Abs Top IS', w: 'w-24' },
  ];

  // Summary counts
  const healthCounts = useMemo(() => {
    const counts = { healthy: 0, warning: 0, critical: 0 };
    for (const c of filtered) counts[computeHealthScore(c)]++;
    return counts;
  }, [filtered]);

  return (
    <div className="bg-surface-container rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">campaign</span>
            Campaign Performance
          </h3>
          <span className="text-xs text-on-surface-variant">({filtered.length})</span>
          <div className="flex items-center gap-2 ml-2">
            <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-secondary" />{healthCounts.healthy}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-amber-400" />{healthCounts.warning}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-error" />{healthCounts.critical}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined text-on-surface-variant text-sm absolute left-2.5 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-surface-container-high border-outline-variant/20 w-44"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs py-1.5 px-2 rounded-lg bg-surface-container-high border-outline-variant/20"
          >
            <option value="all">All Status</option>
            <option value="enabled">Enabled</option>
            <option value="paused">Paused</option>
            <option value="removed">Removed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant/10">
              {cols.map(col => (
                <th
                  key={col.key}
                  onClick={() => !col.nosort && handleSort(col.key)}
                  className={`text-left px-4 py-3 text-label-sm text-on-surface-variant whitespace-nowrap ${col.w || ''} ${
                    !col.nosort ? 'cursor-pointer hover:text-on-surface select-none' : ''
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortCol === col.key && (
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                        {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={cols.length} className="px-4 py-12 text-center">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/20 block mb-2">campaign</span>
                  <p className="text-sm text-on-surface-variant">No campaigns found</p>
                  <p className="text-xs text-on-surface-variant/60 mt-1">Connect a Google Ads account to see campaign data here</p>
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => {
                const key = c.id || `${c.client_id}-${i}`;
                const health = computeHealthScore(c);
                const isExpanded = expandedRow === key;
                const costPerConv = c.conversions > 0 ? c.cost / c.conversions : null;

                const statusBadge = (() => {
                  const s = (c.status || '').toUpperCase();
                  if (s === 'ENABLED') return 'bg-secondary/10 text-secondary';
                  if (s === 'PAUSED') return 'bg-amber-400/10 text-amber-400';
                  return 'bg-surface-container-highest text-on-surface-variant';
                })();

                return (
                  <Fragment key={key}>
                    <tr
                      onClick={() => setExpandedRow(isExpanded ? null : key)}
                      className={`border-b border-outline-variant/5 transition-colors cursor-pointer hover:bg-surface-container-high ${
                        isExpanded ? 'bg-surface-container-high/50' : ''
                      }`}
                    >
                      <td className="px-4 py-3"><HealthDot status={health} /></td>
                      {!selectedAccount && (
                        <td className="px-4 py-3 text-xs text-on-surface-variant font-medium truncate max-w-[120px]">
                          {c.client_name}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-on-surface-variant/30 text-sm">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                          <span className="text-sm text-on-surface font-medium truncate max-w-[200px]">
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusBadge}`}>
                          {(c.status || 'unknown').toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-on-surface tabular-nums">{formatCurrency(c.budget)}</td>
                      <td className="px-4 py-3 text-sm text-on-surface font-medium tabular-nums">{formatCurrency(c.cost)}</td>
                      <td className="px-4 py-3 text-sm text-on-surface tabular-nums">{formatNumber(c.conversions)}</td>
                      <td className="px-4 py-3 text-sm text-on-surface tabular-nums">
                        {costPerConv != null ? formatCurrency(costPerConv) : <span className="text-on-surface-variant">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-on-surface tabular-nums">
                        {c.ctr != null ? formatPercent(c.ctr * 100) : <span className="text-on-surface-variant">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-on-surface tabular-nums">
                        {c.search_impression_share != null
                          ? formatPercent(c.search_impression_share * 100)
                          : <span className="text-on-surface-variant">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-on-surface tabular-nums">
                        {c.top_impression_rate != null
                          ? formatPercent(c.top_impression_rate * 100)
                          : <span className="text-on-surface-variant">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-on-surface tabular-nums">
                        {c.absolute_top_impression_rate != null
                          ? formatPercent(c.absolute_top_impression_rate * 100)
                          : <span className="text-on-surface-variant">&mdash;</span>}
                      </td>
                    </tr>

                    {/* Expanded keywords row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={cols.length} className="bg-surface-container-low px-8 py-4">
                          {c.keywords && c.keywords.length > 0 ? (
                            <>
                              <div className="text-label-sm text-on-surface-variant mb-3">Top Keywords</div>
                              <div className="space-y-1">
                                {c.keywords.slice(0, 10).map((kw, ki) => (
                                  <div
                                    key={ki}
                                    className="flex items-center justify-between py-1.5 text-xs border-b border-outline-variant/5 last:border-0"
                                  >
                                    <span className="text-on-surface font-medium">{kw.keyword || kw.text || kw.name}</span>
                                    <div className="flex items-center gap-6 text-on-surface-variant tabular-nums">
                                      <span>{formatNumber(kw.clicks)} clicks</span>
                                      <span>{formatNumber(kw.conversions)} conv</span>
                                      <span>{formatCurrency(kw.cost)}</span>
                                      {kw.quality_score != null && (
                                        <span className={kw.quality_score >= 7 ? 'text-secondary' : kw.quality_score >= 4 ? 'text-amber-400' : 'text-error'}>
                                          QS: {kw.quality_score}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-on-surface-variant">No keyword data available for this campaign</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
