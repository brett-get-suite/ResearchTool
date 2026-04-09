'use client';

import { useState, useEffect } from 'react';
import { getAccounts, getAuditScoreHistory, getAccountSchedule, saveAccountSchedule } from '@/lib/supabase';
import GradientButton from '@/components/ui/GradientButton';
import GhostButton from '@/components/ui/GhostButton';
import Skeleton from '@/components/ui/Skeleton';
import AgentCards from '@/components/agent-controls/AgentCards';
import AuditMetrics from '@/components/agent-controls/AuditMetrics';
import PerformanceDeltas from '@/components/agent-controls/PerformanceDeltas';
import CampaignQuality from '@/components/agent-controls/CampaignQuality';
import CampaignTable from '@/components/agent-controls/CampaignTable';
import ActionTimeline from '@/components/agent-controls/ActionTimeline';
import AuditTrending from '@/components/agent-controls/AuditTrending';
import DaypartingHeatmap from '@/components/agent-controls/DaypartingHeatmap';
import ScalingOpportunity from '@/components/agent-controls/ScalingOpportunity';
import ScheduleConfig from '@/components/agent-controls/ScheduleConfig';

export default function AgentControlsPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [campaigns, setCampaigns] = useState([]);
  const [actions, setActions] = useState([]);
  const [runs, setRuns] = useState([]);
  const [auditHistory, setAuditHistory] = useState([]);
  const [daypartingData, setDaypartingData] = useState(null);
  const [scheduleConfig, setScheduleConfig] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const accts = await getAccounts();
        setAccounts(accts || []);
        if (accts?.length > 0) {
          setSelectedAccount(accts[0]);
          await loadAccountData(accts[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function loadAccountData(accountId) {
    const [
      metricsRes,
      campaignsRes,
      actionsRes,
      runsRes,
      history,
      dayparting,
      schedule,
    ] = await Promise.all([
      fetch(`/api/accounts/${accountId}/metrics`).then((r) => r.ok ? r.json() : {}),
      fetch(`/api/accounts/${accountId}/campaigns`).then((r) => r.ok ? r.json() : { campaigns: [] }),
      fetch(`/api/accounts/${accountId}/actions?limit=10`).then((r) => r.ok ? r.json() : { actions: [] }),
      fetch(`/api/agents/runs?accountId=${accountId}`).then((r) => r.ok ? r.json() : { runs: [] }),
      getAuditScoreHistory(accountId),
      fetch(`/api/accounts/${accountId}/dayparting`).then((r) => r.ok ? r.json() : null),
      getAccountSchedule(accountId),
    ]);
    setMetrics(metricsRes);
    setCampaigns(campaignsRes.campaigns || []);
    setActions(actionsRes.actions || []);
    setRuns(runsRes.runs || []);
    setAuditHistory(history);
    setDaypartingData(dayparting);
    setScheduleConfig(schedule);
  }

  async function handleUndo(actionId) {
    if (!selectedAccount) return;
    const res = await fetch(`/api/accounts/${selectedAccount.id}/actions/${actionId}/undo`, { method: 'POST' });
    if (res.ok) {
      const actionsRes = await fetch(`/api/accounts/${selectedAccount.id}/actions?limit=10`);
      if (actionsRes.ok) {
        const data = await actionsRes.json();
        setActions(data.actions || []);
      }
    }
  }

  async function handleSaveSchedule(config) {
    if (!selectedAccount) return;
    await saveAccountSchedule(selectedAccount.id, config);
    setScheduleConfig(config);
  }

  if (loading) {
    return (
      <div className="space-y-6 fade-up">
        <Skeleton variant="text" className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="card" className="h-36" />)}
        </div>
        <Skeleton variant="card" className="h-48" />
      </div>
    );
  }

  const auditScore = selectedAccount?.audit_data?.overall_score || 0;
  const prevAuditScore = auditHistory.length >= 2 ? auditHistory[auditHistory.length - 2]?.score : null;
  const wastedSpend = selectedAccount?.audit_data?.wasted_spend || 0;
  const optimizationUplift = selectedAccount?.audit_data?.optimization_uplift || 0;

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-secondary pulse-dot" />
            <span className="text-label-sm text-secondary">Autonomous Layer Active</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Agent Controls</h1>
        </div>
        <div className="flex items-center gap-3">
          {accounts.length > 1 && (
            <select
              value={selectedAccount?.id || ''}
              onChange={(e) => {
                const acct = accounts.find((a) => a.id === e.target.value);
                setSelectedAccount(acct);
                if (acct) loadAccountData(acct.id);
              }}
              className="px-3 py-2 rounded-xl bg-surface-container text-on-surface text-sm outline-none"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
          <GhostButton onClick={() => setShowSchedule((s) => !s)}>
            <span className="material-symbols-outlined text-lg">schedule</span>
            {showSchedule ? 'Hide Schedule' : 'Schedule'}
          </GhostButton>
          <GhostButton>
            <span className="material-symbols-outlined text-lg">pause_circle</span>
            Pause All Agents
          </GhostButton>
          <GradientButton>
            <span className="material-symbols-outlined text-lg">add</span>
            Deploy New Agent
          </GradientButton>
        </div>
      </div>

      {/* Agent Status Cards (7 types, 4-across) */}
      <AgentCards latestRuns={runs} />

      {/* Schedule Config (toggle) */}
      {showSchedule && (
        <ScheduleConfig
          accountId={selectedAccount?.id}
          initialConfig={scheduleConfig}
          onSave={handleSaveSchedule}
        />
      )}

      {/* Performance Deltas — 5 boss-requested metrics */}
      <PerformanceDeltas
        currentPeriod={metrics?.current || {}}
        previousPeriod={metrics?.previous || {}}
      />

      {/* Main content grid: 8 cols + 4 cols sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          {/* 3 Hero Audit Metrics */}
          <AuditMetrics
            auditScore={auditScore}
            prevAuditScore={prevAuditScore}
            wastedSpend={wastedSpend}
            optimizationUplift={optimizationUplift}
          />

          {/* Campaign Quality Index */}
          <CampaignQuality campaigns={campaigns} />

          {/* Audit Score Trending */}
          <AuditTrending history={auditHistory} />

          {/* Dayparting Heatmap */}
          <DaypartingHeatmap daypartingData={daypartingData} />

          {/* Campaign Table with Impression Share */}
          <CampaignTable campaigns={campaigns} />
        </div>

        {/* Right sidebar: Action Timeline */}
        <div className="xl:col-span-4">
          <ActionTimeline
            actions={actions}
            onUndo={handleUndo}
          />
        </div>
      </div>

      {/* Scaling Opportunity Banner */}
      <ScalingOpportunity
        opportunity={selectedAccount?.audit_data?.scaling_opportunity || null}
      />
    </div>
  );
}
