'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import StatCard from '@/components/dashboard/StatCard';
import SpendChart from '@/components/dashboard/SpendChart';
import ConversionsChart from '@/components/dashboard/ConversionsChart';
import CampaignTable from '@/components/dashboard/CampaignTable';
import KeywordTable from '@/components/dashboard/KeywordTable';
import AdCopyPanel from '@/components/dashboard/AdCopyPanel';
import ChangeLogTab from '@/components/dashboard/ChangeLogTab';
import AuditTab from '@/components/dashboard/AuditTab';
import AccountSettings from '@/components/dashboard/AccountSettings';
import ReportUpload from '@/components/upload/ReportUpload';
import { StatCardSkeleton, TableSkeleton } from '@/components/Skeleton';
import ErrorBoundary from '@/components/ErrorBoundary';

// ─── Format helpers ──────────────────────────────────────────────────────────

// Dollars → "$X,XXX" (no decimals)
const fmtCost = (dollars) =>
  '$' + (dollars || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

// Raw customer ID → XXX-XXX-XXXX
const fmtCustomerId = (id) =>
  id ? String(id).replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') : '';

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

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: 'dashboard' },
  { id: 'campaigns',  label: 'Campaigns',  icon: 'campaign' },
  { id: 'keywords',   label: 'Keywords',   icon: 'key_visualizer' },
  { id: 'adcopy',     label: 'Ad Copy',    icon: 'edit_note' },
  { id: 'uploads',    label: 'Uploads',    icon: 'upload_file' },
  { id: 'changelog',  label: 'Change Log', icon: 'history' },
  { id: 'audit',      label: 'Audit',      icon: 'speed' },
  { id: 'settings',   label: 'Settings',   icon: 'settings' },
];

