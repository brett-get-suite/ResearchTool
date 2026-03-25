'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getClient } from '@/lib/supabase';
import { getDefaultBenchmarks, getSeasonalMultipliers, getServiceFrequency, TAM_CONSTANTS } from '@/lib/benchmarks';

export default function PitchPage() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClient(id).then(setClient).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (client && !loading) {
      setTimeout(() => window.print(), 1000);
    }
  }, [client, loading]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <p>Preparing pitch deck...</p>
    </div>
  );

  if (!client) return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}><p>Client not found.</p></div>
  );

  const bp = client.budget_projection || {};
  const benchmarks = getDefaultBenchmarks(client.industry || '');
  const seasonality = getSeasonalMultipliers(client.industry || '');
  const freq = getServiceFrequency(client.industry || '');
  const allKw = client.keyword_data?.keyword_groups?.flatMap(g => g.keywords) || [];
  const opps = client.low_hanging_fruit?.top_opportunities || [];
  const competitors = client.competitor_data?.competitors || [];
  const balanced = bp.budget_tiers?.find(t => t.level === 'balanced');
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // TAM calculations (default 250k population)
  const tamPop = 250000;
  const households = Math.round(tamPop / TAM_CONSTANTS.avgHouseholdSize * TAM_CONSTANTS.homeownershipRate);
  const annualDemand = Math.round(households * freq.frequency);
  const totalMarketRevenue = annualDemand * benchmarks.avgJobValue;

  // ROI for balanced tier
  const balancedLeads = balanced?.expected_monthly_leads || 0;
  const balancedJobs = Math.round(balancedLeads * benchmarks.closeRate);
  const balancedRevenue = balancedJobs * benchmarks.avgJobValue;
  const balancedSpend = balanced?.monthly_budget || 0;
  const balancedROI = balancedSpend > 0 ? (balancedRevenue / balancedSpend).toFixed(1) : '0';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; color: #1b1c1d; background: white; font-size: 11px; line-height: 1.6; }
        h1, h2, h3 { font-family: 'Noto Serif', serif; }
        .page { max-width: 800px; margin: 0 auto; padding: 48px 40px; page-break-after: always; }
        .page:last-child { page-break-after: avoid; }

        /* Cover */
        .cover { display: flex; flex-direction: column; justify-content: center; min-height: 90vh; text-align: center; }
        .cover h1 { font-size: 32px; color: #094cb2; margin-bottom: 8px; }
        .cover h2 { font-size: 20px; font-weight: 400; color: #5a5f63; margin-bottom: 40px; }
        .cover-meta { font-size: 11px; color: #5a5f63; }
        .cover-meta strong { color: #1b1c1d; }
        .cover-divider { width: 60px; height: 3px; background: #094cb2; margin: 24px auto; }

        /* Sections */
        .section-num { font-size: 10px; color: #094cb2; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin-bottom: 4px; }
        .section-title { font-size: 18px; font-weight: 700; color: #1b1c1d; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #094cb2; }
        .pitch-box { background: #f0f4ff; border-left: 3px solid #094cb2; padding: 16px 20px; margin-bottom: 20px; font-size: 12px; line-height: 1.7; color: #1b1c1d; }

        /* Stats grid */
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .stat-card { padding: 14px; border: 1px solid #e3e2e3; border-radius: 8px; text-align: center; }
        .stat-card-val { font-size: 22px; font-weight: 700; color: #094cb2; }
        .stat-card-label { font-size: 9px; color: #5a5f63; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
        .stat-card-sub { font-size: 9px; color: #8a8f93; margin-top: 2px; }

        /* Tables */
        table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 16px; }
        th { background: #f5f3f4; text-align: left; padding: 7px 10px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #5a5f63; border-bottom: 1px solid #e3e2e3; }
        td { padding: 6px 10px; border-bottom: 1px solid #f0efef; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 9px; font-weight: 600; }
        .badge-t { background: #fef3c7; color: #92400e; }
        .badge-c { background: #dbeafe; color: #1e40af; }
        .badge-g { background: #d1fae5; color: #065f46; }

        /* Budget cards */
        .tier-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
        .tier-card { padding: 14px; border: 1px solid #e3e2e3; border-radius: 8px; text-align: center; }
        .tier-card.rec { border-color: #094cb2; background: #f0f4ff; }
        .tier-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #5a5f63; font-weight: 600; margin-bottom: 4px; }
        .tier-amount { font-size: 18px; font-weight: 700; }
        .tier-sub { font-size: 9px; color: #5a5f63; margin-top: 2px; }

        /* ROI table */
        .roi-table td:last-child { font-weight: 700; }
        .green { color: #059669; }

        /* Bar chart */
        .bar-chart { display: flex; align-items: flex-end; gap: 4px; height: 120px; margin-bottom: 8px; padding: 0 4px; }
        .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; height: 100%; }
        .bar-val { font-size: 8px; color: #5a5f63; }
        .bar-fill-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
        .bar-fill { width: 100%; background: #094cb2; border-radius: 2px 2px 0 0; min-height: 2px; }
        .bar-fill.light { background: #c5d8f5; }
        .bar-label { font-size: 9px; color: #5a5f63; font-weight: 600; }

        /* CTA */
        .cta-box { background: #094cb2; color: white; padding: 24px 32px; border-radius: 8px; text-align: center; margin-top: 32px; }
        .cta-box h3 { color: white; font-size: 18px; margin-bottom: 8px; }
        .cta-box p { font-size: 12px; opacity: 0.9; }

        /* Footer */
        .footer { border-top: 1px solid #e3e2e3; padding-top: 10px; margin-top: 32px; display: flex; justify-content: space-between; font-size: 9px; color: #5a5f63; }

        /* Print button */
        .print-btn { position: fixed; top: 16px; right: 16px; background: #094cb2; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; z-index: 10000; }
        @media print {
          .print-btn { display: none; }
          body { font-size: 10px; }
          .page { padding: 24px; }
        }
        @page { margin: 1cm; }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 9999, overflowY: 'auto' }}>
      <button className="print-btn" onClick={() => window.print()}>Print / Save PDF</button>

      {/* PAGE 1 — Cover */}
      <div className="page cover">
        <div>
          <p style={{ fontSize: '11px', color: '#094cb2', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: '16px' }}>Google Ads Growth Strategy</p>
          <h1>{client.name}</h1>
          <h2>{client.industry} · {(client.service_areas || []).join(', ')}</h2>
          <div className="cover-divider" />
          <div className="cover-meta">
            <p>Prepared: <strong>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></p>
            <p style={{ marginTop: '4px' }}>Website: <strong>{client.website}</strong></p>
          </div>
        </div>
      </div>

      {/* PAGE 2 — Executive Summary */}
      <div className="page">
        <p className="section-num">01</p>
        <h2 className="section-title">Executive Summary</h2>

        {bp.executive_pitch && (
          <div className="pitch-box">{bp.executive_pitch}</div>
        )}

        <div className="stat-grid">
          {[
            { val: allKw.length, label: 'Keywords Identified', sub: 'across all ad groups' },
            { val: opps.length, label: 'Quick-Win Opportunities', sub: 'low competition, high intent' },
            { val: competitors.length, label: 'Competitors Analyzed', sub: 'in your market' },
            { val: balancedSpend > 0 ? `${balancedROI}×` : '—', label: 'Projected ROI', sub: 'at recommended budget' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-card-val">{s.val}</div>
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {client.low_hanging_fruit?.executive_summary && (
          <p style={{ fontSize: '11px', color: '#434653', lineHeight: 1.7 }}>{client.low_hanging_fruit.executive_summary}</p>
        )}

        <div className="footer">
          <span>Confidential — Prepared for {client.name}</span>
          <span>PPC Recon · Google Ads Intelligence</span>
        </div>
      </div>

      {/* PAGE 3 — Market Opportunity */}
      <div className="page">
        <p className="section-num">02</p>
        <h2 className="section-title">Market Opportunity</h2>

        <p style={{ marginBottom: '16px', fontSize: '11px', color: '#434653' }}>
          Your service area represents a significant untapped market for {client.industry?.toLowerCase()} services. Here is the estimated total addressable market.
        </p>

        <div className="stat-grid">
          {[
            { val: households.toLocaleString(), label: 'Households', sub: `${tamPop.toLocaleString()} population` },
            { val: `${annualDemand.toLocaleString()}`, label: 'Annual Service Demand', sub: `${freq.frequency}× per household/yr` },
            { val: `$${benchmarks.avgJobValue.toLocaleString()}`, label: 'Avg Job Value', sub: benchmarks.label },
            { val: `$${totalMarketRevenue >= 1e6 ? `${(totalMarketRevenue / 1e6).toFixed(1)}M` : `${(totalMarketRevenue / 1e3).toFixed(0)}K`}`, label: 'Total Market Revenue', sub: 'annual' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-card-val">{s.val}</div>
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Capturable Market Share</h3>
        <table>
          <thead><tr><th>Market Share</th><th>Jobs/Year</th><th>Revenue/Year</th><th>Revenue/Month</th></tr></thead>
          <tbody>
            {[0.005, 0.01, 0.03, 0.05].map(pct => {
              const jobs = Math.round(annualDemand * pct);
              const rev = jobs * benchmarks.avgJobValue;
              return (
                <tr key={pct}>
                  <td style={{ fontWeight: 600 }}>{(pct * 100).toFixed(1)}%</td>
                  <td>{jobs.toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>${rev.toLocaleString()}</td>
                  <td>${Math.round(rev / 12).toLocaleString()}/mo</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ fontSize: '9px', color: '#8a8f93', fontStyle: 'italic' }}>Estimates based on US Census data and industry averages. Actual market size varies by local conditions.</p>

        <div className="footer">
          <span>Confidential — Prepared for {client.name}</span>
          <span>PPC Recon · Google Ads Intelligence</span>
        </div>
      </div>

      {/* PAGE 4 — Keyword Strategy */}
      <div className="page">
        <p className="section-num">03</p>
        <h2 className="section-title">Keyword Strategy</h2>

        {opps.length > 0 && (
          <>
            <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Top Opportunities</h3>
            <table>
              <thead><tr><th>Score</th><th>Keyword</th><th>Intent</th><th>Mo. Searches</th><th>Est. CPC</th><th>Why It Matters</th></tr></thead>
              <tbody>
                {opps.sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0)).slice(0, 10).map((o, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700, color: '#094cb2' }}>{o.opportunity_score}</td>
                    <td style={{ fontWeight: 600 }}>{o.keyword}</td>
                    <td><span className={`badge ${o.intent === 'transactional' ? 'badge-t' : 'badge-c'}`}>{o.intent}</span></td>
                    <td>{(o.estimated_monthly_searches || 0).toLocaleString()}</td>
                    <td>${(o.estimated_cpc || 0).toFixed(2)}</td>
                    <td style={{ maxWidth: '180px', color: '#434653' }}>{o.why_its_gold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {client.keyword_data?.keyword_groups?.length > 0 && (
          <>
            <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', marginTop: '16px' }}>Ad Group Summary</h3>
            <table>
              <thead><tr><th>Ad Group</th><th>Keywords</th><th>Avg CPC</th><th>Top Intent</th></tr></thead>
              <tbody>
                {client.keyword_data.keyword_groups.map((g, i) => {
                  const kws = g.keywords || [];
                  const avg = kws.length ? (kws.reduce((s, k) => s + (k.estimated_cpc || 0), 0) / kws.length).toFixed(2) : '0.00';
                  const topIntent = kws.length ? ['transactional', 'commercial', 'informational'].sort((a, b) => kws.filter(k => k.intent === b).length - kws.filter(k => k.intent === a).length)[0] : '—';
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{g.theme}</td>
                      <td>{kws.length}</td>
                      <td>${avg}</td>
                      <td><span className={`badge ${topIntent === 'transactional' ? 'badge-t' : topIntent === 'commercial' ? 'badge-c' : 'badge-g'}`}>{topIntent}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        <div className="footer">
          <span>Confidential — Prepared for {client.name}</span>
          <span>PPC Recon · Google Ads Intelligence</span>
        </div>
      </div>

      {/* PAGE 5 — Competitive Landscape */}
      {competitors.length > 0 && (
        <div className="page">
          <p className="section-num">04</p>
          <h2 className="section-title">Competitive Landscape</h2>

          {client.competitor_data?.market_analysis && (
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '16px' }}>
              {[
                { val: client.competitor_data.market_analysis.competition_level, label: 'Competition Level' },
                { val: client.competitor_data.market_analysis.avg_cpc_range ? `$${client.competitor_data.market_analysis.avg_cpc_range.low}–$${client.competitor_data.market_analysis.avg_cpc_range.high}` : '—', label: 'CPC Range' },
                { val: competitors.length, label: 'Active Competitors' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-card-val" style={{ textTransform: 'capitalize' }}>{s.val}</div>
                  <div className="stat-card-label">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <table>
            <thead><tr><th>Competitor</th><th>Est. Ad Spend</th><th>Threat</th><th>Key Services</th><th>Notes</th></tr></thead>
            <tbody>
              {competitors.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{c.estimated_ad_spend}</td>
                  <td style={{ textTransform: 'capitalize' }}>{c.threat_level}</td>
                  <td>{(c.services_advertised || []).slice(0, 3).join(', ')}</td>
                  <td style={{ color: '#434653', maxWidth: '160px' }}>{c.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {client.competitor_data?.market_analysis?.opportunity_gaps?.length > 0 && (
            <>
              <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Gaps Your Competitors Are Missing</h3>
              <ul style={{ paddingLeft: '20px', fontSize: '11px', color: '#434653', lineHeight: 1.8 }}>
                {client.competitor_data.market_analysis.opportunity_gaps.map((gap, i) => (
                  <li key={i}>{gap}</li>
                ))}
              </ul>
            </>
          )}

          <div className="footer">
            <span>Confidential — Prepared for {client.name}</span>
            <span>PPC Recon · Google Ads Intelligence</span>
          </div>
        </div>
      )}

      {/* PAGE 6 — Budget & ROI */}
      <div className="page">
        <p className="section-num">{competitors.length > 0 ? '05' : '04'}</p>
        <h2 className="section-title">Budget Options &amp; ROI Projections</h2>

        {bp.budget_tiers?.length > 0 && (
          <>
            <div className="tier-grid">
              {bp.budget_tiers.map(tier => (
                <div key={tier.level} className={`tier-card ${tier.level === 'balanced' ? 'rec' : ''}`}>
                  <p className="tier-label">{tier.level}</p>
                  <p className="tier-amount">${(tier.monthly_budget || 0).toLocaleString()}</p>
                  <p className="tier-sub">/month</p>
                  <p className="tier-sub">~{tier.expected_monthly_leads || 0} leads</p>
                  {tier.level === 'balanced' && <p style={{ fontSize: '9px', color: '#094cb2', fontWeight: 700, marginTop: '4px' }}>Recommended</p>}
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Revenue Projections by Tier</h3>
            <table className="roi-table">
              <thead><tr><th>Tier</th><th>Ad Spend</th><th>Leads</th><th>Est. Jobs</th><th>Revenue</th><th>ROI</th></tr></thead>
              <tbody>
                {bp.budget_tiers.map(tier => {
                  const leads = tier.expected_monthly_leads || 0;
                  const spend = tier.monthly_budget || 0;
                  const jobs = Math.round(leads * benchmarks.closeRate);
                  const revenue = jobs * benchmarks.avgJobValue;
                  const roi = spend > 0 ? (revenue / spend).toFixed(1) : '0';
                  return (
                    <tr key={tier.level} style={tier.level === 'balanced' ? { background: '#f0f4ff' } : {}}>
                      <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{tier.level}</td>
                      <td>${spend.toLocaleString()}/mo</td>
                      <td>~{leads}</td>
                      <td>{jobs}</td>
                      <td style={{ fontWeight: 700 }}>${revenue.toLocaleString()}/mo</td>
                      <td className="green">{roi}×</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={{ fontSize: '9px', color: '#8a8f93', fontStyle: 'italic', marginBottom: '16px' }}>
              Based on {benchmarks.label} benchmarks: {Math.round(benchmarks.closeRate * 100)}% close rate, ${benchmarks.avgJobValue.toLocaleString()} avg job value.
            </p>
          </>
        )}

        {/* Seasonal bar chart */}
        {balanced && (
          <>
            <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>12-Month Seasonal Budget Plan <span style={{ fontWeight: 400, fontSize: '10px', color: '#5a5f63' }}>(Recommended tier)</span></h3>
            <div className="bar-chart">
              {seasonality.map((m, i) => {
                const budget = Math.round((balanced.monthly_budget || 0) * m);
                const maxB = Math.max(...seasonality.map(s => Math.round((balanced.monthly_budget || 0) * s)));
                const pct = maxB > 0 ? (budget / maxB) * 100 : 0;
                const currentMonth = new Date().getMonth();
                return (
                  <div key={i} className="bar-col">
                    <p className="bar-val">${budget >= 1000 ? `${(budget / 1000).toFixed(1)}k` : budget}</p>
                    <div className="bar-fill-wrap">
                      <div className={`bar-fill ${i === currentMonth ? '' : 'light'}`} style={{ height: `${Math.max(pct, 3)}%` }} />
                    </div>
                    <p className="bar-label">{MONTHS[i]}</p>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: '10px', color: '#5a5f63', textAlign: 'center', marginBottom: '8px' }}>
              Annual total: <strong>${seasonality.reduce((s, m) => s + Math.round((balanced.monthly_budget || 0) * m), 0).toLocaleString()}</strong> · ~{seasonality.reduce((s, m) => s + Math.round((balanced.expected_monthly_leads || 0) * m), 0)} leads/year
            </p>
          </>
        )}

        <div className="footer">
          <span>Confidential — Prepared for {client.name}</span>
          <span>PPC Recon · Google Ads Intelligence</span>
        </div>
      </div>

      {/* PAGE 7 — Next Steps */}
      <div className="page">
        <p className="section-num">Next Steps</p>
        <h2 className="section-title">Ready to Grow?</h2>

        <p style={{ fontSize: '12px', color: '#434653', lineHeight: 1.8, marginBottom: '24px' }}>
          This research identifies a clear path to generating more leads and revenue through Google Ads.
          Here is the recommended action plan to get started:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {[
            { num: '1', title: 'Approve Budget & Strategy', desc: `Start with the recommended ${balanced ? `$${balanced.monthly_budget?.toLocaleString()}/mo` : ''} budget targeting your highest-value services.` },
            { num: '2', title: 'Launch Quick-Win Campaigns', desc: `Begin with the ${opps.length} low-hanging fruit keywords — these have the lowest CPCs and highest conversion potential.` },
            { num: '3', title: 'Build Full Campaign Structure', desc: `Roll out all ${client.keyword_data?.keyword_groups?.length || 0} ad groups with the AI-generated ad copy and sitelinks.` },
            { num: '4', title: 'Optimize Monthly', desc: 'Review performance data, adjust bids, add negative keywords, and scale winning campaigns.' },
          ].map(step => (
            <div key={step.num} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#094cb2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>{step.num}</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>{step.title}</p>
                <p style={{ fontSize: '11px', color: '#434653' }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="cta-box">
          <h3>Let&apos;s Get Started</h3>
          <p>Ready to turn these insights into real leads and revenue for your business.</p>
        </div>

        <div className="footer">
          <span>Confidential — Prepared for {client.name}</span>
          <span>PPC Recon · Google Ads Intelligence</span>
        </div>
      </div>

      </div>{/* end full-screen overlay */}
    </>
  );
}
