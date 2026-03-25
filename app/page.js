'use client';

import { useState, useCallback } from 'react';

// ─── Icon components (inline to avoid dependency issues) ─────────────
function Icon({ children, className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      {children}
    </svg>
  );
}

function SearchIcon(p) { return <Icon {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></Icon>; }
function GlobeIcon(p) { return <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></Icon>; }
function TargetIcon(p) { return <Icon {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></Icon>; }
function TrendingUpIcon(p) { return <Icon {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></Icon>; }
function DownloadIcon(p) { return <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></Icon>; }
function CheckIcon(p) { return <Icon {...p}><path d="M20 6 9 17l-5-5"/></Icon>; }
function LoaderIcon({ className = '' }) { return <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/><path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" opacity=".75"/></svg>; }
function AlertIcon(p) { return <Icon {...p}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></Icon>; }
function ChevronRightIcon(p) { return <Icon {...p}><path d="m9 18 6-6-6-6"/></Icon>; }
function SparklesIcon(p) { return <Icon {...p}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></Icon>; }
function XIcon(p) { return <Icon {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></Icon>; }
function PlusIcon(p) { return <Icon {...p}><path d="M5 12h14"/><path d="M12 5v14"/></Icon>; }
function UsersIcon(p) { return <Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>; }
function DollarIcon(p) { return <Icon {...p}><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Icon>; }
function LeafIcon(p) { return <Icon {...p}><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 20 2 20 2s-1.5 5.5-4 10.5c-2 4-5 7.5-5 7.5Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></Icon>; }

// ─── Constants ─────────────────────────────────────────────────────
const STEPS = [
  { id: 'setup', label: 'Setup', icon: GlobeIcon },
  { id: 'services', label: 'Services', icon: SearchIcon },
  { id: 'research', label: 'Research', icon: SparklesIcon },
  { id: 'results', label: 'Results', icon: TargetIcon },
];

const INDUSTRIES = [
  'Plumbing',
  'HVAC',
  'Plumbing & HVAC',
  'Electrical',
  'Roofing',
  'General Contractor',
  'Pest Control',
  'Landscaping',
  'Other Home Services',
];

// ─── Main Page Component ──────────────────────────────────────────
export default function HomePage() {
  // Step management
  const [currentStep, setCurrentStep] = useState(0);

  // Setup state
  const [apiKey, setApiKey] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [industry, setIndustry] = useState('Plumbing');

  // Service areas
  const [serviceAreas, setServiceAreas] = useState([]);
  const [areaInput, setAreaInput] = useState('');

  // Website analysis results
  const [websiteData, setWebsiteData] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);

  // Research results
  const [keywordData, setKeywordData] = useState(null);
  const [competitorData, setCompetitorData] = useState(null);
  const [lowHangingFruit, setLowHangingFruit] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [error, setError] = useState('');
  const [activeResultTab, setActiveResultTab] = useState('keywords');

  // ─── Handlers ─────────────────────────────────────────────────
  const addServiceArea = useCallback(() => {
    const trimmed = areaInput.trim();
    if (trimmed && !serviceAreas.includes(trimmed)) {
      setServiceAreas(prev => [...prev, trimmed]);
      setAreaInput('');
    }
  }, [areaInput, serviceAreas]);

  const removeServiceArea = useCallback((area) => {
    setServiceAreas(prev => prev.filter(a => a !== area));
  }, []);

  const toggleService = useCallback((serviceName) => {
    setSelectedServices(prev =>
      prev.includes(serviceName)
        ? prev.filter(s => s !== serviceName)
        : [...prev, serviceName]
    );
  }, []);

  // ─── Step 1: Analyze Website ──────────────────────────────────
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
      // Pre-select primary services
      const primary = (result.data.services || [])
        .filter(s => s.is_primary)
        .map(s => s.name);
      setSelectedServices(primary.length ? primary : (result.data.services || []).map(s => s.name));

      // If service areas detected, pre-fill
      if (result.data.service_areas_detected?.length && serviceAreas.length === 0) {
        setServiceAreas(result.data.service_areas_detected);
      }

      setCurrentStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingPhase('');
    }
  };

  // ─── Step 2: Run Full Research Pipeline ────────────────────────
  const runResearch = async () => {
    setLoading(true);
    setError('');
    setCurrentStep(2);

    try {
      // Phase 1: Keyword Research
      setLoadingPhase('Running keyword research across service areas...');
      const kwRes = await fetch('/api/keyword-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          services: selectedServices,
          serviceAreas,
          industry,
        }),
      });
      const kwResult = await kwRes.json();
      if (!kwRes.ok) throw new Error(kwResult.error);
      setKeywordData(kwResult.data);

      // Phase 2: Competitor Audit + Low Hanging Fruit
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

      setCurrentStep(3);
    } catch (err) {
      setError(err.message);
      setCurrentStep(1); // Go back to services step on error
    } finally {
      setLoading(false);
      setLoadingPhase('');
    }
  };

  // ─── Export CSV ────────────────────────────────────────────────
  const exportCSV = async () => {
    try {
      const res = await fetch('/api/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywordData,
          competitorData,
          lowHangingFruit,
          businessName: websiteData?.business_name || websiteUrl,
        }),
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${websiteData?.business_name || 'research'}-ppc-report.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export CSV: ' + err.message);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────
  const intentColor = (intent) => {
    switch (intent) {
      case 'transactional': return 'intent-transactional';
      case 'commercial': return 'intent-commercial';
      case 'informational': return 'intent-informational';
      default: return 'intent-navigational';
    }
  };

  const cpcColor = (cpc) => {
    if (cpc < 10) return 'cpc-low';
    if (cpc < 30) return 'cpc-medium';
    return 'cpc-high';
  };

  const priorityBadge = (priority) => {
    const colors = {
      high: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
      medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
      low: 'bg-surface-300 text-surface-700 border-surface-300',
    };
    return colors[priority] || colors.low;
  };

  // ─── Count stats from keyword data ─────────────────────────────
  const getStats = () => {
    if (!keywordData?.keyword_groups) return { total: 0, transactional: 0, avgCpc: 0 };
    const allKw = keywordData.keyword_groups.flatMap(g => g.keywords);
    const total = allKw.length;
    const transactional = allKw.filter(k => k.intent === 'transactional').length;
    const avgCpc = total > 0 ? (allKw.reduce((s, k) => s + (k.estimated_cpc || 0), 0) / total).toFixed(2) : 0;
    return { total, transactional, avgCpc };
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-surface-200 bg-surface-50/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <TargetIcon className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-surface-950 leading-tight">PPC Recon</h1>
              <p className="text-xs text-surface-600">Google Ads Research Tool</p>
            </div>
          </div>

          {/* Step indicators */}
          <div className="hidden sm:flex items-center gap-1">
            {STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const isActive = i === currentStep;
              const isDone = i < currentStep;
              return (
                <div key={step.id} className="flex items-center">
                  {i > 0 && <div className={`w-8 h-px mx-1 ${isDone ? 'bg-brand-500' : 'bg-surface-300'}`} />}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                    ${isActive ? 'bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/30' : ''}
                    ${isDone ? 'bg-emerald-500/10 text-emerald-400' : ''}
                    ${!isActive && !isDone ? 'text-surface-500' : ''}
                  `}>
                    {isDone ? <CheckIcon className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                    <span>{step.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm animate-in">
            <AlertIcon className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Something went wrong</p>
              <p className="mt-1 text-rose-400/80">{error}</p>
            </div>
            <button onClick={() => setError('')} className="ml-auto shrink-0 hover:text-rose-200">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ───────── STEP 0: SETUP ───────── */}
        {currentStep === 0 && (
          <div className="animate-in max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-display font-bold text-surface-950 mb-3">
                Client Research Setup
              </h2>
              <p className="text-surface-600 text-lg">
                Enter your client's info and we'll use Gemini AI to crawl their site, research keywords, audit competitors, and find low-hanging fruit.
              </p>
            </div>

            <div className="space-y-6 bg-surface-50 border border-surface-200 rounded-2xl p-8">
              {/* API Key */}
              <div>
                <label className="field-label">Gemini API Key</label>
                <input
                  type="password"
                  className="field-input font-mono text-sm"
                  placeholder="AIza..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
                <p className="mt-1.5 text-xs text-surface-500">
                  Free key from{' '}
                  <a href="https://aistudio.google.com" target="_blank" rel="noopener"
                    className="text-brand-400 hover:text-brand-300 underline underline-offset-2">
                    aistudio.google.com
                  </a>
                  {' '}— or set <code className="font-mono text-[11px] bg-surface-200 px-1.5 py-0.5 rounded">GEMINI_API_KEY</code> in Vercel env vars.
                </p>
              </div>

              {/* Website URL */}
              <div>
                <label className="field-label">Client Website</label>
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
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all
                        ${industry === ind
                          ? 'bg-brand-500/15 text-brand-400 border-brand-500/30'
                          : 'bg-surface-100 text-surface-700 border-surface-200 hover:border-surface-400'
                        }`}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Areas */}
              <div>
                <label className="field-label">Service Areas (cities, zip codes, or regions)</label>
                <div className="flex gap-2">
                  <input
                    className="field-input flex-1"
                    placeholder="e.g. Greensboro NC, 27401, High Point"
                    value={areaInput}
                    onChange={e => setAreaInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addServiceArea())}
                  />
                  <button
                    onClick={addServiceArea}
                    className="px-4 py-2 bg-surface-200 hover:bg-surface-300 text-surface-800 rounded-lg transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
                {serviceAreas.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {serviceAreas.map(area => (
                      <span key={area}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 text-brand-400 text-sm rounded-lg border border-brand-500/20">
                        {area}
                        <button onClick={() => removeServiceArea(area)} className="hover:text-brand-200">
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                onClick={analyzeWebsite}
                disabled={loading || !apiKey || !websiteUrl}
                className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-display font-semibold text-base transition-all
                  ${loading || !apiKey || !websiteUrl
                    ? 'bg-surface-200 text-surface-500 cursor-not-allowed'
                    : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/20 hover:shadow-brand-500/30'
                  }`}
              >
                {loading ? (
                  <>
                    <LoaderIcon />
                    <span>{loadingPhase}</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon />
                    <span>Analyze Website & Detect Services</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ───────── STEP 1: REVIEW SERVICES ───────── */}
        {currentStep === 1 && websiteData && (
          <div className="animate-in max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-surface-950 mb-2">
                {websiteData.business_name || 'Website'} — Detected Services
              </h2>
              <p className="text-surface-600">
                Select the services you want to research keywords for. Add or remove service areas below.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Services list */}
              <div className="lg:col-span-2 bg-surface-50 border border-surface-200 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-surface-800 uppercase tracking-wider mb-4">Services Found</h3>
                <div className="space-y-2">
                  {(websiteData.services || []).map(svc => (
                    <label key={svc.name}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                        ${selectedServices.includes(svc.name)
                          ? 'bg-brand-500/10 border-brand-500/25'
                          : 'bg-surface-100 border-surface-200 hover:border-surface-300'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(svc.name)}
                        onChange={() => toggleService(svc.name)}
                        className="rounded border-surface-400 text-brand-500 focus:ring-brand-500/40"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-surface-900">{svc.name}</span>
                        <span className="ml-2 text-xs text-surface-500">{svc.category}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        svc.estimated_value === 'high' ? 'bg-emerald-500/15 text-emerald-400' :
                        svc.estimated_value === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-surface-200 text-surface-600'
                      }`}>
                        {svc.estimated_value} value
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sidebar info */}
              <div className="space-y-4">
                {/* Service Areas */}
                <div className="bg-surface-50 border border-surface-200 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-surface-800 uppercase tracking-wider mb-3">Service Areas</h3>
                  <div className="flex gap-2 mb-3">
                    <input
                      className="field-input text-sm flex-1"
                      placeholder="Add area..."
                      value={areaInput}
                      onChange={e => setAreaInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addServiceArea())}
                    />
                    <button onClick={addServiceArea} className="px-3 bg-surface-200 hover:bg-surface-300 rounded-lg transition-colors">
                      <PlusIcon className="w-4 h-4 text-surface-700" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {serviceAreas.map(area => (
                      <span key={area} className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-500/10 text-brand-400 text-xs rounded-md border border-brand-500/20">
                        {area}
                        <button onClick={() => removeServiceArea(area)} className="hover:text-brand-200"><XIcon className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* USPs */}
                {websiteData.unique_selling_points?.length > 0 && (
                  <div className="bg-surface-50 border border-surface-200 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-surface-800 uppercase tracking-wider mb-3">Detected USPs</h3>
                    <ul className="space-y-2 text-sm text-surface-700">
                      {websiteData.unique_selling_points.map((usp, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          {usp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick facts */}
                <div className="bg-surface-50 border border-surface-200 rounded-2xl p-6 space-y-2 text-sm">
                  <div className="flex justify-between text-surface-600">
                    <span>Online Scheduling</span>
                    <span className={websiteData.has_online_scheduling ? 'text-emerald-400' : 'text-surface-500'}>
                      {websiteData.has_online_scheduling ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between text-surface-600">
                    <span>Emergency Services</span>
                    <span className={websiteData.emergency_services ? 'text-emerald-400' : 'text-surface-500'}>
                      {websiteData.emergency_services ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between text-surface-600">
                    <span>Website Quality</span>
                    <span className="text-surface-800 capitalize">{websiteData.website_quality}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Run Research button */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={runResearch}
                disabled={loading || selectedServices.length === 0 || serviceAreas.length === 0}
                className={`flex items-center gap-2 px-8 py-4 rounded-xl font-display font-semibold text-base transition-all
                  ${loading || selectedServices.length === 0 || serviceAreas.length === 0
                    ? 'bg-surface-200 text-surface-500 cursor-not-allowed'
                    : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/20 hover:shadow-brand-500/30 glow-pulse'
                  }`}
              >
                <SearchIcon />
                Run Full Research Pipeline ({selectedServices.length} services × {serviceAreas.length} areas)
                <ChevronRightIcon />
              </button>
            </div>
          </div>
        )}

        {/* ───────── STEP 2: RUNNING RESEARCH ───────── */}
        {currentStep === 2 && loading && (
          <div className="animate-in max-w-lg mx-auto text-center py-20">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand-500/15 flex items-center justify-center">
              <LoaderIcon className="w-8 h-8 text-brand-400" />
            </div>
            <h2 className="text-2xl font-display font-bold text-surface-950 mb-3">
              Running Research Pipeline
            </h2>
            <p className="text-surface-600 mb-8">{loadingPhase}</p>

            <div className="space-y-3 text-left bg-surface-50 border border-surface-200 rounded-2xl p-6">
              <PhaseRow
                label="Keyword Research"
                done={!!keywordData}
                active={!keywordData && loadingPhase.includes('keyword')}
              />
              <PhaseRow
                label="Competitor Audit"
                done={!!competitorData}
                active={!competitorData && loadingPhase.includes('competitor')}
              />
              <PhaseRow
                label="Low-Hanging Fruit Analysis"
                done={!!lowHangingFruit}
                active={!lowHangingFruit && loadingPhase.includes('fruit')}
              />
            </div>
          </div>
        )}

        {/* ───────── STEP 3: RESULTS DASHBOARD ───────── */}
        {currentStep === 3 && (
          <div className="animate-in">
            {/* Summary bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-display font-bold text-surface-950">
                  {websiteData?.business_name || 'Client'} — Research Results
                </h2>
                <p className="text-surface-600 text-sm mt-1">
                  {selectedServices.length} services × {serviceAreas.length} service areas
                </p>
              </div>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-xl text-sm font-medium border border-emerald-500/20 transition-all"
              >
                <DownloadIcon className="w-4 h-4" />
                Export CSV Report
              </button>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Total Keywords"
                value={getStats().total}
                icon={SearchIcon}
                color="brand"
              />
              <StatCard
                label="Transactional"
                value={getStats().transactional}
                icon={TargetIcon}
                color="emerald"
              />
              <StatCard
                label="Avg CPC"
                value={`$${getStats().avgCpc}`}
                icon={DollarIcon}
                color="amber"
              />
              <StatCard
                label="Opportunities"
                value={lowHangingFruit?.top_opportunities?.length || 0}
                icon={LeafIcon}
                color="green"
              />
            </div>

            {/* Executive Summary */}
            {lowHangingFruit?.executive_summary && (
              <div className="mb-8 p-5 bg-gradient-to-r from-brand-500/10 to-emerald-500/10 border border-brand-500/15 rounded-2xl">
                <div className="flex items-start gap-3">
                  <SparklesIcon className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-display font-semibold text-surface-900 mb-1">Executive Summary</h3>
                    <p className="text-surface-700 text-sm leading-relaxed">{lowHangingFruit.executive_summary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab navigation */}
            <div className="flex gap-1 mb-6 bg-surface-50 p-1 rounded-xl border border-surface-200 w-fit">
              {[
                { id: 'keywords', label: 'Keywords', icon: SearchIcon },
                { id: 'competitors', label: 'Competitors', icon: UsersIcon },
                { id: 'opportunities', label: 'Low-Hanging Fruit', icon: LeafIcon },
                { id: 'budget', label: 'Budget', icon: DollarIcon },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveResultTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${activeResultTab === tab.id
                      ? 'bg-surface-200 text-surface-950 shadow-sm'
                      : 'text-surface-600 hover:text-surface-800'
                    }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="bg-surface-50 border border-surface-200 rounded-2xl overflow-hidden">
              {/* KEYWORDS TAB */}
              {activeResultTab === 'keywords' && keywordData && (
                <div>
                  {(keywordData.keyword_groups || []).map((group, gi) => (
                    <div key={gi} className={gi > 0 ? 'border-t border-surface-200' : ''}>
                      <div className="px-6 py-4 bg-surface-100/50">
                        <h4 className="font-display font-semibold text-surface-900">
                          {group.theme}
                          <span className="ml-2 text-xs font-normal text-surface-500">
                            {group.keywords?.length || 0} keywords · {group.service}
                          </span>
                        </h4>
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
                                <td className="font-medium text-surface-900">{kw.keyword}</td>
                                <td>
                                  <span className={`keyword-chip ${intentColor(kw.intent)}`}>
                                    {kw.intent}
                                  </span>
                                </td>
                                <td className="text-surface-700 font-mono text-sm">
                                  {(kw.estimated_monthly_searches || 0).toLocaleString()}
                                </td>
                                <td className={`font-mono text-sm font-medium ${cpcColor(kw.estimated_cpc)}`}>
                                  ${(kw.estimated_cpc || 0).toFixed(2)}
                                </td>
                                <td>
                                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                    kw.competition === 'low' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    kw.competition === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                    'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  }`}>
                                    {kw.competition}
                                  </span>
                                </td>
                                <td>
                                  <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityBadge(kw.priority)}`}>
                                    {kw.priority}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}

                  {/* Negative Keywords */}
                  {keywordData.negative_keywords?.length > 0 && (
                    <div className="border-t border-surface-200 p-6">
                      <h4 className="font-display font-semibold text-surface-900 mb-3">Negative Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {keywordData.negative_keywords.map((nk, i) => (
                          <span key={i} className="px-3 py-1 bg-rose-500/10 text-rose-400 text-xs rounded-lg border border-rose-500/15">
                            {nk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* COMPETITORS TAB */}
              {activeResultTab === 'competitors' && competitorData && (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-surface-100 rounded-xl">
                      <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">Competition Level</p>
                      <p className="text-lg font-display font-bold text-surface-950 capitalize">
                        {competitorData.market_analysis?.competition_level || 'N/A'}
                      </p>
                    </div>
                    <div className="p-4 bg-surface-100 rounded-xl">
                      <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">CPC Range</p>
                      <p className="text-lg font-display font-bold text-surface-950">
                        ${competitorData.market_analysis?.avg_cpc_range?.low || '?'} – ${competitorData.market_analysis?.avg_cpc_range?.high || '?'}
                      </p>
                    </div>
                  </div>

                  {/* Opportunity gaps */}
                  {competitorData.market_analysis?.opportunity_gaps?.length > 0 && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl mb-4">
                      <h4 className="font-semibold text-emerald-400 text-sm mb-2">Opportunity Gaps</h4>
                      <ul className="space-y-1.5">
                        {competitorData.market_analysis.opportunity_gaps.map((gap, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-surface-700">
                            <LeafIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            {gap}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Competitor cards */}
                  {(competitorData.competitors || []).map((comp, i) => (
                    <div key={i} className="p-5 bg-surface-100 rounded-xl border border-surface-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-display font-semibold text-surface-950">{comp.name}</h4>
                          {comp.website && (
                            <p className="text-xs text-surface-500 mt-0.5">{comp.website}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                          comp.threat_level === 'high' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          comp.threat_level === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-surface-200 text-surface-600 border-surface-300'
                        }`}>
                          {comp.threat_level} threat
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(comp.services_advertised || []).map((svc, si) => (
                          <span key={si} className="text-xs px-2 py-0.5 bg-surface-200 text-surface-700 rounded">
                            {svc}
                          </span>
                        ))}
                      </div>
                      {comp.notes && <p className="text-sm text-surface-600 mt-2">{comp.notes}</p>}
                    </div>
                  ))}

                  {/* Negatives */}
                  {competitorData.competitor_keywords_to_negate?.length > 0 && (
                    <div className="p-4 bg-surface-100 rounded-xl border border-surface-200">
                      <h4 className="font-semibold text-sm text-surface-800 mb-2">Competitor Terms to Negate</h4>
                      <div className="flex flex-wrap gap-2">
                        {competitorData.competitor_keywords_to_negate.map((term, i) => (
                          <span key={i} className="px-2.5 py-1 bg-rose-500/10 text-rose-400 text-xs rounded-lg border border-rose-500/15">
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* LOW-HANGING FRUIT TAB */}
              {activeResultTab === 'opportunities' && lowHangingFruit && (
                <div className="p-6 space-y-4">
                  {(lowHangingFruit.top_opportunities || [])
                    .sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0))
                    .map((opp, i) => (
                    <div key={i} className="p-5 bg-surface-100 rounded-xl border border-surface-200 hover:border-emerald-500/20 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 font-display font-bold text-sm">
                            {opp.opportunity_score}
                          </div>
                          <div>
                            <h4 className="font-display font-semibold text-surface-950">{opp.keyword}</h4>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-surface-500">
                              <span className={intentColor(opp.intent) + ' keyword-chip'}>{opp.intent}</span>
                              <span className="font-mono">{(opp.estimated_monthly_searches || 0).toLocaleString()}/mo</span>
                              <span className={`font-mono font-medium ${cpcColor(opp.estimated_cpc)}`}>
                                ${(opp.estimated_cpc || 0).toFixed(2)} CPC
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          opp.competition === 'low' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {opp.competition} comp.
                        </span>
                      </div>
                      <p className="text-sm text-surface-700 mt-2">{opp.why_its_gold}</p>
                      <div className="flex gap-4 mt-3 text-xs text-surface-500">
                        <span>Match: <strong className="text-surface-700">{opp.recommended_match_type}</strong></span>
                        <span>Ad Group: <strong className="text-surface-700">{opp.recommended_ad_group}</strong></span>
                        <span>Est. CVR: <strong className="text-surface-700">{opp.estimated_conversion_rate}</strong></span>
                      </div>
                    </div>
                  ))}

                  {/* Quick Win Campaigns */}
                  {lowHangingFruit.quick_win_campaigns?.length > 0 && (
                    <div className="mt-8">
                      <h3 className="font-display font-bold text-lg text-surface-950 mb-4">Quick Win Campaigns</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {lowHangingFruit.quick_win_campaigns.map((camp, i) => (
                          <div key={i} className="p-5 bg-gradient-to-br from-brand-500/5 to-emerald-500/5 border border-brand-500/15 rounded-xl">
                            <h4 className="font-display font-semibold text-surface-950 mb-1">{camp.campaign_name}</h4>
                            <p className="text-sm text-surface-600 mb-3">{camp.strategy}</p>
                            <div className="flex gap-4 text-xs text-surface-500 mb-3">
                              <span>Budget: <strong className="text-surface-800">${camp.estimated_daily_budget}/day</strong></span>
                              <span>Clicks: <strong className="text-surface-800">~{camp.expected_daily_clicks}/day</strong></span>
                              <span>Leads: <strong className="text-surface-800">{camp.expected_monthly_leads}/mo</strong></span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(camp.keywords || []).map((kw, ki) => (
                                <span key={ki} className="text-xs px-2 py-0.5 bg-brand-500/10 text-brand-400 rounded border border-brand-500/15">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* BUDGET TAB */}
              {activeResultTab === 'budget' && keywordData && (
                <div className="p-6">
                  <h3 className="font-display font-bold text-lg text-surface-950 mb-4">Budget Recommendations</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {['conservative', 'balanced', 'aggressive'].map(level => (
                      <div key={level} className={`p-5 rounded-xl border ${
                        level === 'balanced' ? 'bg-brand-500/5 border-brand-500/20' : 'bg-surface-100 border-surface-200'
                      }`}>
                        <p className="text-xs text-surface-500 uppercase tracking-wider mb-1 capitalize">{level}</p>
                        <p className="text-2xl font-display font-bold text-surface-950">
                          ${(keywordData.estimated_monthly_budget_range?.[level] || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-surface-500 mt-1">/month</p>
                        {level === 'balanced' && (
                          <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-brand-500/15 text-brand-400 rounded-full">Recommended</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {keywordData.budget_assumptions && (
                    <p className="text-sm text-surface-600 p-4 bg-surface-100 rounded-xl border border-surface-200">
                      <strong className="text-surface-800">Assumptions:</strong> {keywordData.budget_assumptions}
                    </p>
                  )}

                  {/* Seasonal notes from competitor data */}
                  {competitorData?.market_analysis?.peak_seasons?.length > 0 && (
                    <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                      <h4 className="text-sm font-semibold text-amber-400 mb-2">Peak Seasons to Plan For</h4>
                      <div className="flex flex-wrap gap-2">
                        {competitorData.market_analysis.peak_seasons.map((s, i) => (
                          <span key={i} className="text-xs px-3 py-1 bg-amber-500/10 text-amber-300 rounded-lg border border-amber-500/15">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Start Over */}
            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setCurrentStep(0);
                  setWebsiteData(null);
                  setKeywordData(null);
                  setCompetitorData(null);
                  setLowHangingFruit(null);
                  setSelectedServices([]);
                }}
                className="text-sm text-surface-500 hover:text-surface-700 underline underline-offset-4 transition-colors"
              >
                Start new research
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-200 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-surface-500">
          <span>PPC Recon — Internal Research Tool</span>
          <span>Powered by Gemini AI</span>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function PhaseRow({ label, done, active }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
        done ? 'bg-emerald-500/20' : active ? 'bg-brand-500/20' : 'bg-surface-200'
      }`}>
        {done ? (
          <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
        ) : active ? (
          <LoaderIcon className="w-3.5 h-3.5 text-brand-400" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-surface-400" />
        )}
      </div>
      <span className={`text-sm ${done ? 'text-emerald-400' : active ? 'text-brand-400' : 'text-surface-500'}`}>
        {label}
      </span>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colorMap = {
    brand: 'from-brand-500/10 to-brand-500/5 border-brand-500/15 text-brand-400',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/15 text-emerald-400',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/15 text-amber-400',
    green: 'from-green-500/10 to-green-500/5 border-green-500/15 text-green-400',
  };

  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-br border ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-4 h-4 opacity-60" />
      </div>
      <p className="text-2xl font-display font-bold text-surface-950">{value}</p>
      <p className="text-xs text-surface-500 mt-0.5">{label}</p>
    </div>
  );
}
