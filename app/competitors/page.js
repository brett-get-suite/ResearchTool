'use client';

import { useState, useEffect } from 'react';

const intentBadge = (i) => ({ transactional: 'badge-transactional', commercial: 'badge-commercial', informational: 'badge-informational' }[i] || 'badge-navigational');
const cpcClass = (c) => c < 10 ? 'cpc-low' : c < 30 ? 'cpc-mid' : 'cpc-high';

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

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => setHasServerKey(!!d.hasApiKey));
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      // First analyze the competitor website
      const siteRes = await fetch('/api/analyze-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, websiteUrl: competitorUrl, industry }),
      });
      const siteResult = await siteRes.json();
      if (!siteRes.ok) throw new Error(siteResult.error);

      const services = (siteResult.data.services || []).map(s => s.name);
      const areas = serviceAreas.filter(Boolean);

      // Then run competitor audit on it
      const compRes = await fetch('/api/competitor-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          businessName: siteResult.data.business_name,
          services,
          serviceAreas: areas,
          industry,
          keywordData: null,
        }),
      });
      const compResult = await compRes.json();
      if (!compRes.ok) throw new Error(compResult.error);

      setResult({ siteData: siteResult.data, ...compResult.data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-8 py-10">
      <div className="mb-8">
        <h2 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-1">Competitor Analysis</h2>
        <p className="text-on-surface-variant text-sm">Enter a competitor URL to analyze their services, ad strategy, and find gaps you can exploit.</p>
      </div>

      {/* Input card */}
      <div className="card p-8 max-w-2xl mb-8">
        {/* API Key */}
        {hasServerKey ? (
          <div className="flex items-center gap-2 p-3 bg-secondary/10 rounded-xl mb-6">
            <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
            <span className="text-sm font-label font-semibold text-secondary">API key configured via environment variable</span>
          </div>
        ) : (
          <div className="mb-6">
            <label className="field-label">Gemini API Key</label>
            <input type="password" className="field-input font-mono text-sm" placeholder="AIza..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="field-label">Competitor Website URL</label>
            <input type="url" className="field-input" placeholder="https://competitorplumbing.com" value={competitorUrl} onChange={e => setCompetitorUrl(e.target.value)} />
          </div>

          <div>
            <label className="field-label">Industry</label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map(ind => (
                <button key={ind} onClick={() => setIndustry(ind)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-label font-medium border transition-all ${
                    industry === ind ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:border-outline hover:text-on-surface'
                  }`}>
                  {ind}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Service Areas (for context)</label>
            <div className="flex gap-2">
              <input
                className="field-input flex-1"
                placeholder="e.g. Charlotte NC, 28201"
                value={serviceAreas[0] || ''}
                onChange={e => setServiceAreas([e.target.value])}
              />
            </div>
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading || (!apiKey && !hasServerKey) || !competitorUrl}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-label font-semibold text-sm transition-all ${
              loading || (!apiKey && !hasServerKey) || !competitorUrl
                ? 'bg-surface-high text-secondary cursor-not-allowed'
                : 'bg-gradient-to-r from-primary to-primary-container text-white shadow-sm hover:opacity-90'
            }`}
          >
            {loading ? (
              <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Analyzing competitor...</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">analytics</span>Analyze Competitor</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-error/10 text-error text-sm max-w-2xl">
          <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
          <p className="flex-1">{error}</p>
          <button onClick={() => setError('')}><span className="material-symbols-outlined text-[16px]">close</span></button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="fade-up space-y-6">
          {/* Website intel */}
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-headline font-bold text-on-surface">{result.siteData?.business_name || competitorUrl}</h3>
                <p className="text-sm text-secondary mt-0.5">{result.siteData?.industry} · {result.siteData?.website_quality} site</p>
              </div>
              <div className="flex gap-3">
                {[
                  { label: 'Online Scheduling', val: result.siteData?.has_online_scheduling },
                  { label: 'Emergency Services', val: result.siteData?.emergency_services },
                  { label: 'Reviews', val: result.siteData?.has_reviews_displayed },
                ].map(({ label, val }) => (
                  <div key={label} className={`text-center px-3 py-2 rounded-lg text-xs font-label font-semibold ${val ? 'bg-secondary/15 text-secondary' : 'bg-surface-high text-secondary'}`}>
                    <span className="material-symbols-outlined text-[16px] block mb-0.5">{val ? 'check' : 'close'}</span>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Services */}
            <div className="mb-4">
              <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-2">Services Detected</p>
              <div className="flex flex-wrap gap-2">
                {(result.siteData?.services || []).map((svc, i) => (
                  <span key={i} className={`text-xs px-2.5 py-1 font-label rounded-lg border ${
                    svc.is_primary ? 'bg-primary/[0.08] text-primary border-primary/20' : 'bg-surface-high text-on-variant border-outline-variant/20'
                  }`}>
                    {svc.name}
                    {svc.is_primary && <span className="ml-1 text-[10px]">★</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* USPs */}
            {result.siteData?.unique_selling_points?.length > 0 && (
              <div>
                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-2">Unique Selling Points</p>
                <div className="flex flex-wrap gap-2">
                  {result.siteData.unique_selling_points.map((usp, i) => (
                    <span key={i} className="text-xs px-3 py-1 bg-tertiary/10 text-tertiary font-label rounded-lg border border-tertiary/20">{usp}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Market analysis */}
          {result.competitors?.market_analysis && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-5">
                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1">Market Competition</p>
                <p className="text-xl font-headline font-bold text-on-surface capitalize">{result.competitors.market_analysis.competition_level}</p>
              </div>
              <div className="card p-5">
                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1">Avg CPC Range</p>
                <p className="text-xl font-headline font-bold text-on-surface">
                  ${result.competitors.market_analysis.avg_cpc_range?.low}–${result.competitors.market_analysis.avg_cpc_range?.high}
                </p>
              </div>
              <div className="card p-5">
                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1">Peak Seasons</p>
                <p className="text-sm font-label text-on-surface">{(result.competitors.market_analysis.peak_seasons || []).join(', ') || 'N/A'}</p>
              </div>
            </div>
          )}

          {/* Differentiation */}
          {result.competitors?.recommended_differentiation?.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
                <p className="font-headline font-bold text-on-surface">How to Beat Them</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.competitors.recommended_differentiation.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-primary/[0.04] border border-primary/15 rounded-lg">
                    <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">lightbulb</span>
                    <p className="text-sm text-on-variant">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low hanging fruit */}
          {result.competitors?.low_hanging_fruit?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-6 py-5 border-b border-outline-variant/10">
                <p className="font-headline font-bold text-on-surface">Keyword Opportunities They Are Missing</p>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Keyword</th><th>Why It Is An Opportunity</th><th>Est. CPC</th><th>Mo. Searches</th><th>Competition</th></tr></thead>
                  <tbody>
                    {result.competitors.low_hanging_fruit.map((opp, i) => (
                      <tr key={i}>
                        <td className="font-label font-semibold text-on-surface">{opp.keyword}</td>
                        <td className="text-sm text-on-variant max-w-xs">{opp.why}</td>
                        <td className={`font-mono text-sm font-bold ${cpcClass(opp.estimated_cpc||0)}`}>${(opp.estimated_cpc||0).toFixed(2)}</td>
                        <td className="font-mono text-sm text-on-variant">{(opp.estimated_monthly_searches||0).toLocaleString()}</td>
                        <td><span className={`text-[10px] font-label font-bold px-2 py-0.5 rounded-full ${opp.competition==='low'?'bg-secondary/15 text-secondary':'bg-tertiary/15 text-tertiary'}`}>{opp.competition}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Negatives to add */}
          {result.competitors?.competitor_keywords_to_negate?.length > 0 && (
            <div className="card p-6">
              <p className="font-label font-bold text-on-surface mb-3">Add These as Negative Keywords in YOUR Campaigns</p>
              <div className="flex flex-wrap gap-2">
                {result.competitors.competitor_keywords_to_negate.map((t, i) => (
                  <span key={i} className="px-3 py-1 bg-error/10 text-error text-xs font-label rounded-lg border border-error/15">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
