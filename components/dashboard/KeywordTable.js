'use client';

import { useState } from 'react';

const fmtCost = (v) => '$' + (v || 0).toFixed(2);
const FILTERS = ['All', 'Active', 'Paused', 'Agent Flagged'];

export default function KeywordTable({ keywords, accountId, agentSuggestions = [], onRefresh }) {
  const [filter, setFilter] = useState('All');
  const [editingBid, setEditingBid] = useState(null);
  const [bidDraft, setBidDraft] = useState('');

  const flaggedKeywords = new Set(agentSuggestions.map(s => s.keyword));

  const filtered = (keywords || []).filter(kw => {
    if (filter === 'Active') return kw.status?.toLowerCase() === 'enabled';
    if (filter === 'Paused') return kw.status?.toLowerCase() === 'paused';
    if (filter === 'Agent Flagged') return flaggedKeywords.has(kw.keyword_text);
    return true;
  });

  const saveInlineBid = async (kw) => {
    const newBid = parseFloat(bidDraft);
    if (isNaN(newBid) || newBid <= 0) { setEditingBid(null); return; }
    try {
      await fetch(`/api/accounts/${accountId}/keywords`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywordId: kw.id, cpcBidMicros: Math.round(newBid * 1_000_000) }),
      });
      onRefresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setEditingBid(null);
    }
  };

  const togglePause = async (kw) => {
    const newStatus = kw.status?.toLowerCase() === 'enabled' ? 'PAUSED' : 'ENABLED';
    try {
      await fetch(`/api/accounts/${accountId}/keywords`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywordId: kw.id, status: newStatus }),
      });
      onRefresh?.();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs font-label font-semibold px-3 py-1.5 rounded-lg transition-colors ${filter === f ? 'bg-primary text-white' : 'text-secondary hover:bg-surface-high'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-secondary font-label">No keywords match this filter</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Match</th>
                <th>Ad Group</th>
                <th>Impressions</th>
                <th>Clicks</th>
                <th>CPC</th>
                <th>Cost</th>
                <th>Conv.</th>
                <th>QS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(kw => {
                const suggestion = agentSuggestions.find(s => s.keyword === kw.keyword_text);
                return (
                  <tr key={kw.id}>
                    <td>
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-on-surface">{kw.keyword_text}</span>
                        {suggestion && (
                          <span className="text-[10px] font-label font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 shrink-0">
                            AI: {suggestion.suggestion}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="capitalize text-secondary">{kw.match_type?.toLowerCase()}</td>
                    <td className="max-w-[140px] truncate text-secondary">{kw.ad_group_name}</td>
                    <td>{(kw.impressions || 0).toLocaleString()}</td>
                    <td>{(kw.clicks || 0).toLocaleString()}</td>
                    <td>
                      {editingBid === kw.id ? (
                        <span className="flex items-center gap-1">
                          <input type="number" value={bidDraft} onChange={e => setBidDraft(e.target.value)}
                            className="w-16 px-1.5 py-0.5 text-xs border border-primary rounded focus:outline-none" autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') saveInlineBid(kw); if (e.key === 'Escape') setEditingBid(null); }} />
                          <button onClick={() => saveInlineBid(kw)} className="text-xs text-primary hover:underline font-label">Save</button>
                        </span>
                      ) : (
                        <button onClick={() => { setEditingBid(kw.id); setBidDraft(kw.cpc_bid_micros ? (kw.cpc_bid_micros / 1e6).toFixed(2) : ''); }}
                          className="text-xs text-secondary hover:text-primary font-label transition-colors">
                          {kw.cpc_bid_micros ? `$${(kw.cpc_bid_micros / 1e6).toFixed(2)}` : '—'}
                        </button>
                      )}
                    </td>
                    <td>{fmtCost(kw.cost)}</td>
                    <td>{kw.conversions || 0}</td>
                    <td>{kw.quality_score ?? '—'}</td>
                    <td>
                      <button onClick={() => togglePause(kw)}
                        className="text-[10px] font-label font-semibold px-2 py-1 rounded border border-outline-variant/30 text-secondary hover:border-primary hover:text-primary transition-colors">
                        {kw.status?.toLowerCase() === 'enabled' ? 'Pause' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
