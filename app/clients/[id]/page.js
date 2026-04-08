'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getClient, deleteClient, updateClient } from '@/lib/supabase';
import { getDefaultBenchmarks, getSeasonalMultipliers, getServiceFrequency, TAM_CONSTANTS } from '@/lib/benchmarks';
import { getNegativeKeywords, buildNegativeKeywordCSV } from '@/lib/negative-keywords';

const intentBadge = (i) => ({ transactional: 'badge-transactional', commercial: 'badge-commercial', informational: 'badge-informational' }[i] || 'badge-navigational');
const cpcClass = (c) => c < 10 ? 'cpc-low' : c < 30 ? 'cpc-mid' : 'cpc-high';
const compColor = (c) => c === 'low' ? 'bg-secondary/15 text-secondary' : c === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('keywords');
  const [error, setError] = useState('');
  const [projecting, setProjecting] = useState(false);
  const [projectionError, setProjectionError] = useState('');
  const [selectedTier, setSelectedTier] = useState('balanced');
  const [closeRate, setCloseRate] = useState(45);    // percent, 0–100
  const [avgJobValue, setAvgJobValue] = useState(1000); // dollars
  const [generatingAdCopy, setGeneratingAdCopy] = useState(false);
  const [adCopyError, setAdCopyError] = useState('');
  const [expandedAdGroup, setExpandedAdGroup] = useState(null);
  const [tamPopulation, setTamPopulation] = useState(250000);
  const [auditingPages, setAuditingPages] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState('');
  const [hasGoogleAds, setHasGoogleAds] = useState(false);
  const [trendsData, setTrendsData] = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const fetchTrends = useCallback(async (client) => {
    const keyword = client.primary_keyword || client.services?.[0] || client.industry || 'home services';
    // Try to extract state abbreviation from service areas like "Greensboro, NC"
    const firstArea = client.service_areas?.[0] || '';
    const stateMatch = firstArea.match(/,\s*([A-Z]{2})$/);
    const geo = stateMatch ? `US-${stateMatch[1]}` : 'US';

    setTrendsLoading(true);
    try {
      const res = await fetch(`/api/trends?keyword=${encodeURIComponent(keyword)}&geo=${encodeURIComponent(geo)}`);
      const data = await res.json();
      if (res.ok && data.multipliers) setTrendsData(data);
    } catch (e) {
      console.warn('Trends fetch failed:', e);
    } finally {
      setTrendsLoading(false);
    }
  }, []);

  useEffect(() => {
    getClient(id).then(clientData => {
      setClient(clientData);
      if (clientData) fetchTrends(clientData);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id, fetchTrends]);

  useEffect(() => {
    if (client?.industry) {
      const b = getDefaultBenchmarks(client.industry);
      setCloseRate(Math.round(b.closeRate * 100));
      setAvgJobValue(b.avgJobValue);
    }
  }, [client?.industry]);

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => setHasGoogleAds(!!d.hasGoogleAds)).catch(() => {});
  }, []);

  const handleDelete = async () => {
    if (!confirm('Delete this client and all research data?')) return;
    await deleteClient(id);
    router.push('/clients');
  };

  const enrichWithGoogle = async () => {
    if (!client?.keyword_data) return;
    setEnriching(true);
    setEnrichError('');
    try {
      const res = await fetch('/api/keyword-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywordData: client.keyword_data,
          serviceAreas: client.service_areas || [],
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      const updated = { ...client, keyword_data: result.data };
      setClient(updated);
      await updateClient(id, { keyword_data: result.data });
    } catch (err) {
      setEnrichError(err.message);
    } finally {
      setEnriching(false);
    }
  };

  const exportCSV = async () => {
    if (!client) return;
    try {
      const res = await fetch('/api/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywordData: client.keyword_data,
          competitorData: client.competitor_data,
          lowHangingFruit: client.low_hanging_fruit,
          businessName: client.name,
        }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${client.name}-ppc-report.csv`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { alert('Export failed: ' + e.message); }
  };

  const exportZIP = async () => {
    if (!client) return;
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      let kwCsv = 'Ad Group,Keyword,Intent,Monthly Searches,Est CPC,Competition,Priority\n';
      (client.keyword_data?.keyword_groups || []).forEach(g =>
        (g.keywords || []).forEach(kw => { kwCsv += `"${g.theme}","${kw.keyword}","${kw.intent}",${kw.estimated_monthly_searches},${kw.estimated_cpc},"${kw.competition}","${kw.priority}"\n`; })
      );
      zip.file('keywords.csv', kwCsv);
      let oppCsv = 'Keyword,Intent,Monthly Searches,Est CPC,Competition,Score,Why\n';
      (client.low_hanging_fruit?.top_opportunities || []).forEach(o => {
        oppCsv += `"${o.keyword}","${o.intent}",${o.estimated_monthly_searches},${o.estimated_cpc},"${o.competition}",${o.opportunity_score},"${o.why_its_gold}"\n`;
      });
      zip.file('opportunities.csv', oppCsv);
      let compCsv = 'Competitor,Est Ad Spend,Threat,Services,Notes\n';
      (client.competitor_data?.competitors || []).forEach(c => {
        compCsv += `"${c.name}","${c.estimated_ad_spend}","${c.threat_level}","${(c.services_advertised||[]).join('; ')}","${c.notes||''}"\n`;
      });
      zip.file('competitors.csv', compCsv);
      zip.file('summary.txt', `${client.name}\nIndustry: ${client.industry}\nWebsite: ${client.website}\nService Areas: ${(client.service_areas||[]).join(', ')}\n\n${client.low_hanging_fruit?.executive_summary || ''}`);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${client.name}-ppc-research.zip`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { alert('ZIP failed: ' + e.message); }
  };

  const generateProjection = async () => {
    if (!client) return;
    setProjecting(true);
    setProjectionError('');
    try {
      const res = await fetch('/api/budget-projection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: client.name,
          industry: client.industry,
          serviceAreas: client.service_areas,
          keywordData: client.keyword_data,
          competitorData: client.competitor_data,
          calibration: client.calibration || null,
          seasonalMultipliers: trendsData?.multipliers ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generation failed');
      const { updateClient } = await import('@/lib/supabase');
      const updated = await updateClient(id, { budget_projection: json.data });
      setClient(updated);
    } catch (e) {
      setProjectionError(e.message);
    } finally {
      setProjecting(false);
    }
  };

  const generateAdCopy = async () => {
    if (!client) return;
    setGeneratingAdCopy(true);
    setAdCopyError('');
    try {
      const res = await fetch('/api/ad-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywordData: client.keyword_data,
          websiteData: client.website_data,
          industry: client.industry,
          serviceAreas: client.service_areas,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generation failed');
      const { updateClient } = await import('@/lib/supabase');
      const updated = await updateClient(id, { ad_copy: json.data });
      setClient(updated);
      setExpandedAdGroup(0);
    } catch (e) {
      setAdCopyError(e.message);
    } finally {
      setGeneratingAdCopy(false);
    }
  };

  const exportAdCopyCSV = () => {
    if (!client?.ad_copy?.ad_groups) return;
    const groups = client.ad_copy.ad_groups;
    const maxH = 15, maxD = 4;
    let header = 'Campaign,Ad Group';
    for (let i = 1; i <= maxH; i++) header += `,Headline ${i}`;
    for (let i = 1; i <= maxD; i++) header += `,Description ${i}`;
    header += '\n';

    let csv = header;
    groups.forEach(g => {
      const campaign = client.name || 'Campaign';
      let row = `"${campaign}","${g.ad_group_name}"`;
      for (let i = 0; i < maxH; i++) row += `,"${(g.headlines?.[i]?.text || '').replace(/"/g, '""')}"`;
      for (let i = 0; i < maxD; i++) row += `,"${(g.descriptions?.[i]?.text || '').replace(/"/g, '""')}"`;
      csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${client.name}-ad-copy-google-ads.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const generateAudit = async () => {
    if (!client) return;
    setAuditingPages(true);
    setAuditError('');
    try {
      const services = client.website_data?.services?.map(s => s.name || s) || client.selected_services || [];
      const res = await fetch('/api/landing-page-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl: client.website,
          services,
          industry: client.industry,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Audit failed');
      const { updateClient } = await import('@/lib/supabase');
      const updated = await updateClient(id, { landing_page_audit: json.data });
      setClient(updated);
    } catch (e) {
      setAuditError(e.message);
    } finally {
      setAuditingPages(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <span className="material-symbols-outlined text-primary text-[40px] animate-spin">progress_activity</span>
    </div>
  );

  if (error || !client) return (
    <div className="px-8 py-10 text-center">
      <p className="font-headline font-bold text-on-surface mb-2">Client not found</p>
      <p className="text-secondary text-sm mb-4">{error}</p>
      <a href="/clients" className="pill-btn-primary text-sm">Back to Clients</a>
    </div>
  );

  const allKw = client.keyword_data?.keyword_groups?.flatMap(g => g.keywords) || [];
  const opps = client.low_hanging_fruit?.top_opportunities || [];

  return (
    <div className="px-8 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-1">{client.name}</h2>
          <div className="flex items-center gap-3 text-sm text-secondary">
            <a href={client.website} target="_blank" rel="noopener" className="hover:text-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              {client.website}
            </a>
            <span>·</span>
            <span>{client.industry}</span>
            <span>·</span>
            <span className={`text-[10px] font-label font-bold px-2 py-0.5 rounded-full ${
              client.status === 'complete' ? 'bg-secondary/15 text-secondary' : 'bg-surface-high text-secondary'
            }`}>
              {(client.status || 'draft').toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {client.status !== 'complete' && (
            <a href={`/research?url=${encodeURIComponent(client.website || '')}&industry=${encodeURIComponent(client.industry || '')}`}
              className="pill-btn text-xs bg-amber-100 text-amber-800 hover:bg-amber-200 font-bold">
              <span className="material-symbols-outlined text-[15px]">refresh</span>Re-run Research
            </a>
          )}
          <button onClick={exportCSV} className="pill-btn-secondary text-xs">
            <span className="material-symbols-outlined text-[15px]">download</span>CSV
          </button>
          <button onClick={exportZIP} className="pill-btn-secondary text-xs">
            <span className="material-symbols-outlined text-[15px]">folder_zip</span>ZIP
          </button>
          <button onClick={() => window.open(`/print/${id}`, '_blank')} className="pill-btn-secondary text-xs">
            <span className="material-symbols-outlined text-[15px]">print</span>PDF
          </button>
          <button onClick={() => window.open(`/pitch/${id}`, '_blank')} className="pill-btn-primary text-xs">
            <span className="material-symbols-outlined text-[15px]">slideshow</span>Client Pitch
          </button>
          <button onClick={handleDelete} className="pill-btn text-xs bg-error/10 text-error hover:bg-red-100">
            <span className="material-symbols-outlined text-[15px]">delete</span>Delete
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { icon: 'key_visualizer', label: 'Total Keywords', value: allKw.length, color: 'text-primary' },
          { icon: 'target_arrow',   label: 'Transactional',  value: allKw.filter(k => k.intent === 'transactional').length, color: 'text-tertiary' },
          { icon: 'star',           label: 'Opportunities',  value: opps.length, color: 'text-tertiary' },
          { icon: 'location_on',    label: 'Service Areas',  value: (client.service_areas||[]).length, color: 'text-secondary' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <span className={`material-symbols-outlined text-[20px] mb-2 ${s.color}`}>{s.icon}</span>
            <p className="text-2xl font-headline font-bold text-on-surface">{s.value}</p>
            <p className="text-xs font-label text-secondary mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Executive summary */}
      {client.low_hanging_fruit?.executive_summary && (
        <div className="mb-8 p-5 bg-primary/[0.04] border border-primary/15 rounded-xl flex gap-3">
          <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">auto_awesome</span>
          <div>
            <p className="font-label font-bold text-on-surface mb-1">Executive Summary</p>
            <p className="text-sm text-on-variant leading-relaxed">{client.low_hanging_fruit.executive_summary}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-0 border-b border-outline-variant/15">
        {[
          { id: 'keywords',      label: 'Keywords',     icon: 'key_visualizer' },
          { id: 'competitors',   label: 'Competitors',  icon: 'analytics' },
          { id: 'opportunities', label: 'Opportunities',icon: 'star' },
          { id: 'budget',        label: 'Budget',       icon: 'payments' },
          { id: 'adcopy',        label: 'Ad Copy',      icon: 'edit_note' },
          { id: 'audit',         label: 'Page Audit',   icon: 'speed' },
          { id: 'info',          label: 'Client Info',  icon: 'info' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-label font-semibold transition-all border-b-2 -mb-px ${
              activeTab === t.id ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card rounded-tl-none overflow-hidden">
        {/* KEYWORDS */}
        {activeTab === 'keywords' && (
          client.keyword_data ? (
            <div>
              {/* Data source banner */}
              <div className="px-6 py-3 border-b border-outline-variant/10 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {client.keyword_data.data_source === 'google_enriched' ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-[10px] font-label font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        GOOGLE DATA
                      </span>
                      <span className="text-[11px] text-secondary">
                        {client.keyword_data.google_enriched_count || 0} keywords enriched with real metrics
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-label font-bold px-2.5 py-1 rounded-full bg-surface-high text-secondary">
                        AI ESTIMATED
                      </span>
                      <span className="text-[11px] text-secondary">
                        Search volumes &amp; CPCs are AI-estimated
                      </span>
                    </>
                  )}
                </div>
                {hasGoogleAds && client.keyword_data.data_source !== 'google_enriched' && (
                  <button onClick={enrichWithGoogle} disabled={enriching} className="pill-btn-primary text-[11px]">
                    {enriching ? (
                      <><span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>Enriching...</>
                    ) : (
                      <><span className="material-symbols-outlined text-[14px]">auto_awesome</span>Enrich with Google Data</>
                    )}
                  </button>
                )}
                {hasGoogleAds && client.keyword_data.data_source === 'google_enriched' && (
                  <button onClick={enrichWithGoogle} disabled={enriching} className="pill-btn-secondary text-[11px]">
                    {enriching ? (
                      <><span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>Refreshing...</>
                    ) : (
                      <><span className="material-symbols-outlined text-[14px]">refresh</span>Refresh Data</>
                    )}
                  </button>
                )}
              </div>
              {enrichError && (
                <div className="mx-6 mt-3 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-red-700">
                  <span className="font-label font-bold">Enrichment failed:</span> {enrichError}
                </div>
              )}

              {(client.keyword_data.keyword_groups || []).map((group, gi) => (
                <div key={gi} className={gi > 0 ? 'border-t border-outline-variant/10' : ''}>
                  <div className="px-6 py-4 bg-surface-low">
                    <p className="font-headline font-bold text-on-surface text-sm">
                      {group.theme}
                      <span className="ml-2 font-body font-normal text-secondary text-xs">{group.keywords?.length||0} keywords</span>
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead><tr>
                        <th>Keyword</th><th>Intent</th>
                        <th>{client.keyword_data.data_source === 'google_enriched' ? 'Mo. Searches' : 'Est. Searches'}</th>
                        <th>{client.keyword_data.data_source === 'google_enriched' ? 'CPC' : 'Est. CPC'}</th>
                        <th>Competition</th><th>Priority</th>
                      </tr></thead>
                      <tbody>
                        {(group.keywords||[]).map((kw, ki) => (
                          <tr key={ki}>
                            <td className="font-label font-semibold text-on-surface">
                              {kw.keyword}
                              {kw.data_source === 'google' && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-blue-500" title="Google Keyword Planner data" />}
                            </td>
                            <td><span className={intentBadge(kw.intent)}>{kw.intent}</span></td>
                            <td className="font-mono text-sm text-on-variant">{(kw.estimated_monthly_searches||0).toLocaleString()}</td>
                            <td className={`font-mono text-sm font-bold ${cpcClass(kw.estimated_cpc||0)}`}>${(kw.estimated_cpc||0).toFixed(2)}</td>
                            <td><span className={`text-[10px] font-label font-bold px-2 py-0.5 rounded-full ${compColor(kw.competition)}`}>{kw.competition}</span></td>
                            <td><span className={`text-[10px] font-label font-bold px-2 py-0.5 rounded-full ${kw.priority==='high'?'bg-red-100 text-red-700':kw.priority==='medium'?'bg-amber-100 text-amber-700':'bg-surface-high text-secondary'}`}>{kw.priority}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Negative Keywords Library */}
              {(() => {
                const neg = getNegativeKeywords(client.industry || '');
                const aiNegatives = client.keyword_data?.negative_keywords || [];
                const competitorBrands = (client.competitor_data?.competitor_keywords_to_negate || []);
                const allNegatives = [...new Set([...neg.combined, ...aiNegatives, ...competitorBrands])].sort();

                const exportNegCSV = () => {
                  const csv = buildNegativeKeywordCSV(allNegatives, client.name || 'Campaign');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `${client.name}-negative-keywords.csv`;
                  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                };

                return (
                  <div className="border-t border-outline-variant/10 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Negative Keyword Library</p>
                        <p className="text-xs text-secondary mt-0.5">{allNegatives.length} negatives · Blocks wasted spend on irrelevant searches</p>
                      </div>
                      <button onClick={exportNegCSV} className="pill-btn-secondary text-xs">
                        <span className="material-symbols-outlined text-[14px]">download</span>
                        Export Negatives CSV
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="card-inner p-4">
                        <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-2">Universal ({neg.universal.length})</p>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                          {neg.universal.map(kw => (
                            <span key={kw} className="text-[10px] px-2 py-0.5 bg-error/10 text-red-700 rounded-full font-label">{kw}</span>
                          ))}
                        </div>
                      </div>
                      <div className="card-inner p-4">
                        <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-2">{client.industry || 'Industry'} ({neg.industry.length})</p>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                          {neg.industry.map(kw => (
                            <span key={kw} className="text-[10px] px-2 py-0.5 bg-tertiary/10 text-amber-700 rounded-full font-label">{kw}</span>
                          ))}
                        </div>
                      </div>
                      <div className="card-inner p-4">
                        <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-2">AI + Competitor ({aiNegatives.length + competitorBrands.length})</p>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                          {[...aiNegatives, ...competitorBrands].map(kw => (
                            <span key={kw} className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-label">{kw}</span>
                          ))}
                          {aiNegatives.length === 0 && competitorBrands.length === 0 && (
                            <p className="text-[10px] text-secondary">None detected from research</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Quality Score Predictor */}
              {(() => {
                const groups = client.keyword_data?.keyword_groups || [];
                if (groups.length === 0) return null;

                const predictions = groups.map(group => {
                  const kws = group.keywords || [];
                  const kwCount = kws.length;
                  // Factor 1: Ad group size (tighter groups = better QS)
                  const sizeFactor = kwCount <= 10 ? 10 : kwCount <= 20 ? 7 : kwCount <= 30 ? 5 : 3;
                  // Factor 2: Intent concentration (more transactional = higher CTR = better QS)
                  const transactional = kws.filter(k => k.intent === 'transactional').length;
                  const commercial = kws.filter(k => k.intent === 'commercial').length;
                  const intentRatio = kwCount > 0 ? (transactional + commercial * 0.6) / kwCount : 0;
                  const intentFactor = Math.round(intentRatio * 10);
                  // Factor 3: Competition (low comp = usually better QS due to less auction pressure)
                  const lowComp = kws.filter(k => k.competition === 'low').length;
                  const compRatio = kwCount > 0 ? lowComp / kwCount : 0;
                  const compFactor = Math.round(3 + compRatio * 7);
                  // Overall predicted QS (1-10 scale)
                  const predictedQS = Math.max(1, Math.min(10, Math.round((sizeFactor + intentFactor + compFactor) / 3)));
                  const risk = predictedQS <= 4 ? 'high' : predictedQS <= 6 ? 'medium' : 'low';

                  return { theme: group.theme, kwCount, predictedQS, sizeFactor, intentFactor, compFactor, risk };
                });

                const flagged = predictions.filter(p => p.risk !== 'low');
                const avgQS = (predictions.reduce((s, p) => s + p.predictedQS, 0) / predictions.length).toFixed(1);

                return (
                  <div className="border-t border-outline-variant/10 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Quality Score Predictor</p>
                        <p className="text-xs text-secondary mt-0.5">Avg predicted QS: <span className="font-bold text-on-surface">{avgQS}/10</span> · {flagged.length > 0 ? `${flagged.length} ad group${flagged.length > 1 ? 's' : ''} flagged` : 'All groups look healthy'}</p>
                      </div>
                    </div>

                    <div className="card-inner overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-outline-variant/10 text-[10px] font-label font-bold text-secondary uppercase tracking-widest">
                            <th className="text-left px-4 py-3">Ad Group</th>
                            <th className="text-right px-4 py-3">Keywords</th>
                            <th className="text-right px-4 py-3">Group Fit</th>
                            <th className="text-right px-4 py-3">Intent</th>
                            <th className="text-right px-4 py-3">Competition</th>
                            <th className="text-right px-4 py-3">Pred. QS</th>
                            <th className="text-right px-4 py-3">Risk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {predictions.map((p, i) => {
                            const qsColor = p.predictedQS >= 7 ? 'text-secondary font-bold' : p.predictedQS >= 5 ? 'text-amber-700 font-bold' : 'text-red-700 font-bold';
                            const riskBadge = p.risk === 'low' ? 'bg-secondary/15 text-secondary' : p.risk === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                            return (
                              <tr key={i} className={i < predictions.length - 1 ? 'border-b border-outline-variant/10' : ''}>
                                <td className="px-4 py-3 font-label font-semibold text-on-surface text-sm">{p.theme}</td>
                                <td className="px-4 py-3 font-mono text-sm text-right text-secondary">{p.kwCount}</td>
                                <td className="px-4 py-3 font-mono text-sm text-right text-secondary">{p.sizeFactor}/10</td>
                                <td className="px-4 py-3 font-mono text-sm text-right text-secondary">{p.intentFactor}/10</td>
                                <td className="px-4 py-3 font-mono text-sm text-right text-secondary">{p.compFactor}/10</td>
                                <td className={`px-4 py-3 font-mono text-sm text-right ${qsColor}`}>{p.predictedQS}/10</td>
                                <td className="px-4 py-3 text-right"><span className={`text-[10px] font-label font-bold px-2 py-0.5 rounded-full capitalize ${riskBadge}`}>{p.risk}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {flagged.length > 0 && (
                      <div className="p-4 bg-tertiary/10 border border-tertiary/20 rounded-xl">
                        <p className="text-[10px] font-label font-bold text-amber-800 uppercase tracking-widest mb-2">Recommendations</p>
                        <ul className="space-y-1.5">
                          {flagged.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                              <span className="material-symbols-outlined text-[14px] text-tertiary mt-0.5 shrink-0">warning</span>
                              <span><strong>{f.theme}</strong>: {f.kwCount > 20 ? 'Split into smaller, tighter ad groups (target ≤15 keywords each). ' : ''}{f.intentFactor < 5 ? 'Consider separating informational keywords into their own campaign. ' : ''}{f.compFactor < 5 ? 'High competition — ensure ad copy closely matches keyword themes.' : ''}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="text-[11px] text-secondary">Predictions based on ad group structure, intent mix, and competition level. Actual QS depends on click-through rate, landing page experience, and ad relevance.</p>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="p-12 text-center text-secondary">No keyword data — research not yet complete.</div>
          )
        )}

        {/* COMPETITORS */}
        {activeTab === 'competitors' && (
          client.competitor_data ? (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div className="card-inner p-4">
                  <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1">Competition Level</p>
                  <p className="font-headline font-bold text-on-surface capitalize">{client.competitor_data.market_analysis?.competition_level || 'N/A'}</p>
                </div>
                <div className="card-inner p-4">
                  <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1">Avg CPC Range</p>
                  <p className="font-headline font-bold text-on-surface">
                    ${client.competitor_data.market_analysis?.avg_cpc_range?.low||'?'}–${client.competitor_data.market_analysis?.avg_cpc_range?.high||'?'}
                  </p>
                </div>
              </div>
              {(client.competitor_data.competitors||[]).map((comp, i) => (
                <div key={i} className="card-inner p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-headline font-bold text-on-surface">{comp.name}</p>
                      {comp.website && <p className="text-xs text-secondary mt-0.5">{comp.website}</p>}
                    </div>
                    <span className={`text-[10px] font-label font-bold px-2.5 py-1 rounded-full ${comp.threat_level==='high'?'bg-red-100 text-red-700':comp.threat_level==='medium'?'bg-amber-100 text-amber-700':'bg-surface-high text-secondary'}`}>
                      {comp.threat_level} threat
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(comp.services_advertised||[]).map((s, si) => (
                      <span key={si} className="text-xs px-2 py-0.5 bg-surface-high text-on-variant font-label rounded">{s}</span>
                    ))}
                  </div>
                  {comp.notes && <p className="text-sm text-secondary mt-2">{comp.notes}</p>}
                </div>
              ))}
            </div>
          ) : <div className="p-12 text-center text-secondary">No competitor data yet.</div>
        )}

        {/* OPPORTUNITIES */}
        {activeTab === 'opportunities' && (
          opps.length > 0 ? (
            <div className="p-6 space-y-3">
              {opps.sort((a,b)=>(b.opportunity_score||0)-(a.opportunity_score||0)).map((opp, i) => (
                <div key={i} className="card-inner p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center text-xs font-headline font-bold text-tertiary shrink-0">
                      {opp.opportunity_score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-label font-bold text-on-surface">{opp.keyword}</p>
                        <span className={`text-[10px] font-label font-bold px-2 py-0.5 rounded-full shrink-0 ${compColor(opp.competition)}`}>{opp.competition} comp</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={intentBadge(opp.intent)}>{opp.intent}</span>
                        <span className="text-xs font-label text-secondary">{(opp.estimated_monthly_searches||0).toLocaleString()}/mo</span>
                        <span className={`text-xs font-mono font-bold ${cpcClass(opp.estimated_cpc||0)}`}>${(opp.estimated_cpc||0).toFixed(2)} CPC</span>
                      </div>
                      <p className="text-sm text-on-variant mt-2">{opp.why_its_gold}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="p-12 text-center text-secondary">No opportunity data yet.</div>
        )}

        {/* BUDGET */}
        {activeTab === 'budget' && (
          <div className="p-6 space-y-6">
            {/* No projection yet */}
            {!client.budget_projection && !projecting && (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <span className="material-symbols-outlined text-primary text-[40px]">account_balance_wallet</span>
                <div>
                  <p className="font-headline font-bold text-on-surface text-lg mb-1">Budget Projections</p>
                  <p className="text-sm text-secondary max-w-sm">AI-powered analysis of what each spend level will achieve, and what budget you need to hit a lead goal.</p>
                </div>
                {projectionError && <p className="text-sm text-error">{projectionError}</p>}
                {client.keyword_data ? (
                  <button onClick={generateProjection} className="pill-btn-primary">
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    Generate Budget Projection
                  </button>
                ) : (
                  <p className="text-sm text-secondary">Complete keyword research first to enable budget projections.</p>
                )}
              </div>
            )}

            {/* Generating spinner */}
            {projecting && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
                <p className="text-sm font-label font-semibold text-on-surface">Generating budget projections…</p>
                <p className="text-xs text-secondary">Analyzing keyword data and competitive landscape</p>
              </div>
            )}

            {/* Projection results */}
            {client.budget_projection && !projecting && (() => {
              const bp = client.budget_projection;
              const activeTier = bp.budget_tiers?.find(t => t.level === selectedTier) || bp.budget_tiers?.[0];
              const feasibilityColor = f => f === 'achievable' ? 'bg-secondary/15 text-secondary' : f === 'challenging' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
              const priorityColor = p => p === 'must_have' ? 'bg-primary/10 text-primary' : p === 'should_have' ? 'bg-amber-100 text-amber-700' : 'bg-surface-high text-secondary';

              return (
                <>
                  {/* Executive pitch */}
                  {bp.executive_pitch && (
                    <div className="p-5 bg-primary/[0.04] border border-primary/15 rounded-xl flex gap-3">
                      <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">format_quote</span>
                      <div>
                        <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-2">Executive Summary</p>
                        <p className="text-sm text-on-variant leading-relaxed">{bp.executive_pitch}</p>
                      </div>
                    </div>
                  )}

                  {/* Tier selector + details */}
                  {bp.budget_tiers?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Budget Tiers</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                        {bp.budget_tiers.map(tier => (
                          <button key={tier.level} onClick={() => setSelectedTier(tier.level)}
                            className={`p-4 rounded-xl border text-left transition-all ${selectedTier === tier.level ? 'border-primary/30 bg-primary/[0.05] ring-1 ring-primary/20' : 'bg-surface-low border-outline-variant/15 hover:border-outline-variant/40'}`}
                          >
                            <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest capitalize mb-1">{tier.level}</p>
                            <p className="text-xl font-headline font-bold text-on-surface">${(tier.monthly_budget||0).toLocaleString()}</p>
                            <p className="text-[10px] text-secondary mt-0.5">/month</p>
                            {tier.level === 'balanced' && <span className="inline-block mt-1.5 text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-label font-bold">Recommended</span>}
                          </button>
                        ))}
                      </div>
                      {activeTier && (
                        <div className="card-inner p-5 space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            {[
                              { icon: 'ads_click', label: 'Est. Clicks/mo',  value: (activeTier.expected_monthly_clicks||0).toLocaleString() },
                              { icon: 'call',      label: 'Est. Leads/mo',   value: `~${activeTier.expected_monthly_leads||0}` },
                              { icon: 'payments',  label: 'Cost per Lead',   value: activeTier.expected_cost_per_lead > 0 ? `$${activeTier.expected_cost_per_lead}` : '—' },
                            ].map(m => (
                              <div key={m.label}>
                                <span className="material-symbols-outlined text-primary text-[16px]">{m.icon}</span>
                                <p className="text-2xl font-headline font-bold text-on-surface mt-1">{m.value}</p>
                                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mt-0.5">{m.label}</p>
                              </div>
                            ))}
                          </div>
                          {activeTier.what_you_get && (
                            <p className="text-sm text-on-variant leading-relaxed border-t border-outline-variant/10 pt-4">{activeTier.what_you_get}</p>
                          )}
                          {activeTier.rationale && (
                            <p className="text-xs text-secondary">{activeTier.rationale}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Revenue & ROI Projections */}
                  {bp.budget_tiers?.length > 0 && (() => {
                    const benchmarks = getDefaultBenchmarks(client.industry || '');
                    return (
                      <div>
                        <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Revenue &amp; ROI Projections</p>

                        {/* Editable benchmark inputs */}
                        <div className="card-inner p-5 mb-4">
                          <div className="flex flex-wrap gap-6 items-end mb-3">
                            <div>
                              <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1.5">Close Rate</p>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number" min="1" max="100" value={closeRate}
                                  onChange={e => setCloseRate(Math.max(1, Math.min(100, Number(e.target.value))))}
                                  className="field-input w-20 text-right font-mono text-sm"
                                />
                                <span className="text-sm font-label font-semibold text-secondary">%</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1.5">Avg Job Value</p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-label font-semibold text-secondary">$</span>
                                <input
                                  type="number" min="1" value={avgJobValue}
                                  onChange={e => setAvgJobValue(Math.max(1, Number(e.target.value)))}
                                  className="field-input w-28 font-mono text-sm"
                                />
                              </div>
                            </div>
                          </div>
                          <p className="text-[11px] text-secondary">
                            Based on <span className="font-semibold text-on-variant">{benchmarks.label}</span> averages. {benchmarks.note}
                          </p>
                        </div>

                        {/* Funnel table — all 4 tiers */}
                        <div className="card-inner overflow-hidden mb-4">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-outline-variant/10 text-[10px] font-label font-bold text-secondary uppercase tracking-widest">
                                <th className="text-left px-4 py-3">Tier</th>
                                <th className="text-right px-4 py-3">Ad Spend</th>
                                <th className="text-right px-4 py-3">Leads</th>
                                <th className="text-right px-4 py-3">Jobs</th>
                                <th className="text-right px-4 py-3">Revenue</th>
                                <th className="text-right px-4 py-3">ROI</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bp.budget_tiers.map((tier, i) => {
                                const leads = tier.expected_monthly_leads || 0;
                                const spend = tier.monthly_budget || 0;
                                const jobs = Math.round(leads * (closeRate / 100));
                                const revenue = jobs * avgJobValue;
                                const roiVal = spend > 0 ? revenue / spend : 0;
                                const roiColor = roiVal >= 3 ? 'text-secondary font-bold' : roiVal >= 1 ? 'text-amber-700 font-bold' : 'text-error font-bold';
                                const isActive = tier.level === selectedTier;
                                return (
                                  <tr key={tier.level}
                                    onClick={() => setSelectedTier(tier.level)}
                                    className={`cursor-pointer transition-colors ${i < bp.budget_tiers.length - 1 ? 'border-b border-outline-variant/10' : ''} ${isActive ? 'bg-primary/[0.04]' : 'hover:bg-surface-low'}`}
                                  >
                                    <td className="px-4 py-3">
                                      <span className="font-label font-semibold text-on-surface text-sm capitalize">{tier.level}</span>
                                      {tier.level === 'balanced' && <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-label font-bold">Rec.</span>}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm text-right text-on-surface">${spend.toLocaleString()}</td>
                                    <td className="px-4 py-3 font-mono text-sm text-right text-secondary">~{leads}</td>
                                    <td className="px-4 py-3 font-mono text-sm text-right text-on-surface">{jobs}</td>
                                    <td className="px-4 py-3 font-mono text-sm text-right text-on-surface">${revenue.toLocaleString()}</td>
                                    <td className={`px-4 py-3 font-mono text-sm text-right ${roiColor}`}>{roiVal > 0 ? `${roiVal.toFixed(1)}×` : '—'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Break-even callout for active tier */}
                        {(() => {
                          const tier = bp.budget_tiers.find(t => t.level === selectedTier) || bp.budget_tiers[0];
                          const spend = tier?.monthly_budget || 0;
                          const breakEven = avgJobValue > 0 ? Math.ceil(spend / avgJobValue) : 0;
                          if (!spend || !breakEven) return null;
                          return (
                            <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-xl flex gap-3 items-start">
                              <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">trending_up</span>
                              <p className="text-sm text-emerald-800">
                                At the <strong className="capitalize">{tier.level}</strong> tier (${spend.toLocaleString()}/mo), you only need{' '}
                                <strong>{breakEven} {breakEven === 1 ? 'job' : 'jobs'}/month</strong> to break even on ad spend — everything after that is profit.
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* 12-Month Seasonal Budget Plan */}
                  {bp.budget_tiers?.length > 0 && (() => {
                    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                    const currentMonth = new Date().getMonth();
                    const multipliers = (trendsData?.source === 'google_trends' && trendsData?.multipliers?.length === 12)
                      ? trendsData.multipliers
                      : getSeasonalMultipliers(client.industry || '');
                    const tier = bp.budget_tiers.find(t => t.level === selectedTier) || bp.budget_tiers[0];
                    const baseBudget = tier?.monthly_budget || 0;
                    const baseLeads = tier?.expected_monthly_leads || 0;

                    const monthlyPlan = multipliers.map((m, i) => ({
                      month: MONTHS[i],
                      multiplier: m,
                      budget: Math.round(baseBudget * m),
                      leads: Math.round(baseLeads * m),
                    }));
                    const annualSpend = monthlyPlan.reduce((s, m) => s + m.budget, 0);
                    const annualLeads = monthlyPlan.reduce((s, m) => s + m.leads, 0);
                    const maxBudget = Math.max(...monthlyPlan.map(m => m.budget));

                    return (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">12-Month Seasonal Budget Plan</p>
                          {trendsLoading ? (
                            <span className="text-[10px] font-label text-secondary">Loading trends…</span>
                          ) : trendsData?.source === 'google_trends' ? (
                            <span className="text-[10px] font-label font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">GOOGLE TRENDS DATA</span>
                          ) : (
                            <span className="text-[10px] font-label font-bold px-2 py-0.5 rounded bg-surface-high text-secondary">ESTIMATED</span>
                          )}
                        </div>

                        {/* Annual summary */}
                        <div className="p-4 bg-primary/[0.04] border border-primary/15 rounded-xl flex flex-wrap gap-6 mb-4">
                          <div>
                            <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Annual Spend</p>
                            <p className="text-xl font-headline font-bold text-on-surface">${annualSpend.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Annual Leads</p>
                            <p className="text-xl font-headline font-bold text-on-surface">~{annualLeads}</p>
                          </div>
                          <div className="flex items-end">
                            <p className="text-xs text-secondary">Based on <span className="font-semibold text-on-variant capitalize">{selectedTier}</span> tier · ${baseBudget.toLocaleString()}/mo avg</p>
                          </div>
                        </div>

                        {/* CSS bar chart */}
                        <div className="card-inner p-5 mb-4">
                          <div className="flex items-end gap-1.5 sm:gap-2 h-48">
                            {monthlyPlan.map((m, i) => {
                              const heightPct = maxBudget > 0 ? (m.budget / maxBudget) * 100 : 0;
                              const isCurrent = i === currentMonth;
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1" style={{ height: '100%' }}>
                                  <p className={`text-[9px] font-mono ${isCurrent ? 'text-primary font-bold' : 'text-secondary'}`}>
                                    ${m.budget >= 1000 ? `${(m.budget / 1000).toFixed(1)}k` : m.budget}
                                  </p>
                                  <div className="w-full flex-1 flex items-end">
                                    <div
                                      className={`w-full rounded-t transition-all ${isCurrent ? 'bg-primary' : 'bg-primary/20'}`}
                                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                                      title={`${m.month}: $${m.budget.toLocaleString()} · ~${m.leads} leads · ${m.multiplier}×`}
                                    />
                                  </div>
                                  <p className={`text-[10px] font-label font-semibold ${isCurrent ? 'text-primary' : 'text-secondary'}`}>{m.month}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Monthly detail table */}
                        <div className="card-inner overflow-hidden mb-2">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-outline-variant/10 text-[10px] font-label font-bold text-secondary uppercase tracking-widest">
                                <th className="text-left px-4 py-3">Month</th>
                                <th className="text-right px-4 py-3 hidden sm:table-cell">Multiplier</th>
                                <th className="text-right px-4 py-3">Budget</th>
                                <th className="text-right px-4 py-3">Est. Leads</th>
                              </tr>
                            </thead>
                            <tbody>
                              {monthlyPlan.map((m, i) => {
                                const isCurrent = i === currentMonth;
                                return (
                                  <tr key={i} className={`${i < 11 ? 'border-b border-outline-variant/10' : ''} ${isCurrent ? 'bg-primary/[0.04]' : ''}`}>
                                    <td className="px-4 py-2.5">
                                      <span className={`text-sm font-label ${isCurrent ? 'font-bold text-primary' : 'font-semibold text-on-surface'}`}>{m.month}</span>
                                      {isCurrent && <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-label font-bold">Now</span>}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-sm text-right text-secondary hidden sm:table-cell">{m.multiplier}×</td>
                                    <td className="px-4 py-2.5 font-mono text-sm text-right text-on-surface">${m.budget.toLocaleString()}</td>
                                    <td className="px-4 py-2.5 font-mono text-sm text-right text-secondary">~{m.leads}</td>
                                  </tr>
                                );
                              })}
                              {/* Totals row */}
                              <tr className="border-t-2 border-outline-variant/20 bg-surface-low">
                                <td className="px-4 py-3 text-sm font-label font-bold text-on-surface">Annual Total</td>
                                <td className="px-4 py-3 hidden sm:table-cell" />
                                <td className="px-4 py-3 font-mono text-sm font-bold text-right text-on-surface">${annualSpend.toLocaleString()}</td>
                                <td className="px-4 py-3 font-mono text-sm font-bold text-right text-on-surface">~{annualLeads}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <p className="text-[11px] text-secondary">Seasonality based on {client.industry || 'general'} industry averages. Actual demand may vary by market.</p>
                      </div>
                    );
                  })()}

                  {/* Lead goal scenarios */}
                  {bp.lead_scenarios?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Goal Scenarios</p>
                      <div className="card-inner overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-outline-variant/10 text-[10px] font-label font-bold text-secondary uppercase tracking-widest">
                              <th className="text-left px-4 py-3">Leads/month</th>
                              <th className="text-right px-4 py-3">Required Budget</th>
                              <th className="text-right px-4 py-3">Cost/Lead</th>
                              <th className="text-right px-4 py-3">Feasibility</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bp.lead_scenarios.map((s, i) => (
                              <tr key={i} className={i < bp.lead_scenarios.length - 1 ? 'border-b border-outline-variant/10' : ''}>
                                <td className="px-4 py-3 font-headline font-bold text-on-surface">{s.leads_per_month} leads</td>
                                <td className="px-4 py-3 font-mono text-sm text-right text-on-surface">${(s.required_budget||0).toLocaleString()}/mo</td>
                                <td className="px-4 py-3 font-mono text-sm text-right text-secondary">${s.cost_per_lead||'—'}</td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`text-[10px] font-label font-bold px-2 py-0.5 rounded-full capitalize ${feasibilityColor(s.feasibility)}`}>{(s.feasibility||'').replace('_',' ')}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {bp.minimum_viable_budget > 0 && (
                        <p className="text-xs text-secondary mt-2">
                          Minimum viable budget: <strong className="text-on-surface">${bp.minimum_viable_budget.toLocaleString()}/mo</strong>
                          {bp.sweet_spot_budget > 0 && <> · Sweet spot: <strong className="text-on-surface">${bp.sweet_spot_budget.toLocaleString()}/mo</strong></>}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Budget allocation */}
                  {bp.recommended_allocation?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Recommended Budget Allocation</p>
                      <div className="card-inner overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-outline-variant/10 text-[10px] font-label font-bold text-secondary uppercase tracking-widest">
                              <th className="text-left px-4 py-3">Campaign</th>
                              <th className="text-right px-4 py-3">Budget</th>
                              <th className="text-right px-4 py-3 hidden sm:table-cell">Priority</th>
                              <th className="text-right px-4 py-3">Est. Leads</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bp.recommended_allocation.map((a, i) => (
                              <tr key={i} className={i < bp.recommended_allocation.length - 1 ? 'border-b border-outline-variant/10' : ''}>
                                <td className="px-4 py-3">
                                  <p className="font-label font-semibold text-on-surface text-sm">{a.campaign_name}</p>
                                  {a.reason && <p className="text-xs text-secondary mt-0.5">{a.reason}</p>}
                                </td>
                                <td className="px-4 py-3 font-mono text-sm text-right text-on-surface">${(a.monthly_budget||0).toLocaleString()}</td>
                                <td className="px-4 py-3 hidden sm:table-cell text-right">
                                  <span className={`text-[10px] font-label font-bold px-2 py-0.5 rounded-full ${priorityColor(a.priority)}`}>{(a.priority||'').replace(/_/g,' ')}</span>
                                </td>
                                <td className="px-4 py-3 font-mono text-sm font-bold text-secondary text-right">~{a.expected_leads||0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Key insights */}
                  {bp.key_insights?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Key Insights</p>
                      <div className="card-inner p-5 space-y-3">
                        {bp.key_insights.map((insight, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">lightbulb</span>
                            <p className="text-sm text-on-variant leading-relaxed">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Market context */}
                  {bp.market_context && (
                    <div className="p-4 bg-surface-low border border-outline-variant/15 rounded-xl">
                      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-2">Market Context</p>
                      <p className="text-sm text-on-variant">{bp.market_context}</p>
                    </div>
                  )}

                  {/* TAM Calculator */}
                  {(() => {
                    const freq = getServiceFrequency(client.industry || '');
                    const benchmarks = getDefaultBenchmarks(client.industry || '');
                    const households = Math.round(tamPopulation / TAM_CONSTANTS.avgHouseholdSize * TAM_CONSTANTS.homeownershipRate);
                    const annualDemand = Math.round(households * freq.frequency);
                    const totalMarketRevenue = annualDemand * (avgJobValue || benchmarks.avgJobValue);
                    const captureSlices = [
                      { pct: 0.005, label: '0.5%' },
                      { pct: 0.01, label: '1%' },
                      { pct: 0.03, label: '3%' },
                      { pct: 0.05, label: '5%' },
                    ];

                    return (
                      <div>
                        <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Total Addressable Market (TAM)</p>

                        {/* Population input */}
                        <div className="card-inner p-5 mb-4">
                          <div className="flex flex-wrap gap-6 items-end mb-3">
                            <div>
                              <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1.5">Service Area Population</p>
                              <input
                                type="number" min="1000" value={tamPopulation}
                                onChange={e => setTamPopulation(Math.max(1000, Number(e.target.value)))}
                                className="field-input w-36 font-mono text-sm"
                              />
                            </div>
                            <p className="text-[11px] text-secondary pb-2">
                              Enter the total population of the client&#39;s service area.
                              {client.service_areas?.length > 0 && <> Serving: <span className="font-semibold text-on-variant">{client.service_areas.join(', ')}</span></>}
                            </p>
                          </div>

                          {/* Funnel breakdown */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-outline-variant/10">
                            {[
                              { icon: 'groups', label: 'Households', value: households.toLocaleString(), sub: `${(TAM_CONSTANTS.homeownershipRate * 100).toFixed(1)}% homeownership` },
                              { icon: 'home_repair_service', label: 'Annual Demand', value: `${annualDemand.toLocaleString()} jobs`, sub: `${freq.frequency}× per household/yr` },
                              { icon: 'attach_money', label: 'Avg Job Value', value: `$${(avgJobValue || benchmarks.avgJobValue).toLocaleString()}`, sub: benchmarks.label },
                              { icon: 'trending_up', label: 'Total Market', value: `$${totalMarketRevenue >= 1000000 ? `${(totalMarketRevenue / 1000000).toFixed(1)}M` : `${(totalMarketRevenue / 1000).toFixed(0)}K`}`, sub: 'annual revenue' },
                            ].map(m => (
                              <div key={m.label}>
                                <span className="material-symbols-outlined text-primary text-[16px]">{m.icon}</span>
                                <p className="text-lg font-headline font-bold text-on-surface mt-1">{m.value}</p>
                                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mt-0.5">{m.label}</p>
                                <p className="text-[10px] text-secondary mt-0.5">{m.sub}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Capturable share table */}
                        <div className="card-inner overflow-hidden mb-2">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-outline-variant/10 text-[10px] font-label font-bold text-secondary uppercase tracking-widest">
                                <th className="text-left px-4 py-3">Market Share</th>
                                <th className="text-right px-4 py-3">Jobs/Year</th>
                                <th className="text-right px-4 py-3">Revenue/Year</th>
                                <th className="text-right px-4 py-3">Revenue/Month</th>
                              </tr>
                            </thead>
                            <tbody>
                              {captureSlices.map((s, i) => {
                                const jobs = Math.round(annualDemand * s.pct);
                                const rev = jobs * (avgJobValue || benchmarks.avgJobValue);
                                return (
                                  <tr key={s.label} className={i < captureSlices.length - 1 ? 'border-b border-outline-variant/10' : ''}>
                                    <td className="px-4 py-3 font-label font-semibold text-on-surface text-sm">{s.label} capture</td>
                                    <td className="px-4 py-3 font-mono text-sm text-right text-on-surface">{jobs.toLocaleString()}</td>
                                    <td className="px-4 py-3 font-mono text-sm text-right text-on-surface">${rev.toLocaleString()}</td>
                                    <td className="px-4 py-3 font-mono text-sm text-right text-secondary">${Math.round(rev / 12).toLocaleString()}/mo</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-[11px] text-secondary">Estimates based on US Census data and industry averages. Actual market size varies by local conditions.</p>
                      </div>
                    );
                  })()}

                  {/* Regenerate */}
                  <div className="flex justify-end pt-2">
                    <button onClick={generateProjection} className="pill-btn-secondary text-xs">
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      Regenerate
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* AD COPY */}
        {activeTab === 'adcopy' && (
          <div className="p-6 space-y-6">
            {/* No ad copy yet */}
            {!client.ad_copy && !generatingAdCopy && (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <span className="material-symbols-outlined text-primary text-[40px]">edit_note</span>
                <div>
                  <p className="font-headline font-bold text-on-surface text-lg mb-1">Ad Copy Generator</p>
                  <p className="text-sm text-secondary max-w-sm">Generate RSA headlines, descriptions, and pin suggestions for every ad group — ready to import into Google Ads Editor.</p>
                </div>
                {adCopyError && <p className="text-sm text-error">{adCopyError}</p>}
                {client.keyword_data ? (
                  <button onClick={generateAdCopy} className="pill-btn-primary">
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    Generate Ad Copy
                  </button>
                ) : (
                  <p className="text-sm text-secondary">Complete keyword research first to enable ad copy generation.</p>
                )}
              </div>
            )}

            {/* Generating spinner */}
            {generatingAdCopy && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
                <p className="text-sm font-label font-semibold text-on-surface">Generating ad copy…</p>
                <p className="text-xs text-secondary">Writing headlines &amp; descriptions for each ad group</p>
              </div>
            )}

            {/* Results */}
            {client.ad_copy && !generatingAdCopy && (() => {
              const ac = client.ad_copy;
              const groups = ac.ad_groups || [];
              const pinColor = p => {
                if (!p) return 'bg-surface-high text-secondary';
                if (p === 'H1' || p === 'D1') return 'bg-primary/10 text-primary';
                if (p === 'H2' || p === 'D2') return 'bg-amber-100 text-amber-700';
                return 'bg-secondary/15 text-secondary';
              };
              const typeIcon = t => ({
                service: 'home_repair_service', location: 'location_on', cta: 'call',
                usp: 'verified', offer: 'local_offer', trust: 'shield',
              }[t] || 'text_fields');
              const charCountColor = (len, max) => len <= max ? 'text-secondary' : 'text-error font-bold';

              return (
                <>
                  {/* Top bar: summary + export */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Generated Ad Copy</p>
                      <p className="text-sm text-on-variant mt-0.5">{groups.length} ad groups · {groups.reduce((s, g) => s + (g.headlines?.length || 0), 0)} headlines · {groups.reduce((s, g) => s + (g.descriptions?.length || 0), 0)} descriptions</p>
                    </div>
                    <button onClick={exportAdCopyCSV} className="pill-btn-secondary text-xs">
                      <span className="material-symbols-outlined text-[14px]">download</span>
                      Export for Google Ads Editor
                    </button>
                  </div>

                  {ac.export_notes && (
                    <p className="text-xs text-secondary italic">{ac.export_notes}</p>
                  )}

                  {/* Ad group accordion */}
                  <div className="space-y-3">
                    {groups.map((group, gi) => {
                      const isOpen = expandedAdGroup === gi;
                      return (
                        <div key={gi} className="card-inner overflow-hidden">
                          {/* Accordion header */}
                          <button
                            onClick={() => setExpandedAdGroup(isOpen ? null : gi)}
                            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-low transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-primary text-[18px]">campaign</span>
                              <div>
                                <p className="font-label font-semibold text-on-surface text-sm">{group.ad_group_name}</p>
                                <p className="text-[11px] text-secondary">{group.headlines?.length || 0} headlines · {group.descriptions?.length || 0} descriptions</p>
                              </div>
                            </div>
                            <span className={`material-symbols-outlined text-secondary text-[18px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>

                          {/* Expanded content */}
                          {isOpen && (
                            <div className="px-5 pb-5 space-y-5 border-t border-outline-variant/10">
                              {/* Headlines */}
                              <div className="pt-4">
                                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Headlines</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {(group.headlines || []).map((h, hi) => (
                                    <div key={hi} className="flex items-start gap-2 p-2.5 bg-surface-low rounded-lg">
                                      <span className="material-symbols-outlined text-[14px] text-secondary mt-0.5 shrink-0">{typeIcon(h.type)}</span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-on-surface font-mono truncate">{h.text}</p>
                                        <div className="flex gap-1.5 mt-1">
                                          <span className={`text-[9px] font-label font-bold px-1.5 py-0.5 rounded-full ${charCountColor(h.text?.length || 0, 30)}`}>{h.text?.length || 0}/30</span>
                                          {h.pin && <span className={`text-[9px] font-label font-bold px-1.5 py-0.5 rounded-full ${pinColor(h.pin)}`}>{h.pin}</span>}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Descriptions */}
                              <div>
                                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Descriptions</p>
                                <div className="space-y-2">
                                  {(group.descriptions || []).map((d, di) => (
                                    <div key={di} className="p-3 bg-surface-low rounded-lg">
                                      <p className="text-sm text-on-surface leading-relaxed">{d.text}</p>
                                      <div className="flex gap-1.5 mt-1.5">
                                        <span className={`text-[9px] font-label font-bold px-1.5 py-0.5 rounded-full ${charCountColor(d.text?.length || 0, 90)}`}>{d.text?.length || 0}/90</span>
                                        {d.pin && <span className={`text-[9px] font-label font-bold px-1.5 py-0.5 rounded-full ${pinColor(d.pin)}`}>{d.pin}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Sitelinks */}
                              {group.sitelinks?.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Sitelink Suggestions</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {group.sitelinks.map((sl, si) => (
                                      <div key={si} className="p-2.5 bg-surface-low rounded-lg">
                                        <p className="text-sm font-label font-semibold text-primary">{sl.text}</p>
                                        {sl.description && <p className="text-xs text-secondary mt-0.5">{sl.description}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Regenerate */}
                  <div className="flex justify-end pt-2">
                    <button onClick={generateAdCopy} className="pill-btn-secondary text-xs">
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      Regenerate
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* LANDING PAGE AUDIT */}
        {activeTab === 'audit' && (
          <div className="p-6 space-y-6">
            {/* No audit yet */}
            {!client.landing_page_audit && !auditingPages && (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <span className="material-symbols-outlined text-primary text-[40px]">speed</span>
                <div>
                  <p className="font-headline font-bold text-on-surface text-lg mb-1">Landing Page Audit</p>
                  <p className="text-sm text-secondary max-w-sm">Grade your client&apos;s pages for conversion readiness before spending money on ads. Checks CTAs, trust signals, phone visibility, and more.</p>
                </div>
                {auditError && <p className="text-sm text-error">{auditError}</p>}
                {client.website ? (
                  <button onClick={generateAudit} className="pill-btn-primary">
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    Audit Landing Pages
                  </button>
                ) : (
                  <p className="text-sm text-secondary">Website URL required to run audit.</p>
                )}
              </div>
            )}

            {/* Auditing spinner */}
            {auditingPages && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
                <p className="text-sm font-label font-semibold text-on-surface">Auditing landing pages…</p>
                <p className="text-xs text-secondary">Analyzing {client.website} for conversion readiness</p>
              </div>
            )}

            {/* Audit results */}
            {client.landing_page_audit && !auditingPages && (() => {
              const audit = client.landing_page_audit;
              const gradeColor = g => ({ A: 'bg-secondary/15 text-secondary', B: 'bg-secondary/15 text-secondary', C: 'bg-amber-100 text-amber-700', D: 'bg-orange-100 text-orange-700', F: 'bg-red-100 text-red-700' }[g] || 'bg-surface-high text-secondary');
              const impactColor = i => i === 'high' ? 'bg-red-100 text-red-700' : i === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-surface-high text-secondary';
              const statusIcon = s => s === 'pass' ? 'check_circle' : s === 'fail' ? 'cancel' : 'warning';
              const statusColor = s => s === 'pass' ? 'text-secondary' : s === 'fail' ? 'text-error' : 'text-tertiary';
              const scoreBarColor = s => s >= 7 ? 'bg-secondary/100' : s >= 4 ? 'bg-tertiary/100' : 'bg-error/100';

              return (
                <>
                  {/* Overall score */}
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${gradeColor(audit.overall_grade)}`}>
                        <span className="text-2xl font-headline font-bold">{audit.overall_grade || '?'}</span>
                      </div>
                      <div>
                        <p className="text-3xl font-headline font-bold text-on-surface">{audit.overall_score || 0}<span className="text-lg text-secondary">/100</span></p>
                        <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Overall Score</p>
                      </div>
                    </div>
                    {audit.summary && (
                      <p className="text-sm text-on-variant leading-relaxed flex-1 min-w-[200px]">{audit.summary}</p>
                    )}
                  </div>

                  {/* Pre-launch checklist */}
                  {audit.pre_launch_checklist?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Pre-Launch Checklist</p>
                      <div className="card-inner p-4 space-y-2">
                        {audit.pre_launch_checklist.map((item, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${statusColor(item.status)}`}>{statusIcon(item.status)}</span>
                            <div>
                              <p className="text-sm font-label font-semibold text-on-surface">{item.item}</p>
                              {item.detail && <p className="text-xs text-secondary">{item.detail}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Page-by-page audit */}
                  {audit.pages?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Page-by-Page Audit</p>
                      <div className="space-y-4">
                        {audit.pages.map((page, pi) => (
                          <div key={pi} className="card-inner overflow-hidden">
                            <div className="px-5 py-4 flex items-center justify-between border-b border-outline-variant/10">
                              <div>
                                <p className="font-label font-semibold text-on-surface text-sm">{page.page_name}</p>
                                <p className="text-[11px] text-secondary">{page.url_path}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-headline font-bold text-on-surface">{page.score}<span className="text-sm text-secondary">/100</span></p>
                              </div>
                            </div>
                            <div className="px-5 py-4 space-y-4">
                              {/* Score bars */}
                              {page.scores && (
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                  {Object.entries(page.scores).map(([key, val]) => (
                                    <div key={key} className="flex items-center gap-2">
                                      <p className="text-[10px] font-label font-semibold text-secondary w-28 capitalize truncate">{key.replace(/_/g, ' ')}</p>
                                      <div className="flex-1 h-2 bg-surface-high rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${scoreBarColor(val.score)}`} style={{ width: `${(val.score || 0) * 10}%` }} />
                                      </div>
                                      <p className="text-[10px] font-mono font-bold text-on-surface w-6 text-right">{val.score}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Issues */}
                              {page.issues?.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-2">Issues</p>
                                  <div className="space-y-2">
                                    {page.issues.map((issue, ii) => (
                                      <div key={ii} className="flex items-start gap-2">
                                        <span className={`text-[9px] font-label font-bold px-1.5 py-0.5 rounded-full mt-0.5 shrink-0 ${impactColor(issue.impact)}`}>{issue.impact}</span>
                                        <div>
                                          <p className="text-sm text-on-surface">{issue.issue}</p>
                                          <p className="text-xs text-primary mt-0.5">{issue.fix}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Priority fixes */}
                  {audit.priority_fixes?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Priority Fix List</p>
                      <div className="card-inner overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-outline-variant/10 text-[10px] font-label font-bold text-secondary uppercase tracking-widest">
                              <th className="text-left px-4 py-3">#</th>
                              <th className="text-left px-4 py-3">Fix</th>
                              <th className="text-right px-4 py-3">Impact</th>
                              <th className="text-right px-4 py-3">Effort</th>
                            </tr>
                          </thead>
                          <tbody>
                            {audit.priority_fixes.map((fix, i) => (
                              <tr key={i} className={i < audit.priority_fixes.length - 1 ? 'border-b border-outline-variant/10' : ''}>
                                <td className="px-4 py-3 font-headline font-bold text-primary">{fix.rank || i + 1}</td>
                                <td className="px-4 py-3">
                                  <p className="text-sm font-label font-semibold text-on-surface">{fix.fix}</p>
                                  {fix.affected_pages?.length > 0 && <p className="text-[10px] text-secondary mt-0.5">{fix.affected_pages.join(', ')}</p>}
                                </td>
                                <td className="px-4 py-3 text-right"><span className={`text-[10px] font-label font-bold px-2 py-0.5 rounded-full ${impactColor(fix.impact)}`}>{fix.impact}</span></td>
                                <td className="px-4 py-3 text-right text-xs text-secondary capitalize">{fix.effort}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Regenerate */}
                  <div className="flex justify-end pt-2">
                    <button onClick={generateAudit} className="pill-btn-secondary text-xs">
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      Re-audit
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* INFO */}
        {activeTab === 'info' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Client Details</p>
                {[
                  { label: 'Business Name', value: client.name },
                  { label: 'Website', value: client.website },
                  { label: 'Industry', value: client.industry },
                  { label: 'Status', value: client.status },
                  { label: 'Created', value: client.created_at ? new Date(client.created_at).toLocaleDateString() : '—' },
                  { label: 'Last Updated', value: client.updated_at ? new Date(client.updated_at).toLocaleDateString() : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2 border-b border-outline-variant/10">
                    <span className="text-sm font-label text-secondary">{label}</span>
                    <span className="text-sm font-label font-semibold text-on-surface">{value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Service Areas</p>
                <div className="flex flex-wrap gap-2">
                  {(client.service_areas||[]).map(a => (
                    <span key={a} className="px-3 py-1.5 bg-primary/[0.08] text-primary text-sm font-label rounded-lg border border-primary/20">{a}</span>
                  ))}
                </div>
                {client.website_data?.unique_selling_points?.length > 0 && (
                  <>
                    <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mt-4">Detected USPs</p>
                    <ul className="space-y-2">
                      {client.website_data.unique_selling_points.map((usp, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-on-variant">
                          <span className="material-symbols-outlined text-secondary text-[14px] shrink-0 mt-0.5">check</span>
                          {usp}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>

            {/* Pipeline Tracking */}
            <div className="mt-6 border-t border-outline-variant/10 pt-6 space-y-4">
              <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Pipeline Tracking</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1.5">Pipeline Status</p>
                  <select
                    value={client.status_pipeline || 'prospect'}
                    onChange={async e => {
                      const { updateClient: uc } = await import('@/lib/supabase');
                      const updated = await uc(id, { status_pipeline: e.target.value });
                      setClient(updated);
                    }}
                    className="field-input w-full text-sm"
                  >
                    {['prospect', 'proposal_sent', 'active', 'paused', 'churned'].map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1.5">Monthly Mgmt Fee</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-secondary">$</span>
                    <input
                      type="number" min="0" defaultValue={client.monthly_mgmt_fee || ''}
                      placeholder="0"
                      onBlur={async e => {
                        const val = Number(e.target.value) || 0;
                        if (val !== (client.monthly_mgmt_fee || 0)) {
                          const { updateClient: uc } = await import('@/lib/supabase');
                          const updated = await uc(id, { monthly_mgmt_fee: val });
                          setClient(updated);
                        }
                      }}
                      className="field-input flex-1 font-mono text-sm"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1.5">Follow-up Date</p>
                  <input
                    type="date" defaultValue={client.follow_up_date || ''}
                    onChange={async e => {
                      const { updateClient: uc } = await import('@/lib/supabase');
                      const updated = await uc(id, { follow_up_date: e.target.value || null });
                      setClient(updated);
                    }}
                    className="field-input w-full text-sm"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1.5">Days Since Activity</p>
                  <p className="text-lg font-headline font-bold text-on-surface">
                    {client.updated_at ? Math.floor((Date.now() - new Date(client.updated_at).getTime()) / 86400000) : '—'}
                    <span className="text-sm text-secondary font-normal ml-1">days</span>
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1.5">Notes</p>
                <textarea
                  rows={3} defaultValue={client.notes || ''}
                  placeholder="Internal notes about this client..."
                  onBlur={async e => {
                    if (e.target.value !== (client.notes || '')) {
                      const { updateClient: uc } = await import('@/lib/supabase');
                      const updated = await uc(id, { notes: e.target.value });
                      setClient(updated);
                    }
                  }}
                  className="field-input w-full text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
