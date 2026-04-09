'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { getAccounts, isSupabaseConfigured } from '@/lib/supabase';
import TimeComparison from '@/components/mission-control/TimeComparison';
import ClientSwitcher from '@/components/mission-control/ClientSwitcher';
import Skeleton from '@/components/ui/Skeleton';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  calcDelta,
  DATE_PRESETS,
} from '@/lib/dashboard-utils';

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */

const MATCH_DISPLAY = { EXACT: '[exact]', PHRASE: '"phrase"', BROAD: 'broad' };

function matchLabel(type) {
  const t = (type || '').toUpperCase();
  return MATCH_DISPLAY[t] || t.toLowerCase();
}

function matchBadgeClass(type) {
  const t = (type || '').toUpperCase();
  if (t === 'EXACT') return 'bg-secondary/10 text-secondary';
  if (t === 'PHRASE') return 'bg-primary/10 text-primary';
  return 'bg-surface-container-highest text-on-surface-variant';
}

function qsColor(qs) {
  if (qs == null) return 'text-on-surface-variant';
  if (qs >= 7) return 'text-secondary';
  if (qs >= 4) return 'text-amber-400';
  return 'text-error';
}

/* ═══════════════════════════════════════════════════════════════
   Smart Filter Definitions
   ═══════════════════════════════════════════════════════════════ */

const SMART_FILTERS = [
  {
    key: 'wasted',
    label: 'Wasted Spend',
    icon: 'money_off',
    color: 'text-error',
    bg: 'bg-error/10',
    activeBg: 'bg-error/20 ring-1 ring-error/30',
    test: (kw) => (kw.cost || 0) > 50 && (!kw.conversions || kw.conversions === 0),
  },
  {
    key: 'high_perf',
    label: 'High Performers',
    icon: 'star',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    activeBg: 'bg-secondary/20 ring-1 ring-secondary/30',
    test: (kw, ctx) => {
      if (!kw.conversions || kw.conversions === 0) return false;
      const cpConv = kw.cost / kw.conversions;
      return ctx.avgCostPerConv > 0 && cpConv < ctx.avgCostPerConv;
    },
  },
  {
    key: 'low_qs',
    label: 'Low Quality Score',
    icon: 'error_outline',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    activeBg: 'bg-amber-400/20 ring-1 ring-amber-400/30',
    test: (kw) => kw.qualityScore != null && kw.qualityScore < 5,
  },
  {
    key: 'low_is',
    label: 'Low Impression Share',
    icon: 'visibility_off',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    activeBg: 'bg-amber-400/20 ring-1 ring-amber-400/30',
    test: (kw) => kw.search_impression_share != null && kw.search_impression_share < 0.3,
  },
  {
    key: 'zero_clicks',
    label: 'Zero Clicks',
    icon: 'do_not_touch',
    color: 'text-on-surface-variant',
    bg: 'bg-surface-container-highest',
    activeBg: 'bg-surface-container-highest ring-1 ring-outline-variant/30',
    test: (kw) => (kw.impressions || 0) > 100 && (!kw.clicks || kw.clicks === 0),
  },
];

/* ═══════════════════════════════════════════════════════════════
   Negative Keywords Panel
   ═══════════════════════════════════════════════════════════════ */

