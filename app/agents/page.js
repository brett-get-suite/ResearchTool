'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAccounts } from '@/lib/supabase';
import { AGENT_TYPES, AGENT_TYPE_KEYS, getDefaultScheduleConfig } from '@/lib/agent-config';
import GradientButton from '@/components/ui/GradientButton';
import GhostButton from '@/components/ui/GhostButton';
import Skeleton from '@/components/ui/Skeleton';
import { formatCurrency, formatNumber, calcDelta, DATE_PRESETS } from '@/lib/dashboard-utils';
import TimeComparison from '@/components/mission-control/TimeComparison';

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */

function relativeTime(iso) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_CFG = {
  running: { dot: 'bg-primary', text: 'text-primary', label: 'Running', pulse: true },
  active:  { dot: 'bg-secondary', text: 'text-secondary', label: 'Active', pulse: false },
  idle:    { dot: 'bg-on-surface-variant/40', text: 'text-on-surface-variant', label: 'Idle', pulse: false },
  paused:  { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Paused', pulse: false },
  error:   { dot: 'bg-error', text: 'text-error', label: 'Error', pulse: true },
};

const FREQ_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'on-demand', label: 'On Demand' },
];

/* ═══════════════════════════════════════════════════════════════
   Agent Card
   ═══════════════════════════════════════════════════════════════ */

