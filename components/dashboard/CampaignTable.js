'use client';

import { useState } from 'react';

const fmtCost = (v) => '$' + (v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

function StatusBadge({ status }) {
  const cls = {
    enabled: 'bg-emerald-50 text-emerald-600',
    paused: 'bg-slate-100 text-slate-500',
  }[status?.toLowerCase()] || 'bg-amber-50 text-amber-600';
  return <span className={`text-[10px] font-label font-bold px-2 py-0.5 rounded-full capitalize ${cls}`}>{status || '—'}</span>;
}

export default function CampaignTable({ campaigns, accountId, onRefresh }) {
  const [sortKey, setSortKey] = useState('cpl');
  const [sortDir, setSortDir] = useState('asc');
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetDraft, setBudgetDraft] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  if (!campaigns?.length) {
    return (
      <div className="card p-8 text-center text-sm text-secondary font-label">
        No campaign data yet — click Sync to pull from Google Ads
      </div>
    );
  }

  const avgCpl = (() => {
    const withCpl = campaigns.filter(c => c.conversions > 0);
    if (!withCpl.length) return null;
    const totalCost = withCpl.reduce((s, c) => s + (c.cost || 0), 0);
    const totalConv = withCpl.reduce((s, c) => s + (c.conversions || 0), 0);
    return totalConv > 0 ? totalCost / totalConv : null;
  })();

  const sorted = [...campaigns].sort((a, b) => {
    const getCpl = (c) => c.conversions > 0 ? c.cost / c.conversions : Infinity;
    const getVal = (c) => {
      if (sortKey === 'cpl') return getCpl(c);
      return c[sortKey] ?? 0;
    };
    const diff = getVal(a) - getVal(b);
    return sortDir === 'asc' ? diff : -diff;
  });

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) => (
    <span className="material-symbols-outlined text-[12px] ml-0.5">
      {sortKey === col ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
    </span>
  );

  const saveInlineBudget = async (campaign) => {
    const newBudget = parseFloat(budgetDraft);
    if (isNaN(newBudget) || newBudget <= 0) { setEditingBudget(null); return; }
    setSavingBudget(true);
    try {
      await fetch(`/api/accounts/${accountId}/campaigns`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, dailyBudget: newBudget }),
      });
      onRefresh?.();
    } catch (e) {
      console.error('Budget save failed:', e);
    } finally {
      setSavingBudget(false);
      setEditingBudget(null);
    }
  };

  const togglePause = async (campaign) => {
    const newStatus = campaign.status?.toLowerCase() === 'enabled' ? 'PAUSED' : 'ENABLED';
    try {
      await fetch(`/api/accounts/${accountId}/campaigns`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, status: newStatus }),
      });
      onRefresh?.();
    } catch (e) {
      console.error('Status toggle failed:', e);
    }
  };

  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th className="cursor-pointer select-none" onClick={() => toggleSort('cost')}>Spend<SortIcon col="cost" /></th>
            <th className="cursor-pointer select-none" onClick={() => toggleSort('clicks')}>Clicks<SortIcon col="clicks" /></th>
            <th className="cursor-pointer select-none" onClick={() => toggleSort('conversions')}>Conv.<SortIcon col="conversions" /></th>
            <th className="cursor-pointer select-none" onClick={() => toggleSort('cpl')}>CPL<SortIcon col="cpl" /></th>
            <th className="cursor-pointer select-none" onClick={() => toggleSort('daily_budget')}>Daily Budget<SortIcon col="daily_budget" /></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(c => {
            const cpl = c.conversions > 0 ? c.cost / c.conversions : null;
            const highCpl = avgCpl && cpl && cpl > avgCpl * 1.5;
            return (
              <tr key={c.id}>
                <td className="font-medium text-on-surface max-w-[220px] truncate">{c.name}</td>
                <td><StatusBadge status={c.status} /></td>
                <td>{fmtCost(c.cost)}</td>
                <td>{(c.clicks || 0).toLocaleString()}</td>
                <td>{c.conversions || 0}</td>
                <td>
                  {cpl ? (
                    <span className="flex items-center gap-1">
                      {fmtCost(cpl)}
                      {highCpl && (
                        <span className="text-[10px] font-label font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600">HIGH</span>
                      )}
                    </span>
                  ) : '—'}
                </td>
                <td>
                  {editingBudget === c.id ? (
                    <span className="flex items-center gap-1">
                      <input
                        type="number"
                        value={budgetDraft}
                        onChange={e => setBudgetDraft(e.target.value)}
                        className="w-20 px-2 py-1 text-xs border border-primary rounded focus:outline-none"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') saveInlineBudget(c); if (e.key === 'Escape') setEditingBudget(null); }}
                      />
                      <button onClick={() => saveInlineBudget(c)} disabled={savingBudget} className="text-xs text-primary hover:underline font-label">Save</button>
                    </span>
                  ) : (
                    <button onClick={() => { setEditingBudget(c.id); setBudgetDraft(c.daily_budget || ''); }} className="text-xs text-secondary hover:text-primary font-label transition-colors">
                      {c.daily_budget ? fmtCost(c.daily_budget) + '/day' : '—'}
                    </button>
                  )}
                </td>
                <td>
                  <button
                    onClick={() => togglePause(c)}
                    className="text-[10px] font-label font-semibold px-2 py-1 rounded border border-outline-variant/30 text-secondary hover:border-primary hover:text-primary transition-colors"
                  >
                    {c.status?.toLowerCase() === 'enabled' ? 'Pause' : 'Enable'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