function NegativeKeywordsPanel({ open, onToggle, accounts, allKeywords }) {
  const [search, setSearch] = useState('');
  const [newNeg, setNewNeg] = useState('');

  // Gather wasted-spend keywords as negative candidates
  const candidates = useMemo(() => {
    return allKeywords
      .filter(kw => (kw.cost || 0) > 100 && (!kw.conversions || kw.conversions === 0))
      .sort((a, b) => (b.cost || 0) - (a.cost || 0))
      .slice(0, 30);
  }, [allKeywords]);

  const filtered = search
    ? candidates.filter(c => c.keyword.toLowerCase().includes(search.toLowerCase()))
    : candidates;

  if (!open) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/10 transition-colors text-sm text-on-surface-variant w-full"
      >
        <span className="material-symbols-outlined text-lg">block</span>
        <span className="font-medium">Negative Keywords</span>
        <span className="material-symbols-outlined ml-auto text-lg">chevron_right</span>
      </button>
    );
  }

  return (
    <div className="bg-surface-container rounded-xl p-5 flex flex-col" style={{ minHeight: 400 }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-lg">block</span>
          Negative Keywords
        </h3>
        <button onClick={onToggle} className="text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      {/* Add negative */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Add negative keyword..."
          value={newNeg}
          onChange={e => setNewNeg(e.target.value)}
          className="flex-1 text-xs px-3 py-2 rounded-lg bg-surface-container-high border-outline-variant/20"
        />
        <button
          onClick={() => { if (newNeg.trim()) setNewNeg(''); }}
          className="px-3 py-2 rounded-lg text-xs font-medium gradient-primary text-on-primary"
        >
          Add
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <span className="material-symbols-outlined text-on-surface-variant text-sm absolute left-2.5 top-1/2 -translate-y-1/2">search</span>
        <input
          type="text"
          placeholder="Search candidates..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-surface-container-high border-outline-variant/20"
        />
      </div>

      <div className="text-label-sm text-on-surface-variant mb-2">
        Suggested Negatives ({filtered.length}) — High spend, zero conversions
      </div>

      <div className="flex-1 overflow-auto min-h-0" style={{ maxHeight: 400 }}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-outline-variant/10">
              <th className="text-left px-2 py-2 text-label-sm text-on-surface-variant whitespace-nowrap">Keyword</th>
              <th className="text-left px-2 py-2 text-label-sm text-on-surface-variant whitespace-nowrap">Match Type</th>
              <th className="text-left px-2 py-2 text-label-sm text-on-surface-variant whitespace-nowrap">Level</th>
              <th className="text-left px-2 py-2 text-label-sm text-on-surface-variant whitespace-nowrap">Campaign</th>
              <th className="text-left px-2 py-2 text-label-sm text-on-surface-variant whitespace-nowrap">Added By</th>
              <th className="text-left px-2 py-2 text-label-sm text-on-surface-variant whitespace-nowrap">Date Added</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((kw, i) => (
              <tr
                key={`${kw.client_id}-${kw.criterionId}-${i}`}
                className="border-b border-outline-variant/5 hover:bg-surface-container-high transition-colors"
              >
                <td className="px-2 py-2 text-on-surface font-medium truncate max-w-[120px]">{kw.keyword}</td>
                <td className="px-2 py-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-secondary/10 text-secondary">Exact</span>
                </td>
                <td className="px-2 py-2 text-on-surface-variant">Campaign</td>
                <td className="px-2 py-2 text-on-surface-variant truncate max-w-[100px]">{kw.campaignName}</td>
                <td className="px-2 py-2">
                  <span className="inline-flex items-center gap-1 text-on-surface-variant">
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>smart_toy</span>
                    AI Agent
                  </span>
                </td>
                <td className="px-2 py-2 text-on-surface-variant tabular-nums">{new Date().toLocaleDateString()}</td>
                <td className="px-2 py-2">
                  <button className="p-1 rounded hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors" title="Add as negative">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_circle</span>
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-sm text-on-surface-variant text-center py-8">No candidates found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Bulk Actions Bar
   ═══════════════════════════════════════════════════════════════ */

function BulkActionsBar({ count, onAction }) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-6 py-3 rounded-2xl bg-surface-container-highest/95 border border-outline-variant/30 shadow-2xl backdrop-blur-md fade-up">
      <span className="text-sm font-medium text-on-surface">
        {count} keyword{count !== 1 ? 's' : ''} selected
      </span>
      <div className="h-5 w-px bg-outline-variant/30" />
      {[
        { key: 'pause', label: 'Pause', icon: 'pause_circle', color: 'text-amber-400' },
        { key: 'bid_up', label: 'Increase Bids', icon: 'arrow_upward', color: 'text-secondary' },
        { key: 'bid_down', label: 'Decrease Bids', icon: 'arrow_downward', color: 'text-error' },
        { key: 'negate', label: 'Add as Negative', icon: 'block', color: 'text-error' },
        { key: 'assign_agent', label: 'Assign to Agent', icon: 'smart_toy', color: 'text-tertiary' },
      ].map(a => (
        <button
          key={a.key}
          onClick={() => onAction(a.key)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/10 transition-colors text-xs font-medium"
        >
          <span className={`material-symbols-outlined ${a.color}`} style={{ fontSize: 14 }}>{a.icon}</span>
          <span className="text-on-surface">{a.label}</span>
        </button>
      ))}
      <button onClick={() => onAction('clear')} className="ml-1 p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Column Definitions
   ═══════════════════════════════════════════════════════════════ */

const COLUMNS = [
  { key: '_check', label: '', nosort: true, w: 'w-10' },
  { key: 'client_name', label: 'Client', w: 'min-w-[100px]' },
  { key: 'campaignName', label: 'Campaign', w: 'min-w-[140px]' },
  { key: 'adGroupName', label: 'Ad Group', w: 'min-w-[120px]' },
  { key: 'keyword', label: 'Keyword', w: 'min-w-[180px]' },
  { key: 'matchType', label: 'Match', w: 'w-24' },
  { key: 'status', label: 'Status', w: 'w-24' },
  { key: 'impressions', label: 'Impr.', w: 'w-20' },
  { key: 'clicks', label: 'Clicks', w: 'w-20' },
  { key: 'ctr', label: 'CTR', w: 'w-18' },
  { key: 'avgCpc', label: 'Avg CPC', w: 'w-24' },
  { key: 'cost', label: 'Cost', w: 'w-24' },
  { key: 'conversions', label: 'Conv.', w: 'w-18' },
  { key: 'cost_per_conv', label: 'Cost/Conv', w: 'w-28' },
  { key: 'qualityScore', label: 'QS', w: 'w-14' },
];

/* ═══════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════ */

export default function KeywordEnginePage() {
  const router = useRouter();

  /* ── State ── */
  const [accounts, setAccounts] = useState([]);
  const [allKeywords, setAllKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [dateRange, setDateRange] = useState('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState('cost');
  const [sortDir, setSortDir] = useState('desc');
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [negPanelOpen, setNegPanelOpen] = useState(false);
  const [matchFilter, setMatchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [flyoutKeyword, setFlyoutKeyword] = useState(null);

  /* ── Data Fetching ── */
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadAll() {
      if (!isSupabaseConfigured()) { setLoading(false); return; }

      try {
        const accts = await getAccounts();
        if (signal.aborted) return;
        setAccounts(accts || []);

        const kwList = [];
        await Promise.all(
          (accts || []).map(async (acct) => {
            try {
              const res = await fetch(`/api/accounts/${acct.id}/keywords`, { signal });
              if (res.ok && !signal.aborted) {
                const data = await res.json();
                const keywords = Array.isArray(data) ? data : [];
                keywords.forEach(kw => kwList.push({
                  ...kw,
                  client_name: acct.name,
                  client_id: acct.id,
                }));
              }
            } catch (_) {}
          }),
        );

        if (!signal.aborted) {
          setAllKeywords(kwList);
          setSelectedRows(new Set());
          setLoading(false);
        }
      } catch (_) {
        if (!signal.aborted) setLoading(false);
      }
    }

    setLoading(true);
    loadAll();
    return () => controller.abort();
  }, [dateRange, refreshKey]);

  /* ── Computed: filter context ── */
  const filterCtx = useMemo(() => {
    const withConv = allKeywords.filter(kw => kw.conversions > 0);
    const totalCost = withConv.reduce((s, kw) => s + (kw.cost || 0), 0);
    const totalConv = withConv.reduce((s, kw) => s + (kw.conversions || 0), 0);
    return { avgCostPerConv: totalConv > 0 ? totalCost / totalConv : 0 };
  }, [allKeywords]);

  /* ── Computed: smart filter counts ── */
  const filterCounts = useMemo(() => {
    const counts = {};
    for (const f of SMART_FILTERS) {
      counts[f.key] = allKeywords.filter(kw => f.test(kw, filterCtx)).length;
    }
    return counts;
  }, [allKeywords, filterCtx]);

  /* ── Computed: visible keywords ── */
  const visible = useMemo(() => {
    let result = [...allKeywords];

    // Account filter
    if (selectedAccount) {
      result = result.filter(kw => kw.client_id === selectedAccount);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(kw =>
        (kw.keyword || '').toLowerCase().includes(q) ||
        (kw.client_name || '').toLowerCase().includes(q) ||
        (kw.campaignName || '').toLowerCase().includes(q) ||
        (kw.adGroupName || '').toLowerCase().includes(q),
      );
    }

    // Match type filter
    if (matchFilter !== 'all') {
      result = result.filter(kw => (kw.matchType || '').toUpperCase() === matchFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(kw => (kw.status || '').toUpperCase() === statusFilter);
    }

    // Smart filters (AND within active filters)
    if (activeFilters.size > 0) {
      const activeArr = SMART_FILTERS.filter(f => activeFilters.has(f.key));
      result = result.filter(kw => activeArr.every(f => f.test(kw, filterCtx)));
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortCol];
      let bVal = b[sortCol];
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
  }, [allKeywords, selectedAccount, searchQuery, matchFilter, statusFilter, activeFilters, filterCtx, sortCol, sortDir]);

  /* ── Summary stats ── */
  const stats = useMemo(() => {
    const kws = visible;
    const totalCost = kws.reduce((s, k) => s + (k.cost || 0), 0);
    const totalConv = kws.reduce((s, k) => s + (k.conversions || 0), 0);
    const totalClicks = kws.reduce((s, k) => s + (k.clicks || 0), 0);
    const totalImpr = kws.reduce((s, k) => s + (k.impressions || 0), 0);
    return {
      count: kws.length,
      cost: totalCost,
      conversions: totalConv,
      avgCPC: totalClicks > 0 ? totalCost / totalClicks : 0,
      costPerConv: totalConv > 0 ? totalCost / totalConv : 0,
      ctr: totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0,
    };
  }, [visible]);

  /* ── Handlers ── */
  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  function toggleFilter(key) {
    setActiveFilters(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleRow(id) {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    if (selectedRows.size === visible.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(visible.map(kw => kw._uid)));
    }
  }

  const handleBulkAction = useCallback((action) => {
    if (action === 'clear') { setSelectedRows(new Set()); return; }
    // Future: wire to actual API actions
    setSelectedRows(new Set());
  }, []);

  /* ── Assign UIDs for selection tracking ── */
  const keywordsWithUid = useMemo(() => {
    return allKeywords.map((kw, i) => ({
      ...kw,
      _uid: `${kw.client_id}-${kw.adGroupId}-${kw.criterionId}-${i}`,
    }));
  }, [allKeywords]);

  // Re-derive visible from UID-enriched list
  const visibleWithUid = useMemo(() => {
    let result = [...keywordsWithUid];

    if (selectedAccount) result = result.filter(kw => kw.client_id === selectedAccount);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(kw =>
        (kw.keyword || '').toLowerCase().includes(q) ||
        (kw.client_name || '').toLowerCase().includes(q) ||
        (kw.campaignName || '').toLowerCase().includes(q) ||
        (kw.adGroupName || '').toLowerCase().includes(q),
      );
    }

    if (matchFilter !== 'all') result = result.filter(kw => (kw.matchType || '').toUpperCase() === matchFilter);
    if (statusFilter !== 'all') result = result.filter(kw => (kw.status || '').toUpperCase() === statusFilter);

    if (activeFilters.size > 0) {
      const activeArr = SMART_FILTERS.filter(f => activeFilters.has(f.key));
      result = result.filter(kw => activeArr.every(f => f.test(kw, filterCtx)));
    }

    result.sort((a, b) => {
      let aVal = a[sortCol];
      let bVal = b[sortCol];
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
  }, [keywordsWithUid, selectedAccount, searchQuery, matchFilter, statusFilter, activeFilters, filterCtx, sortCol, sortDir]);

  /* ── Pagination ── */
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;
  const totalPages = Math.ceil(visibleWithUid.length / PAGE_SIZE);
  const pageData = visibleWithUid.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [selectedAccount, searchQuery, matchFilter, statusFilter, activeFilters, sortCol, sortDir]);

  const allPageSelected = pageData.length > 0 && pageData.every(kw => selectedRows.has(kw._uid));

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="space-y-6 fade-up">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" className="h-8 w-64" />
          <div className="flex gap-3">
            <Skeleton variant="text" className="h-11 w-64 rounded-xl" />
            <Skeleton variant="text" className="h-11 w-56 rounded-xl" />
          </div>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} variant="text" className="h-9 w-36 rounded-lg" />)}
        </div>
        <Skeleton variant="card" className="h-[600px]" />
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div className="space-y-5 fade-up">
      {/* ─── Header ─── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Keyword Engine</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {allKeywords.length.toLocaleString()} keywords across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ClientSwitcher accounts={accounts} selected={selectedAccount} onSelect={setSelectedAccount} />
          <TimeComparison selected={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* ─── Summary Strip ─── */}
      <div className="flex items-center gap-6 px-5 py-3 bg-surface-container rounded-xl text-xs flex-wrap">
        <StatMini label="Keywords" value={formatNumber(stats.count)} />
        <StatMini label="Total Spend" value={formatCurrency(stats.cost, true)} />
        <StatMini label="Conversions" value={formatNumber(stats.conversions)} />
        <StatMini label="Avg. CPC" value={formatCurrency(stats.avgCPC)} />
        <StatMini label="Avg. Cost/Conv" value={stats.costPerConv > 0 ? formatCurrency(stats.costPerConv) : '\u2014'} />
        <StatMini label="Avg. CTR" value={formatPercent(stats.ctr)} />
      </div>

      {/* ─── Smart Filters ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-label-sm text-on-surface-variant mr-1">Filters</span>
        {SMART_FILTERS.map(f => {
          const isActive = activeFilters.has(f.key);
          return (
            <button
              key={f.key}
              onClick={() => toggleFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive ? `${f.activeBg} ${f.color}` : `${f.bg} ${f.color} hover:brightness-110`
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{f.icon}</span>
              {f.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-black/10' : 'bg-black/5'}`}>
                {filterCounts[f.key]}
              </span>
            </button>
          );
        })}
        {activeFilters.size > 0 && (
          <button
            onClick={() => setActiveFilters(new Set())}
            className="text-xs text-on-surface-variant hover:text-on-surface transition-colors ml-1"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ─── Main Content ─── */}
      <div className={`grid gap-5 ${negPanelOpen ? 'grid-cols-1 xl:grid-cols-12' : 'grid-cols-1'}`}>
        {/* Keyword Table */}
        <div className={negPanelOpen ? 'xl:col-span-9' : ''}>
          <div className="bg-surface-container rounded-xl overflow-hidden">
            {/* Table toolbar */}
            <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm absolute left-2.5 top-1/2 -translate-y-1/2">search</span>
                  <input
                    type="text"
                    placeholder="Search keywords, campaigns, clients..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-surface-container-high border-outline-variant/20 w-64"
                  />
                </div>
                <select
                  value={matchFilter}
                  onChange={e => setMatchFilter(e.target.value)}
                  className="text-xs py-1.5 px-2 rounded-lg bg-surface-container-high border-outline-variant/20"
                >
                  <option value="all">All Match Types</option>
                  <option value="EXACT">Exact</option>
                  <option value="PHRASE">Phrase</option>
                  <option value="BROAD">Broad</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="text-xs py-1.5 px-2 rounded-lg bg-surface-container-high border-outline-variant/20"
                >
                  <option value="all">All Status</option>
                  <option value="ENABLED">Enabled</option>
                  <option value="PAUSED">Paused</option>
                  <option value="REMOVED">Removed</option>
                </select>
              </div>
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <span>{visibleWithUid.length.toLocaleString()} results</span>
                {totalPages > 1 && (
                  <>
                    <span className="text-outline-variant/40">&middot;</span>
                    <span>Page {page + 1} of {totalPages}</span>
                  </>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant/10">
                    {COLUMNS.map((col, colIdx) => {
                      const stickyClass = colIdx === 0
                        ? 'sticky left-0 z-10 bg-surface-container'
                        : colIdx === 1
                          ? 'sticky left-[40px] z-10 bg-surface-container'
                          : colIdx === 2
                            ? 'sticky left-[140px] z-10 bg-surface-container'
                            : '';
                      return (
                        <th
                          key={col.key}
                          onClick={() => {
                            if (col.key === '_check') { toggleAllVisible(); return; }
                            if (!col.nosort) handleSort(col.key);
                          }}
                          className={`text-left px-3 py-3 text-label-sm text-on-surface-variant whitespace-nowrap ${col.w || ''} ${
                            !col.nosort || col.key === '_check' ? 'cursor-pointer hover:text-on-surface select-none' : ''
                          } ${stickyClass}`}
                        >
                          {col.key === '_check' ? (
                            <input
                              type="checkbox"
                              checked={allPageSelected}
                              onChange={toggleAllVisible}
                              className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                            />
                          ) : (
                            <div className="flex items-center gap-1">
                              {col.label}
                              {sortCol === col.key && (
                                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                                  {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                </span>
                              )}
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {pageData.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-on-surface-variant text-sm">
                        {allKeywords.length === 0 ? 'No keywords found — connect accounts to see keyword data' : 'No keywords match your filters'}
                      </td>
                    </tr>
                  ) : (
                    pageData.map(kw => {
                      const isSelected = selectedRows.has(kw._uid);
                      const costPerConv = kw.conversions > 0 ? kw.cost / kw.conversions : null;
                      const prevCostPerConv = kw.prev_conversions > 0 ? kw.prev_cost / kw.prev_conversions : null;
                      const rowBg = isSelected ? 'bg-primary/5' : '';
                      const stickyBg = isSelected ? 'bg-primary/5' : 'bg-surface-container';

                      const statusBadge = (() => {
                        const s = (kw.status || '').toUpperCase();
                        if (s === 'ENABLED') return 'bg-secondary/10 text-secondary';
                        if (s === 'PAUSED') return 'bg-amber-400/10 text-amber-400';
                        return 'bg-surface-container-highest text-on-surface-variant';
                      })();

                      return (
                        <tr
                          key={kw._uid}
                          onClick={(e) => {
                            if (e.target.closest('input[type="checkbox"]')) return;
                            setFlyoutKeyword(kw);
                          }}
                          className={`border-b border-outline-variant/5 transition-colors hover:bg-surface-container-high cursor-pointer group ${rowBg}`}
                        >
                          <td className={`px-3 py-2.5 sticky left-0 z-10 ${stickyBg} group-hover:bg-surface-container-high`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRow(kw._uid)}
                              className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                            />
                          </td>
                          <td className={`px-3 py-2.5 text-xs text-on-surface-variant truncate max-w-[100px] sticky left-[40px] z-10 ${stickyBg} group-hover:bg-surface-container-high`}>{kw.client_name}</td>
                          <td className={`px-3 py-2.5 text-xs text-on-surface-variant truncate max-w-[140px] sticky left-[140px] z-10 ${stickyBg} group-hover:bg-surface-container-high`}>{kw.campaignName}</td>
                          <td className="px-3 py-2.5 text-xs text-on-surface-variant truncate max-w-[120px]">{kw.adGroupName}</td>
                          <td className="px-3 py-2.5">
                            <span className="text-sm text-on-surface font-medium">{kw.keyword}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${matchBadgeClass(kw.matchType)}`}>
                              {matchLabel(kw.matchType)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusBadge}`}>
                              {(kw.status || 'unknown').toLowerCase()}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-on-surface tabular-nums">
                            {formatNumber(kw.impressions)}
                            {kw.prev_impressions != null && (
                              <div className={`text-[10px] font-medium ${kw.impressions > kw.prev_impressions ? 'text-secondary' : kw.impressions < kw.prev_impressions ? 'text-error' : 'text-on-surface-variant'}`}>
                                {kw.impressions > kw.prev_impressions ? '\u2191' : kw.impressions < kw.prev_impressions ? '\u2193' : '\u2014'}
                                {Math.abs(calcDelta(kw.impressions, kw.prev_impressions)).toFixed(1)}%
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-on-surface tabular-nums">
                            {formatNumber(kw.clicks)}
                            {kw.prev_clicks != null && (
                              <div className={`text-[10px] font-medium ${kw.clicks > kw.prev_clicks ? 'text-secondary' : kw.clicks < kw.prev_clicks ? 'text-error' : 'text-on-surface-variant'}`}>
                                {kw.clicks > kw.prev_clicks ? '\u2191' : kw.clicks < kw.prev_clicks ? '\u2193' : '\u2014'}
                                {Math.abs(calcDelta(kw.clicks, kw.prev_clicks)).toFixed(1)}%
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-on-surface tabular-nums">
                            {kw.ctr != null ? formatPercent(kw.ctr * 100) : '\u2014'}
                            {kw.prev_ctr != null && (
                              <div className={`text-[10px] font-medium ${kw.ctr > kw.prev_ctr ? 'text-secondary' : kw.ctr < kw.prev_ctr ? 'text-error' : 'text-on-surface-variant'}`}>
                                {kw.ctr > kw.prev_ctr ? '\u2191' : kw.ctr < kw.prev_ctr ? '\u2193' : '\u2014'}
                                {Math.abs(calcDelta(kw.ctr, kw.prev_ctr)).toFixed(1)}%
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-on-surface tabular-nums">
                            {kw.avgCpc != null ? formatCurrency(kw.avgCpc) : '\u2014'}
                            {kw.prev_avgCpc != null && (
                              <div className={`text-[10px] font-medium ${kw.avgCpc < kw.prev_avgCpc ? 'text-secondary' : kw.avgCpc > kw.prev_avgCpc ? 'text-error' : 'text-on-surface-variant'}`}>
                                {kw.avgCpc < kw.prev_avgCpc ? '\u2191' : kw.avgCpc > kw.prev_avgCpc ? '\u2193' : '\u2014'}
                                {Math.abs(calcDelta(kw.avgCpc, kw.prev_avgCpc)).toFixed(1)}%
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-on-surface font-medium tabular-nums">
                            {formatCurrency(kw.cost)}
                            {kw.prev_cost != null && (
                              <div className={`text-[10px] font-medium ${kw.cost < kw.prev_cost ? 'text-secondary' : kw.cost > kw.prev_cost ? 'text-error' : 'text-on-surface-variant'}`}>
                                {kw.cost < kw.prev_cost ? '\u2191' : kw.cost > kw.prev_cost ? '\u2193' : '\u2014'}
                                {Math.abs(calcDelta(kw.cost, kw.prev_cost)).toFixed(1)}%
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-on-surface tabular-nums">
                            {formatNumber(kw.conversions)}
                            {kw.prev_conversions != null && (
                              <div className={`text-[10px] font-medium ${kw.conversions > kw.prev_conversions ? 'text-secondary' : kw.conversions < kw.prev_conversions ? 'text-error' : 'text-on-surface-variant'}`}>
                                {kw.conversions > kw.prev_conversions ? '\u2191' : kw.conversions < kw.prev_conversions ? '\u2193' : '\u2014'}
                                {Math.abs(calcDelta(kw.conversions, kw.prev_conversions)).toFixed(1)}%
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-on-surface tabular-nums">
                            {costPerConv != null ? formatCurrency(costPerConv) : <span className="text-on-surface-variant">&mdash;</span>}
                            {costPerConv != null && prevCostPerConv != null && (
                              <div className={`text-[10px] font-medium ${costPerConv < prevCostPerConv ? 'text-secondary' : costPerConv > prevCostPerConv ? 'text-error' : 'text-on-surface-variant'}`}>
                                {costPerConv < prevCostPerConv ? '\u2191' : costPerConv > prevCostPerConv ? '\u2193' : '\u2014'}
                                {Math.abs(calcDelta(costPerConv, prevCostPerConv)).toFixed(1)}%
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs font-bold tabular-nums ${qsColor(kw.qualityScore)}`}>
                              {kw.qualityScore ?? '\u2014'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/10">
                <span className="text-xs text-on-surface-variant">
                  Showing {page * PAGE_SIZE + 1}&ndash;{Math.min((page + 1) * PAGE_SIZE, visibleWithUid.length)} of {visibleWithUid.length.toLocaleString()}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30 transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pNum;
                    if (totalPages <= 7) pNum = i;
                    else if (page < 3) pNum = i;
                    else if (page > totalPages - 4) pNum = totalPages - 7 + i;
                    else pNum = page - 3 + i;

                    return (
                      <button
                        key={pNum}
                        onClick={() => setPage(pNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                          page === pNum ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        {pNum + 1}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30 transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Negative Keywords Panel */}
        <div className={negPanelOpen ? 'xl:col-span-3' : ''}>
          <NegativeKeywordsPanel
            open={negPanelOpen}
            onToggle={() => setNegPanelOpen(o => !o)}
            accounts={accounts}
            allKeywords={keywordsWithUid}
          />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar count={selectedRows.size} onAction={handleBulkAction} />

      {/* Keyword Detail Flyout */}
      {flyoutKeyword && (
        <KeywordDetailFlyout keyword={flyoutKeyword} onClose={() => setFlyoutKeyword(null)} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Keyword Detail Flyout
   ═══════════════════════════════════════════════════════════════ */

function KeywordDetailFlyout({ keyword, onClose }) {
  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!keyword) return null;

  const costPerConv = keyword.conversions > 0 ? keyword.cost / keyword.conversions : null;
  const qs = keyword.qualityScore;
  const qsBg = qs == null ? 'bg-surface-container-highest' : qs >= 7 ? 'bg-secondary/20' : qs >= 4 ? 'bg-amber-400/20' : 'bg-error/20';
  const qsText = qs == null ? 'text-on-surface-variant' : qs >= 7 ? 'text-secondary' : qs >= 4 ? 'text-amber-400' : 'text-error';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-[420px] bg-surface-container-high rounded-l-2xl border-l border-outline-variant/30 shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-outline-variant/10">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-on-surface truncate">{keyword.keyword}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${matchBadgeClass(keyword.matchType)}`}>
                {matchLabel(keyword.matchType)}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-2 truncate">{keyword.campaignName}</p>
            <p className="text-xs text-on-surface-variant truncate">{keyword.adGroupName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0 ml-3"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Performance Metrics Grid */}
          <div>
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Performance Metrics</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Impressions', value: formatNumber(keyword.impressions) },
                { label: 'Clicks', value: formatNumber(keyword.clicks) },
                { label: 'CTR', value: keyword.ctr != null ? formatPercent(keyword.ctr * 100) : '\u2014' },
                { label: 'Avg. CPC', value: keyword.avgCpc != null ? formatCurrency(keyword.avgCpc) : '\u2014' },
                { label: 'Cost', value: formatCurrency(keyword.cost) },
                { label: 'Conversions', value: formatNumber(keyword.conversions) },
              ].map(m => (
                <div key={m.label} className="bg-surface-container rounded-xl p-3">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">{m.label}</div>
                  <div className="text-sm font-bold text-on-surface tabular-nums mt-1">{m.value}</div>
                </div>
              ))}
            </div>
            {costPerConv != null && (
              <div className="mt-3 bg-surface-container rounded-xl p-3">
                <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">Cost / Conversion</div>
                <div className="text-sm font-bold text-on-surface tabular-nums mt-1">{formatCurrency(costPerConv)}</div>
              </div>
            )}
          </div>

          {/* Quality Score */}
          <div>
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Quality Score</h3>
            <div className={`rounded-xl p-4 ${qsBg} flex items-center gap-4`}>
              <div className={`text-3xl font-black tabular-nums ${qsText}`}>
                {qs ?? '\u2014'}
              </div>
              <div className="text-xs text-on-surface-variant">
                {qs == null ? 'No quality score data available' :
                  qs >= 7 ? 'Good \u2014 Keyword is performing well' :
                    qs >= 4 ? 'Average \u2014 Room for improvement' :
                      'Poor \u2014 Needs attention'}
              </div>
            </div>
          </div>

          {/* Performance History Placeholder */}
          <div>
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Performance History</h3>
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container p-6 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-on-surface-variant text-2xl mb-2">show_chart</span>
              <p className="text-xs text-on-surface-variant">Daily performance chart coming soon</p>
            </div>
          </div>

          {/* Agent Actions Placeholder */}
          <div>
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Agent Actions</h3>
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container p-6 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-on-surface-variant text-2xl mb-2">smart_toy</span>
              <p className="text-xs text-on-surface-variant">No agent actions recorded for this keyword</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Tiny stat component ── */
function StatMini({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-on-surface-variant">{label}:</span>
      <span className="text-on-surface font-semibold tabular-nums">{value}</span>
    </div>
  );
}
