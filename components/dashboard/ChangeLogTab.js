'use client';

import { useState, useEffect } from 'react';

const FILTER_TYPES = ['All', 'Agent', 'External', 'bid', 'budget', 'keyword', 'ad_copy', 'negative'];

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function describeChange(change) {
  const op = change.resourceChangeOperation;
  const type = change.changeResourceType?.replace(/_/g, ' ').toLowerCase();
  const campaign = change.campaign?.name || 'Unknown Campaign';

  if (op === 'CREATE') return `Added new ${type} in ${campaign}`;
  if (op === 'REMOVE') return `Removed ${type} in ${campaign}`;

  const fields = change.changedFields || '';
  if (fields.includes('budget')) return `Changed budget in ${campaign}`;
  if (fields.includes('bid')) return `Changed bid modifier in ${campaign}`;
  if (fields.includes('status')) return `Changed status in ${campaign}`;
  return `Updated ${type} in ${campaign}`;
}

export default function ChangeLogTab({ actions, accountId, onUndo, changeHistory }) {
  const [filterType, setFilterType] = useState('All');
  const [undoing, setUndoing] = useState(null);

  // Merge agent actions and external change history into a unified timeline
  const agentEntries = (actions || []).map(a => ({
    ...a,
    source: 'agent',
    sortTime: new Date(a.created_at).getTime(),
  }));

  const externalEntries = (changeHistory || []).map(c => ({
    id: c.changeResourceName + c.changeDateTime,
    source: 'external',
    agent_type: 'external',
    description: describeChange(c),
    userEmail: c.userEmail,
    created_at: c.changeDateTime,
    sortTime: new Date(c.changeDateTime).getTime(),
    changeDetail: c,
  }));

  const allEntries = [...agentEntries, ...externalEntries]
    .sort((a, b) => b.sortTime - a.sortTime);

  const filtered = allEntries.filter(a => {
    if (filterType === 'All') return true;
    if (filterType === 'Agent') return a.source === 'agent';
    if (filterType === 'External') return a.source === 'external';
    return a.agent_type === filterType;
  });

  const handleUndo = async (action) => {
    if (action.source !== 'agent') return;
    setUndoing(action.id);
    try {
      await fetch(`/api/accounts/${accountId}/actions/${action.id}/undo`, { method: 'POST' });
      onUndo?.();
    } catch (e) {
      console.error('Undo failed:', e);
    } finally {
      setUndoing(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {FILTER_TYPES.map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`text-xs font-label font-semibold px-3 py-1.5 rounded-lg transition-colors capitalize ${filterType === t ? 'bg-primary text-white' : 'text-secondary hover:bg-surface-high'}`}>
            {t}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-secondary font-label">No changes recorded</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => (
            <div key={entry.id} className="card p-4 flex items-start gap-3">
              <span className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${entry.source === 'external' ? 'text-tertiary' : 'text-primary'}`}>
                {entry.source === 'external' ? 'sync_alt' : 'smart_toy'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {entry.source === 'external' ? (
                    <span className="text-[10px] font-label font-bold px-2 py-0.5 rounded-full bg-tertiary/20 text-tertiary">
                      EXTERNAL
                    </span>
                  ) : (
                    <span className="text-[10px] font-label font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 capitalize">
                      {entry.agent_type}
                    </span>
                  )}
                  <span className="text-[10px] text-secondary font-label">{relativeTime(entry.created_at)}</span>
                  {entry.userEmail && (
                    <span className="text-[10px] text-on-surface-variant font-label">{entry.userEmail}</span>
                  )}
                </div>
                <p className="text-sm text-on-surface font-label">{entry.description}</p>
                {entry.source === 'agent' && entry.before_value !== undefined && entry.after_value !== undefined && (
                  <p className="text-xs text-secondary font-label mt-0.5">
                    {JSON.stringify(entry.before_value)} → {JSON.stringify(entry.after_value)}
                  </p>
                )}
              </div>
              {entry.source === 'agent' && entry.reversible !== false && (
                <button onClick={() => handleUndo(entry)} disabled={undoing === entry.id}
                  className="text-xs font-label text-secondary hover:text-red-600 transition-colors border border-outline-variant/30 px-2.5 py-1 rounded shrink-0 disabled:opacity-50">
                  {undoing === entry.id ? '...' : 'Undo'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
