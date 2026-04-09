'use client';

import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import GradientButton from '@/components/ui/GradientButton';
import GhostButton from '@/components/ui/GhostButton';
import Skeleton from '@/components/ui/Skeleton';
import TimeComparison from '@/components/mission-control/TimeComparison';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  calcDelta,
  computeHealthScore,
  generateAlerts,
  DATE_PRESETS,
} from '@/lib/dashboard-utils';

/* ── Helpers ── */

function formatCustomerId(raw) {
  if (!raw) return '\u2014';
  const d = String(raw).replace(/\D/g, '');
  if (d.length >= 9) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`;
  return d;
}

function relativeTime(iso) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const AGENT_TYPES = ['audit', 'bid', 'ad_copy', 'budget', 'keyword', 'negative_kw', 'brand'];

/* ── Delta Arrow chip ── */
function DeltaArrow({ current, previous, invert = false }) {
  const delta = calcDelta(current || 0, previous || 0);
  const isPos = invert ? delta < 0 : delta > 0;
  const isNeg = invert ? delta > 0 : delta < 0;
  const color = isPos ? 'text-secondary' : isNeg ? 'text-error' : 'text-on-surface-variant';

  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${color}`}>
      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
        {isPos ? 'arrow_upward' : isNeg ? 'arrow_downward' : 'remove'}
      </span>
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

/* ── Health badge ── */
const HEALTH = {
  healthy:  { label: 'Healthy',  bg: 'bg-secondary/10', text: 'text-secondary',  dot: 'bg-secondary' },
  warning:  { label: 'Warning',  bg: 'bg-amber-400/10', text: 'text-amber-400',  dot: 'bg-amber-400' },
  critical: { label: 'Critical', bg: 'bg-error/10',     text: 'text-error',      dot: 'bg-error' },
};

