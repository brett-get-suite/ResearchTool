'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getClients, isSupabaseConfigured } from '@/lib/supabase';

export default function ReportsPage() {
  return (
    <Suspense>
      <ReportsContent />
    </Suspense>
  );
}

const REPORT_TEMPLATES = [
  { key: 'client_monthly', label: 'Client-Facing Monthly', icon: 'person', desc: 'Simplified — focuses on leads, cost/lead, and spend' },
  { key: 'internal_audit', label: 'Internal Audit', icon: 'fact_check', desc: 'Detailed — includes agent activity and keyword-level data' },
  { key: 'budget_recon', label: 'Budget Reconciliation', icon: 'account_balance', desc: 'Spend vs budget by client, with pacing analysis' },
];

function ReportsContent() {
  const searchParams = useSearchParams();
  const preselect = searchParams.get('client');

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState('');
  const [activeTab, setActiveTab] = useState('export');
  const [scheduleFreq, setScheduleFreq] = useState('monthly');
  const [scheduleEmail, setScheduleEmail] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('client_monthly');

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    getClients()
      .then(data => {
        const completed = data.filter(c => c.status === 'complete');
        setClients(completed);
        if (preselect) {
          const pre = completed.find(c => c.id === preselect);
          if (pre) setSelected(pre);
        } else if (completed.length > 0) {
          setSelected(completed[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [preselect]);

  const exportCSV = async (client) => {
    setExporting('csv');
    try {
      const res = await fetch('/api/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywordData: client.keyword_data, competitorData: client.competitor_data, lowHangingFruit: client.low_hanging_fruit, businessName: client.name }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${client.name}-ppc-report.csv`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { alert('CSV failed: ' + e.message); }
    setExporting('');
  };

  const exportZIP = async (client) => {
    setExporting('zip');
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      let kwCsv = 'Ad Group,Keyword,Intent,Monthly Searches,Est CPC,Competition,Priority\n';
      (client.keyword_data?.keyword_groups||[]).forEach(g => (g.keywords||[]).forEach(kw => {
        kwCsv += `"${g.theme}","${kw.keyword}","${kw.intent}",${kw.estimated_monthly_searches},${kw.estimated_cpc},"${kw.competition}","${kw.priority}"\n`;
      }));
      zip.file('keywords.csv', kwCsv);
      let negCsv = 'Negative Keyword\n';
      (client.keyword_data?.negative_keywords||[]).forEach(n => { negCsv += `"${n}"\n`; });
      zip.file('negative-keywords.csv', negCsv);
      let compCsv = 'Competitor,Est Ad Spend,Threat Level,Services,Notes\n';
      (client.competitor_data?.competitors||[]).forEach(c => {
        compCsv += `"${c.name}","${c.estimated_ad_spend}","${c.threat_level}","${(c.services_advertised||[]).join('; ')}","${c.notes||''}"\n`;
      });
      zip.file('competitors.csv', compCsv);
      let oppCsv = 'Keyword,Intent,Monthly Searches,Est CPC,Competition,Score,Why\n';
      (client.low_hanging_fruit?.top_opportunities||[]).forEach(o => {
        oppCsv += `"${o.keyword}","${o.intent}",${o.estimated_monthly_searches},${o.estimated_cpc},"${o.competition}",${o.opportunity_score},"${o.why_its_gold}"\n`;
      });
      zip.file('opportunities.csv', oppCsv);
      let campCsv = 'Campaign,Strategy,Keywords,Daily Budget,Daily Clicks\n';
      (client.low_hanging_fruit?.quick_win_campaigns||[]).forEach(c => {
        campCsv += `"${c.campaign_name}","${c.strategy}","${(c.keywords||[]).join('; ')}",${c.estimated_daily_budget},${c.expected_daily_clicks}\n`;
      });
      zip.file('quick-win-campaigns.csv', campCsv);
      const kws = (client.keyword_data?.keyword_groups||[]).flatMap(g=>g.keywords);
      const avg = kws.length ? (kws.reduce((s,k)=>s+(k.estimated_cpc||0),0)/kws.length).toFixed(2) : '0.00';
      zip.file('executive-summary.txt', [
        `PPC RESEARCH REPORT`,
        `Client: ${client.name}`,
        `Website: ${client.website}`,
        `Industry: ${client.industry}`,
        `Service Areas: ${(client.service_areas||[]).join(', ')}`,
        `Generated: ${new Date().toLocaleDateString()}`,
        '',
        '── STATS ──',
        `Total Keywords: ${kws.length}`,
        `Transactional Keywords: ${kws.filter(k=>k.intent==='transactional').length}`,
        `Average CPC: $${avg}`,
        `Opportunities: ${(client.low_hanging_fruit?.top_opportunities||[]).length}`,
        '',
        '── EXECUTIVE SUMMARY ──',
        client.low_hanging_fruit?.executive_summary || 'N/A',
        '',
        '── BUDGET RECOMMENDATIONS ──',
        `Conservative: $${(client.keyword_data?.estimated_monthly_budget_range?.conservative||0).toLocaleString()}/mo`,
        `Balanced: $${(client.keyword_data?.estimated_monthly_budget_range?.balanced||0).toLocaleString()}/mo`,
        `Aggressive: $${(client.keyword_data?.estimated_monthly_budget_range?.aggressive||0).toLocaleString()}/mo`,
        '',
        '── BUDGET ASSUMPTIONS ──',
        client.keyword_data?.budget_assumptions || 'N/A',
      ].join('\n'));
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${client.name}-ppc-research.zip`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { alert('ZIP failed: ' + e.message); }
    setExporting('');
  };

  const allKw = selected?.keyword_data?.keyword_groups?.flatMap(g=>g.keywords) || [];
  const opps = selected?.low_hanging_fruit?.top_opportunities || [];
  const avgCpc = allKw.length ? (allKw.reduce((s,k)=>s+(k.estimated_cpc||0),0)/allKw.length).toFixed(2) : '0.00';

  return (
    <div className="px-8 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-on-surface mb-1">Reports &amp; Exports</h2>
          <p className="text-on-surface-variant text-sm">Generate, schedule, and export reports</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container rounded-xl p-1 w-fit mb-6">
        {[
          { key: 'export', label: 'Export Reports', icon: 'download' },
          { key: 'templates', label: 'Templates', icon: 'description' },
          { key: 'scheduled', label: 'Scheduled', icon: 'schedule' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4 mb-6">
          <p className="text-sm text-on-surface-variant">Choose a template to generate a pre-formatted report</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REPORT_TEMPLATES.map(t => (
              <button key={t.key} onClick={() => { setSelectedTemplate(t.key); setActiveTab('export'); }}
                className={`bg-surface-container rounded-xl p-6 text-left hover:border-primary/30 border border-transparent transition-all ${
                  selectedTemplate === t.key ? 'border-primary/30 bg-primary/5' : ''
                }`}>
                <span className="material-symbols-outlined text-primary text-2xl mb-3 block">{t.icon}</span>
                <h3 className="text-sm font-semibold text-on-surface mb-1">{t.label}</h3>
                <p className="text-xs text-on-surface-variant">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Reports Tab */}
      {activeTab === 'scheduled' && (
        <div className="bg-surface-container rounded-xl p-6 max-w-lg mb-6">
          <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">schedule_send</span>
            Schedule Recurring Reports
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-2">Frequency</label>
              <select value={scheduleFreq} onChange={e => setScheduleFreq(e.target.value)}
                className="w-full text-sm py-2.5 px-3 rounded-xl bg-surface-container-high border border-outline-variant/20">
                <option value="weekly">Weekly (every Monday)</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly (1st of month)</option>
              </select>
            </div>
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-2">Report Template</label>
              <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}
                className="w-full text-sm py-2.5 px-3 rounded-xl bg-surface-container-high border border-outline-variant/20">
                {REPORT_TEMPLATES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-2">Email Recipients</label>
              <input type="email" value={scheduleEmail} onChange={e => setScheduleEmail(e.target.value)}
                placeholder="manager@agency.com" className="w-full text-sm py-2.5 px-3 rounded-xl bg-surface-container-high border border-outline-variant/20" />
            </div>
            <button className="w-full pill-btn-primary justify-center py-3">
              <span className="material-symbols-outlined text-lg">schedule_send</span>
              Save Schedule
            </button>
          </div>
        </div>
      )}

      {activeTab === 'export' && !isSupabaseConfigured() ? (
        <div className="card p-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">cloud_off</span>
          <p className="font-headline font-bold text-on-surface mb-1">Supabase not configured</p>
          <p className="text-sm text-secondary">Reports require Supabase to load saved client data.</p>
        </div>
      ) : loading ? (
        <div className="card p-12 text-center"><span className="material-symbols-outlined text-primary text-[40px] animate-spin">progress_activity</span></div>
      ) : clients.length === 0 ? (
        <div className="card p-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">assessment</span>
          <p className="font-headline font-bold text-on-surface mb-1">No completed research yet</p>
          <p className="text-sm text-secondary mb-6">Complete a research run to generate exportable reports.</p>
          <a href="/research" className="pill-btn-primary text-sm">Start Research</a>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Client list */}
          <div className="col-span-12 lg:col-span-4 card overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/10">
              <p className="font-label font-bold text-on-surface text-sm">Select Client</p>
            </div>
            <div className="divide-y divide-outline-variant/10 max-h-[600px] overflow-y-auto">
              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => setSelected(client)}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${
                    selected?.id === client.id ? 'bg-primary/[0.05] border-r-2 border-primary' : 'hover:bg-surface-low'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-label font-semibold text-on-surface text-sm truncate">{client.name}</p>
                    <p className="text-[11px] text-secondary truncate">{client.industry} · {(client.service_areas||[]).length} areas</p>
                  </div>
                  <span className="text-[10px] font-label font-bold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary shrink-0">DONE</span>
                </button>
              ))}
            </div>
          </div>

          {/* Report preview */}
          {selected && (
            <div className="col-span-12 lg:col-span-8 space-y-6">
              {/* Export buttons */}
              <div className="card p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-headline font-bold text-on-surface">{selected.name}</h3>
                    <p className="text-sm text-secondary mt-0.5">
                      {selected.industry} · {new Date(selected.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <a href={`/clients/${selected.id}`} className="pill-btn-ghost text-xs">
                    <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                    Full Profile
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => exportCSV(selected)}
                    disabled={exporting === 'csv'}
                    className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-outline-variant/30 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group"
                  >
                    <span className="material-symbols-outlined text-[32px] text-secondary group-hover:text-primary transition-colors">
                      {exporting === 'csv' ? 'progress_activity' : 'table_view'}
                    </span>
                    <div className="text-center">
                      <p className="font-label font-bold text-on-surface text-sm">CSV Export</p>
                      <p className="text-[11px] text-secondary mt-0.5">Single file, all data</p>
                    </div>
                  </button>

                  <button
                    onClick={() => exportZIP(selected)}
                    disabled={exporting === 'zip'}
                    className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-primary/30 bg-primary/[0.03] hover:bg-primary/[0.06] transition-all group"
                  >
                    <span className={`material-symbols-outlined text-[32px] text-primary ${exporting === 'zip' ? 'animate-spin' : ''}`}>
                      {exporting === 'zip' ? 'progress_activity' : 'folder_zip'}
                    </span>
                    <div className="text-center">
                      <p className="font-label font-bold text-on-surface text-sm">ZIP Bundle</p>
                      <p className="text-[11px] text-secondary mt-0.5">5 separate CSV files</p>
                      <span className="inline-block mt-1 text-[10px] font-label font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Recommended</span>
                    </div>
                  </button>

                  <button
                    onClick={() => window.open(`/print/${selected.id}`, '_blank')}
                    className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-outline-variant/30 hover:border-tertiary/30 hover:bg-tertiary/[0.03] transition-all group"
                  >
                    <span className="material-symbols-outlined text-[32px] text-secondary group-hover:text-tertiary transition-colors">print</span>
                    <div className="text-center">
                      <p className="font-label font-bold text-on-surface text-sm">PDF Report</p>
                      <p className="text-[11px] text-secondary mt-0.5">Print or save as PDF</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Report preview */}
              <div className="card overflow-hidden">
                <div className="px-6 py-5 border-b border-outline-variant/10 bg-surface-low">
                  <p className="font-label font-bold text-on-surface text-sm">Report Preview</p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Keywords', value: allKw.length },
                      { label: 'Transactional', value: allKw.filter(k=>k.intent==='transactional').length },
                      { label: 'Avg CPC', value: `$${avgCpc}` },
                      { label: 'Opportunities', value: opps.length },
                    ].map(s => (
                      <div key={s.label} className="text-center p-3 bg-surface-low rounded-lg">
                        <p className="text-xl font-headline font-bold text-on-surface">{s.value}</p>
                        <p className="text-[10px] font-label text-secondary mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Executive summary */}
                  {selected.low_hanging_fruit?.executive_summary && (
                    <div className="p-4 bg-primary/[0.04] border border-primary/15 rounded-xl">
                      <p className="text-[10px] font-label font-bold text-primary uppercase tracking-widest mb-2">Executive Summary</p>
                      <p className="text-sm text-on-variant leading-relaxed">{selected.low_hanging_fruit.executive_summary}</p>
                    </div>
                  )}

                  {/* Budget */}
                  {selected.keyword_data?.estimated_monthly_budget_range && (
                    <div>
                      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Budget Recommendations</p>
                      <div className="grid grid-cols-3 gap-3">
                        {['conservative','balanced','aggressive'].map(l => (
                          <div key={l} className={`p-4 rounded-xl border ${l==='balanced'?'bg-primary/[0.04] border-primary/20':'bg-surface-low border-outline-variant/15'}`}>
                            <p className="text-[10px] font-label font-bold text-secondary capitalize mb-1">{l}</p>
                            <p className="text-lg font-headline font-bold text-on-surface">${(selected.keyword_data.estimated_monthly_budget_range[l]||0).toLocaleString()}/mo</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top 5 keywords */}
                  {allKw.length > 0 && (
                    <div>
                      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3">Top Keywords (by search volume)</p>
                      <div className="space-y-2">
                        {allKw.sort((a,b)=>(b.estimated_monthly_searches||0)-(a.estimated_monthly_searches||0)).slice(0,5).map((kw,i) => (
                          <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-outline-variant/10">
                            <span className="font-label font-semibold text-on-surface">{kw.keyword}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-secondary font-mono">{(kw.estimated_monthly_searches||0).toLocaleString()}/mo</span>
                              <span className={`text-xs font-mono font-bold ${cpcClass(kw.estimated_cpc||0)}`}>${(kw.estimated_cpc||0).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function cpcClass(c) { return c < 10 ? 'cpc-low' : c < 30 ? 'cpc-mid' : 'cpc-high'; }
