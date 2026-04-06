'use client';

import { useEffect, useState, useCallback } from 'react';

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

function AgentCard({ agent, lastRun, onRun, running, disabled }) {
  const status = running ? 'running' : (lastRun?.status ?? 'idle');
  const actionsCount = lastRun?.actions_taken ?? null;

  return (
    <div className="card p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="material-symbols-outlined text-primary text-[22px] shrink-0">
            {agent.icon}
          </span>
          <p className="font-headline font-bold text-on-surface text-base leading-tight truncate">
            {agent.name}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Last run */}
      <div className="flex items-center gap-1.5 text-xs text-secondary">
        <span className="material-symbols-outlined text-[14px]">schedule</span>
        <span>Last run: {relativeTime(lastRun?.created_at)}</span>
      </div>

      {/* Actions taken */}
      {actionsCount != null && (
        <div className="flex items-center gap-1.5 text-xs text-secondary">
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          <span>{actionsCount} action{actionsCount !== 1 ? 's' : ''} taken</span>
        </div>
      )}

      {/* Run Now button */}
      <button
        onClick={onRun}
        disabled={running || disabled}
        className="pill-btn-primary justify-center text-sm mt-auto disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {running ? (
          <>
            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
            Running…
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
            Run Now
          </>
        )}
      </button>
    </div>
  );
}


export default function AgentsPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [recentRuns, setRecentRuns] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(false);
  // { [agentType]: { running: bool, lastRun: action | null } }
  const [agentState, setAgentState] = useState(
    Object.fromEntries(AGENT_CONFIG.map(a => [a.type, { running: false, lastRun: null }]))
  );
  const [runError, setRunError] = useState(null);

  // Load accounts on mount
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/accounts', { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setAccounts(list);
        if (list.length) setSelectedAccountId(list[0].id);
      })
      .catch(err => { if (err.name !== 'AbortError') console.error(err); })
      .finally(() => setLoadingAccounts(false));
    return () => controller.abort();
  }, []);

  // Load recent runs when account changes
  const loadRecentRuns = useCallback(async (accountId) => {
    if (!accountId) return;
    setLoadingRuns(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/actions?limit=20`);
      const data = await res.json();
      const runs = Array.isArray(data) ? data : [];
      setRecentRuns(runs);

      // Update lastRun per agent type from most recent action
      setAgentState(prev => {
        const next = { ...prev };
        for (const agent of AGENT_CONFIG) {
          const lastForType = runs.find(r => r.agent_type === agent.type);
          next[agent.type] = { ...next[agent.type], lastRun: lastForType ?? null };
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to load recent runs:', err);
    } finally {
      setLoadingRuns(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAccountId) loadRecentRuns(selectedAccountId);
  }, [selectedAccountId, loadRecentRuns]);

  const handleRunAgent = async (agentType) => {
    const accountId = selectedAccountId; // capture before any async state changes
    if (!accountId) return;
    setRunError(null);
    setAgentState(prev => ({
      ...prev,
      [agentType]: { ...prev[agentType], running: true },
    }));

    try {
      const res = await fetch(`/api/agents/${agentType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Agent ${agentType} failed`);
      }
    } catch (err) {
      console.error(`Agent ${agentType} error:`, err);
      setRunError(`${agentType}: ${err.message}`);
    } finally {
      setAgentState(prev => ({
        ...prev,
        [agentType]: { ...prev[agentType], running: false },
      }));
      // Refresh runs list (use captured accountId, not current state)
      await loadRecentRuns(accountId);
    }
  };

  const anyRunning = Object.values(agentState).some(s => s.running);

  return (
    <div className="px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-1">
          Agent Dashboard
        </h2>
        <p className="text-secondary text-sm">Monitor and control your AI optimization agents</p>
      </div>

      {/* Account selector */}
      <div className="card p-4 mb-6 flex items-center gap-4">
        <span className="material-symbols-outlined text-primary text-[20px] shrink-0">account_tree</span>
        <div className="flex-1 min-w-0">
          <label className="field-label">Active Account</label>
          {loadingAccounts ? (
            <div className="h-8 w-48 bg-outline-variant/10 rounded animate-pulse" />
          ) : accounts.length === 0 ? (
            <p className="text-sm text-secondary">No accounts connected</p>
          ) : (
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="field-input max-w-xs"
            >
              <option value="" disabled>Select an account to run agents</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name || 'Unnamed Account'}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Error banner */}
      {runError && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <span className="material-symbols-outlined text-[16px]">error</span>
          <span>{runError}</span>
          <button
            onClick={() => setRunError(null)}
            className="ml-auto material-symbols-outlined text-[16px] hover:opacity-70"
          >
            close
          </button>
        </div>
      )}

      {/* Agent cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {AGENT_CONFIG.map(agent => (
          <AgentCard
            key={agent.type}
            agent={agent}
            lastRun={agentState[agent.type]?.lastRun}
            running={agentState[agent.type]?.running}
            disabled={!selectedAccountId || anyRunning}
            onRun={() => handleRunAgent(agent.type)}
          />
        ))}
      </div>

      {/* Recent runs */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">history</span>
            <h3 className="font-headline font-bold text-on-surface text-base">Recent Runs</h3>
          </div>
          {loadingRuns && (
            <span className="material-symbols-outlined text-secondary text-[18px] animate-spin">
              progress_activity
            </span>
          )}
        </div>

        {!selectedAccountId ? (
          <div className="px-5 py-10 text-center text-secondary text-sm">
            Select an account to view recent runs
          </div>
        ) : loadingRuns && recentRuns.length === 0 ? (
          <div className="divide-y divide-outline-variant/10">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3 animate-pulse">
                <div className="h-4 w-28 bg-outline-variant/10 rounded" />
                <div className="h-4 w-16 bg-outline-variant/10 rounded" />
                <div className="ml-auto h-4 w-20 bg-outline-variant/10 rounded" />
              </div>
            ))}
          </div>
        ) : recentRuns.length === 0 ? (
          <div className="px-5 py-10 text-center text-secondary text-sm">
            No agent runs recorded yet for this account
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Trigger</th>
                <th>Description</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map(run => {
                const agentConf = AGENT_CONFIG.find(a => a.type === run.agent_type);
                return (
                  <tr key={run.id}>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {agentConf && (
                          <span className="material-symbols-outlined text-primary text-[14px]">
                            {agentConf.icon}
                          </span>
                        )}
                        <span className="font-label font-semibold text-on-surface capitalize">
                          {agentConf?.name ?? run.agent_type}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-secondary capitalize">{run.action_type ?? '—'}</span>
                    </td>
                    <td>
                      <span className="text-xs text-secondary line-clamp-1 max-w-xs">
                        {run.description ?? '—'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={run.status} />
                    </td>
                    <td>
                      <span className="text-xs text-secondary whitespace-nowrap">
                        {relativeTime(run.created_at)}
                      </span>
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
