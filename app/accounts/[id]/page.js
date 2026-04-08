'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TabNav from '@/components/ui/TabNav';
import StatusBadge from '@/components/ui/StatusBadge';
import GradientButton from '@/components/ui/GradientButton';
import GhostButton from '@/components/ui/GhostButton';
import Skeleton from '@/components/ui/Skeleton';
import LandingPageAudit from '@/components/analysis-hub/LandingPageAudit';
import WebsiteAnalysis from '@/components/analysis-hub/WebsiteAnalysis';
import LowHangingFruit from '@/components/analysis-hub/LowHangingFruit';
import AdPreview from '@/components/analysis-hub/AdPreview';
import ReportUpload from '@/components/upload/ReportUpload';
import SpendChart from '@/components/dashboard/SpendChart';
import ConversionsChart from '@/components/dashboard/ConversionsChart';
import CampaignTable from '@/components/dashboard/CampaignTable';
import KeywordTable from '@/components/dashboard/KeywordTable';
import AdCopyPanel from '@/components/dashboard/AdCopyPanel';
import ChangeLogTab from '@/components/dashboard/ChangeLogTab';
import AuditTab from '@/components/dashboard/AuditTab';
import AccountSettings from '@/components/dashboard/AccountSettings';
import ErrorBoundary from '@/components/ErrorBoundary';

