'use client';

import { useEffect, useRef, useState } from 'react';

// Relative time helper
function relativeTime(isoString) {
  if (!isoString) return 'Never';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''} ago`;
}

const AGENT_CONFIG = [
  { type: 'audit',    icon: 'security',              name: 'Account Audit' },
  { type: 'keyword',  icon: 'key',                   name: 'Keyword Optimizer' },
  { type: 'bid',      icon: 'trending_up',            name: 'Bid Manager' },
  { type: 'budget',   icon: 'account_balance_wallet', name: 'Budget Allocator' },
  { type: 'ad_copy',  icon: 'edit_note',              name: 'Ad Copy Optimizer' },
  { type: 'negative', icon: 'block',                  name: 'Negative Keywords' },
];

const STATUS_STYLES = {
  running:   'bg-amber-50 text-amber-600',
  completed: 'bg-emerald-50 text-emerald-600',
  failed:    'bg-red-50 text-red-600',
  idle:      'bg-slate-100 text-slate-500',
};

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || STATUS_STYLES.idle;
  return (
    <span className={`text-[10px] font-label font-bold px-2.5 py-1 rounded-full capitalize ${cls}`}>
      {status || 'idle'}
    </span>
  );
}

export default function AgentsPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [recentRuns, setRecentRuns] = useState([]);  // cross-account
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [agentState, setAgentState] = useState(
    Object.fromEntries(AGENT_CONFIG.map(a => [a.type, { running: false, lastRun: null, totalActions: 0, successRate: null }]))
  );
  const [agentEnabled, setAgentEnabled] = useState(
    Object.fromEntries(AGENT_CONFIG.map(a => [a.type, true]))
  );
  const [runError, setRunError] = useState(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // Load accounts + cross-account runs on mount
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch('/api/accounts', { signal: controller.signal }).then(r => r.json()).catch(() => []),
      fetch('/api/agents/runs?limit=20', { signal: controller.signal }).then(r => r.json()).catch(() => []),
    ]).then(([accountsList, runs]) => {
      const list = Array.isArray(accountsList) ? accountsList : [];
      setAccounts(list);
      if (list.length) setSelectedAccountId(list[0].id);
      const runList = Array.isArray(runs) ? runs : [];
      setRecentRuns(runList);

      // Derive global enabled state from accounts — disabled if any account explicitly disables it
      setAgentEnabled(() => {
        const next = {};
        for (const agent of AGENT_CONFIG) {
          next[agent.type] = list.every(acc =>
            acc.settings?.agents?.[agent.type] !== false
          );
        }
        return next;
      });

      // Compute per-agent stats from cross-account runs
      setAgentState(prev => {
        const next = { ...prev };
        for (const agent of AGENT_CONFIG) {
          const agentRuns = runList.filter(r => r.agent_type === agent.type || r.type === agent.type);
          const lastRun = agentRuns[0] ?? null;
          const totalActions = agentRuns.reduce((s, r) => s + (r.actions_taken ?? 0), 0);
          const completed = agentRuns.filter(r => r.status === 'completed').length;
          const successRate = agentRuns.length > 0 ? Math.round((completed / agentRuns.length) * 100) : null;
          next[agent.type] = { ...next[agent.type], lastRun, totalActions, successRate };
        }
        return next;
      });
    }).catch(() => {}).finally(() => setLoadingAccounts(false));
    return () => controller.abort();
  }, []);

  const handleRunAgent = async (agentType) => {
    if (!selectedAccountId) { setRunError('Select an account first'); return; }
    setRunError(null);
    setAgentState(prev => ({ ...prev, [agentType]: { ...prev[agentType], running: true } }));
    try {
      const res = await fetch(`/api/agents/${agentType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId }),
      });
      const result = await res.json();
      const accountName = accounts.find(a => a.id === selectedAccountId)?.name || selectedAccountId;
      const newRun = {
        agent_type: agentType,
        status: result.success ? 'completed' : 'failed',
        created_at: new Date().toISOString(),
        actions_taken: result.actionsCount ?? 0,
        accounts: { name: accountName },
      };
      if (!isMountedRef.current) return;
      setRecentRuns(prev => [newRun, ...prev.slice(0, 19)]);
      setAgentState(prev => ({
        ...prev,
        [agentType]: {
          ...prev[agentType],
          running: false,
          lastRun: newRun,
          totalActions: (prev[agentType].totalActions || 0) + (newRun.actions_taken || 0),
        },
      }));
    } catch (err) {
      if (!isMountedRef.current) return;
      setRunError(`${agentType} agent failed: ${err.message}`);
      setAgentState(prev => ({ ...prev, [agentType]: { ...prev[agentType], running: false } }));
    }
  };

  const handleGlobalToggle = async (agentType, enabled) => {
    setAgentEnabled(prev => ({ ...prev, [agentType]: enabled }));
    await Promise.allSettled(accounts.map(acc =>
      fetch(`/api/accounts/${acc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { agents: { [agentType]: enabled } } }),
      })
    ));
  };

  const anyRunning = Object.values(agentState).some(s => s.running);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">Agent Dashboard</h1>
          <p className="text-sm text-secondary font-label mt-1">AI agents running across all connected accounts</p>
        </div>
        <div className="flex items-center gap-3">
          {loadingAccounts ? (
            <div className="h-9 w-48 bg-surface-high rounded-lg animate-pulse" />
          ) : (
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="field-input w-48 py-2"
            >
              {accounts.length === 0 && <option value="">No accounts connected</option>}
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name || a.customer_id}</option>)}
            </select>
          )}
        </div>
      </div>

      {runError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-label">{runError}</div>
      )}

      {/* Agent cards grid — 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {AGENT_CONFIG.map(agent => {
          const state = agentState[agent.type];
          return (
            <div key={agent.type} className="card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[22px]">{agent.icon}</span>
                  <p className="font-headline font-bold text-on-surface text-sm">{agent.name}</p>
                </div>
                <StatusBadge status={state.running ? 'running' : (state.lastRun?.status ?? 'idle')} />
              </div>
              <div className="space-y-1 text-xs text-secondary font-label">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                  Last run: {relativeTime(state.lastRun?.created_at)}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px]">check_circle</span>
                  {state.totalActions || 0} total actions
                </div>
                {state.successRate !== null && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px]">percent</span>
                    {state.successRate}% success rate
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <button
                  onClick={() => handleRunAgent(agent.type)}
                  disabled={state.running || anyRunning || !selectedAccountId}
                  className="flex-1 pill-btn-primary justify-center text-xs disabled:opacity-50"
                >
                  {state.running ? (
                    <><span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span> Running…</>
                  ) : (
                    <><span className="material-symbols-outlined text-[14px]">play_arrow</span> Run Now</>
                  )}
                </button>
                <button
                  onClick={() => handleGlobalToggle(agent.type, !agentEnabled[agent.type])}
                  title={agentEnabled[agent.type] ? 'Disable globally' : 'Enable globally'}
                  className={`p-2 rounded-lg transition-colors ${
                    agentEnabled[agent.type]
                      ? 'text-secondary hover:bg-surface-high hover:text-red-600'
                      : 'text-red-500 bg-red-50 hover:bg-red-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {agentEnabled[agent.type] ? 'pause_circle' : 'play_circle'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent runs timeline — cross-account */}
      <div>
        <h2 className="text-sm font-headline font-bold text-on-surface mb-3">Recent Runs — All Accounts</h2>
        {loadingAccounts ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-surface-high rounded-xl animate-pulse" />)}
          </div>
        ) : recentRuns.length === 0 ? (
          <div className="card p-6 text-center text-sm text-secondary font-label">No agent runs yet</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Agent</th>
                  <th>Actions</th>
                  <th>Status</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run, i) => (
                  <tr key={run.id || i}>
                    <td className="font-medium text-on-surface">{run.accounts?.name || run.account_name || '—'}</td>
                    <td><span className="capitalize text-secondary font-label">{run.agent_type || run.type}</span></td>
                    <td>{run.actions_taken ?? '—'}</td>
                    <td><StatusBadge status={run.status} /></td>
                    <td className="text-secondary font-label text-xs">{relativeTime(run.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
