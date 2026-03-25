'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getClient } from '@/lib/supabase';

export default function PrintPage() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClient(id).then(setClient).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (client && !loading) {
      setTimeout(() => window.print(), 800);
    }
  }, [client, loading]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <p>Preparing report...</p>
    </div>
  );

  if (!client) return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <p>Client not found.</p>
    </div>
  );

  const allKw = client.keyword_data?.keyword_groups?.flatMap(g => g.keywords) || [];
  const opps = client.low_hanging_fruit?.top_opportunities || [];
  const avgCpc = allKw.length ? (allKw.reduce((s, k) => s + (k.estimated_cpc || 0), 0) / allKw.length).toFixed(2) : '0.00';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&family=Inter:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; color: #1b1c1d; background: white; font-size: 11px; }
        h1, h2, h3, h4 { font-family: 'Noto Serif', serif; }
        .page { max-width: 800px; margin: 0 auto; padding: 40px; }
        .header { border-bottom: 2px solid #094cb2; padding-bottom: 20px; margin-bottom: 24px; }
        .header h1 { font-size: 24px; color: #094cb2; }
        .header-meta { display: flex; gap: 24px; margin-top: 8px; font-size: 10px; color: #5a5f63; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat { padding: 12px; border: 1px solid #e3e2e3; border-radius: 6px; text-align: center; }
        .stat-val { font-size: 20px; font-weight: 700; color: #094cb2; }
        .stat-label { font-size: 9px; color: #5a5f63; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 14px; font-weight: 700; border-bottom: 1px solid #e3e2e3; padding-bottom: 6px; margin-bottom: 12px; }
        .summary-box { background: #f5f5f5; border-left: 3px solid #094cb2; padding: 12px 16px; margin-bottom: 16px; font-size: 11px; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
        th { background: #f5f3f4; text-align: left; padding: 6px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #5a5f63; border-bottom: 1px solid #e3e2e3; }
        td { padding: 5px 8px; border-bottom: 1px solid #f0efef; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 9px; font-weight: 600; }
        .badge-t { background: #fef3c7; color: #92400e; }
        .badge-c { background: #dbeafe; color: #1e40af; }
        .badge-i { background: #d1fae5; color: #065f46; }
        .budget-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .budget-card { padding: 12px; border: 1px solid #e3e2e3; border-radius: 6px; text-align: center; }
        .budget-card.recommended { border-color: #094cb2; background: #f0f4ff; }
        .budget-amount { font-size: 18px; font-weight: 700; color: #1b1c1d; }
        .no-print-btn { position: fixed; top: 16px; right: 16px; background: #094cb2; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
        @media print {
          .no-print-btn { display: none; }
          body { font-size: 10px; }
          .page { padding: 20px; }
        }
        @page { margin: 1cm; }
      `}</style>

      {/* Full-screen overlay that breaks out of the sidebar layout */}
      <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 9999, overflowY: 'auto' }}>
      <button className="no-print-btn" onClick={() => window.print()}>Print / Save PDF</button>

      <div className="page">
        {/* Header */}
        <div className="header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1>PPC Research Report</h1>
              <h2 style={{ fontSize: '18px', fontWeight: 400, marginTop: '4px', color: '#1b1c1d' }}>{client.name}</h2>
            </div>
            <div style={{ textAlign: 'right', fontSize: '10px', color: '#5a5f63' }}>
              <p>CONFIDENTIAL</p>
              <p>Generated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div className="header-meta">
            <span>Website: {client.website}</span>
            <span>Industry: {client.industry}</span>
            <span>Service Areas: {(client.service_areas || []).join(', ')}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="stats">
          {[
            { label: 'Total Keywords', value: allKw.length },
            { label: 'Transactional', value: allKw.filter(k => k.intent === 'transactional').length },
            { label: 'Avg CPC', value: `$${avgCpc}` },
            { label: 'Opportunities', value: opps.length },
          ].map(s => (
            <div key={s.label} className="stat">
              <div className="stat-val">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Executive Summary */}
        {client.low_hanging_fruit?.executive_summary && (
          <div className="section">
            <h3 className="section-title">I. Executive Summary</h3>
            <div className="summary-box">{client.low_hanging_fruit.executive_summary}</div>
          </div>
        )}

        {/* Budget */}
        {client.keyword_data?.estimated_monthly_budget_range && (
          <div className="section">
            <h3 className="section-title">II. Budget Recommendations</h3>
            <div className="budget-grid">
              {['conservative', 'balanced', 'aggressive'].map(l => (
                <div key={l} className={`budget-card ${l === 'balanced' ? 'recommended' : ''}`}>
                  <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5a5f63', marginBottom: '4px' }}>{l}</p>
                  <p className="budget-amount">${(client.keyword_data.estimated_monthly_budget_range[l] || 0).toLocaleString()}</p>
                  <p style={{ fontSize: '9px', color: '#5a5f63' }}>/month</p>
                  {l === 'balanced' && <p style={{ fontSize: '9px', color: '#094cb2', fontWeight: 600, marginTop: '4px' }}>★ Recommended</p>}
                </div>
              ))}
            </div>
            {client.keyword_data.budget_assumptions && (
              <p style={{ marginTop: '12px', fontSize: '10px', color: '#5a5f63', fontStyle: 'italic' }}>
                <strong>Assumptions:</strong> {client.keyword_data.budget_assumptions}
              </p>
            )}
          </div>
        )}

        {/* Top opportunities */}
        {opps.length > 0 && (
          <div className="section">
            <h3 className="section-title">III. Low-Hanging Fruit Opportunities</h3>
            <table>
              <thead>
                <tr>
                  <th>Score</th>
                  <th>Keyword</th>
                  <th>Intent</th>
                  <th>Mo. Searches</th>
                  <th>Est. CPC</th>
                  <th>Competition</th>
                  <th>Why It Matters</th>
                </tr>
              </thead>
              <tbody>
                {opps.sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0)).map((opp, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700, color: '#6d5e00' }}>{opp.opportunity_score}</td>
                    <td style={{ fontWeight: 600 }}>{opp.keyword}</td>
                    <td>
                      <span className={`badge ${opp.intent === 'transactional' ? 'badge-t' : opp.intent === 'commercial' ? 'badge-c' : 'badge-i'}`}>
                        {opp.intent}
                      </span>
                    </td>
                    <td>{(opp.estimated_monthly_searches || 0).toLocaleString()}</td>
                    <td style={{ fontWeight: 600 }}>${(opp.estimated_cpc || 0).toFixed(2)}</td>
                    <td>{opp.competition}</td>
                    <td style={{ maxWidth: '200px', color: '#434653' }}>{opp.why_its_gold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Keywords by ad group */}
        {client.keyword_data?.keyword_groups?.length > 0 && (
          <div className="section">
            <h3 className="section-title">IV. Keyword Research by Ad Group</h3>
            {client.keyword_data.keyword_groups.map((group, gi) => (
              <div key={gi} style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#094cb2' }}>
                  {group.theme} <span style={{ fontWeight: 400, color: '#5a5f63', fontSize: '10px' }}>({group.keywords?.length || 0} keywords)</span>
                </h4>
                <table>
                  <thead>
                    <tr><th>Keyword</th><th>Intent</th><th>Mo. Searches</th><th>Est. CPC</th><th>Competition</th><th>Priority</th></tr>
                  </thead>
                  <tbody>
                    {(group.keywords || []).map((kw, ki) => (
                      <tr key={ki}>
                        <td style={{ fontWeight: 600 }}>{kw.keyword}</td>
                        <td><span className={`badge ${kw.intent === 'transactional' ? 'badge-t' : kw.intent === 'commercial' ? 'badge-c' : 'badge-i'}`}>{kw.intent}</span></td>
                        <td>{(kw.estimated_monthly_searches || 0).toLocaleString()}</td>
                        <td style={{ fontWeight: 600 }}>${(kw.estimated_cpc || 0).toFixed(2)}</td>
                        <td>{kw.competition}</td>
                        <td>{kw.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Competitors */}
        {client.competitor_data?.competitors?.length > 0 && (
          <div className="section">
            <h3 className="section-title">V. Competitor Analysis</h3>
            <table>
              <thead>
                <tr><th>Competitor</th><th>Est. Ad Spend</th><th>Threat Level</th><th>Services Advertised</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {client.competitor_data.competitors.map((comp, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{comp.name}</td>
                    <td>{comp.estimated_ad_spend}</td>
                    <td>{comp.threat_level}</td>
                    <td>{(comp.services_advertised || []).join(', ')}</td>
                    <td style={{ color: '#5a5f63' }}>{comp.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e3e2e3', paddingTop: '12px', marginTop: '32px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#5a5f63' }}>
          <span>PPC Recon — Google Ads Intelligence</span>
          <span>Powered by Gemini AI · {client.name}</span>
        </div>
      </div>
      </div>{/* end full-screen overlay */}
    </>
  );
}
