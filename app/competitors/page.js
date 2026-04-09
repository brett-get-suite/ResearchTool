'use client';

import { useState, useEffect } from 'react';
import { getClients, isSupabaseConfigured } from '@/lib/supabase';

const intentBadge = (i) => ({ transactional: 'badge-transactional', commercial: 'badge-commercial', informational: 'badge-informational' }[i] || 'badge-navigational');
const cpcClass = (c) => c < 10 ? 'cpc-low' : c < 30 ? 'cpc-mid' : 'cpc-high';
const threatColor = (t) => t === 'high' ? 'bg-error/15 text-error' : t === 'medium' ? 'bg-tertiary/15 text-tertiary' : 'bg-secondary/15 text-secondary';

const INDUSTRIES = ['Plumbing', 'HVAC', 'Plumbing & HVAC', 'Electrical', 'Roofing', 'General Contractor', 'Pest Control', 'Landscaping', 'Other Home Services'];

export default function CompetitorsPage() {
  const [apiKey, setApiKey] = useState('');
  const [hasServerKey, setHasServerKey] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [industry, setIndustry] = useState('HVAC');
  const [serviceAreas, setServiceAreas] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [savedCompetitors, setSavedCompetitors] = useState([]);
  const [activeTab, setActiveTab] = useState('analyze');

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => setHasServerKey(!!d.hasApiKey));
    // Load past competitor analyses from completed client research
    if (isSupabaseConfigured()) {
      getClients().then(data => {
        const comps = [];
        (data || []).forEach(client => {
          if (client.competitor_data?.competitors) {
            client.competitor_data.competitors.forEach(c => {
              comps.push({ ...c, client_name: client.name, client_id: client.id, analyzed_at: client.researched_at });
            });
          }
        });
        setSavedCompetitors(comps);
      }).catch(() => {});
    }
  }, []);

  const runAnalysis = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const siteRes = await fetch('/api/analyze-website', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: competitorUrl, industry }),
      });
      const siteResult = await siteRes.json();
      if (!siteRes.ok) throw new Error(siteResult.error);

      const services = (siteResult.data.services || []).map(s => s.name);
      const compRes = await fetch('/api/competitor-audit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: siteResult.data.business_name, services, serviceAreas: serviceAreas.filter(Boolean), industry }),
      });
      const compResult = await compRes.json();
      if (!compRes.ok) throw new Error(compResult.error);

      setResult({ siteData: siteResult.data, ...compResult.data });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-on-surface mb-1">Competitor Intelligence</h2>
          <p className="text-on-surface-variant text-sm">Analyze competitors and find market gaps</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container rounded-xl p-1 w-fit">
        {[
          { key: 'analyze', label: 'New Analysis', icon: 'analytics' },
          { key: 'saved', label: `Saved (${savedCompetitors.length})`, icon: 'bookmark' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Saved Competitors Table */}
      {activeTab === 'saved' && (
        <div className="bg-surface-container rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  <th className="text-left px-5 py-3 text-label-sm text-on-surface-variant">Competitor</th>
                  <th className="text-left px-5 py-3 text-label-sm text-on-surface-variant">Client</th>
                  <th className="text-left px-5 py-3 text-label-sm text-on-surface-variant">Threat Level</th>
                  <th className="text-left px-5 py-3 text-label-sm text-on-surface-variant">Est. Ad Spend</th>
                  <th className="text-left px-5 py-3 text-label-sm text-on-surface-variant">Services</th>
                  <th className="text-left px-5 py-3 text-label-sm text-on-surface-variant">Analyzed</th>
                  <th className="text-left px-5 py-3 text-label-sm text-on-surface-variant w-24"></th>
                </tr>
              </thead>
              <tbody>
                {savedCompetitors.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-on-surface-variant text-sm">No saved competitors yet. Run a client research analysis to discover competitors.</td></tr>
                ) : savedCompetitors.map((comp, i) => (
                  <tr key={i} className="border-b border-outline-variant/5 hover:bg-surface-container-high transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-on-surface">{comp.name}</td>
                    <td className="px-5 py-3 text-xs text-on-surface-variant">{comp.client_name}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${threatColor(comp.threat_level)}`}>{comp.threat_level}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-on-surface">{comp.estimated_ad_spend || '—'}</td>
                    <td className="px-5 py-3 text-xs text-on-surface-variant truncate max-w-[200px]">{(comp.services_advertised || []).join(', ') || '—'}</td>
                    <td className="px-5 py-3 text-xs text-on-surface-variant">{comp.analyzed_at ? new Date(comp.analyzed_at).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => { setCompetitorUrl(comp.website || ''); setActiveTab('analyze'); }} className="text-xs text-primary hover:underline font-medium">Re-analyze</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analysis Form */}
      {activeTab === 'analyze' && (
        <>
          <div className="bg-surface-container rounded-xl p-6 max-w-2xl space-y-5">
            {hasServerKey ? (
              <div className="flex items-center gap-2 p-3 bg-secondary/10 rounded-lg">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18 }}>check_circle</span>
                <span className="text-sm font-medium text-secondary">API key configured</span>
              </div>
            ) : (
              <div>
                <label className="text-label-sm text-on-surface-variant block mb-2">Gemini API Key</label>
                <input type="password" className="w-full text-sm py-2.5 px-3 rounded-xl bg-surface-container-high border border-outline-variant/20 font-mono" placeholder="AIza..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
              </div>
            )}

            <div>
              <label className="text-label-sm text-on-surface-variant block mb-2">Competitor Website URL</label>
              <input type="url" className="w-full text-sm py-2.5 px-3 rounded-xl bg-surface-container-high border border-outline-variant/20" placeholder="https://competitorplumbing.com" value={competitorUrl} onChange={e => setCompetitorUrl(e.target.value)} />
            </div>

            <div>
              <label className="text-label-sm text-on-surface-variant block mb-2">Industry</label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map(ind => (
                  <button key={ind} onClick={() => setIndustry(ind)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      industry === ind ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-high border-outline-variant/20 text-on-surface-variant hover:text-on-surface'
                    }`}>{ind}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-label-sm text-on-surface-variant block mb-2">Service Area</label>
              <input className="w-full text-sm py-2.5 px-3 rounded-xl bg-surface-container-high border border-outline-variant/20" placeholder="e.g. Charlotte NC" value={serviceAreas[0] || ''} onChange={e => setServiceAreas([e.target.value])} />
            </div>

            <button onClick={runAnalysis} disabled={loading || (!apiKey && !hasServerKey) || !competitorUrl}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                loading || (!apiKey && !hasServerKey) || !competitorUrl
                  ? 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed'
                  : 'gradient-primary text-on-primary hover:opacity-90'
              }`}>
              {loading ? (<><span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>Analyzing...</>) :
                (<><span className="material-symbols-outlined text-lg">analytics</span>Analyze Competitor</>)}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-error/10 text-error text-sm max-w-2xl">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
              <p className="flex-1">{error}</p>
              <button onClick={() => setError('')}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span></button>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6 fade-up">
              {/* Website intel */}
              <div className="bg-surface-container rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">{result.siteData?.business_name || competitorUrl}</h3>
                    <p className="text-sm text-on-surface-variant mt-0.5">{result.siteData?.industry} &middot; {result.siteData?.website_quality} site</p>
                  </div>
                  <div className="flex gap-3">
                    {[
                      { label: 'Scheduling', val: result.siteData?.has_online_scheduling, icon: 'calendar_today' },
                      { label: 'Emergency', val: result.siteData?.emergency_services, icon: 'emergency' },
                      { label: 'Reviews', val: result.siteData?.has_reviews_displayed, icon: 'star' },
                    ].map(({ label, val, icon }) => (
                      <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${val ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{val ? 'check' : 'close'}</span>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {result.siteData?.services?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-label-sm text-on-surface-variant mb-2">Services Detected</p>
                    <div className="flex flex-wrap gap-2">
                      {result.siteData.services.map((svc, i) => (
                        <span key={i} className={`text-xs px-2.5 py-1 rounded-lg border ${svc.is_primary ? 'bg-primary/10 text-primary border-primary/20' : 'bg-surface-container-highest text-on-surface-variant border-outline-variant/15'}`}>
                          {svc.name}{svc.is_primary && ' \u2605'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.siteData?.unique_selling_points?.length > 0 && (
                  <div>
                    <p className="text-label-sm text-on-surface-variant mb-2">USPs</p>
                    <div className="flex flex-wrap gap-2">
                      {result.siteData.unique_selling_points.map((usp, i) => (
                        <span key={i} className="text-xs px-3 py-1 bg-tertiary/10 text-tertiary rounded-lg border border-tertiary/15">{usp}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Market analysis */}
              {result.competitors?.market_analysis && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-surface-container rounded-xl p-5">
                    <p className="text-label-sm text-on-surface-variant mb-1">Market Competition</p>
                    <p className="text-xl font-bold text-on-surface capitalize">{result.competitors.market_analysis.competition_level}</p>
                  </div>
                  <div className="bg-surface-container rounded-xl p-5">
                    <p className="text-label-sm text-on-surface-variant mb-1">Avg CPC Range</p>
                    <p className="text-xl font-bold text-on-surface">${result.competitors.market_analysis.avg_cpc_range?.low}\u2013${result.competitors.market_analysis.avg_cpc_range?.high}</p>
                  </div>
                  <div className="bg-surface-container rounded-xl p-5">
                    <p className="text-label-sm text-on-surface-variant mb-1">Peak Seasons</p>
                    <p className="text-sm text-on-surface">{(result.competitors.market_analysis.peak_seasons || []).join(', ') || 'N/A'}</p>
                  </div>
                </div>
              )}

              {/* Differentiation */}
              {result.competitors?.recommended_differentiation?.length > 0 && (
                <div className="bg-surface-container rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
                    How to Beat Them
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {result.competitors.recommended_differentiation.map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>lightbulb</span>
                        <p className="text-sm text-on-surface-variant">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Keyword Opportunities */}
              {result.competitors?.low_hanging_fruit?.length > 0 && (
                <div className="bg-surface-container rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-outline-variant/10">
                    <h3 className="text-sm font-semibold text-on-surface">Keyword Opportunities They Are Missing</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-outline-variant/10">
                          <th className="text-left px-5 py-3 text-label-sm text-on-surface-variant">Keyword</th>
                          <th className="text-left px-5 py-3 text-label-sm text-on-surface-variant">Why</th>
                          <th className="text-left px-5 py-3 text-label-sm text-on-surface-variant">Est. CPC</th>
                          <th className="text-left px-5 py-3 text-label-sm text-on-surface-variant">Mo. Searches</th>
                          <th className="text-left px-5 py-3 text-label-sm text-on-surface-variant">Competition</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.competitors.low_hanging_fruit.map((opp, i) => (
                          <tr key={i} className="border-b border-outline-variant/5 hover:bg-surface-container-high transition-colors">
                            <td className="px-5 py-3 text-sm font-medium text-on-surface">{opp.keyword}</td>
                            <td className="px-5 py-3 text-xs text-on-surface-variant max-w-xs">{opp.why}</td>
                            <td className={`px-5 py-3 font-mono text-sm font-bold ${cpcClass(opp.estimated_cpc || 0)}`}>${(opp.estimated_cpc || 0).toFixed(2)}</td>
                            <td className="px-5 py-3 text-sm text-on-surface-variant tabular-nums">{(opp.estimated_monthly_searches || 0).toLocaleString()}</td>
                            <td className="px-5 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${opp.competition === 'low' ? 'bg-secondary/15 text-secondary' : 'bg-tertiary/15 text-tertiary'}`}>{opp.competition}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Negatives */}
              {result.competitors?.competitor_keywords_to_negate?.length > 0 && (
                <div className="bg-surface-container rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-on-surface mb-3">Add as Negative Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.competitors.competitor_keywords_to_negate.map((t, i) => (
                      <span key={i} className="px-3 py-1 bg-error/10 text-error text-xs font-medium rounded-lg border border-error/15">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
