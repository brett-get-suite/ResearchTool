'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

// ─── Format helpers ──────────────────────────────────────────────────────────

// Dollars → "$X,XXX" (no decimals)
const fmtCost = (dollars) =>
  '$' + (dollars || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

// Raw customer ID → XXX-XXX-XXXX
const fmtCustomerId = (id) =>
  id ? String(id).replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') : '';

// Relative time
function relativeTime(iso) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// Truncate string
const truncate = (str, n) => (str && str.length > n ? str.slice(0, n) + '…' : str || '');

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CLS = {
  active:       'bg-emerald-50 text-emerald-600',
  connecting:   'bg-amber-50 text-amber-600',
  paused:       'bg-slate-100 text-slate-500',
  disconnected: 'bg-red-50 text-red-600',
  enabled:      'bg-emerald-50 text-emerald-600',
  removed:      'bg-red-50 text-red-600',
};

function StatusBadge({ status }) {
  const cls = STATUS_CLS[status?.toLowerCase()] || 'bg-slate-100 text-slate-500';
  return (
    <span className={`text-[10px] font-label font-bold px-2.5 py-1 rounded-full capitalize ${cls}`}>
      {status || 'unknown'}
    </span>
  );
}

// ─── Agent icon map ───────────────────────────────────────────────────────────

const AGENT_ICON = {
  bid_optimizer:     'trending_up',
  ad_copy:           'edit_note',
  budget_manager:    'payments',
  keyword_harvester: 'key_visualizer',
  audit:             'speed',
  default:           'smart_toy',
};

function agentIcon(type) {
  return AGENT_ICON[type] || AGENT_ICON.default;
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: 'dashboard' },
  { id: 'campaigns',  label: 'Campaigns',  icon: 'campaign' },
  { id: 'keywords',   label: 'Keywords',   icon: 'key_visualizer' },
  { id: 'adcopy',     label: 'Ad Copy',    icon: 'edit_note' },
  { id: 'budget',     label: 'Budget',     icon: 'payments' },
  { id: 'changelog',  label: 'Change Log', icon: 'history' },
  { id: 'audit',      label: 'Audit',      icon: 'speed' },
  { id: 'settings',   label: 'Settings',   icon: 'settings' },
];

