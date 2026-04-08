'use client';

import { useState, useEffect, useCallback } from 'react';
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

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'uploads', label: 'Uploads', icon: 'upload_file' },
  { id: 'campaigns', label: 'Campaigns', icon: 'campaign' },
  { id: 'keywords', label: 'Keywords', icon: 'key_visualizer' },
  { id: 'audit', label: 'Audit', icon: 'speed' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export default function AnalysisHub() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id;

  const [account, setAccount] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [selectedUploads, setSelectedUploads] = useState(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [acctRes, upsRes, ansRes] = await Promise.all([
        fetch(`/api/accounts/${accountId}`).then(r => r.json()),
        fetch(`/api/reports/${accountId}`).then(r => r.json()).catch(() => []),
        fetch(`/api/reports/${accountId}/analyses`).then(r => r.json()).catch(() => []),
      ]);
      setAccount(acctRes);
      setUploads(Array.isArray(upsRes) ? upsRes : []);
      setAnalyses(Array.isArray(ansRes) ? ansRes : []);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6 fade-up">
        <Skeleton variant="text" className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton variant="card" className="h-64" />
          <Skeleton variant="card" className="h-64" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-20">
        <span className="material-symbols-outlined text-on-surface-variant text-5xl mb-4">error</span>
        <p className="text-on-surface-variant">Account not found</p>
      </div>
    );
  }

  const websiteAnalysis = account.brand_profile?.website_analysis || null;
  const landingPageAudit = account.audit_data?.landing_page || null;
  const adCopy = account.audit_data?.ad_copy || null;
  const lowHangingFruit = account.audit_data?.opportunities || [];

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-1">
            <button onClick={() => router.push('/')} className="hover:text-primary transition-colors">
              Clients
            </button>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-on-surface">{account.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Analysis Hub</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Comprehensive semantic audit and performance mapping
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GhostButton>
            <span className="material-symbols-outlined text-lg">download</span>
            Export PDF
          </GhostButton>
          <GradientButton>
            <span className="material-symbols-outlined text-lg">refresh</span>
            Re-crawl Site
          </GradientButton>
        </div>
      </div>

      {/* URL bar */}
      {account.google_customer_id && (
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-container rounded-xl">
          <span className="material-symbols-outlined text-secondary text-lg">language</span>
          <span className="text-sm text-on-surface">{account.google_customer_id}</span>
          <StatusBadge status="active" label="AI Scanned" />
        </div>
      )}

      {/* Tabs */}
      <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top row: Audit + Website Analysis */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-5">
              <LandingPageAudit audit={landingPageAudit} />
            </div>
            <div className="xl:col-span-7">
              <WebsiteAnalysis analysis={websiteAnalysis} />
            </div>
          </div>

          {/* Bottom row: Keywords + Ad Preview */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8">
              <LowHangingFruit keywords={lowHangingFruit} />
            </div>
            <div className="xl:col-span-4">
              <AdPreview adCopy={adCopy} brandProfile={account.brand_profile} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'uploads' && (
        <div className="space-y-6">
          <ReportUpload
            accountId={accountId}
            onUploadComplete={loadData}
          />

          {/* Upload history with multi-select */}
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
                    onClick={() => setSelectedUploads(prev => {
                      const next = new Set(prev);
                      next.has(u.id) ? next.delete(u.id) : next.add(u.id);
                      return next;
                    })}
                    className={`flex items-center gap-3 py-3 px-3 rounded-xl cursor-pointer transition-colors ${
                      selectedUploads.has(u.id) ? 'bg-primary/5' : 'hover:bg-surface-container-high'
                    }`}
                  >
                    <input type="checkbox" readOnly checked={selectedUploads.has(u.id)}
                      className="accent-[var(--primary)] w-4 h-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-on-surface font-medium capitalize">{u.report_type?.replace('_', ' ')} Report</div>
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

          {/* Analyses list */}
          {analyses.length > 0 && (
            <div className="bg-surface-container rounded-xl p-6">
              <h3 className="text-sm font-semibold text-on-surface mb-4">Analyses</h3>
              <div className="space-y-3">
                {analyses.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => router.push(`/accounts/${accountId}/analysis/${a.id}`)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-xl hover:bg-surface-container-high transition-colors text-left"
                  >
                    <div>
                      <div className="text-sm text-on-surface font-medium">
                        Audit — {new Date(a.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-on-surface-variant">{a.mode} mode</div>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="bg-surface-container rounded-xl p-6">
          <p className="text-on-surface-variant text-sm">Campaign management coming in Phase 4.</p>
        </div>
      )}

      {activeTab === 'keywords' && (
        <div className="bg-surface-container rounded-xl p-6">
          <p className="text-on-surface-variant text-sm">Keyword Engine coming in Phase 3.</p>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-surface-container rounded-xl p-6">
          <p className="text-on-surface-variant text-sm">
            Upload CSV reports in the Uploads tab, then run an analysis to see audit results here.
          </p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-surface-container rounded-xl p-6">
          <p className="text-on-surface-variant text-sm">Account settings coming soon.</p>
        </div>
      )}
    </div>
  );
}
