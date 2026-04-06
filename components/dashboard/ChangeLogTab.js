'use client';

import { useState } from 'react';

const AGENT_TYPES = ['All', 'bid', 'budget', 'keyword', 'ad_copy', 'negative'];

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

export default function ChangeLogTab({ actions, accountId, onUndo }) {
  const [filterType, setFilterType] = useState('All');
  const [undoing, setUndoing] = useState(null);

  const filtered = (actions || []).filter(a => filterType === 'All' || a.agent_type === filterType);

  const handleUndo = async (action) => {
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
        {AGENT_TYPES.map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`text-xs font-label font-semibold px-3 py-1.5 rounded-lg transition-colors capitalize ${filterType === t ? 'bg-primary text-white' : 'text-secondary hover:bg-surface-high'}`}>
            {t}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-secondary font-label">No agent actions yet</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(action => (
            <div key={action.id} className="card p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">smart_toy</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-label font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 capitalize">{action.agent_type}</span>
                  <span className="text-[10px] text-secondary font-label">{relativeTime(action.created_at)}</span>
                </div>
                <p className="text-sm text-on-surface font-label">{action.description}</p>
                {action.before_value !== undefined && action.after_value !== undefined && (
                  <p className="text-xs text-secondary font-label mt-0.5">
                    {JSON.stringify(action.before_value)} → {JSON.stringify(action.after_value)}
                  </p>
                )}
              </div>
              {action.reversible !== false && (
                <button onClick={() => handleUndo(action)} disabled={undoing === action.id}
                  className="text-xs font-label text-secondary hover:text-red-600 transition-colors border border-outline-variant/30 px-2.5 py-1 rounded shrink-0 disabled:opacity-50">
                  {undoing === action.id ? '…' : 'Undo'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
