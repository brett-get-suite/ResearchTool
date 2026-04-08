// app/accounts/[id]/analysis/[analysisId]/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TabNav from '@/components/ui/TabNav';
import StatusBadge from '@/components/ui/StatusBadge';
import GradientButton from '@/components/ui/GradientButton';
import GhostButton from '@/components/ui/GhostButton';
import Skeleton from '@/components/ui/Skeleton';
import NgramTable from '@/components/analysis/NgramTable';
import WastedSpend from '@/components/analysis/WastedSpend';
import CampaignRanking from '@/components/analysis/CampaignRanking';
import SwotPanel from '@/components/analysis/SwotPanel';
import ActionItems from '@/components/analysis/ActionItems';
import AuditChat from '@/components/analysis/AuditChat';

const SECTIONS = [
  { id: 'summary', label: 'Summary', icon: 'dashboard' },
  { id: 'ngrams', label: 'N-gram', icon: 'workspaces' },
  { id: 'wasted', label: 'Wasted', icon: 'money_off' },
  { id: 'campaigns', label: 'Campaigns', icon: 'campaign' },
  { id: 'swot', label: 'SWOT', icon: 'psychology' },
  { id: 'actions', label: 'Actions', icon: 'checklist' },
];

export default function AnalysisPage() {
  const { id: accountId, analysisId } = useParams();
  const router = useRouter();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [swot, setSwot] = useState(null);
  const [actions, setActions] = useState([]);
  const [swotLoading, setSwotLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('summary');
  const [focusContext, setFocusContext] = useState(null);

  useEffect(() => {
    fetch(`/api/reports/${accountId}/analyses/${analysisId}`)
      .then(r => r.json())
      .then(data => {
        setAnalysis(data);
        if (data.swot) setSwot(data.swot);
        if (data.action_items) setActions(data.action_items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [accountId, analysisId]);

  const generateSwot = useCallback(async () => {
    if (swot || swotLoading) return;
    setSwotLoading(true);
    try {
      const res = await fetch(`/api/reports/${accountId}/swot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSwot(data.swot);
        setActions(data.actionItems || []);
      }
    } finally {
      setSwotLoading(false);
    }
  }, [accountId, analysisId, swot, swotLoading]);

  if (loading) {
    return (
      <div className="space-y-6 fade-up">
        <Skeleton variant="text" className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="card" className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-20">
        <span className="material-symbols-outlined text-on-surface-variant text-5xl mb-4">error</span>
        <p className="text-on-surface-variant mb-4">Analysis not found</p>
        <GhostButton onClick={() => router.push(`/accounts/${accountId}`)}>
          Back to Account
        </GhostButton>
      </div>
    );
  }

  const data = analysis.computed_data || {};
  const summary = data.summary || {};
  const ngrams = data.ngrams || {};
  const keywords = data.keywords || {};
  const campaigns = data.campaigns || {};
  const warnings = analysis.data_sufficiency_warnings || [];
  const mode = analysis.mode || 'lead_gen';
  const isEcom = mode === 'ecommerce';

  return (
    <div className="space-y-6 fade-up pb-24">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-1">
            <button onClick={() => router.push('/')} className="hover:text-primary transition-colors">
              Clients
            </button>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <button onClick={() => router.push(`/accounts/${accountId}`)} className="hover:text-primary transition-colors">
              Analysis Hub
            </button>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-on-surface">Audit</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Account Audit</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge
              status={isEcom ? 'pitching' : 'running'}
              label={isEcom ? 'E-Commerce' : 'Lead Gen'}
            />
            <span className="text-xs text-on-surface-variant">
              {new Date(analysis.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
        {!swot && (
          <GradientButton onClick={generateSwot} disabled={swotLoading}>
            {swotLoading ? (
              <><span className="material-symbols-outlined text-lg animate-spin">progress_activity</span> Generating...</>
            ) : (
              <><span className="material-symbols-outlined text-lg">psychology</span> Generate SWOT + Actions</>
            )}
          </GradientButton>
        )}
      </div>

      {/* Data sufficiency warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl bg-tertiary/10 p-4 space-y-1">
          <p className="text-xs font-label font-bold text-tertiary mb-1">Data Sufficiency</p>
          {warnings.map((w, i) => <p key={i} className="text-xs font-label text-tertiary">&#9888; {w}</p>)}
        </div>
      )}

      {/* Section nav */}
      <TabNav tabs={SECTIONS} activeTab={activeSection} onTabChange={setActiveSection} />

      {/* Summary */}
      {activeSection === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Spend', value: `$${(summary.totalSpend || 0).toLocaleString()}` },
              { label: 'Conversions', value: (summary.totalConversions || 0).toLocaleString() },
              { label: isEcom ? 'Avg ROAS' : 'Avg CPA',
                value: isEcom ? `${summary.avgRoas || '\u2014'}\u00D7` : `$${summary.avgCpa || '\u2014'}` },
              { label: 'Wasted Spend', value: `$${(summary.totalWasted || 0).toLocaleString()}`,
                sub: `${summary.wastedPct || 0}% of total`, isError: true },
            ].map(s => (
              <div key={s.label} className="bg-surface-container rounded-xl p-4">
                <p className={`text-2xl font-bold ${s.isError ? 'text-error' : 'text-on-surface'}`}>{s.value}</p>
                <p className="text-label-sm text-on-surface-variant mt-1">{s.label}</p>
                {s.sub && <p className="text-xs text-on-surface-variant mt-0.5">{s.sub}</p>}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Keywords analyzed', value: summary.keywordCount || 0 },
              { label: 'Search terms analyzed', value: summary.searchTermCount || 0 },
              { label: 'Campaigns', value: summary.campaignCount || 0 },
            ].map(s => (
              <div key={s.label} className="bg-surface-container rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-on-surface">{s.value}</p>
                <p className="text-label-sm text-on-surface-variant mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* N-gram Table */}
      {activeSection === 'ngrams' && (
        <div>
          <p className="text-sm text-on-surface-variant mb-4">
            Every phrase cluster across all search terms — sorted by spend. Red = zero conversions. Amber = above-average CPA.
            Click any row to focus the chat assistant on that phrase.
          </p>
          <NgramTable
            table={ngrams.table || []}
            accountAvgCpa={ngrams.accountAvgCpa}
            mode={mode}
            onRowClick={row => { setFocusContext(row); }}
          />
        </div>
      )}

      {/* Wasted Spend */}
      {activeSection === 'wasted' && (
        <WastedSpend
          keywords={keywords.zeroConvKeywords || []}
          terms={keywords.zeroConvTerms || []}
          totalWastedOnKeywords={keywords.totalWastedOnKeywords || 0}
          totalWastedOnTerms={keywords.totalWastedOnTerms || 0}
          onTermClick={t => setFocusContext(t)}
        />
      )}

      {/* Campaign Ranking */}
      {activeSection === 'campaigns' && (
        <CampaignRanking
          campaigns={campaigns.rankedCampaigns || []}
          readyToScale={campaigns.readyToScale || []}
          underperformers={campaigns.underperformers || []}
          mode={mode}
          avgCpa={campaigns.avgCpa}
          avgRoas={campaigns.avgRoas}
        />
      )}

      {/* SWOT */}
      {activeSection === 'swot' && (
        <div>
          {!swot && !swotLoading && (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3 block">psychology</span>
              <p className="font-semibold text-on-surface mb-4">SWOT not generated yet</p>
              <GradientButton onClick={generateSwot}>
                Generate SWOT + Action Items
              </GradientButton>
            </div>
          )}
          <SwotPanel
            swot={swot}
            loading={swotLoading}
            onItemClick={item => setFocusContext(item)}
          />
        </div>
      )}

      {/* Action Items */}
      {activeSection === 'actions' && (
        <div>
          {!swot && !swotLoading && (
            <div className="mb-4">
              <GradientButton onClick={generateSwot} className="text-sm">
                Generate SWOT + Action Items first
              </GradientButton>
            </div>
          )}
          <ActionItems
            items={actions}
            loading={swotLoading}
            warnings={warnings}
            onItemClick={item => setFocusContext(item)}
          />
        </div>
      )}

      {/* Chat panel */}
      <AuditChat
        accountId={accountId}
        analysisId={analysisId}
        focusContext={focusContext}
        onClearFocus={() => setFocusContext(null)}
      />
    </div>
  );
}