const fmtCost = (dollars) =>
  '$' + (dollars || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'campaigns', label: 'Campaigns', icon: 'campaign' },
  { id: 'keywords', label: 'Keywords', icon: 'key_visualizer' },
  { id: 'uploads', label: 'Uploads', icon: 'upload_file' },
  { id: 'adcopy', label: 'Ad Copy', icon: 'edit_note' },
  { id: 'changelog', label: 'Change Log', icon: 'history' },
  { id: 'audit', label: 'Audit', icon: 'speed' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export default function AnalysisHub() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id;
  const controllerRef = useRef(null);

  // Core state
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [syncing, setSyncing] = useState(false);

  // Metrics + date range
  const [metrics, setMetrics] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [dateRange, setDateRange] = useState('LAST_30_DAYS');
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Lazy-loaded tab data
  const [keywords, setKeywords] = useState([]);
  const [ads, setAds] = useState([]);
  const [actions, setActions] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [selectedUploads, setSelectedUploads] = useState(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState(new Set(['overview']));

  // Initial load
  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [acctRes, actionsRes] = await Promise.all([
          fetch(`/api/accounts/${accountId}`, { signal }).then(r => r.json()),
          fetch(`/api/accounts/${accountId}/actions?limit=10`, { signal }).then(r => r.json()).catch(() => []),
        ]);
        if (!signal.aborted) {
          setAccount(acctRes);
          setActions(Array.isArray(actionsRes) ? actionsRes : []);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Failed to load account data.');
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [accountId]);

  // Date range metric fetching
  useEffect(() => {
    if (!accountId || loading) return;
    const controller = new AbortController();
    const { signal } = controller;
    setMetricsLoading(true);

    Promise.all([
      fetch(`/api/accounts/${accountId}/metrics?range=${dateRange}`, { signal }).then(r => r.json()).catch(() => null),
      fetch(`/api/accounts/${accountId}/campaigns?range=${dateRange}`, { signal }).then(r => r.json()).catch(() => []),
    ]).then(([m, c]) => {
      if (!signal.aborted) {
        setMetrics(m);
        setCampaigns(Array.isArray(c) ? c : []);
      }
    }).catch(() => {}).finally(() => {
      if (!signal.aborted) setMetricsLoading(false);
    });

    return () => controller.abort();
  }, [accountId, dateRange, loading]);

  // Lazy tab data loading
  const loadTabData = useCallback(async (tab) => {
    if (tab === 'keywords') {
      fetch(`/api/accounts/${accountId}/keywords`).then(r => r.json()).then(d => setKeywords(Array.isArray(d) ? d : [])).catch(() => {});
    }
    if (tab === 'adcopy') {
      fetch(`/api/accounts/${accountId}/ads`).then(r => r.json()).then(d => setAds(Array.isArray(d) ? d : [])).catch(() => {});
    }
    if (tab === 'changelog') {
      fetch(`/api/accounts/${accountId}/actions?limit=100`).then(r => r.json()).then(d => setActions(Array.isArray(d) ? d : [])).catch(() => {});
    }
    if (tab === 'uploads') {
      Promise.all([
        fetch(`/api/reports/${accountId}`).then(r => r.json()).catch(() => []),
        fetch(`/api/reports/${accountId}/analyses`).then(r => r.json()).catch(() => []),
      ]).then(([u, a]) => {
        setUploads(Array.isArray(u) ? u : []);
        setAnalyses(Array.isArray(a) ? a : []);
      });
    }
  }, [accountId]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (!loadedTabs.has(tab)) {
      setLoadedTabs(prev => new Set([...prev, tab]));
      loadTabData(tab);
    }
  };

  // Sync handler
  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch(`/api/accounts/${accountId}/sync`, { method: 'POST' });
      const [acctRes, metricsRes, campaignsRes] = await Promise.all([
        fetch(`/api/accounts/${accountId}`).then(r => r.json()),
        fetch(`/api/accounts/${accountId}/metrics?range=${dateRange}`).then(r => r.json()).catch(() => null),
        fetch(`/api/accounts/${accountId}/campaigns?range=${dateRange}`).then(r => r.json()).catch(() => []),
      ]);
      setAccount(acctRes);
      setMetrics(metricsRes);
      setCampaigns(Array.isArray(campaignsRes) ? campaignsRes : []);
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Re-crawl website
  const handleRecrawl = async () => {
    if (!account?.brand_profile?.website_url && !account?.google_customer_id) return;
    setSyncing(true);
    try {
      await fetch('/api/analyze-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl: account.brand_profile?.website_url || account.google_customer_id,
          accountId,
          industry: account.brand_profile?.industry,
        }),
      });
      const acctRes = await fetch(`/api/accounts/${accountId}`).then(r => r.json());
      setAccount(acctRes);
    } catch (err) {
      console.error('Re-crawl failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="space-y-6 fade-up">
        <Skeleton variant="text" className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="card" className="h-24" />)}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Skeleton variant="card" className="h-64" />
          <Skeleton variant="card" className="h-64" />
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="text-center py-20">
        <span className="material-symbols-outlined text-error text-5xl mb-4">error</span>
        <p className="text-on-surface-variant mb-4">{error}</p>
        <GhostButton onClick={() => window.location.reload()}>Retry</GhostButton>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-20">
        <span className="material-symbols-outlined text-on-surface-variant text-5xl mb-4">error</span>
        <p className="text-on-surface-variant mb-4">Account not found</p>
        <GhostButton onClick={() => router.push('/accounts')}>Back to Accounts</GhostButton>
      </div>
    );
  }

  // Derived data
  const websiteAnalysis = account.brand_profile?.website_analysis || null;
  const landingPageAudit = account.audit_data?.landing_page || null;
  const adCopy = account.audit_data?.ad_copy || null;
  const lowHangingFruit = account.audit_data?.opportunities || [];
  const acctMetrics = metrics?.account;
  const snapshots = metrics?.snapshots || [];
  const spendData = snapshots.map(s => ({ date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), spend: s.total_cost || 0 }));
  const convData = snapshots.map(s => ({ date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), conversions: s.conversions || 0 }));

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-1">
            <button onClick={() => router.push('/accounts')} className="hover:text-primary transition-colors">
              Ad Accounts
            </button>
            <span className="material-symbols-outlined text-xs" aria-hidden="true">chevron_right</span>
            <span className="text-on-surface">{account.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">{account.name || 'Analysis Hub'}</h1>
          <div className="flex items-center gap-3 mt-1">
            {account.google_customer_id && (
              <span className="text-sm text-on-surface-variant">{account.google_customer_id}</span>
            )}
            <StatusBadge status={account.status === 'active' ? 'active' : 'idle'} label={account.status} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <GhostButton onClick={() => router.push(`/print/${accountId}`)}>
            <span className="material-symbols-outlined text-lg" aria-hidden="true">download</span>
            Export PDF
          </GhostButton>
          <GhostButton onClick={handleSync} disabled={syncing}>
            <span className={`material-symbols-outlined text-lg ${syncing ? 'animate-spin' : ''}`} aria-hidden="true">
              {syncing ? 'progress_activity' : 'sync'}
            </span>
            {syncing ? 'Syncing...' : 'Sync Data'}
          </GhostButton>
          <GradientButton onClick={handleRecrawl} disabled={syncing}>
            <span className="material-symbols-outlined text-lg" aria-hidden="true">refresh</span>
            Re-crawl Site
          </GradientButton>
        </div>
      </div>

      {/* Date range */}
      <div className="flex items-center gap-1 bg-surface-container rounded-xl p-1 w-fit">
        {[['LAST_7_DAYS', '7d'], ['LAST_30_DAYS', '30d'], ['LAST_90_DAYS', '90d']].map(([val, label]) => (
          <button key={val} onClick={() => setDateRange(val)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              dateRange === val ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      {metricsLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="card" className="h-24" />)}
        </div>
      ) : acctMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: 'visibility', label: 'Impressions', value: (acctMetrics.impressions || 0).toLocaleString() },
            { icon: 'ads_click', label: 'Clicks', value: (acctMetrics.clicks || 0).toLocaleString() },
            { icon: 'attach_money', label: 'Cost', value: fmtCost((acctMetrics.cost_micros || 0) / 1_000_000) },
            { icon: 'conversion_path', label: 'Conversions', value: (acctMetrics.conversions || 0).toLocaleString() },
          ].map(s => (
            <div key={s.label} className="bg-surface-container rounded-xl p-4">
              <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">{s.icon}</span>
              <p className="text-2xl font-bold text-on-surface mt-1">{s.value}</p>
              <p className="text-label-sm text-on-surface-variant">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <TabNav tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <ErrorBoundary key={activeTab}>
        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Charts */}
            {(spendData.length > 0 || convData.length > 0) && (
              <div className="grid grid-cols-2 gap-6">
                <SpendChart data={spendData.length > 0 ? spendData : [{ date: 'Current', spend: campaigns.reduce((s, c) => s + (c.cost || 0), 0) }]} loading={metricsLoading} />
                <ConversionsChart data={convData.length > 0 ? convData : [{ date: 'Current', conversions: campaigns.reduce((s, c) => s + (c.conversions || 0), 0) }]} loading={metricsLoading} />
              </div>
            )}

            {/* Analysis Hub cards */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-5">
                <LandingPageAudit audit={landingPageAudit} />
              </div>
              <div className="xl:col-span-7">
                <WebsiteAnalysis analysis={websiteAnalysis} />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-8">
                <LowHangingFruit keywords={lowHangingFruit} />
              </div>
              <div className="xl:col-span-4">
                <AdPreview adCopy={adCopy} brandProfile={account.brand_profile} />
              </div>
            </div>

            {/* Campaigns preview */}
            {campaigns.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-on-surface mb-3">Campaigns</h2>
                <CampaignTable campaigns={campaigns} accountId={accountId} onRefresh={handleSync} />
              </div>
            )}
          </div>
        )}

        {/* Campaigns */}
        {activeTab === 'campaigns' && (
          <div>
            {metricsLoading ? (
              <Skeleton variant="card" className="h-64" />
            ) : (
              <CampaignTable campaigns={campaigns} accountId={accountId} onRefresh={handleSync} />
            )}
          </div>
        )}

        {/* Keywords */}
        {activeTab === 'keywords' && (
          <KeywordTable
            keywords={keywords}
            accountId={accountId}
            agentSuggestions={actions
              .filter(a => a.agent_type === 'keyword' && a.keyword)
              .map(a => ({ keyword: a.keyword, suggestion: a.description || 'Review suggested' }))
            }
            onRefresh={() => {
              fetch(`/api/accounts/${accountId}/keywords`).then(r => r.json()).then(d => setKeywords(Array.isArray(d) ? d : []));
            }}
          />
        )}

        {/* Uploads */}
        {activeTab === 'uploads' && (
          <div className="space-y-6">
            <ReportUpload accountId={accountId} onUploadComplete={() => loadTabData('uploads')} />

            {uploads.length > 0 && (
              <div className="bg-surface-container rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-on-surface">
                    Upload History ({uploads.length})
                    {selectedUploads.size > 0 && (
                      <span className="ml-2 text-on-surface-variant font-normal">({selectedUploads.size} selected)</span>
                    )}
                  </h3>
                  {selectedUploads.size > 0 && (
                    <GradientButton
                      disabled={analyzing}
                      onClick={async () => {
                        setAnalyzing(true);
                        try {
                          const res = await fetch(`/api/reports/${accountId}/analyze`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ uploadIds: Array.from(selectedUploads) }),
                          });
                          const data = await res.json();
                          if (res.ok && data.analysisId) {
                            router.push(`/accounts/${accountId}/analysis/${data.analysisId}`);
                          }
                        } finally {
                          setAnalyzing(false);
                        }
                      }}
                      className="text-xs"
                    >
                      {analyzing ? (
                        <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Analyzing...</>
                      ) : (
                        <><span className="material-symbols-outlined text-sm">query_stats</span> Run Analysis ({selectedUploads.size})</>
                      )}
                    </GradientButton>
                  )}
                </div>
                <div className="space-y-2">
                  {uploads.map((u) => (
                    <div
                      key={u.id}
                      role="checkbox"
                      aria-checked={selectedUploads.has(u.id)}
                      tabIndex={0}
                      onClick={() => setSelectedUploads(prev => {
                        const next = new Set(prev);
                        next.has(u.id) ? next.delete(u.id) : next.add(u.id);
                        return next;
                      })}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          setSelectedUploads(prev => {
                            const next = new Set(prev);
                            next.has(u.id) ? next.delete(u.id) : next.add(u.id);
                            return next;
                          });
                        }
                      }}
                      className={`flex items-center gap-3 py-3 px-3 rounded-xl cursor-pointer transition-colors ${
                        selectedUploads.has(u.id) ? 'bg-primary/5' : 'hover:bg-surface-container-high'
                      }`}
                    >
                      <input type="checkbox" readOnly checked={selectedUploads.has(u.id)} tabIndex={-1}
                        className="accent-[var(--primary)] w-4 h-4 shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-on-surface font-medium capitalize">{u.report_type?.replace(/_/g, ' ')} Report</div>
                        <div className="text-xs text-on-surface-variant">
                          {u.row_count?.toLocaleString()} rows
                          {u.file_name ? ` \u00B7 ${u.file_name}` : ''}
                          {' \u00B7 '}
                          {new Date(u.uploaded_at || u.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm('Remove this upload? This cannot be undone.')) return;
                          await fetch(`/api/reports/${accountId}?uploadId=${u.id}`, { method: 'DELETE' });
                          setUploads(prev => prev.filter(x => x.id !== u.id));
                          setSelectedUploads(prev => { const n = new Set(prev); n.delete(u.id); return n; });
                        }}
                        className="text-xs text-on-surface-variant hover:text-error transition-colors shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analyses.length > 0 && (
              <div className="bg-surface-container rounded-xl p-6">
                <h3 className="text-sm font-semibold text-on-surface mb-4">Past Analyses</h3>
                <div className="space-y-3">
                  {analyses.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => router.push(`/accounts/${accountId}/analysis/${a.id}`)}
                      className="w-full flex items-center justify-between py-2 px-3 rounded-xl hover:bg-surface-container-high transition-colors text-left"
                    >
                      <div>
                        <div className="text-sm text-on-surface font-medium">
                          {a.mode?.replace(/_/g, ' ')} Audit — {new Date(a.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-on-surface-variant">{(a.upload_ids || []).length} upload{(a.upload_ids || []).length !== 1 ? 's' : ''}</div>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">chevron_right</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ad Copy */}
        {activeTab === 'adcopy' && (
          <AdCopyPanel ads={ads} accountId={accountId} />
        )}

        {/* Change Log */}
        {activeTab === 'changelog' && (
          <ChangeLogTab actions={actions} accountId={accountId} onUndo={() => {
            fetch(`/api/accounts/${accountId}/actions?limit=100`).then(r => r.json()).then(d => setActions(Array.isArray(d) ? d : []));
          }} />
        )}

        {/* Audit */}
        {activeTab === 'audit' && (
          <AuditTab auditData={account?.audit_data ?? account?.lastAudit} accountId={accountId} onRerun={() => {
            fetch(`/api/accounts/${accountId}`).then(r => r.json()).then(setAccount);
          }} />
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <AccountSettings accountId={accountId} campaigns={campaigns} />
        )}
      </ErrorBoundary>
    </div>
  );
}