function AgentCard({ type, config, run, actionCount, scheduleEnabled, onToggle, onConfigure, onRun }) {
  const status = !scheduleEnabled ? 'paused'
    : run?.status === 'running' ? 'running'
    : run?.status === 'error' ? 'error'
    : run ? 'active' : 'idle';
  const sCfg = STATUS_CFG[status];

  return (
    <div className={`bg-surface-card rounded-2xl p-6 hover:bg-surface-elevated transition-all ${
      status === 'idle' || status === 'paused' ? 'opacity-80' : ''
    }`}>
      {/* Top row: name + toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center">
            <span className={`material-symbols-outlined text-xl ${config.textColor}`}>{config.icon}</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-on-surface">{config.label}</h3>
            <span className={`ds-status-badge ${
              status === 'active' ? 'ds-status-badge--success' :
              status === 'running' ? 'ds-status-badge--info' :
              status === 'paused' ? 'ds-status-badge--warning' :
              status === 'error' ? 'ds-status-badge--error' :
              'ds-status-badge--muted'
            } mt-1`}>
              {sCfg.pulse && <span className="w-1.5 h-1.5 rounded-full bg-current pulse-dot" />}
              {sCfg.label}
            </span>
          </div>
        </div>
        <label className="ds-toggle">
          <input
            type="checkbox"
            checked={scheduleEnabled}
            onChange={() => onToggle(type)}
          />
          <div className="ds-toggle__track" />
          <div className="ds-toggle__thumb" />
        </label>
      </div>

      {/* Description */}
      <p className="text-xs text-on-surface-variant mb-4 line-clamp-1">
        {run?.summary || config.description}
      </p>

      {/* Bottom row: Run Now + schedule + settings */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onRun(type)}
          disabled={status === 'running'}
          className="ds-btn-primary !text-xs !py-2.5 flex-1 disabled:opacity-40"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>play_arrow</span>
          Run Now
        </button>
        <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">{config.defaultFrequency}</span>
        <button
          onClick={() => onConfigure(type)}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-colors"
          title="Configure agent"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>tune</span>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Agent Config Modal
   ═══════════════════════════════════════════════════════════════ */

function AgentConfigModal({ type, config, accounts, onClose, onSave }) {
  const [freq, setFreq] = useState(config?.defaultFrequency || 'weekly');
  const [enabledAccounts, setEnabledAccounts] = useState(accounts.map(a => a.id));
  const [maxBidChange, setMaxBidChange] = useState(20);
  const [maxBudgetChange, setMaxBudgetChange] = useState(15);
  const [aggressiveness, setAggressiveness] = useState('balanced');
  const [targetMetric, setTargetMetric] = useState('cpa');
  const [minSpendThreshold, setMinSpendThreshold] = useState(10);
  const [autoApply, setAutoApply] = useState(false);
  const [matchTypes, setMatchTypes] = useState({ exact: true, phrase: true, broad: false });

  if (!type) return null;
  const agentCfg = AGENT_TYPES[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container-high border border-outline-variant/30 rounded-2xl p-8 max-w-lg w-full shadow-2xl fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
            <span className={`material-symbols-outlined text-xl ${agentCfg.textColor}`}>{agentCfg.icon}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface">{agentCfg.label} Settings</h2>
            <p className="text-xs text-on-surface-variant">{agentCfg.description}</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-label-sm text-on-surface-variant block mb-2">Run Frequency</label>
            <select value={freq} onChange={e => setFreq(e.target.value)} className="w-full text-sm py-2 px-3 rounded-lg bg-surface-container border-outline-variant/20">
              {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {type === 'bid' && (
            <>
              <div>
                <label className="text-label-sm text-on-surface-variant block mb-2">Strategy Mode</label>
                <div className="flex gap-2">
                  {['conservative', 'balanced', 'aggressive'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setAggressiveness(mode)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors capitalize ${
                        aggressiveness === mode
                          ? 'bg-primary/15 border-primary/30 text-primary'
                          : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-label-sm text-on-surface-variant block mb-2">Target Metric</label>
                <select value={targetMetric} onChange={e => setTargetMetric(e.target.value)} className="w-full text-sm py-2 px-3 rounded-lg bg-surface-container border-outline-variant/20">
                  <option value="cpa">CPA (Cost Per Acquisition)</option>
                  <option value="roas">ROAS (Return On Ad Spend)</option>
                  <option value="conversions">Conversions</option>
                </select>
              </div>
              <div>
                <label className="text-label-sm text-on-surface-variant block mb-2">Max Bid Change (%)</label>
                <input type="number" value={maxBidChange} onChange={e => setMaxBidChange(+e.target.value)} className="w-full text-sm py-2 px-3 rounded-lg bg-surface-container border-outline-variant/20" min={1} max={100} />
              </div>
            </>
          )}

          {type === 'negative' && (
            <>
              <div>
                <label className="text-label-sm text-on-surface-variant block mb-2">Min Spend Threshold ($)</label>
                <input type="number" value={minSpendThreshold} onChange={e => setMinSpendThreshold(+e.target.value)} className="w-full text-sm py-2 px-3 rounded-lg bg-surface-container border-outline-variant/20" min={0} step={1} />
                <p className="text-[11px] text-on-surface-variant mt-1">Only flag keywords with spend above this amount</p>
              </div>
              <div>
                <label className="text-label-sm text-on-surface-variant block mb-2">Match Types</label>
                <div className="flex gap-3">
                  {['exact', 'phrase', 'broad'].map(mt => (
                    <label key={mt} className="flex items-center gap-1.5 text-sm text-on-surface cursor-pointer capitalize">
                      <input
                        type="checkbox"
                        checked={matchTypes[mt]}
                        onChange={() => setMatchTypes(prev => ({ ...prev, [mt]: !prev[mt] }))}
                        className="w-3.5 h-3.5 rounded accent-primary"
                      />
                      {mt}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-label-sm text-on-surface-variant block mb-2">Application Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAutoApply(false)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                      !autoApply
                        ? 'bg-primary/15 border-primary/30 text-primary'
                        : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    Suggest Only
                  </button>
                  <button
                    onClick={() => setAutoApply(true)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                      autoApply
                        ? 'bg-primary/15 border-primary/30 text-primary'
                        : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    Auto-Apply
                  </button>
                </div>
              </div>
            </>
          )}

          {type === 'budget' && (
            <>
              <div>
                <label className="text-label-sm text-on-surface-variant block mb-2">Strategy Mode</label>
                <div className="flex gap-2">
                  {['conservative', 'balanced', 'aggressive'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setAggressiveness(mode)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors capitalize ${
                        aggressiveness === mode
                          ? 'bg-primary/15 border-primary/30 text-primary'
                          : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-label-sm text-on-surface-variant block mb-2">Max Budget Change (%)</label>
                <input type="number" value={maxBudgetChange} onChange={e => setMaxBudgetChange(+e.target.value)} className="w-full text-sm py-2 px-3 rounded-lg bg-surface-container border-outline-variant/20" min={1} max={100} />
              </div>
            </>
          )}

          <div>
            <label className="text-label-sm text-on-surface-variant block mb-2">Active On Accounts</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {accounts.map(a => (
                <label key={a.id} className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabledAccounts.includes(a.id)}
                    onChange={() => setEnabledAccounts(prev =>
                      prev.includes(a.id) ? prev.filter(id => id !== a.id) : [...prev, a.id]
                    )}
                    className="w-3.5 h-3.5 rounded accent-primary"
                  />
                  {a.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <GhostButton onClick={onClose} className="flex-1 justify-center">Cancel</GhostButton>
          <GradientButton onClick={() => { onSave({ type, freq, enabledAccounts, maxBidChange, maxBudgetChange, aggressiveness, targetMetric, minSpendThreshold, autoApply, matchTypes }); onClose(); }} className="flex-1 justify-center">
            Save Settings
          </GradientButton>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Guardrails Modal
   ═══════════════════════════════════════════════════════════════ */

function GuardrailsModal({ open, onClose }) {
  const [maxBidCeiling, setMaxBidCeiling] = useState('');
  const [maxDailyBudgetChange, setMaxDailyBudgetChange] = useState(15);
  const [minQualityScore, setMinQualityScore] = useState(3);
  const [requireApprovalAbove, setRequireApprovalAbove] = useState('');
  const [maxBidChangePerAdj, setMaxBidChangePerAdj] = useState(20);
  const [portfolioSpendCeiling, setPortfolioSpendCeiling] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container-high border border-outline-variant/30 rounded-2xl p-8 max-w-lg w-full shadow-2xl fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface">
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="text-lg font-bold text-on-surface mb-1">Portfolio-wide Guardrails</h2>
        <p className="text-xs text-on-surface-variant mb-6">Safety limits that apply to all agents across all accounts</p>

        <div className="space-y-5">
          <div>
            <label className="text-label-sm text-on-surface-variant block mb-2">Max Bid Ceiling ($)</label>
            <input type="number" value={maxBidCeiling} onChange={e => setMaxBidCeiling(e.target.value)} placeholder="No limit" className="w-full text-sm py-2 px-3 rounded-lg bg-surface-container border-outline-variant/20" min={0} step={0.5} />
            <p className="text-[11px] text-on-surface-variant mt-1">Agents will never set a keyword bid above this amount</p>
          </div>
          <div>
            <label className="text-label-sm text-on-surface-variant block mb-2">Max Daily Budget Change (%)</label>
            <input type="number" value={maxDailyBudgetChange} onChange={e => setMaxDailyBudgetChange(+e.target.value)} className="w-full text-sm py-2 px-3 rounded-lg bg-surface-container border-outline-variant/20" min={1} max={100} />
          </div>
          <div>
            <label className="text-label-sm text-on-surface-variant block mb-2">Min Quality Score Before Agent Touches Keyword</label>
            <input type="number" value={minQualityScore} onChange={e => setMinQualityScore(+e.target.value)} className="w-full text-sm py-2 px-3 rounded-lg bg-surface-container border-outline-variant/20" min={1} max={10} />
          </div>
          <div>
            <label className="text-label-sm text-on-surface-variant block mb-2">Require Human Approval for Changes Above ($)</label>
            <input type="number" value={requireApprovalAbove} onChange={e => setRequireApprovalAbove(e.target.value)} placeholder="No threshold" className="w-full text-sm py-2 px-3 rounded-lg bg-surface-container border-outline-variant/20" min={0} />
          </div>
          <div>
            <label className="text-label-sm text-on-surface-variant block mb-2">Max Bid Change Per Adjustment (%)</label>
            <input type="number" value={maxBidChangePerAdj} onChange={e => setMaxBidChangePerAdj(+e.target.value)} className="w-full text-sm py-2 px-3 rounded-lg bg-surface-container border-outline-variant/20" min={1} max={100} />
            <p className="text-[11px] text-on-surface-variant mt-1">Limits how much a single bid adjustment can change a keyword bid</p>
          </div>
          <div>
            <label className="text-label-sm text-on-surface-variant block mb-2">Portfolio-wide Spend Ceiling ($)</label>
            <input type="number" value={portfolioSpendCeiling} onChange={e => setPortfolioSpendCeiling(e.target.value)} placeholder="No limit" className="w-full text-sm py-2 px-3 rounded-lg bg-surface-container border-outline-variant/20" min={0} step={1} />
            <p className="text-[11px] text-on-surface-variant mt-1">Total daily spend limit across all managed accounts</p>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <GhostButton onClick={onClose} className="flex-1 justify-center">Cancel</GhostButton>
          <GradientButton onClick={onClose} className="flex-1 justify-center">Save Guardrails</GradientButton>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Activity Log Table
   ═══════════════════════════════════════════════════════════════ */

function ActivityLog({ actions, accounts, filterAgent, onFilterAgent }) {
  const [search, setSearch] = useState('');
  const accountMap = {};
  for (const a of accounts) accountMap[a.id] = a.name;

  const filtered = useMemo(() => {
    let result = [...actions];
    if (filterAgent !== 'all') result = result.filter(a => a.agent_type === filterAgent);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        (a.description || '').toLowerCase().includes(q) ||
        (a.keyword || '').toLowerCase().includes(q) ||
        (accountMap[a.account_id] || '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [actions, filterAgent, search]);

  return (
    <div className="bg-surface-card rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between gap-3 flex-wrap">
        <h3 className="ds-section-header flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">history</span>
          Agent Activity Log
          <span className="text-xs font-normal text-on-surface-variant">({filtered.length})</span>
        </h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined text-on-surface-variant text-base absolute left-3 top-1/2 -translate-y-1/2">search</span>
            <input type="text" placeholder="Search actions..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-3 py-2 text-sm rounded-xl bg-surface-container-high border border-outline-variant/30 focus:border-primary/40 outline-none w-48" />
          </div>
          <select value={filterAgent} onChange={e => onFilterAgent(e.target.value)}
            className="text-xs py-1.5 px-2 rounded-lg bg-surface-container-high border-outline-variant/20">
            <option value="all">All Agents</option>
            {AGENT_TYPE_KEYS.map(k => <option key={k} value={k}>{AGENT_TYPES[k].label}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant/10">
              <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant w-32">Timestamp</th>
              <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant w-32">Agent</th>
              <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant w-28">Client</th>
              <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant">Action Taken</th>
              <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant w-24">Keyword</th>
              <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant w-24">Before</th>
              <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant w-24">After</th>
              <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-on-surface-variant text-sm">No activity recorded</td></tr>
            ) : (
              filtered.slice(0, 100).map((action, i) => {
                const agentCfg = AGENT_TYPES[action.agent_type] || AGENT_TYPES.audit;
                return (
                  <tr key={action.id || i} className="border-b border-outline-variant/5 hover:bg-surface-container-high transition-colors">
                    <td className="px-4 py-3 text-xs text-on-surface-variant tabular-nums">{relativeTime(action.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${agentCfg.textColor}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{agentCfg.icon}</span>
                        {agentCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant truncate max-w-[100px]">{accountMap[action.account_id] || '—'}</td>
                    <td className="px-4 py-3 text-sm text-on-surface">{action.description || 'Action taken'}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant truncate max-w-[100px]">{action.keyword || '—'}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant tabular-nums">{action.before_value || '—'}</td>
                    <td className="px-4 py-3 text-xs text-on-surface tabular-nums font-medium">{action.after_value || '—'}</td>
                    <td className="px-4 py-3">
                      {action.before_value && (
                        <button className="text-[10px] px-2 py-1 rounded-md bg-surface-container-high hover:bg-amber-400/10 text-on-surface-variant hover:text-amber-400 border border-outline-variant/10 transition-colors font-medium">
                          Undo
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Agent Schedule Visual
   ═══════════════════════════════════════════════════════════════ */

function AgentSchedule({ schedule }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const freqToDays = {
    hourly: [0,1,2,3,4,5,6], daily: [0,1,2,3,4,5,6], weekly: [0],
    biweekly: [0], 'on-demand': [],
  };

  return (
    <div className="bg-surface-card rounded-2xl p-6">
      <h3 className="ds-section-header mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-lg">calendar_month</span>
        Agent Schedule
      </h3>
      <div className="overflow-x-auto">
        <div className="grid gap-2" style={{ gridTemplateColumns: '140px repeat(7, 1fr)' }}>
          {/* Header */}
          <div />
          {days.map(d => <div key={d} className="text-center text-label-sm text-on-surface-variant py-1">{d}</div>)}

          {/* Agent rows */}
          {AGENT_TYPE_KEYS.map(type => {
            const agentCfg = AGENT_TYPES[type];
            const freq = schedule?.[type]?.frequency || agentCfg.defaultFrequency;
            const enabled = schedule?.[type]?.enabled !== false;
            const activeDays = freqToDays[freq] || [];

            return (
              <div key={type} className="contents">
                <div className="flex items-center gap-2 text-xs font-medium text-on-surface pr-2">
                  <span className={`material-symbols-outlined ${agentCfg.textColor}`} style={{ fontSize: 14 }}>{agentCfg.icon}</span>
                  <span className="truncate">{agentCfg.label}</span>
                </div>
                {days.map((_, di) => (
                  <div key={di} className="flex items-center justify-center">
                    {enabled && activeDays.includes(di) ? (
                      <div
                        className={`w-full h-6 rounded ${agentCfg.color}/20 border border-current/10 flex items-center justify-center`}
                        title={`${agentCfg.label}: Runs ${freq} ${freq === 'hourly' ? '(24x/day)' : freq === 'daily' ? '(1x/day)' : `(${freq})`}`}
                      >
                        <span className={`text-[10px] font-bold ${agentCfg.textColor}`}>
                          {freq === 'hourly' ? '24x' : freq === 'daily' ? '1x' : ''}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-6 rounded bg-surface-container-highest/30" title="Not scheduled" />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════ */

export default function AgentControlsPage() {
  const [accounts, setAccounts] = useState([]);
  const [allActions, setAllActions] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [filterAgent, setFilterAgent] = useState('all');
  const [configModal, setConfigModal] = useState(null);
  const [guardrailsOpen, setGuardrailsOpen] = useState(false);
  const [schedule, setSchedule] = useState(() => getDefaultScheduleConfig());

  /* ── Fetch data ── */
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function load() {
      try {
        const accts = await getAccounts();
        if (signal.aborted) return;
        setAccounts(accts || []);

        const actionsAll = [];
        const runsAll = [];

        await Promise.all(
          (accts || []).map(async (acct) => {
            try {
              const res = await fetch(`/api/accounts/${acct.id}/actions?limit=50`, { signal });
              if (res.ok && !signal.aborted) {
                const d = await res.json();
                (d.actions || []).forEach(a => actionsAll.push({ ...a, account_id: acct.id }));
              }
            } catch (_) {}
            try {
              const res = await fetch(`/api/agents/runs?accountId=${acct.id}`, { signal });
              if (res.ok && !signal.aborted) {
                const d = await res.json();
                (d.runs || []).forEach(r => runsAll.push(r));
              }
            } catch (_) {}
          }),
        );

        if (!signal.aborted) {
          setAllActions(actionsAll.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
          setRuns(runsAll);
          setLoading(false);
        }
      } catch (_) {
        if (!signal.aborted) setLoading(false);
      }
    }

    setLoading(true);
    load();
    return () => controller.abort();
  }, [dateRange]);

  /* ── Per-agent latest run ── */
  const latestRuns = useMemo(() => {
    const map = {};
    for (const r of runs) {
      if (!map[r.agent_type] || new Date(r.updated_at) > new Date(map[r.agent_type].updated_at)) {
        map[r.agent_type] = r;
      }
    }
    return map;
  }, [runs]);

  /* ── Per-agent action counts ── */
  const actionCounts = useMemo(() => {
    const counts = {};
    for (const a of allActions) counts[a.agent_type] = (counts[a.agent_type] || 0) + 1;
    return counts;
  }, [allActions]);

  /* ── Performance stats ── */
  const perfStats = useMemo(() => {
    const bidActions = allActions.filter(a => a.agent_type === 'bid').length;
    return {
      totalActions: allActions.length,
      activeAgents: AGENT_TYPE_KEYS.filter(k => schedule[k]?.enabled !== false).length,
      totalAgents: AGENT_TYPE_KEYS.length,
      bidActions,
      negActions: allActions.filter(a => a.agent_type === 'negative').length,
      estimatedSavings: bidActions * 5 * 0.15,
    };
  }, [allActions, schedule]);

  /* ── Handlers ── */
  const toggleAgent = useCallback((type) => {
    setSchedule(prev => ({
      ...prev,
      [type]: { ...prev[type], enabled: !(prev[type]?.enabled !== false) },
    }));
  }, []);

  const handleRun = useCallback(async (type) => {
    for (const acct of accounts) {
      try {
        await fetch('/api/agents/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: acct.id, agentType: type }),
        });
      } catch (_) {}
    }
  }, [accounts]);

  const pauseAll = useCallback(() => {
    setSchedule(prev => {
      const next = { ...prev };
      for (const k of AGENT_TYPE_KEYS) next[k] = { ...next[k], enabled: false };
      return next;
    });
  }, []);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="space-y-6 fade-up">
        <Skeleton variant="text" className="h-8 w-48" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} variant="card" className="h-48" />)}
        </div>
        <Skeleton variant="card" className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-up">
      {/* ─── Header ─── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-ds-success pulse-dot" />
            <span className="ds-metric-label !text-ds-success !normal-case">
              {perfStats.activeAgents}/{perfStats.totalAgents} Agents Active
            </span>
          </div>
          <h1 className="ds-page-title">Agent Controls</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {perfStats.totalActions} actions across {accounts.length} accounts this period
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <TimeComparison selected={dateRange} onChange={setDateRange} />
          <GhostButton onClick={() => setGuardrailsOpen(true)}>
            <span className="material-symbols-outlined text-lg">shield</span>
            Guardrails
          </GhostButton>
          <GhostButton onClick={pauseAll}>
            <span className="material-symbols-outlined text-lg">pause_circle</span>
            Pause All
          </GhostButton>
          <GradientButton>
            <span className="material-symbols-outlined text-lg">add</span>
            Deploy Agent
          </GradientButton>
        </div>
      </div>

      {/* ─── Agent Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {AGENT_TYPE_KEYS.map(type => (
          <AgentCard
            key={type}
            type={type}
            config={AGENT_TYPES[type]}
            run={latestRuns[type]}
            actionCount={actionCounts[type] || 0}
            scheduleEnabled={schedule[type]?.enabled !== false}
            onToggle={toggleAgent}
            onConfigure={setConfigModal}
            onRun={handleRun}
          />
        ))}
      </div>

      {/* ─── Performance Metrics ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-surface-card rounded-2xl p-6">
          <div className="ds-metric-label mb-2">Total Actions</div>
          <div className="ds-secondary-metric">{formatNumber(perfStats.totalActions)}</div>
          <div className="text-xs text-on-surface-variant mt-1">{accounts.length} accounts managed</div>
        </div>
        <div className="bg-surface-card rounded-2xl p-6">
          <div className="ds-metric-label mb-2">Bid Adjustments</div>
          <div className="ds-secondary-metric">{formatNumber(perfStats.bidActions)}</div>
          <div className="text-xs text-on-surface-variant mt-1">By Bid Agent this period</div>
        </div>
        <div className="bg-surface-card rounded-2xl p-6">
          <div className="ds-metric-label mb-2">Negatives Added</div>
          <div className="ds-secondary-metric">{formatNumber(perfStats.negActions)}</div>
          <div className="text-xs text-on-surface-variant mt-1">By Negative KW Agent</div>
        </div>
        <div className="bg-surface-card rounded-2xl p-6">
          <div className="ds-metric-label mb-2">Active Agents</div>
          <div className="ds-secondary-metric text-ds-success">{perfStats.activeAgents}/{perfStats.totalAgents}</div>
          <div className="text-xs text-on-surface-variant mt-1">Across all accounts</div>
        </div>
        <div className="bg-surface-card rounded-2xl p-6">
          <div className="ds-metric-label mb-2">Est. Savings</div>
          <div className="text-2xl font-bold text-secondary">{formatCurrency(perfStats.estimatedSavings, true)}</div>
          <div className="text-xs text-on-surface-variant mt-1">Wasted spend avoided this period</div>
        </div>
      </div>

      {/* ─── Schedule ─── */}
      <AgentSchedule schedule={schedule} />

      {/* ─── Activity Log ─── */}
      <ActivityLog
        actions={allActions}
        accounts={accounts}
        filterAgent={filterAgent}
        onFilterAgent={setFilterAgent}
      />

      {/* ─── Modals ─── */}
      {configModal && (
        <AgentConfigModal
          type={configModal}
          config={AGENT_TYPES[configModal]}
          accounts={accounts}
          onClose={() => setConfigModal(null)}
          onSave={() => {}}
        />
      )}
      <GuardrailsModal open={guardrailsOpen} onClose={() => setGuardrailsOpen(false)} />
    </div>
  );
}