export default function AccountPage({ params }) {
  const { id } = params;

  // ── State ──────────────────────────────────────────────────────────────────
  const [account, setAccount]     = useState(null);
  const [metrics, setMetrics]     = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [keywords, setKeywords]   = useState([]);
  const [ads, setAds]             = useState([]);
  const [actions, setActions]     = useState([]);
  const [uploads, setUploads]     = useState([]);
  const [analyses,       setAnalyses]       = useState([]);
  const [selectedUploads, setSelectedUploads] = useState(new Set());
  const [analyzing,      setAnalyzing]      = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [loadedTabs, setLoadedTabs] = useState(new Set(['overview']));
  const [dateRange, setDateRange] = useState('LAST_30_DAYS');
  const [runningAudit, setRunningAudit] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const run = async () => {
      setLoading(true);
      try {
        const [accountRes, actionsRes] = await Promise.all([
          fetch(`/api/accounts/${id}`, { signal }).then(r => r.json()),
          fetch(`/api/accounts/${id}/actions?limit=10`, { signal }).then(r => r.json()).catch(() => []),
        ]);
        setAccount(accountRes);
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

  // ── Date range re-fetch ────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setMetricsLoading(true);
    Promise.all([
      fetch(`/api/accounts/${id}/metrics?range=${dateRange}`, { signal: controller.signal }).then(r => r.json()).catch(() => null),
      fetch(`/api/accounts/${id}/campaigns?range=${dateRange}`, { signal: controller.signal }).then(r => r.json()).catch(() => []),
    ]).then(([m, c]) => {
      setMetrics(m);
      setCampaigns(Array.isArray(c) ? c : []);
    }).catch(() => {}).finally(() => setMetricsLoading(false));
    return () => controller.abort();
  }, [id, dateRange]);

  // ── Reset loaded tabs on account change ───────────────────────────────────
  useEffect(() => {
    setLoadedTabs(new Set(['overview']));
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
    if (tab === 'uploads') {
      Promise.all([
        fetch(`/api/reports/${id}`).then(r => r.json()).catch(() => []),
        fetch(`/api/reports/${id}/analyses`).then(r => r.json()).catch(() => []),
      ]).then(([u, a]) => {
        setUploads(Array.isArray(u) ? u : []);
        setAnalyses(Array.isArray(a) ? a : []);
      });
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
        fetch(`/api/accounts/${id}/metrics?range=${dateRange}`).then(r => r.json()).catch(() => null),
        fetch(`/api/accounts/${id}/campaigns?range=${dateRange}`).then(r => r.json()).catch(() => []),
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

  // ── Run AI audit ───────────────────────────────────────────────────────────
  const handleRunAudit = async () => {
    setRunningAudit(true);
    try {
      await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'audit', accountId: id }),
      });
      handleTabChange('audit');
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setRunningAudit(false);
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
      {metricsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
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
      )}

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
        <ErrorBoundary key={activeTab}>

        {/* ════ Overview ════ */}
        {activeTab === 'overview' && (
          <div>
            {/* Date range selector + account name */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-headline font-bold text-on-surface">{account?.name}</h1>
                <p className="text-xs text-secondary font-label mt-0.5">{fmtCustomerId(account?.customer_id)}</p>
              </div>
              <div className="flex gap-1 bg-surface-low rounded-xl p-1">
                {[['LAST_7_DAYS','7d'],['LAST_30_DAYS','30d'],['LAST_90_DAYS','90d']].map(([val, label]) => (
                  <button key={val} onClick={() => setDateRange(val)}
                    className={`text-xs font-label font-semibold px-3 py-1.5 rounded-lg transition-colors ${dateRange === val ? 'bg-primary text-white' : 'text-secondary hover:text-on-surface'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hero stats */}
            {metricsLoading ? (
              <div className="grid grid-cols-5 gap-4 mb-6">
                {[1,2,3,4,5].map(i => <StatCardSkeleton key={i} />)}
              </div>
            ) : (
              (() => {
                const totalCost = metrics?.total_cost ?? campaigns.reduce((s, c) => s + (c.cost || 0), 0);
                const conversions = metrics?.conversions ?? campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
                const clicks = metrics?.total_clicks ?? campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
                const totalBudget = campaigns.reduce((s, c) => s + (c.daily_budget || 0), 0) * 30;
                const budgetUsedPct = totalBudget > 0 ? (totalCost / totalBudget) * 100 : 0;
                const cpl = conversions > 0 ? totalCost / conversions : null;
                const avgCpc = clicks > 0 ? totalCost / clicks : null;
                return (
                  <div className="grid grid-cols-5 gap-4 mb-6">
                    <StatCard label="Cost Per Lead" value={cpl ? `$${cpl.toFixed(2)}` : '—'} subvalue="Primary metric" color="primary" />
                    <StatCard label="Total Spend" value={fmtCost(totalCost)} />
                    <StatCard label="Conversions" value={conversions} subvalue="Leads" color="gold" />
                    <StatCard label="Budget Used"
                      value={`${Math.round(budgetUsedPct)}%`}
                      subvalue={`${fmtCost(totalCost)} of ${fmtCost(totalBudget)}`}
                      progress={budgetUsedPct}
                      progressColor={budgetUsedPct > 90 ? 'red' : budgetUsedPct > 75 ? 'yellow' : 'primary'}
                    />
                    <StatCard label="Avg CPC" value={avgCpc ? `$${avgCpc.toFixed(2)}` : '—'} />
                  </div>
                );
              })()
            )}

            {/* Charts */}
            {(() => {
              const snapshots = metrics?.snapshots || [];
              const spendData = snapshots.map(s => ({ date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), spend: s.total_cost || 0 }));
              const convData = snapshots.map(s => ({ date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), conversions: s.conversions || 0 }));
              const fallbackSpend = spendData.length === 0 ? [{ date: 'Current', spend: campaigns.reduce((s, c) => s + (c.cost || 0), 0) }] : spendData;
              const fallbackConv = convData.length === 0 ? [{ date: 'Current', conversions: campaigns.reduce((s, c) => s + (c.conversions || 0), 0) }] : convData;
              return (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <SpendChart data={fallbackSpend} loading={metricsLoading} />
                  <ConversionsChart data={fallbackConv} loading={metricsLoading} />
                </div>
              );
            })()}

            {/* Campaign table */}
            <div className="mb-4">
              <h2 className="text-sm font-headline font-bold text-on-surface mb-3">Campaigns</h2>
              {metricsLoading ? <TableSkeleton rows={3} cols={7} /> : <CampaignTable campaigns={campaigns} accountId={id} onRefresh={handleSync} />}
            </div>

            {/* Action bar */}
            <div className="flex gap-3 pt-2">
              <button onClick={handleSync} disabled={syncing} className="pill-btn-primary">
                <span className={`material-symbols-outlined text-[16px] ${syncing ? 'animate-spin' : ''}`}>
                  {syncing ? 'progress_activity' : 'sync'}
                </span>
                {syncing ? 'Syncing…' : 'Sync Data'}
              </button>
              <button onClick={handleRunAudit} disabled={runningAudit} className="pill-btn-secondary">
                <span className={`material-symbols-outlined text-[16px] ${runningAudit ? 'animate-spin' : ''}`}>
                  {runningAudit ? 'progress_activity' : 'security'}
                </span>
                {runningAudit ? 'Running Audit…' : 'Run AI Audit'}
              </button>
            </div>
          </div>
        )}

        {/* ════ Campaigns ════ */}
        {activeTab === 'campaigns' && (
          <div>
            <CampaignTable campaigns={campaigns} accountId={id} onRefresh={handleSync} />
            <div className="mt-4">
              <a href={`/accounts/${id}/campaigns/new`} className="pill-btn-secondary inline-flex">
                <span className="material-symbols-outlined text-[16px]">add</span>
                Create Campaign
              </a>
            </div>
          </div>
        )}

        {/* ════ Keywords ════ */}
        {activeTab === 'keywords' && (
          <KeywordTable
            keywords={keywords}
            accountId={id}
            agentSuggestions={actions
              .filter(a => a.agent_type === 'keyword' && a.keyword)
              .map(a => ({ keyword: a.keyword, suggestion: a.description || 'Review suggested' }))
            }
            onRefresh={() => {
              fetch(`/api/accounts/${id}/keywords`).then(r => r.json()).then(d => setKeywords(Array.isArray(d) ? d : []));
            }}
          />
        )}

        {/* ════ Ad Copy ════ */}
        {activeTab === 'adcopy' && (
          <AdCopyPanel ads={ads} accountId={id} />
        )}

        {/* ════ Change Log ════ */}
        {activeTab === 'changelog' && (
          <ChangeLogTab actions={actions} accountId={id} onUndo={() => {
            fetch(`/api/accounts/${id}/actions?limit=100`).then(r => r.json()).then(d => setActions(Array.isArray(d) ? d : []));
          }} />
        )}

        {/* ════ Audit ════ */}
        {activeTab === 'audit' && (
          <AuditTab auditData={account?.audit_data ?? account?.lastAudit} accountId={id} onRerun={() => {
            fetch(`/api/accounts/${id}`).then(r => r.json()).then(setAccount);
          }} />
        )}

        {/* ════ Uploads ════ */}
        {activeTab === 'uploads' && (
          <div className="space-y-8">
            <div>
              <p className="font-headline font-bold text-on-surface text-lg mb-1">Report Uploads</p>
              <p className="text-sm text-secondary font-label">
                Upload Google Ads CSV exports to enable data-driven analysis. Select one or more uploads and run an audit to combine them.
              </p>
            </div>

            <ReportUpload
              accountId={id}
              onUploadComplete={() => {
                Promise.all([
                  fetch(`/api/reports/${id}`).then(r => r.json()).catch(() => []),
                  fetch(`/api/reports/${id}/analyses`).then(r => r.json()).catch(() => []),
                ]).then(([u, a]) => {
                  setUploads(Array.isArray(u) ? u : []);
                  setAnalyses(Array.isArray(a) ? a : []);
                });
              }}
            />

            {/* Upload history with multi-select */}
            {uploads.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-label font-semibold text-on-surface text-sm">
                    Upload History
                    {selectedUploads.size > 0 && (
                      <span className="ml-2 text-secondary font-normal">({selectedUploads.size} selected)</span>
                    )}
                  </p>
                  {selectedUploads.size > 0 && (
                    <button
                      disabled={analyzing}
                      onClick={async () => {
                        setAnalyzing(true);
                        try {
                          const res = await fetch(`/api/reports/${id}/analyze`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ uploadIds: Array.from(selectedUploads) }),
                          });
                          const data = await res.json();
                          if (res.ok && data.analysisId) {
                            window.location.href = `/accounts/${id}/analysis/${data.analysisId}`;
                          }
                        } finally {
                          setAnalyzing(false);
                        }
                      }}
                      className="pill-btn-primary text-sm disabled:opacity-60"
                    >
                      {analyzing
                        ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Analyzing…</>
                        : <><span className="material-symbols-outlined text-[16px]">query_stats</span> Run Analysis ({selectedUploads.size})</>
                      }
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {uploads.map(upload => (
                    <div key={upload.id}
                      className={`card p-3 flex items-center gap-3 cursor-pointer transition-all ${
                        selectedUploads.has(upload.id) ? 'border-[var(--primary)] bg-[var(--primary)]/5' : ''
                      }`}
                      onClick={() => setSelectedUploads(prev => {
                        const next = new Set(prev);
                        next.has(upload.id) ? next.delete(upload.id) : next.add(upload.id);
                        return next;
                      })}
                    >
                      <input type="checkbox" readOnly checked={selectedUploads.has(upload.id)}
                        className="accent-[var(--primary)] w-4 h-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-label font-semibold text-on-surface capitalize">
                          {upload.report_type.replace('_', ' ')} Report
                        </p>
                        <p className="text-xs text-secondary font-label mt-0.5 truncate">
                          {upload.row_count.toLocaleString()} rows
                          {upload.file_name ? ` · ${upload.file_name}` : ''}
                          {' · '}
                          {new Date(upload.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await fetch(`/api/reports/${id}?uploadId=${upload.id}`, { method: 'DELETE' });
                          setUploads(prev => prev.filter(u => u.id !== upload.id));
                          setSelectedUploads(prev => { const n = new Set(prev); n.delete(upload.id); return n; });
                        }}
                        className="text-xs text-secondary hover:text-red-500 font-label transition-colors shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploads.length === 0 && loadedTabs.has('uploads') && (
              <p className="text-sm text-secondary font-label">No uploads yet. Upload a Google Ads CSV to get started.</p>
            )}

            {/* Past analyses */}
            {analyses.length > 0 && (
              <div>
                <p className="font-label font-semibold text-on-surface text-sm mb-3">Past Analyses</p>
                <div className="space-y-2">
                  {analyses.map(a => (
                    <a key={a.id} href={`/accounts/${id}/analysis/${a.id}`}
                      className="card p-3 flex items-center justify-between hover:border-[var(--primary)]/30 transition-colors block">
                      <div>
                        <p className="text-sm font-label font-semibold text-on-surface capitalize">
                          {a.mode?.replace('_', ' ')} Audit · {(a.upload_ids || []).length} upload{(a.upload_ids || []).length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-secondary font-label mt-0.5">
                          {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-secondary text-[20px]">arrow_forward</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ Settings ════ */}
        {activeTab === 'settings' && (
          <AccountSettings accountId={id} campaigns={campaigns} />
        )}

        </ErrorBoundary>
      </div>
    </div>
  );
}

