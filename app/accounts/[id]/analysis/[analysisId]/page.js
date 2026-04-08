// app/accounts/[id]/analysis/[analysisId]/page.js
'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import NgramTable       from '@/components/analysis/NgramTable';
import WastedSpend      from '@/components/analysis/WastedSpend';
import CampaignRanking  from '@/components/analysis/CampaignRanking';
import SwotPanel        from '@/components/analysis/SwotPanel';
import ActionItems      from '@/components/analysis/ActionItems';
import AuditChat        from '@/components/analysis/AuditChat';

const SECTIONS = [
  { id: 'summary',   label: 'Summary',   icon: 'dashboard' },
  { id: 'ngrams',    label: 'N-gram',     icon: 'workspaces' },
  { id: 'wasted',    label: 'Wasted',     icon: 'money_off' },
  { id: 'campaigns', label: 'Campaigns',  icon: 'campaign' },
  { id: 'swot',      label: 'SWOT',       icon: 'psychology' },
  { id: 'actions',   label: 'Actions',    icon: 'checklist' },
];

export default function AnalysisPage({ params }) {
  const { id: accountId, analysisId } = use(params);

  const [analysis,  setAnalysis]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [swot,      setSwot]      = useState(null);
  const [actions,   setActions]   = useState([]);
  const [swotLoading, setSwotLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('summary');
  const [focusContext,  setFocusContext]  = useState(null);

  useEffect(() => {
    fetch(`/api/reports/${accountId}/analyses/${analysisId}`)
      .then(r => r.json())
      .then(data => {
        setAnalysis(data);
        if (data.swot)         setSwot(data.swot);
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined text-primary text-[40px] animate-spin">progress_activity</span>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="px-8 py-10 text-center">
        <p className="font-headline font-bold text-on-surface mb-2">Analysis not found</p>
        <Link href={`/accounts/${accountId}`} className="pill-btn-primary text-sm">Back to Account</Link>
      </div>
    );
  }

  const data     = analysis.computed_data || {};
  const summary  = data.summary  || {};
  const ngrams   = data.ngrams   || {};
  const keywords = data.keywords || {};
  const campaigns = data.campaigns || {};
  const warnings = analysis.data_sufficiency_warnings || [];
  const mode     = analysis.mode || 'lead_gen';
  const isEcom   = mode === 'ecommerce';

  return (
    <div className="px-8 py-10 pb-24">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/accounts/${accountId}`} className="flex items-center gap-1 text-xs text-secondary hover:text-primary mb-2 w-fit">
          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          Back to Account
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight">Account Audit</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-label font-bold px-2.5 py-1 rounded-full capitalize ${
                isEcom ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {isEcom ? 'E-Commerce' : 'Lead Gen'}
              </span>
              <span className="text-xs text-secondary font-label">
                {new Date(analysis.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
          {!swot && (
            <button onClick={generateSwot} disabled={swotLoading}
              className="pill-btn-primary disabled:opacity-60">
              {swotLoading
                ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Generating…</>
                : <><span className="material-symbols-outlined text-[16px]">psychology</span> Generate SWOT + Actions</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Data sufficiency warnings */}
      {warnings.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
          <p className="text-xs font-label font-bold text-amber-700 mb-1">Data Sufficiency</p>
          {warnings.map((w, i) => <p key={i} className="text-xs font-label text-amber-700">⚠ {w}</p>)}
        </div>
      )}

      {/* Section nav */}
      <div className="flex gap-1 mb-6 border-b border-outline-variant/15 overflow-x-auto">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-label font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
              activeSection === s.id ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-on-surface'
            }`}>
            <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Summary ── */}
      {activeSection === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Spend',    value: `$${(summary.totalSpend || 0).toLocaleString()}` },
              { label: 'Conversions',   value: (summary.totalConversions || 0).toLocaleString() },
              { label: isEcom ? 'Avg ROAS' : 'Avg CPA',
                value: isEcom ? `${summary.avgRoas || '—'}×` : `$${summary.avgCpa || '—'}` },
              { label: 'Wasted Spend',  value: `$${(summary.totalWasted || 0).toLocaleString()}`,
                sub: `${summary.wastedPct || 0}% of total`, color: 'text-red-600' },
            ].map(s => (
              <div key={s.label} className="card p-4">
                <p className={`text-2xl font-headline font-bold ${s.color || 'text-on-surface'}`}>{s.value}</p>
                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mt-1">{s.label}</p>
                {s.sub && <p className="text-xs font-label text-secondary mt-0.5">{s.sub}</p>}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Keywords analyzed',     value: summary.keywordCount || 0 },
              { label: 'Search terms analyzed', value: summary.searchTermCount || 0 },
              { label: 'Campaigns',             value: summary.campaignCount || 0 },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <p className="text-3xl font-headline font-bold text-on-surface">{s.value}</p>
                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── N-gram Table ── */}
      {activeSection === 'ngrams' && (
        <div>
          <p className="text-sm text-secondary font-label mb-4">
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

      {/* ── Wasted Spend ── */}
      {activeSection === 'wasted' && (
        <WastedSpend
          keywords={keywords.zeroConvKeywords || []}
          terms={keywords.zeroConvTerms || []}
          totalWastedOnKeywords={keywords.totalWastedOnKeywords || 0}
          totalWastedOnTerms={keywords.totalWastedOnTerms || 0}
          onTermClick={t => setFocusContext(t)}
        />
      )}

      {/* ── Campaign Ranking ── */}
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

      {/* ── SWOT ── */}
      {activeSection === 'swot' && (
        <div>
          {!swot && !swotLoading && (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-4xl text-secondary mb-3 block">psychology</span>
              <p className="font-label font-semibold text-on-surface mb-4">SWOT not generated yet</p>
              <button onClick={generateSwot} className="pill-btn-primary">
                Generate SWOT + Action Items
              </button>
            </div>
          )}
          <SwotPanel
            swot={swot}
            loading={swotLoading}
            onItemClick={item => setFocusContext(item)}
          />
        </div>
      )}

      {/* ── Action Items ── */}
      {activeSection === 'actions' && (
        <div>
          {!swot && !swotLoading && (
            <div className="mb-4">
              <button onClick={generateSwot} className="pill-btn-primary text-sm">
                Generate SWOT + Action Items first
              </button>
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