export default function AccountPage({ params }) {
  const { id } = use(params);

  // ── State ──────────────────────────────────────────────────────────────────
  const [account, setAccount]     = useState(null);
  const [metrics, setMetrics]     = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [keywords, setKeywords]   = useState([]);
  const [ads, setAds]             = useState([]);
  const [actions, setActions]     = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [loadedTabs, setLoadedTabs] = useState(new Set(['overview']));

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const run = async () => {
      setLoading(true);
      try {
        const [accountRes, metricsRes] = await Promise.all([
          fetch(`/api/accounts/${id}`, { signal }).then(r => r.json()),
          fetch(`/api/accounts/${id}/metrics`, { signal }).then(r => r.json()).catch(() => null),
        ]);
        setAccount(accountRes);
        setMetrics(metricsRes);

        // Overview + Campaigns tabs load campaigns on mount
        const [campaignsRes, actionsRes] = await Promise.all([
          fetch(`/api/accounts/${id}/campaigns`, { signal }).then(r => r.json()).catch(() => []),
          fetch(`/api/accounts/${id}/actions?limit=10`, { signal }).then(r => r.json()).catch(() => []),
        ]);
        setCampaigns(Array.isArray(campaignsRes) ? campaignsRes : []);
        setActions(Array.isArray(actionsRes) ? actionsRes : []);
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Failed to load account:', err);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [id]);

  // ── Lazy tab data loading ──────────────────────────────────────────────────
  const loadTabData = useCallback(async (tab) => {
    if (tab === 'keywords') {
      fetch(`/api/accounts/${id}/keywords`)
        .then(r => r.json())
        .then(d => setKeywords(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
    if (tab === 'adcopy') {
      fetch(`/api/accounts/${id}/ads`)
        .then(r => r.json())
        .then(d => setAds(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
    if (tab === 'changelog') {
      fetch(`/api/accounts/${id}/actions?limit=100`)
        .then(r => r.json())
        .then(d => setActions(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
  }, [id]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (!loadedTabs.has(tab)) {
      setLoadedTabs(prev => new Set([...prev, tab]));
      loadTabData(tab);
    }
  };

  // ── Sync handler ───────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch(`/api/accounts/${id}/sync`, { method: 'POST' });
      const [accountRes, metricsRes, campaignsRes] = await Promise.all([
        fetch(`/api/accounts/${id}`).then(r => r.json()),
        fetch(`/api/accounts/${id}/metrics`).then(r => r.json()).catch(() => null),
        fetch(`/api/accounts/${id}/campaigns`).then(r => r.json()).catch(() => []),
      ]);
      setAccount(accountRes);
      setMetrics(metricsRes);
      setCampaigns(Array.isArray(campaignsRes) ? campaignsRes : []);
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  // ── Undo action ────────────────────────────────────────────────────────────
  const handleUndo = async (actionId) => {
    try {
      const res = await fetch(`/api/accounts/${id}/actions/${actionId}/undo`, { method: 'POST' });
      if (!res.ok) throw new Error('Undo failed');
      setActions(prev => prev.map(a => a.id === actionId ? { ...a, status: 'undone' } : a));
    } catch (err) {
      console.error('Undo error:', err);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined text-primary text-[40px] animate-spin">progress_activity</span>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="px-8 py-10 text-center">
        <p className="font-headline font-bold text-on-surface mb-2">Account not found</p>
        <Link href="/accounts" className="pill-btn-primary text-sm">Back to Accounts</Link>
      </div>
    );
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const acctMetrics = metrics?.account;
  const topCampaigns = [...campaigns]
    .sort((a, b) => (b.cost || 0) - (a.cost || 0))
    .slice(0, 5);

  const sortedKeywords = [...keywords].sort((a, b) => (b.cost || 0) - (a.cost || 0));

  // Group ads by campaign → ad group
  const adsByCampaign = ads.reduce((acc, ad) => {
    const cName = ad.campaignName || ad.campaign_name || 'Unknown Campaign';
    const gName = ad.adGroupName || ad.ad_group_name || 'Unknown Ad Group';
    if (!acc[cName]) acc[cName] = {};
    if (!acc[cName][gName]) acc[cName][gName] = [];
    acc[cName][gName].push(ad);
    return acc;
  }, {});

  // Budget tab data
  const totalDailyBudget = campaigns.reduce((s, c) => s + (c.budgetAmountMicros || 0) / 1_000_000, 0);
  const totalCost = campaigns.reduce((s, c) => s + (c.cost || 0), 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="px-8 py-10">

      {/* ── Header ── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/accounts" className="flex items-center gap-1 text-xs text-secondary hover:text-primary mb-2 w-fit">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Back to Accounts
          </Link>
          <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight">
            {account.name || 'Unnamed Account'}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-secondary text-sm font-label">
              {fmtCustomerId(account.google_customer_id)}
            </span>
            <StatusBadge status={account.status} />
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="pill-btn-secondary disabled:opacity-60 shrink-0"
        >
          <span className={`material-symbols-outlined text-[18px] ${syncing ? 'animate-spin' : ''}`}>
            {syncing ? 'progress_activity' : 'sync'}
          </span>
          {syncing ? 'Syncing…' : 'Sync'}
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: 'visibility',      label: 'Impressions',  value: (acctMetrics?.impressions || 0).toLocaleString() },
          { icon: 'ads_click',       label: 'Clicks',       value: (acctMetrics?.clicks || 0).toLocaleString() },
          { icon: 'attach_money',    label: 'Cost',         value: fmtCost((acctMetrics?.cost_micros || 0) / 1_000_000) },
          { icon: 'conversion_path', label: 'Conversions',  value: (acctMetrics?.conversions || 0).toLocaleString() },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <span className="material-symbols-outlined text-primary text-[20px]">{s.icon}</span>
            <p className="text-2xl font-headline font-bold text-on-surface mt-1">{s.value}</p>
            <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 mb-0 border-b border-outline-variant/15 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-label font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
              activeTab === t.id
                ? 'text-primary border-primary'
                : 'text-secondary border-transparent hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="mt-6">

        {/* ════ Overview ════ */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Recent Agent Activity */}
            <div className="card p-5">
              <h2 className="text-xl font-headline font-bold text-on-surface mb-4">Recent Agent Activity</h2>
              {actions.length === 0 ? (
                <p className="text-secondary text-sm">No recent activity.</p>
              ) : (
                <ul className="space-y-3">
                  {actions.slice(0, 10).map(action => (
                    <li key={action.id} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                        {agentIcon(action.agent_type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-on-surface leading-snug">{action.description || action.action_type}</p>
                        <p className="text-xs text-secondary mt-0.5">{relativeTime(action.created_at)}</p>
                      </div>
                      <StatusBadge status={action.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Top Campaigns */}
            <div className="card p-5">
              <h2 className="text-xl font-headline font-bold text-on-surface mb-4">Top Campaigns</h2>
              {topCampaigns.length === 0 ? (
                <p className="text-secondary text-sm">No campaign data loaded yet.</p>
              ) : (
                <ul className="space-y-3">
                  {topCampaigns.map(c => (
                    <li key={c.id} className="flex items-center gap-3 border-b border-outline-variant/10 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-on-surface truncate">{c.name}</p>
                      </div>
                      <StatusBadge status={c.status?.toLowerCase()} />
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-on-surface">{fmtCost(c.cost)}</p>
                        <p className="text-[10px] text-secondary">{c.conversions || 0} conv.</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ════ Campaigns ════ */}
        {activeTab === 'campaigns' && (
          <div className="card overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-outline-variant/10">
              <h2 className="text-xl font-headline font-bold text-on-surface">Campaigns</h2>
              <Link href={`/accounts/${id}/campaigns/new`} className="pill-btn-primary text-sm">
                <span className="material-symbols-outlined text-[16px]">add</span>
                Create Campaign
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Type</th>
                    <th>Daily Budget</th>
                    <th>Clicks</th>
                    <th>Cost</th>
                    <th>Conversions</th>
                    <th>CPA</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-secondary py-8">No campaigns found.</td>
                    </tr>
                  ) : campaigns.map(c => {
                    const budget = (c.budgetAmountMicros || 0) / 1_000_000;
                    const cpa = c.conversions > 0 ? c.cost / c.conversions : null;
                    return (
                      <tr key={c.id}>
                        <td className="font-medium text-on-surface max-w-[220px] truncate">{c.name}</td>
                        <td><StatusBadge status={c.status?.toLowerCase()} /></td>
                        <td className="text-secondary text-xs">{c.advertisingChannelType || c.type || '—'}</td>
                        <td className="font-mono text-sm">${budget.toFixed(2)}/day</td>
                        <td className="font-mono text-sm">{(c.clicks || 0).toLocaleString()}</td>
                        <td className="font-mono text-sm">{fmtCost(c.cost)}</td>
                        <td className="font-mono text-sm">{(c.conversions || 0).toLocaleString()}</td>
                        <td className="font-mono text-sm">{cpa !== null ? fmtCost(cpa) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════ Keywords ════ */}
        {activeTab === 'keywords' && (
          <div className="card overflow-hidden">
            <div className="p-5 border-b border-outline-variant/10">
              <h2 className="text-xl font-headline font-bold text-on-surface">Keywords</h2>
              <p className="text-secondary text-sm mt-0.5">Sorted by cost descending · {keywords.length} keywords</p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Keyword</th>
                    <th>Match Type</th>
                    <th>Campaign</th>
                    <th>Ad Group</th>
                    <th>Status</th>
                    <th>Bid</th>
                    <th>QS</th>
                    <th>Clicks</th>
                    <th>Cost</th>
                    <th>Conv.</th>
                    <th>CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedKeywords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center text-secondary py-8">No keywords loaded yet.</td>
                    </tr>
                  ) : sortedKeywords.map((kw, i) => {
                    const bid = (kw.cpcBidMicros || 0) / 1_000_000;
                    const ctr = kw.impressions > 0 ? ((kw.clicks / kw.impressions) * 100).toFixed(1) + '%' : '—';
                    return (
                      <tr key={kw.id || i}>
                        <td className="font-medium text-on-surface">{kw.text || kw.keyword_text || '—'}</td>
                        <td className="text-secondary text-xs capitalize">{kw.matchType?.toLowerCase() || kw.match_type || '—'}</td>
                        <td className="text-secondary text-xs max-w-[140px] truncate">{kw.campaignName || kw.campaign_name || '—'}</td>
                        <td className="text-secondary text-xs max-w-[120px] truncate">{kw.adGroupName || kw.ad_group_name || '—'}</td>
                        <td><StatusBadge status={kw.status?.toLowerCase()} /></td>
                        <td className="font-mono text-sm">${bid.toFixed(2)}</td>
                        <td className="font-mono text-sm">{kw.qualityScore || kw.quality_score || '—'}</td>
                        <td className="font-mono text-sm">{(kw.clicks || 0).toLocaleString()}</td>
                        <td className="font-mono text-sm">${(kw.cost || 0).toFixed(2)}</td>
                        <td className="font-mono text-sm">{(kw.conversions || 0).toLocaleString()}</td>
                        <td className="font-mono text-sm">{ctr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════ Ad Copy ════ */}
        {activeTab === 'adcopy' && (
          <div className="space-y-6">
            <h2 className="text-xl font-headline font-bold text-on-surface">Ad Copy</h2>
            {ads.length === 0 ? (
              <div className="card p-10 text-center">
                <span className="material-symbols-outlined text-[40px] text-outline-variant mb-3">edit_note</span>
                <p className="text-secondary text-sm">No ads loaded yet.</p>
              </div>
            ) : (
              Object.entries(adsByCampaign).map(([campaignName, adGroups]) => (
                <div key={campaignName} className="card overflow-hidden">
                  <div className="px-5 py-3 bg-surface-high border-b border-outline-variant/10">
                    <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Campaign</p>
                    <p className="font-medium text-on-surface">{campaignName}</p>
                  </div>
                  {Object.entries(adGroups).map(([groupName, groupAds]) => (
                    <div key={groupName} className="border-b border-outline-variant/10 last:border-b-0">
                      <div className="px-5 py-2 bg-surface-lowest border-b border-outline-variant/5">
                        <p className="text-xs text-secondary font-label font-semibold">Ad Group: {groupName}</p>
                      </div>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Headlines</th>
                            <th>Descriptions</th>
                            <th>Status</th>
                            <th>Final URL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupAds.map((ad, i) => {
                            const headlines = (ad.headlines || ad.responsive_search_ad?.headlines || []).slice(0, 3).map(h => h.text || h).join(', ');
                            const descs = (ad.descriptions || ad.responsive_search_ad?.descriptions || []).slice(0, 2).map(d => d.text || d).join(' · ');
                            const finalUrl = ad.finalUrls?.[0] || ad.final_urls?.[0] || ad.finalUrl || '—';
                            return (
                              <tr key={ad.id || i}>
                                <td className="text-sm text-on-surface max-w-[260px]">{headlines || '—'}</td>
                                <td className="text-sm text-secondary max-w-[260px]">{descs || '—'}</td>
                                <td><StatusBadge status={ad.status?.toLowerCase()} /></td>
                                <td className="text-xs text-secondary font-mono">{truncate(finalUrl, 40)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* ════ Budget ════ */}
        {activeTab === 'budget' && (
          <div className="card overflow-hidden">
            <div className="p-5 border-b border-outline-variant/10">
              <h2 className="text-xl font-headline font-bold text-on-surface">Budget Breakdown</h2>
              <p className="text-secondary text-sm mt-0.5">Daily budgets and 30-day spend estimates</p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Daily Budget</th>
                    <th>Est. Monthly</th>
                    <th>Cost (30d)</th>
                    <th>% Used</th>
                    <th className="w-40">Spend vs Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-secondary py-8">No campaign data.</td>
                    </tr>
                  ) : campaigns.map(c => {
                    const daily = (c.budgetAmountMicros || 0) / 1_000_000;
                    const monthly = daily * 30.4;
                    const cost = c.cost || 0;
                    const pct = monthly > 0 ? Math.round((cost / monthly) * 100) : 0;
                    return (
                      <tr key={c.id}>
                        <td className="font-medium text-on-surface max-w-[200px] truncate">{c.name}</td>
                        <td className="font-mono text-sm">${daily.toFixed(2)}/day</td>
                        <td className="font-mono text-sm">{fmtCost(monthly)}</td>
                        <td className="font-mono text-sm">{fmtCost(cost)}</td>
                        <td className={`font-mono text-sm font-bold ${pct > 100 ? 'text-red-600' : pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {pct}%
                        </td>
                        <td>
                          <div className="w-full bg-surface-high rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${pct > 100 ? 'bg-red-500' : 'bg-primary'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  {campaigns.length > 0 && (() => {
                    const totalMonthly = totalDailyBudget * 30.4;
                    const totalPct = totalMonthly > 0 ? Math.round((totalCost / totalMonthly) * 100) : 0;
                    return (
                      <tr className="bg-surface-high font-bold">
                        <td className="text-on-surface">Total</td>
                        <td className="font-mono text-sm">${totalDailyBudget.toFixed(2)}/day</td>
                        <td className="font-mono text-sm">{fmtCost(totalMonthly)}</td>
                        <td className="font-mono text-sm">{fmtCost(totalCost)}</td>
                        <td className="font-mono text-sm">{totalPct}%</td>
                        <td>
                          <div className="w-full bg-surface-dim rounded-full h-2">
                            <div className={`h-2 rounded-full transition-all ${totalPct > 100 ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${Math.min(totalPct, 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════ Change Log ════ */}
        {activeTab === 'changelog' && (
          <div className="card overflow-hidden">
            <div className="p-5 border-b border-outline-variant/10">
              <h2 className="text-xl font-headline font-bold text-on-surface">Change Log</h2>
              <p className="text-secondary text-sm mt-0.5">Last 100 agent actions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {actions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-secondary py-8">No actions recorded.</td>
                    </tr>
                  ) : actions.map(action => (
                    <tr key={action.id} className={action.status === 'undone' ? 'opacity-40' : ''}>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-primary text-[14px]">{agentIcon(action.agent_type)}</span>
                          <span className="text-xs text-secondary capitalize">{action.agent_type?.replace(/_/g, ' ') || '—'}</span>
                        </div>
                      </td>
                      <td className="text-xs text-on-surface capitalize">{action.action_type?.replace(/_/g, ' ') || '—'}</td>
                      <td className="text-xs text-secondary">{action.entity_type || '—'}</td>
                      <td className="text-sm text-on-surface max-w-[280px]">{action.description || '—'}</td>
                      <td><StatusBadge status={action.status} /></td>
                      <td className="text-xs text-secondary whitespace-nowrap">{relativeTime(action.created_at)}</td>
                      <td>
                        {action.status === 'applied' && (
                          <button
                            onClick={() => handleUndo(action.id)}
                            className="pill-btn-ghost text-xs py-1"
                          >
                            <span className="material-symbols-outlined text-[13px]">undo</span>
                            Undo
                          </button>
                        )}
                        {action.status === 'undone' && (
                          <span className="text-[10px] text-secondary">Undone</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════ Audit ════ */}
        {activeTab === 'audit' && (
          <AuditTab account={account} id={id} setAccount={setAccount} />
        )}

        {/* ════ Settings ════ */}
        {activeTab === 'settings' && (
          <SettingsTab account={account} id={id} setAccount={setAccount} />
        )}

      </div>
    </div>
  );
}

// ─── Audit Tab ────────────────────────────────────────────────────────────────

function AuditTab({ account, id, setAccount }) {
  const [running, setRunning] = useState(false);
  const [completedMessage, setCompletedMessage] = useState('');
  const audit = account?.audit_data;

  const runAudit = async () => {
    setRunning(true);
    setCompletedMessage('');
    try {
      await fetch('/api/agents/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: id }),
      });
      const res = await fetch(`/api/accounts/${id}`);
      const updated = await res.json();
      setAccount(updated);
      setCompletedMessage('Audit complete — results updated.');
      setTimeout(() => setCompletedMessage(''), 3000);
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setRunning(false);
    }
  };

  if (!audit) {
    return (
      <div className="space-y-4">
        {completedMessage && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-medium">
            {completedMessage}
          </div>
        )}
        <div className="card p-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">speed</span>
          <p className="font-headline font-bold text-on-surface text-xl mb-2">No audit data yet</p>
          <p className="text-secondary text-sm mb-6 max-w-sm mx-auto">
            Run an audit to get a health score, identify issues, and receive AI-powered recommendations.
          </p>
          <button onClick={runAudit} disabled={running} className="pill-btn-primary disabled:opacity-60">
            <span className={`material-symbols-outlined text-[18px] ${running ? 'animate-spin' : ''}`}>
              {running ? 'progress_activity' : 'play_arrow'}
            </span>
            {running ? 'Running Audit…' : 'Run Audit'}
          </button>
        </div>
      </div>
    );
  }

  const score = audit.health_score ?? audit.healthScore ?? 0;
  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
  const issues = audit.issues || [];
  const recommendations = audit.recommendations || [];

  const severityBadge = (sev) => {
    const s = sev?.toLowerCase();
    if (s === 'high' || s === 'critical') return 'bg-red-50 text-red-600';
    if (s === 'medium') return 'bg-amber-50 text-amber-600';
    return 'bg-slate-100 text-slate-500';
  };

  const priorityBadge = (p) => {
    const lp = p?.toLowerCase();
    if (lp === 'high') return 'bg-red-50 text-red-600';
    if (lp === 'medium') return 'bg-amber-50 text-amber-600';
    return 'bg-emerald-50 text-emerald-600';
  };

  return (
    <div className="space-y-6">
      {completedMessage && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-medium">
          {completedMessage}
        </div>
      )}
      {/* Health score */}
      <div className="card p-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1">Account Health Score</p>
          <p className={`text-6xl font-headline font-bold ${scoreColor}`}>{score}</p>
          <p className="text-secondary text-sm mt-1">out of 100</p>
        </div>
        <button onClick={runAudit} disabled={running} className="pill-btn-secondary disabled:opacity-60">
          <span className={`material-symbols-outlined text-[18px] ${running ? 'animate-spin' : ''}`}>
            {running ? 'progress_activity' : 'refresh'}
          </span>
          {running ? 'Running…' : 'Re-run Audit'}
        </button>
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div className="card p-5">
          <h3 className="text-xl font-headline font-bold text-on-surface mb-4">Issues ({issues.length})</h3>
          <ul className="space-y-3">
            {issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-3 border-b border-outline-variant/10 pb-3 last:border-b-0 last:pb-0">
                <span className={`text-[10px] font-label font-bold px-2.5 py-1 rounded-full capitalize shrink-0 ${severityBadge(issue.severity)}`}>
                  {issue.severity || 'info'}
                </span>
                <p className="text-sm text-on-surface">{issue.description || issue.message || String(issue)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="card p-5">
          <h3 className="text-xl font-headline font-bold text-on-surface mb-4">Recommendations ({recommendations.length})</h3>
          <ul className="space-y-3">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3 border-b border-outline-variant/10 pb-3 last:border-b-0 last:pb-0">
                <span className={`text-[10px] font-label font-bold px-2.5 py-1 rounded-full capitalize shrink-0 ${priorityBadge(rec.priority)}`}>
                  {rec.priority || 'low'}
                </span>
                <p className="text-sm text-on-surface">{rec.description || rec.message || String(rec)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ account, id, setAccount }) {
  const settings = account?.settings || {};
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(account?.settings || {});
  }, [account?.settings]);

  const agentTypes = [
    { key: 'bid_optimizer',     label: 'Bid Optimizer',     icon: 'trending_up' },
    { key: 'ad_copy',           label: 'Ad Copy Agent',     icon: 'edit_note' },
    { key: 'budget_manager',    label: 'Budget Manager',    icon: 'payments' },
    { key: 'keyword_harvester', label: 'Keyword Harvester', icon: 'key_visualizer' },
  ];

  const toggleAgent = (key) => {
    setLocalSettings(prev => ({
      ...prev,
      agents: {
        ...(prev.agents || {}),
        [key]: !(prev.agents?.[key] ?? true),
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: localSettings }),
      });
      const updated = await res.json();
      setAccount(prev => ({ ...prev, ...updated }));
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Agent toggles */}
      <div className="card p-5">
        <h2 className="text-xl font-headline font-bold text-on-surface mb-4">Agent Settings</h2>
        <ul className="space-y-3">
          {agentTypes.map(agent => {
            const enabled = localSettings.agents?.[agent.key] ?? true;
            return (
              <li key={agent.key} className="flex items-center justify-between py-2 border-b border-outline-variant/10 last:border-b-0">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[18px]">{agent.icon}</span>
                  <span className="text-sm font-medium text-on-surface">{agent.label}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={enabled}
                    onChange={() => toggleAgent(agent.key)}
                  />
                  <div className="w-10 h-5 bg-surface-high peer-checked:bg-primary rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Raw settings JSON */}
      <div className="card p-5">
        <h3 className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Raw Settings</h3>
        <pre className="text-xs text-secondary bg-surface-high rounded-lg p-4 overflow-x-auto leading-relaxed">
          {JSON.stringify(localSettings, null, 2)}
        </pre>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="pill-btn-primary disabled:opacity-60"
      >
        <span className={`material-symbols-outlined text-[18px] ${saving ? 'animate-spin' : ''}`}>
          {saving ? 'progress_activity' : 'save'}
        </span>
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
}