function HealthBadge({ status }) {
  const cfg = HEALTH[status] || HEALTH.healthy;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ── Connect Account Modal ── */
function ConnectAccountModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container-high border border-outline-variant/30 rounded-2xl p-8 max-w-lg w-full shadow-2xl fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-on-primary">add_link</span>
          </div>
          <h2 className="text-xl font-bold text-on-surface">Connect Google Ads Account</h2>
          <p className="text-sm text-on-surface-variant mt-2">
            Link a Google Ads account to unlock AI-powered campaign management
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-surface-container rounded-xl p-4">
            <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">lock</span>
              Permissions Requested
            </h3>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary text-sm mt-0.5">check_circle</span>
                <span><strong className="text-on-surface">Read</strong> campaign, ad group, keyword, and ad performance data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary text-sm mt-0.5">check_circle</span>
                <span><strong className="text-on-surface">Read</strong> account budgets and billing settings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary text-sm mt-0.5">check_circle</span>
                <span><strong className="text-on-surface">Write</strong> bid adjustments, keyword additions, and negative keywords (when agents are enabled)</span>
              </li>
            </ul>
          </div>

          <div className="bg-surface-container rounded-xl p-4">
            <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">sync</span>
              What Gets Synced
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-on-surface-variant">
              {['Campaign metrics', 'Keyword data', 'Search terms', 'Impression share', 'Quality scores', 'Budget pacing', 'Ad copy & assets', 'Change history'].map(item => (
                <div key={item} className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-on-surface-variant/40 text-xs">arrow_right</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 px-1 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-sm mt-0.5">info</span>
            <span>Data syncs automatically every 24 hours. You can trigger manual syncs anytime. All data is encrypted at rest.</span>
          </div>
        </div>

        <GradientButton
          onClick={() => { window.location.href = '/api/auth/google-ads'; }}
          className="w-full justify-center py-3"
        >
          <span className="material-symbols-outlined text-lg">login</span>
          Continue with Google
        </GradientButton>
      </div>
    </div>
  );
}

/* ── Summary Stat Card ── */
function SummaryCard({ label, value, prevValue, icon, format = 'number', invert = false }) {
  const fmt = (v) => {
    if (v == null) return '\u2014';
    if (format === 'currency') return formatCurrency(v, true);
    return formatNumber(v);
  };

  return (
    <div className="bg-surface-container rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-label-sm text-on-surface-variant">{label}</span>
        <span className="material-symbols-outlined text-on-surface-variant/30 text-xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-on-surface">{fmt(value)}</div>
      {prevValue != null && (
        <div className="flex items-center gap-2 mt-1.5">
          <DeltaArrow current={value} previous={prevValue} invert={invert} />
          <span className="text-[11px] text-on-surface-variant">vs {fmt(prevValue)}</span>
        </div>
      )}
    </div>
  );
}

/* ── Account Card (Grid View) ── */
function AccountCard({ account, metrics: m, campaigns, alertCount, syncing, onSync, onAudit }) {
  const cur = m?.current || {};
  const prev = m?.previous || {};
  const agentsEnabled = account.settings?.agents_enabled;

  // Compute health from campaigns
  const allCamps = campaigns || [];
  const healthScores = allCamps.map(c => computeHealthScore(c));
  const health = healthScores.includes('critical') ? 'critical' : healthScores.includes('warning') ? 'warning' : 'healthy';

  // Avg search IS from campaigns
  const campIS = allCamps.filter(c => c.search_impression_share != null);
  const avgSearchIS = campIS.length > 0 ? campIS.reduce((s, c) => s + c.search_impression_share, 0) / campIS.length : null;

  // CTR
  const impressions = allCamps.reduce((s, c) => s + (c.impressions || 0), 0);
  const clicks = cur.clicks || 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;

  return (
    <div className="bg-surface-container rounded-xl p-5 flex flex-col gap-4 hover:border-outline-variant/30 border border-transparent transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <HealthBadge status={health} />
          </div>
          <p className="text-lg font-bold text-on-surface leading-tight truncate">
            {account.name || 'Unnamed Account'}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant">
            <span>{formatCustomerId(account.google_customer_id)}</span>
            <span className="text-on-surface-variant/30">&middot;</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>schedule</span>
              Synced {relativeTime(account.last_synced_at)}
            </span>
          </div>
        </div>
        <StatusBadge
          status={account.status === 'active' ? 'active' : account.status === 'connecting' ? 'running' : 'idle'}
          label={account.status}
          pulse={account.status === 'active'}
        />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <MetricCell label="Spend" value={formatCurrency(cur.total_spend, true)}>
          <DeltaArrow current={cur.total_spend} previous={prev.total_spend} />
        </MetricCell>
        <MetricCell label="Conversions" value={formatNumber(cur.conversions)}>
          <DeltaArrow current={cur.conversions} previous={prev.conversions} />
        </MetricCell>
        <MetricCell label="Cost/Conv" value={cur.cost_per_lead ? formatCurrency(cur.cost_per_lead) : '\u2014'}>
          {cur.cost_per_lead > 0 && prev.cost_per_lead > 0 && (
            <DeltaArrow current={cur.cost_per_lead} previous={prev.cost_per_lead} invert />
          )}
        </MetricCell>
        <MetricCell label="CTR" value={ctr != null ? formatPercent(ctr) : '\u2014'}>
          {ctr != null && prev.clicks > 0 && (
            <DeltaArrow current={ctr} previous={prev.clicks > 0 ? 0 : 0} />
          )}
        </MetricCell>
      </div>

      {/* Search IS bar */}
      {avgSearchIS != null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-on-surface-variant">Search Impression Share</span>
            <span className="text-on-surface font-medium">{formatPercent(avgSearchIS * 100, 0)}</span>
          </div>
          <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                avgSearchIS >= 0.6 ? 'bg-secondary' : avgSearchIS >= 0.35 ? 'bg-amber-400' : 'bg-error'
              }`}
              style={{ width: `${Math.min(avgSearchIS * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Agent + Alert row */}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-on-surface-variant">
          <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 14 }}>smart_toy</span>
          {agentsEnabled ? `${AGENT_TYPES.length}/${AGENT_TYPES.length} agents` : '0 agents'}
        </span>
        {alertCount > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-error/10 text-error font-medium">
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>warning</span>
            {alertCount} alert{alertCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <Link
          href={`/accounts/${account.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-on-primary gradient-primary"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
          View
        </Link>
        <button
          onClick={() => onSync(account.id)}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-on-surface-variant bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/10 transition-colors disabled:opacity-40"
        >
          <span className={`material-symbols-outlined ${syncing ? 'animate-spin' : ''}`} style={{ fontSize: 14 }}>
            {syncing ? 'progress_activity' : 'sync'}
          </span>
          Sync
        </button>
        <button
          onClick={() => onAudit?.(account.id)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-on-surface-variant bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/10 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>fact_check</span>
          Audit
        </button>
      </div>
    </div>
  );
}

function MetricCell({ label, value, children }) {
  return (
    <div>
      <div className="text-label-sm text-on-surface-variant mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-on-surface tabular-nums">{value}</div>
      {children && <div className="mt-0.5">{children}</div>}
    </div>
  );
}

/* ── Account Row (List View) ── */
function AccountRow({ account, metrics: m, campaigns, alertCount, syncing, onSync }) {
  const cur = m?.current || {};
  const prev = m?.previous || {};

  const allCamps = campaigns || [];
  const healthScores = allCamps.map(c => computeHealthScore(c));
  const health = healthScores.includes('critical') ? 'critical' : healthScores.includes('warning') ? 'warning' : 'healthy';

  const campIS = allCamps.filter(c => c.search_impression_share != null);
  const avgSearchIS = campIS.length > 0 ? campIS.reduce((s, c) => s + c.search_impression_share, 0) / campIS.length : null;

  const impressions = allCamps.reduce((s, c) => s + (c.impressions || 0), 0);
  const clicks = cur.clicks || 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;

  const hCfg = HEALTH[health] || HEALTH.healthy;

  return (
    <tr className="border-b border-outline-variant/5 hover:bg-surface-container-high transition-colors">
      <td className="px-4 py-3">
        <span className={`inline-block w-2 h-2 rounded-full ${hCfg.dot}`} />
      </td>
      <td className="px-4 py-3">
        <Link href={`/accounts/${account.id}`} className="hover:text-primary transition-colors">
          <div className="text-sm font-medium text-on-surface">{account.name || 'Unnamed'}</div>
          <div className="text-[11px] text-on-surface-variant">{formatCustomerId(account.google_customer_id)}</div>
        </Link>
      </td>
      <td className="px-4 py-3">
        <StatusBadge
          status={account.status === 'active' ? 'active' : 'idle'}
          label={account.status}
        />
      </td>
      <td className="px-4 py-3 text-xs text-on-surface-variant">{relativeTime(account.last_synced_at)}</td>
      <td className="px-4 py-3 tabular-nums">
        <div className="text-sm text-on-surface">{formatCurrency(cur.total_spend, true)}</div>
        <DeltaArrow current={cur.total_spend} previous={prev.total_spend} />
      </td>
      <td className="px-4 py-3 tabular-nums">
        <div className="text-sm text-on-surface">{formatNumber(cur.conversions)}</div>
        <DeltaArrow current={cur.conversions} previous={prev.conversions} />
      </td>
      <td className="px-4 py-3 tabular-nums">
        <div className="text-sm text-on-surface">{cur.cost_per_lead ? formatCurrency(cur.cost_per_lead) : '\u2014'}</div>
        {cur.cost_per_lead > 0 && prev.cost_per_lead > 0 && (
          <DeltaArrow current={cur.cost_per_lead} previous={prev.cost_per_lead} invert />
        )}
      </td>
      <td className="px-4 py-3 tabular-nums">
        <div className="text-sm text-on-surface">{ctr != null ? formatPercent(ctr) : '\u2014'}</div>
      </td>
      <td className="px-4 py-3 tabular-nums">
        <div className="text-sm text-on-surface">{avgSearchIS != null ? formatPercent(avgSearchIS * 100, 0) : '\u2014'}</div>
      </td>
      <td className="px-4 py-3">
        {alertCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-error/10 text-error">
            {alertCount}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Link
            href={`/accounts/${account.id}`}
            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
            title="View Account"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
          </Link>
          <button
            onClick={() => onSync(account.id)}
            disabled={syncing}
            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors disabled:opacity-40"
            title="Sync"
          >
            <span className={`material-symbols-outlined ${syncing ? 'animate-spin' : ''}`} style={{ fontSize: 16 }}>
              {syncing ? 'progress_activity' : 'sync'}
            </span>
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ════════════════════════════════════════════════════════════
   Main Page
   ════════════════════════════════════════════════════════════ */

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [metricsMap, setMetricsMap] = useState({});
  const [campaignsMap, setCampaignsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [dateRange, setDateRange] = useState('month');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  /* ── Fetch data ── */
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/accounts', { signal });
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        if (signal.aborted) return;
        setAccounts(list);

        const preset = DATE_PRESETS.find(p => p.key === dateRange) || DATE_PRESETS[1];
        const range = preset.range;
        const mMap = {};
        const cMap = {};

        await Promise.all(
          list.map(async (acct) => {
            try {
              const r = await fetch(`/api/accounts/${acct.id}/metrics?range=${range}`, { signal });
              if (r.ok && !signal.aborted) mMap[acct.id] = await r.json();
            } catch (_) {}
            try {
              const r = await fetch(`/api/accounts/${acct.id}/campaigns?range=${range}`, { signal });
              if (r.ok && !signal.aborted) {
                const d = await r.json();
                cMap[acct.id] = Array.isArray(d) ? d : d.campaigns || [];
              }
            } catch (_) {}
          }),
        );

        if (!signal.aborted) {
          setMetricsMap(mMap);
          setCampaignsMap(cMap);
          setLoading(false);
        }
      } catch (err) {
        if (err.name !== 'AbortError') setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [dateRange]);

  /* ── Sync handler ── */
  const handleSync = useCallback(async (accountId) => {
    setSyncing(s => ({ ...s, [accountId]: true }));
    try {
      await fetch(`/api/accounts/${accountId}/sync`, { method: 'POST' });
      const [aRes, mRes] = await Promise.all([
        fetch(`/api/accounts/${accountId}`).then(r => r.json()),
        fetch(`/api/accounts/${accountId}/metrics`).then(r => r.json()).catch(() => null),
      ]);
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, ...aRes } : a));
      if (mRes) setMetricsMap(prev => ({ ...prev, [accountId]: mRes }));
    } catch (_) {}
    setSyncing(s => ({ ...s, [accountId]: false }));
  }, []);

  /* ── Per-account alert counts ── */
  const alertCountMap = useMemo(() => {
    const map = {};
    for (const acct of accounts) {
      const alerts = generateAlerts([acct], metricsMap, campaignsMap);
      map[acct.id] = alerts.length;
    }
    return map;
  }, [accounts, metricsMap, campaignsMap]);

  /* ── Per-account health ── */
  const healthMap = useMemo(() => {
    const map = {};
    for (const acct of accounts) {
      const camps = campaignsMap[acct.id] || [];
      const scores = camps.map(c => computeHealthScore(c));
      map[acct.id] = scores.includes('critical') ? 'critical' : scores.includes('warning') ? 'warning' : 'healthy';
    }
    return map;
  }, [accounts, campaignsMap]);

  /* ── Filtered + sorted accounts ── */
  const visibleAccounts = useMemo(() => {
    let result = [...accounts];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.google_customer_id || '').includes(q),
      );
    }
    if (healthFilter !== 'all') {
      result = result.filter(a => healthMap[a.id] === healthFilter);
    }

    result.sort((a, b) => {
      const mA = metricsMap[a.id]?.current || {};
      const mB = metricsMap[b.id]?.current || {};
      switch (sortBy) {
        case 'spend': return (mB.total_spend || 0) - (mA.total_spend || 0);
        case 'conversions': return (mB.conversions || 0) - (mA.conversions || 0);
        case 'cost_per_lead': return (mA.cost_per_lead || Infinity) - (mB.cost_per_lead || Infinity);
        case 'alerts': return (alertCountMap[b.id] || 0) - (alertCountMap[a.id] || 0);
        default: return (a.name || '').localeCompare(b.name || '');
      }
    });

    return result;
  }, [accounts, searchQuery, healthFilter, sortBy, metricsMap, healthMap, alertCountMap]);

  /* ── Summary stats ── */
  const summary = useMemo(() => {
    let curSpend = 0, prevSpend = 0, curConv = 0, prevConv = 0;
    const active = accounts.filter(a => a.status === 'active').length;

    for (const acct of accounts) {
      const d = metricsMap[acct.id];
      if (!d) continue;
      curSpend += d.current?.total_spend || 0;
      prevSpend += d.previous?.total_spend || 0;
      curConv += d.current?.conversions || 0;
      prevConv += d.previous?.conversions || 0;
    }

    const curCPL = curConv > 0 ? curSpend / curConv : 0;
    const prevCPL = prevConv > 0 ? prevSpend / prevConv : 0;

    return { total: accounts.length, active, curSpend, prevSpend, curConv, prevConv, curCPL, prevCPL };
  }, [accounts, metricsMap]);

  /* ── Health counts for filter badges ── */
  const healthCounts = useMemo(() => {
    const c = { healthy: 0, warning: 0, critical: 0 };
    for (const a of accounts) c[healthMap[a.id] || 'healthy']++;
    return c;
  }, [accounts, healthMap]);

  /* ── Render ── */
  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface mb-1">Managed Accounts</h2>
          <p className="text-on-surface-variant text-sm">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeComparison selected={dateRange} onChange={setDateRange} />
          <GradientButton onClick={() => setConnectModalOpen(true)}>
            <span className="material-symbols-outlined text-lg">add_link</span>
            Connect Account
          </GradientButton>
        </div>
      </div>

      {/* Summary Stats */}
      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Total Accounts" value={summary.total} icon="account_tree" />
          <SummaryCard label="Active Accounts" value={summary.active} icon="verified" />
          <SummaryCard label="Total Spend" value={summary.curSpend} prevValue={summary.prevSpend} icon="payments" format="currency" />
          <SummaryCard label="Avg. Cost/Conv" value={summary.curCPL} prevValue={summary.prevCPL} icon="target" format="currency" invert />
        </div>
      )}

      {/* Filter / Sort Bar */}
      {!loading && accounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-surface-container rounded-xl px-5 py-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <span className="material-symbols-outlined text-on-surface-variant text-sm absolute left-3 top-1/2 -translate-y-1/2">search</span>
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-container-high border-outline-variant/20"
            />
          </div>

          {/* Health filter */}
          <div className="flex items-center gap-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'critical', label: `Critical (${healthCounts.critical})`, dot: 'bg-error' },
              { key: 'warning', label: `Warning (${healthCounts.warning})`, dot: 'bg-amber-400' },
              { key: 'healthy', label: `Healthy (${healthCounts.healthy})`, dot: 'bg-secondary' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setHealthFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  healthFilter === f.key
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {f.dot && <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />}
                {f.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-outline-variant/20" />

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="text-xs py-1.5 px-2 rounded-lg bg-surface-container-high border-outline-variant/20"
          >
            <option value="name">Sort: Name</option>
            <option value="spend">Sort: Spend</option>
            <option value="cost_per_lead">Sort: Cost/Conv</option>
            <option value="conversions">Sort: Conversions</option>
            <option value="alerts">Sort: Alerts</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center rounded-lg bg-surface-container-high border border-outline-variant/10 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              title="Grid view"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>grid_view</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              title="List view"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>view_list</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <Skeleton key={i} variant="card" className="h-72" />)}
        </div>
      ) : accounts.length === 0 ? (
        /* Empty state */
        <div className="bg-surface-container rounded-xl p-16 text-center">
          <span className="material-symbols-outlined text-[56px] text-on-surface-variant/30 mb-4 block">account_balance</span>
          <p className="font-bold text-on-surface text-xl mb-2">No accounts connected yet</p>
          <p className="text-sm text-on-surface-variant mb-8 max-w-sm mx-auto">
            Connect a Google Ads account to start managing campaigns, tracking performance, and unlocking AI-powered insights.
          </p>
          <GradientButton onClick={() => setConnectModalOpen(true)}>
            <span className="material-symbols-outlined text-lg">add_link</span>
            Connect Your First Account
          </GradientButton>
        </div>
      ) : visibleAccounts.length === 0 ? (
        /* No matches */
        <div className="bg-surface-container rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 block mb-2">filter_list_off</span>
          <p className="text-sm text-on-surface-variant">No accounts match your filters</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid view */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleAccounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              metrics={metricsMap[account.id]}
              campaigns={campaignsMap[account.id]}
              alertCount={alertCountMap[account.id] || 0}
              syncing={syncing[account.id]}
              onSync={handleSync}
              onAudit={(id) => router.push(`/accounts/${id}?tab=audit`)}
            />
          ))}
        </div>
      ) : (
        /* List view */
        <div className="bg-surface-container rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  <th className="w-8 px-4 py-3" />
                  <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant">Account</th>
                  <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant">Status</th>
                  <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant">Last Sync</th>
                  <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant">Spend</th>
                  <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant">Conv.</th>
                  <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant">Cost/Conv</th>
                  <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant">CTR</th>
                  <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant">Search IS</th>
                  <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant">Alerts</th>
                  <th className="w-20 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visibleAccounts.map(account => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    metrics={metricsMap[account.id]}
                    campaigns={campaignsMap[account.id]}
                    alertCount={alertCountMap[account.id] || 0}
                    syncing={syncing[account.id]}
                    onSync={handleSync}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Connect Modal */}
      <ConnectAccountModal open={connectModalOpen} onClose={() => setConnectModalOpen(false)} />
    </div>
  );
}
