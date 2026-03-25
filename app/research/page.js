'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient_db, updateClient, isSupabaseConfigured } from '@/lib/supabase';

// ─── Constants ────────────────────────────────────────────────────
const INDUSTRIES = [
  'Plumbing', 'HVAC', 'Plumbing & HVAC', 'Electrical',
  'Roofing', 'General Contractor', 'Pest Control', 'Landscaping', 'Other Home Services',
];

// ─── Helpers ──────────────────────────────────────────────────────
const intentBadge = (intent) => {
  const map = { transactional: 'badge-transactional', commercial: 'badge-commercial', informational: 'badge-informational' };
  return map[intent] || 'badge-navigational';
};
const cpcClass = (cpc) => cpc < 10 ? 'cpc-low' : cpc < 30 ? 'cpc-mid' : 'cpc-high';
const compColor = (c) => c === 'low' ? 'bg-emerald-100 text-emerald-700' : c === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
const threatColor = (t) => t === 'high' ? 'bg-red-100 text-red-700' : t === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-surface-high text-secondary';

// ─── Sub-components ───────────────────────────────────────────────
function PhaseRow({ label, done, active }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-emerald-100' : active ? 'bg-primary/10' : 'bg-surface-high'}`}>
        {done ? (
          <span className="material-symbols-outlined text-[14px] text-emerald-700">check</span>
        ) : active ? (
          <span className="material-symbols-outlined text-[14px] text-primary animate-spin">progress_activity</span>
        ) : (
          <div className="w-2 h-2 rounded-full bg-outline-variant" />
        )}
      </div>
      <span className={`text-sm font-label ${done ? 'text-emerald-700' : active ? 'text-primary font-semibold' : 'text-secondary'}`}>
        {label}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function ResearchPage() {
  const router = useRouter();

  // Step state
  const [currentStep, setCurrentStep] = useState(0);
  const [clientId, setClientId] = useState(null);

  // Form state
  const [apiKey, setApiKey] = useState('');
  const [hasServerKey, setHasServerKey] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [industry, setIndustry] = useState('Plumbing');
  const [serviceAreas, setServiceAreas] = useState([]);
  const [areaInput, setAreaInput] = useState('');

  // Results state
  const [websiteData, setWebsiteData] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [keywordData, setKeywordData] = useState(null);
  const [competitorData, setCompetitorData] = useState(null);
  const [lowHangingFruit, setLowHangingFruit] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('keywords');

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => setHasServerKey(!!d.hasApiKey));
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────
  const addArea = useCallback(() => {
    const v = areaInput.trim();
    if (v && !serviceAreas.includes(v)) {
      setServiceAreas(p => [...p, v]);
      setAreaInput('');
    }
  }, [areaInput, serviceAreas]);

  const removeArea = useCallback((a) => setServiceAreas(p => p.filter(x => x !== a)), []);
  const toggleService = useCallback((name) => {
    setSelectedServices(p => p.includes(name) ? p.filter(s => s !== name) : [...p, name]);
  }, []);

  // ─── Step 1: Analyze website ──────────────────────────────────────
  const analyzeWebsite = async () => {
    setLoading(true);
    setError('');
    setLoadingPhase('Crawling website with Gemini AI...');
    try {
      const res = await fetch('/api/analyze-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, websiteUrl, industry }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setWebsiteData(result.data);
      const primary = (result.data.services || []).filter(s => s.is_primary).map(s => s.name);
      setSelectedServices(primary.length ? primary : (result.data.services || []).map(s => s.name));
      if (result.data.service_areas_detected?.length && serviceAreas.length === 0) {
        setServiceAreas(result.data.service_areas_detected);
      }

      // Create draft record in Supabase
      if (isSupabaseConfigured()) {
        const record = await createClient_db({
          name: result.data.business_name || websiteUrl,
          website: websiteUrl,
          industry,
          service_areas: result.data.service_areas_detected || serviceAreas,
          website_data: result.data,
          status: 'analyzing',
        });
        if (record) setClientId(record.id);
      }

      setCurrentStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingPhase('');
    }
  };

  // ─── Step 2: Run research pipeline ───────────────────────────────
  const runResearch = async () => {
    setLoading(true);
    setError('');
    setCurrentStep(2);
    try {
      setLoadingPhase('Running keyword research across service areas...');
      const kwRes = await fetch('/api/keyword-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, services: selectedServices, serviceAreas, industry }),
      });
      const kwResult = await kwRes.json();
      if (!kwRes.ok) throw new Error(kwResult.error);
      setKeywordData(kwResult.data);

      setLoadingPhase('Analyzing competitors & finding low-hanging fruit...');
      const compRes = await fetch('/api/competitor-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          businessName: websiteData?.business_name || websiteUrl,
          services: selectedServices,
          serviceAreas,
          industry,
          keywordData: kwResult.data,
        }),
      });
      const compResult = await compRes.json();
      if (!compRes.ok) throw new Error(compResult.error);
      setCompetitorData(compResult.data.competitors);
      setLowHangingFruit(compResult.data.lowHangingFruit);

      // Save completed research to Supabase
      if (isSupabaseConfigured() && clientId) {
        await updateClient(clientId, {
          selected_services: selectedServices,
          service_areas: serviceAreas,
          keyword_data: kwResult.data,
          competitor_data: compResult.data.competitors,
          low_hanging_fruit: compResult.data.lowHangingFruit,
          researched_at: new Date().toISOString(),
          status: 'complete',
        });
      }

      setCurrentStep(3);
    } catch (err) {
      setError(err.message);
      setCurrentStep(1);
    } finally {
      setLoading(false);
      setLoadingPhase('');
    }
  };

  // ─── Export helpers ───────────────────────────────────────────────
  const exportCSV = async () => {
    try {
      const res = await fetch('/api/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywordData, competitorData, lowHangingFruit, businessName: websiteData?.business_name || websiteUrl }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${websiteData?.business_name || 'research'}-ppc-report.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) { setError('CSV export failed: ' + err.message); }
  };

  const exportZIP = async () => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const biz = websiteData?.business_name || websiteUrl;

      // Keywords CSV
      let kwCsv = 'Ad Group,Keyword,Intent,Monthly Searches,Est CPC,Competition,Priority\n';
      (keywordData?.keyword_groups || []).forEach(g =>
        (g.keywords || []).forEach(kw => {
          kwCsv += `"${g.theme}","${kw.keyword}","${kw.intent}",${kw.estimated_monthly_searches},${kw.estimated_cpc},"${kw.competition}","${kw.priority}"\n`;
        })
      );
      zip.file('keywords.csv', kwCsv);

      // Negatives CSV
      let negCsv = 'Negative Keyword\n';
      (keywordData?.negative_keywords || []).forEach(n => { negCsv += `"${n}"\n`; });
      zip.file('negative-keywords.csv', negCsv);

      // Competitors CSV
      let compCsv = 'Competitor,Est Ad Spend,Threat Level,Services,Notes\n';
      (competitorData?.competitors || []).forEach(c => {
        compCsv += `"${c.name}","${c.estimated_ad_spend}","${c.threat_level}","${(c.services_advertised||[]).join('; ')}","${c.notes||''}"\n`;
      });
      zip.file('competitors.csv', compCsv);

      // Opportunities CSV
      let oppCsv = 'Keyword,Intent,Monthly Searches,Est CPC,Competition,Score,Why\n';
      (lowHangingFruit?.top_opportunities || []).forEach(o => {
        oppCsv += `"${o.keyword}","${o.intent}",${o.estimated_monthly_searches},${o.estimated_cpc},"${o.competition}",${o.opportunity_score},"${o.why_its_gold}"\n`;
      });
      zip.file('opportunities.csv', oppCsv);

      // Summary TXT
      const summary = [
        `PPC RESEARCH REPORT — ${biz}`,
        `Generated: ${new Date().toLocaleDateString()}`,
        `Industry: ${industry}`,
        `Service Areas: ${serviceAreas.join(', ')}`,
        `Services Researched: ${selectedServices.join(', ')}`,
        '',
        '── EXECUTIVE SUMMARY ──',
        lowHangingFruit?.executive_summary || 'N/A',
        '',
        '── BUDGET RECOMMENDATIONS ──',
        `Conservative: $${keywordData?.estimated_monthly_budget_range?.conservative?.toLocaleString() || '?'}/mo`,
        `Balanced: $${keywordData?.estimated_monthly_budget_range?.balanced?.toLocaleString() || '?'}/mo`,
        `Aggressive: $${keywordData?.estimated_monthly_budget_range?.aggressive?.toLocaleString() || '?'}/mo`,
      ].join('\n');
      zip.file('executive-summary.txt', summary);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${biz}-ppc-research.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) { setError('ZIP export failed: ' + err.message); }
  };

  const printPDF = () => {
    if (clientId) {
      window.open(`/print/${clientId}`, '_blank');
    } else {
      window.print();
    }
  };

  const getStats = () => {
    if (!keywordData?.keyword_groups) return { total: 0, transactional: 0, avgCpc: '0.00' };
    const all = keywordData.keyword_groups.flatMap(g => g.keywords);
    return {
      total: all.length,
      transactional: all.filter(k => k.intent === 'transactional').length,
      avgCpc: all.length ? (all.reduce((s, k) => s + (k.estimated_cpc || 0), 0) / all.length).toFixed(2) : '0.00',
    };
  };

  const stats = getStats();

  return (
    <div className="px-8 py-10">
      {/* Page header */}
      <div className="mb-8">
        <h2 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-1">Client Research</h2>
        <p className="text-secondary text-sm font-body">
          Enter a client website and we will analyze their services, generate keyword lists, audit competitors, and find low-hanging fruit.
        </p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2 mb-8">
        {['Setup', 'Services', 'Running', 'Results'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <div className={`w-8 h-px ${i <= currentStep ? 'bg-primary' : 'bg-outline-variant'}`} />}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label font-semibold transition-all ${
              i === currentStep ? 'bg-primary text-white' :
              i < currentStep ? 'bg-emerald-100 text-emerald-700' :
              'bg-surface-high text-secondary'
            }`}>
              {i < currentStep && <span className="material-symbols-outlined text-[12px]">check</span>}
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
          <div className="flex-1">
            <p className="font-label font-semibold">Something went wrong</p>
            <p className="mt-0.5 text-red-600 text-xs">{error}</p>
          </div>
          <button onClick={() => setError('')} className="shrink-0">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* ── STEP 0: SETUP ── */}
      {currentStep === 0 && (
        <div className="fade-up max-w-2xl">
          <div className="card p-8 space-y-6">
            {/* API Key */}
            {hasServerKey ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="material-symbols-outlined text-emerald-700 text-[18px]">check_circle</span>
                <span className="text-sm font-label font-semibold text-emerald-700">API key configured via environment variable</span>
              </div>
            ) : (
              <div>
                <label className="field-label">Gemini API Key</label>
                <input
                  type="password"
                  className="field-input font-mono text-sm"
                  placeholder="AIza..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
                <p className="mt-1.5 text-xs text-secondary">
                  Free key from{' '}
                  <a href="https://aistudio.google.com" target="_blank" rel="noopener" className="text-primary hover:underline">
                    aistudio.google.com
                  </a>
                </p>
              </div>
            )}

            {/* Website URL */}
            <div>
              <label className="field-label">Client Website URL</label>
              <input
                type="url"
                className="field-input"
                placeholder="https://practicalplumbing.com"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
              />
            </div>

            {/* Industry */}
            <div>
              <label className="field-label">Industry</label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map(ind => (
                  <button
                    key={ind}
                    onClick={() => setIndustry(ind)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-label font-medium border transition-all ${
                      industry === ind
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface-lowest border-outline-variant/30 text-secondary hover:border-outline hover:text-on-surface'
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            {/* Service areas */}
            <div>
              <label className="field-label">Service Areas</label>
              <div className="flex gap-2">
                <input
                  className="field-input flex-1"
                  placeholder="e.g. Greensboro NC, 27401, High Point"
                  value={areaInput}
                  onChange={e => setAreaInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArea())}
                />
                <button
                  onClick={addArea}
                  className="px-4 py-2 bg-surface-high hover:bg-surface-dim text-on-surface rounded-lg transition-colors font-label font-medium text-sm"
                >
                  Add
                </button>
              </div>
              {serviceAreas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {serviceAreas.map(a => (
                    <span key={a} className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/[0.08] text-primary text-sm font-label rounded-lg border border-primary/20">
                      {a}
                      <button onClick={() => removeArea(a)}>
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={analyzeWebsite}
              disabled={loading || (!apiKey && !hasServerKey) || !websiteUrl}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-label font-semibold text-sm transition-all ${
                loading || (!apiKey && !hasServerKey) || !websiteUrl
                  ? 'bg-surface-high text-secondary cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary to-primary-container text-white shadow-sm hover:opacity-90'
              }`}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  {loadingPhase}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">manage_search</span>
                  Analyze Website &amp; Detect Services
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 1: SERVICE SELECTION ── */}
      {currentStep === 1 && websiteData && (
        <div className="fade-up">
          <div className="mb-6">
            <h3 className="text-xl font-headline font-bold text-on-surface">
              {websiteData.business_name || 'Website'} — Detected Services
            </h3>
            <p className="text-sm text-secondary mt-1">Select the services to include in the research. Adjust service areas if needed.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Service list */}
            <div className="lg:col-span-2 card p-6">
              <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-4">Services Found</p>
              <div className="space-y-2">
                {(websiteData.services || []).map(svc => (
                  <label
                    key={svc.name}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedServices.includes(svc.name)
                        ? 'bg-primary/[0.05] border-primary/20'
                        : 'bg-surface-low border-outline-variant/15 hover:border-outline-variant/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(svc.name)}
                      onChange={() => toggleService(svc.name)}
                      className="rounded border-outline-variant text-primary focus:ring-primary/20"
                    />
                    <div className="flex-1">
                      <span className="font-label font-semibold text-on-surface text-sm">{svc.name}</span>
                      <span className="ml-2 text-xs text-secondary">{svc.category}</span>
                    </div>
                    <span className={`text-[10px] font-label font-bold px-2 py-0.5 rounded-full ${
                      svc.estimated_value === 'high' ? 'bg-emerald-100 text-emerald-700' :
                      svc.estimated_value === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-surface-high text-secondary'
                    }`}>
                      {svc.estimated_value} value
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sidebar info */}
            <div className="space-y-4">
              {/* Service areas */}
              <div className="card p-5">
                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Service Areas</p>
                <div className="flex gap-2 mb-3">
                  <input
                    className="field-input text-sm flex-1"
                    placeholder="Add area..."
                    value={areaInput}
                    onChange={e => setAreaInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArea())}
                  />
                  <button onClick={addArea} className="px-3 py-2 bg-surface-high hover:bg-surface-dim rounded-lg transition-colors text-sm font-label">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {serviceAreas.map(a => (
                    <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/[0.08] text-primary text-xs font-label rounded-lg border border-primary/20">
                      {a}
                      <button onClick={() => removeArea(a)}>
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* USPs */}
              {websiteData.unique_selling_points?.length > 0 && (
                <div className="card p-5">
                  <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Detected USPs</p>
                  <ul className="space-y-2">
                    {websiteData.unique_selling_points.map((usp, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-on-variant">
                        <span className="material-symbols-outlined text-emerald-700 text-[14px] shrink-0 mt-0.5">check</span>
                        {usp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quick facts */}
              <div className="card p-5 space-y-2 text-sm">
                {[
                  { label: 'Online Scheduling', val: websiteData.has_online_scheduling },
                  { label: 'Emergency Services', val: websiteData.emergency_services },
                  { label: 'Reviews Displayed', val: websiteData.has_reviews_displayed },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-secondary font-label">{label}</span>
                    <span className={val ? 'text-emerald-700 font-label font-semibold' : 'text-outline font-label'}>
                      {val ? 'Yes' : 'No'}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-secondary font-label">Site Quality</span>
                  <span className="text-on-surface font-label font-semibold capitalize">{websiteData.website_quality}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setCurrentStep(0)}
              className="pill-btn-ghost"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back
            </button>
            <button
              onClick={runResearch}
              disabled={selectedServices.length === 0 || serviceAreas.length === 0}
              className={`pill-btn ${
                selectedServices.length === 0 || serviceAreas.length === 0
                  ? 'bg-surface-high text-secondary cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary to-primary-container text-white shadow-sm hover:opacity-90'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              Run Full Research Pipeline ({selectedServices.length} services × {serviceAreas.length} areas)
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: LOADING ── */}
      {currentStep === 2 && loading && (
        <div className="fade-up max-w-lg mx-auto text-center py-20">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/[0.08] flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
          </div>
          <h3 className="text-2xl font-headline font-bold text-on-surface mb-2">Running Research Pipeline</h3>
          <p className="text-secondary text-sm mb-8">{loadingPhase}</p>
          <div className="card p-6 text-left space-y-4">
            <PhaseRow label="Keyword Research" done={!!keywordData} active={!keywordData && loadingPhase.includes('keyword')} />
            <PhaseRow label="Competitor Audit" done={!!competitorData} active={!competitorData && loadingPhase.includes('competitor')} />
            <PhaseRow label="Low-Hanging Fruit Analysis" done={!!lowHangingFruit} active={!lowHangingFruit && (loadingPhase.includes('fruit') || loadingPhase.includes('competitor'))} />
          </div>
        </div>
      )}

      {/* ── STEP 3: RESULTS ── */}
      {currentStep === 3 && (
        <div className="fade-up">
          {/* Results header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-2xl font-headline font-bold text-on-surface">
                {websiteData?.business_name || 'Client'} — Research Results
              </h3>
              <p className="text-sm text-secondary mt-1">
                {selectedServices.length} services · {serviceAreas.length} service areas
                {clientId && (
                  <span> · <a href={`/clients/${clientId}`} className="text-primary hover:underline">View in Client Profile</a></span>
                )}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={exportCSV} className="pill-btn bg-surface-high text-on-surface hover:bg-surface-dim text-xs">
                <span className="material-symbols-outlined text-[15px]">download</span>
                CSV
              </button>
              <button onClick={exportZIP} className="pill-btn bg-surface-high text-on-surface hover:bg-surface-dim text-xs">
                <span className="material-symbols-outlined text-[15px]">folder_zip</span>
                ZIP
              </button>
              <button onClick={printPDF} className="pill-btn bg-surface-high text-on-surface hover:bg-surface-dim text-xs">
                <span className="material-symbols-outlined text-[15px]">print</span>
                PDF
              </button>
            </div>
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { icon: 'key_visualizer', label: 'Total Keywords', value: stats.total, color: 'text-primary' },
              { icon: 'target_arrow',   label: 'Transactional',  value: stats.transactional, color: 'text-amber-600' },
              { icon: 'payments',       label: 'Avg CPC',        value: `$${stats.avgCpc}`, color: 'text-emerald-700' },
              { icon: 'star',           label: 'Opportunities',  value: lowHangingFruit?.top_opportunities?.length || 0, color: 'text-tertiary' },
            ].map(s => (
              <div key={s.label} className="card p-5">
                <span className={`material-symbols-outlined text-[20px] mb-2 ${s.color}`}>{s.icon}</span>
                <p className="text-2xl font-headline font-bold text-on-surface">{s.value}</p>
                <p className="text-xs font-label text-secondary mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Executive summary */}
          {lowHangingFruit?.executive_summary && (
            <div className="mb-8 p-5 bg-primary/[0.04] border border-primary/15 rounded-xl flex gap-3">
              <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">auto_awesome</span>
              <div>
                <p className="font-label font-bold text-on-surface mb-1">Executive Summary</p>
                <p className="text-sm text-on-variant leading-relaxed">{lowHangingFruit.executive_summary}</p>
              </div>
            </div>
          )}

          {/* Tab nav */}
          <div className="flex gap-1 mb-0 border-b border-outline-variant/15">
            {[
              { id: 'keywords',     label: 'Keywords',        icon: 'key_visualizer' },
              { id: 'competitors',  label: 'Competitors',     icon: 'analytics' },
              { id: 'opportunities',label: 'Low-Hanging Fruit', icon: 'star' },
              { id: 'budget',       label: 'Budget',          icon: 'payments' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-label font-semibold transition-all border-b-2 -mb-px ${
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

          <div className="card rounded-tl-none overflow-hidden">
            {/* KEYWORDS */}
            {activeTab === 'keywords' && keywordData && (
              <div>
                {(keywordData.keyword_groups || []).map((group, gi) => (
                  <div key={gi} className={gi > 0 ? 'border-t border-outline-variant/10' : ''}>
                    <div className="px-6 py-4 bg-surface-low">
                      <p className="font-headline font-bold text-on-surface text-sm">
                        {group.theme}
                        <span className="ml-2 font-body font-normal text-secondary text-xs">
                          {group.keywords?.length || 0} keywords · {group.service}
                        </span>
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Keyword</th>
                            <th>Intent</th>
                            <th>Mo. Searches</th>
                            <th>Est. CPC</th>
                            <th>Competition</th>
                            <th>Priority</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(group.keywords || []).map((kw, ki) => (
                            <tr key={ki}>
                              <td className="font-label font-semibold text-on-surface">{kw.keyword}</td>
                              <td><span className={intentBadge(kw.intent)}>{kw.intent}</span></td>
                              <td className="font-mono text-sm text-on-variant">{(kw.estimated_monthly_searches || 0).toLocaleString()}</td>
                              <td className={`font-mono text-sm font-bold ${cpcClass(kw.estimated_cpc || 0)}`}>${(kw.estimated_cpc || 0).toFixed(2)}</td>
                              <td><span className={`text-[10px] font-label font-bold px-2 py-0.5 rounded-full ${compColor(kw.competition)}`}>{kw.competition}</span></td>
                              <td>
                                <span className={`text-[10px] font-label font-bold px-2 py-0.5 rounded-full ${
                                  kw.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  kw.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                  'bg-surface-high text-secondary'
                                }`}>{kw.priority}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                {keywordData.negative_keywords?.length > 0 && (
                  <div className="border-t border-outline-variant/10 p-6">
                    <p className="font-label font-bold text-on-surface text-sm mb-3">Negative Keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {keywordData.negative_keywords.map((nk, i) => (
                        <span key={i} className="px-3 py-1 bg-red-50 text-red-700 text-xs font-label rounded-lg border border-red-100">{nk}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COMPETITORS */}
            {activeTab === 'competitors' && competitorData && (
              <div className="p-6 space-y-4">
                {/* Market overview */}
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div className="card-inner p-4">
                    <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1">Competition Level</p>
                    <p className="font-headline font-bold text-on-surface capitalize">{competitorData.market_analysis?.competition_level || 'N/A'}</p>
                  </div>
                  <div className="card-inner p-4">
                    <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1">Avg CPC Range</p>
                    <p className="font-headline font-bold text-on-surface">
                      ${competitorData.market_analysis?.avg_cpc_range?.low || '?'}–${competitorData.market_analysis?.avg_cpc_range?.high || '?'}
                    </p>
                  </div>
                </div>

                {/* Opportunity gaps */}
                {competitorData.market_analysis?.opportunity_gaps?.length > 0 && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-sm font-label font-bold text-emerald-700 mb-2">Opportunity Gaps</p>
                    <ul className="space-y-1.5">
                      {competitorData.market_analysis.opportunity_gaps.map((gap, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-on-variant">
                          <span className="material-symbols-outlined text-emerald-700 text-[14px] shrink-0 mt-0.5">trending_up</span>
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Competitor cards */}
                {(competitorData.competitors || []).map((comp, i) => (
                  <div key={i} className="card-inner p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-headline font-bold text-on-surface">{comp.name}</p>
                        {comp.website && <p className="text-xs text-secondary mt-0.5">{comp.website}</p>}
                      </div>
                      <span className={`text-[10px] font-label font-bold px-2.5 py-1 rounded-full ${threatColor(comp.threat_level)}`}>
                        {comp.threat_level} threat
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(comp.services_advertised || []).map((svc, si) => (
                        <span key={si} className="text-xs px-2 py-0.5 bg-surface-high text-on-variant font-label rounded">{svc}</span>
                      ))}
                    </div>
                    {comp.notes && <p className="text-sm text-secondary mt-2">{comp.notes}</p>}
                  </div>
                ))}

                {/* Negative terms */}
                {competitorData.competitor_keywords_to_negate?.length > 0 && (
                  <div className="card-inner p-4">
                    <p className="text-sm font-label font-bold text-on-surface mb-2">Competitor Terms to Negate</p>
                    <div className="flex flex-wrap gap-2">
                      {competitorData.competitor_keywords_to_negate.map((t, i) => (
                        <span key={i} className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-label rounded-lg border border-red-100">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* OPPORTUNITIES */}
            {activeTab === 'opportunities' && lowHangingFruit && (
              <div className="p-6 space-y-3">
                {(lowHangingFruit.top_opportunities || [])
                  .sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0))
                  .map((opp, i) => (
                  <div key={i} className="card-inner p-5 hover:border-primary/20 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center text-xs font-headline font-bold text-tertiary shrink-0">
                        {opp.opportunity_score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-label font-bold text-on-surface">{opp.keyword}</p>
                          <span className={`text-[10px] font-label font-bold px-2 py-0.5 rounded-full shrink-0 ${compColor(opp.competition)}`}>
                            {opp.competition} comp
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={intentBadge(opp.intent)}>{opp.intent}</span>
                          <span className="text-xs font-label text-secondary">{(opp.estimated_monthly_searches||0).toLocaleString()}/mo</span>
                          <span className={`text-xs font-mono font-bold ${cpcClass(opp.estimated_cpc||0)}`}>${(opp.estimated_cpc||0).toFixed(2)} CPC</span>
                        </div>
                        <p className="text-sm text-on-variant mt-2">{opp.why_its_gold}</p>
                        <div className="flex gap-4 mt-2 text-xs text-secondary font-label">
                          <span>Match: <strong className="text-on-surface">{opp.recommended_match_type}</strong></span>
                          <span>Ad Group: <strong className="text-on-surface">{opp.recommended_ad_group}</strong></span>
                          <span>CVR: <strong className="text-on-surface">{opp.estimated_conversion_rate}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {lowHangingFruit.quick_win_campaigns?.length > 0 && (
                  <div className="mt-4">
                    <p className="font-headline font-bold text-on-surface mb-4">Quick Win Campaigns</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {lowHangingFruit.quick_win_campaigns.map((camp, i) => (
                        <div key={i} className="card-inner p-5">
                          <p className="font-label font-bold text-on-surface mb-1">{camp.campaign_name}</p>
                          <p className="text-sm text-secondary mb-3">{camp.strategy}</p>
                          <div className="flex gap-4 text-xs text-secondary font-label mb-3">
                            <span>Budget: <strong className="text-on-surface">${camp.estimated_daily_budget}/day</strong></span>
                            <span>Clicks: <strong className="text-on-surface">~{camp.expected_daily_clicks}/day</strong></span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(camp.keywords || []).map((kw, ki) => (
                              <span key={ki} className="text-xs px-2 py-0.5 bg-primary/[0.08] text-primary font-label rounded">{kw}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BUDGET */}
            {activeTab === 'budget' && keywordData && (
              <div className="p-6">
                <p className="font-headline font-bold text-on-surface mb-6">Budget Recommendations</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {['conservative', 'balanced', 'aggressive'].map(level => (
                    <div key={level} className={`p-5 rounded-xl border ${
                      level === 'balanced'
                        ? 'bg-primary/[0.04] border-primary/20'
                        : 'bg-surface-low border-outline-variant/15'
                    }`}>
                      <p className="text-xs font-label font-bold text-secondary uppercase tracking-widest mb-1 capitalize">{level}</p>
                      <p className="text-3xl font-headline font-bold text-on-surface">
                        ${(keywordData.estimated_monthly_budget_range?.[level] || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-secondary mt-1">/month</p>
                      {level === 'balanced' && (
                        <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-label font-bold">
                          Recommended
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {keywordData.budget_assumptions && (
                  <div className="p-4 bg-surface-low border border-outline-variant/15 rounded-xl text-sm text-on-variant">
                    <strong className="text-on-surface font-label">Assumptions: </strong>
                    {keywordData.budget_assumptions}
                  </div>
                )}
                {competitorData?.market_analysis?.peak_seasons?.length > 0 && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm font-label font-bold text-amber-700 mb-2">Peak Seasons</p>
                    <div className="flex flex-wrap gap-2">
                      {competitorData.market_analysis.peak_seasons.map((s, i) => (
                        <span key={i} className="text-xs px-3 py-1 bg-amber-100 text-amber-700 font-label rounded-lg">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Start over */}
          <div className="mt-8 flex justify-between items-center">
            <button
              onClick={() => {
                setCurrentStep(0); setWebsiteData(null); setKeywordData(null);
                setCompetitorData(null); setLowHangingFruit(null); setSelectedServices([]);
                setClientId(null); setWebsiteUrl(''); setServiceAreas([]);
              }}
              className="pill-btn-ghost text-sm"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Start New Research
            </button>
            {clientId && (
              <a href={`/clients/${clientId}`} className="pill-btn-secondary text-sm">
                <span className="material-symbols-outlined text-[16px]">person</span>
                View Client Profile
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
