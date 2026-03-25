'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getClient, deleteClient } from '@/lib/supabase';

const intentBadge = (i) => ({ transactional: 'badge-transactional', commercial: 'badge-commercial', informational: 'badge-informational' }[i] || 'badge-navigational');
const cpcClass = (c) => c < 10 ? 'cpc-low' : c < 30 ? 'cpc-mid' : 'cpc-high';
const compColor = (c) => c === 'low' ? 'bg-emerald-100 text-emerald-700' : c === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('keywords');
  const [error, setError] = useState('');

  useEffect(() => {
    getClient(id).then(setClient).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Delete this client and all research data?')) return;
    await deleteClient(id);
    router.push('/clients');
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
              client.status === 'complete' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-high text-secondary'
            }`}>
              {(client.status || 'draft').toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="pill-btn-secondary text-xs">
            <span className="material-symbols-outlined text-[15px]">download</span>CSV
          </button>
          <button onClick={exportZIP} className="pill-btn-secondary text-xs">
            <span className="material-symbols-outlined text-[15px]">folder_zip</span>ZIP
          </button>
          <button onClick={() => window.open(`/print/${id}`, '_blank')} className="pill-btn-secondary text-xs">
            <span className="material-symbols-outlined text-[15px]">print</span>PDF
          </button>
          <button onClick={handleDelete} className="pill-btn text-xs bg-red-50 text-error hover:bg-red-100">
            <span className="material-symbols-outlined text-[15px]">delete</span>Delete
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { icon: 'key_visualizer', label: 'Total Keywords', value: allKw.length, color: 'text-primary' },
          { icon: 'target_arrow',   label: 'Transactional',  value: allKw.filter(k => k.intent === 'transactional').length, color: 'text-amber-600' },
          { icon: 'star',           label: 'Opportunities',  value: opps.length, color: 'text-tertiary' },
          { icon: 'location_on',    label: 'Service Areas',  value: (client.service_areas||[]).length, color: 'text-emerald-700' },
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
                      <thead><tr><th>Keyword</th><th>Intent</th><th>Mo. Searches</th><th>Est. CPC</th><th>Competition</th><th>Priority</th></tr></thead>
                      <tbody>
                        {(group.keywords||[]).map((kw, ki) => (
                          <tr key={ki}>
                            <td className="font-label font-semibold text-on-surface">{kw.keyword}</td>
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
        {activeTab === 'budget' && client.keyword_data && (
          <div className="p-6">
            <p className="font-headline font-bold text-on-surface mb-6">Budget Recommendations</p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {['conservative','balanced','aggressive'].map(level => (
                <div key={level} className={`p-5 rounded-xl border ${level==='balanced'?'bg-primary/[0.04] border-primary/20':'bg-surface-low border-outline-variant/15'}`}>
                  <p className="text-xs font-label font-bold text-secondary uppercase tracking-widest mb-1 capitalize">{level}</p>
                  <p className="text-3xl font-headline font-bold text-on-surface">${(client.keyword_data.estimated_monthly_budget_range?.[level]||0).toLocaleString()}</p>
                  <p className="text-xs text-secondary mt-1">/month</p>
                  {level==='balanced' && <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-label font-bold">Recommended</span>}
                </div>
              ))}
            </div>
            {client.keyword_data.budget_assumptions && (
              <div className="p-4 bg-surface-low border border-outline-variant/15 rounded-xl text-sm text-on-variant">
                <strong className="text-on-surface font-label">Assumptions: </strong>{client.keyword_data.budget_assumptions}
              </div>
            )}
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
                          <span className="material-symbols-outlined text-emerald-700 text-[14px] shrink-0 mt-0.5">check</span>
                          {usp}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
