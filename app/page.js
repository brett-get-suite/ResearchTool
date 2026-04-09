'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAccounts, isSupabaseConfigured } from '@/lib/supabase';
import {
  generateAlerts,
  computeTopMovers,
  generateSparklineData,
  calcDelta,
  DATE_PRESETS,
} from '@/lib/dashboard-utils';
import ClientSwitcher from '@/components/mission-control/ClientSwitcher';
import TimeComparison from '@/components/mission-control/TimeComparison';
import KPIStrip from '@/components/mission-control/KPIStrip';
import CampaignTable from '@/components/mission-control/CampaignTable';
import AgentFeed from '@/components/mission-control/AgentFeed';
import AlertsPanel from '@/components/mission-control/AlertsPanel';
import SpendPacing from '@/components/mission-control/SpendPacing';
import TopMovers from '@/components/mission-control/TopMovers';
import QuickActions from '@/components/mission-control/QuickActions';
import TopPerformingAssets from '@/components/mission-control/TopPerformingAssets';
import Skeleton from '@/components/ui/Skeleton';

export default function MissionControl() {
  /* ── State ── */
  const [accounts, setAccounts] = useState([]);
  const [metricsMap, setMetricsMap] = useState({});
  const [campaignsMap, setCampaignsMap] = useState({});
  const [allActions, setAllActions] = useState([]);
  const [allAssets, setAllAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [dateRange, setDateRange] = useState('month');
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  /* ── Data Fetching ── */
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadAll() {
      if (!isSupabaseConfigured()) { setLoading(false); return; }

      try {
        const accts = await getAccounts();
        if (signal.aborted) return;
        setAccounts(accts || []);

        const preset = DATE_PRESETS.find(p => p.key === dateRange) || DATE_PRESETS[1];
        const range = preset.range;

        const mMap = {};
        const cMap = {};
        const actionsAll = [];
        const assetsAll = [];

        await Promise.all(
          (accts || []).map(async (acct) => {
            // Metrics
            try {
              const res = await fetch(`/api/accounts/${acct.id}/metrics?range=${range}`, { signal });
              if (res.ok && !signal.aborted) mMap[acct.id] = await res.json();
            } catch (_) {}

            // Campaigns
            try {
              const res = await fetch(`/api/accounts/${acct.id}/campaigns?range=${range}`, { signal });
              if (res.ok && !signal.aborted) {
                const data = await res.json();
                cMap[acct.id] = Array.isArray(data) ? data : data.campaigns || [];
              }
            } catch (_) {}

            // Agent actions
            try {
              const res = await fetch(`/api/accounts/${acct.id}/actions?limit=25`, { signal });
              if (res.ok && !signal.aborted) {
                const data = await res.json();
                (data.actions || []).forEach(a => actionsAll.push({ ...a, account_id: acct.id }));
              }
            } catch (_) {}

            // Asset performance
            try {
              const res = await fetch(`/api/accounts/${acct.id}/assets`, { signal });
              if (res.ok && !signal.aborted) {
                const data = await res.json();
                (Array.isArray(data) ? data : []).forEach(a => assetsAll.push({ ...a, _accountId: acct.id, _accountName: acct.name }));
              }
            } catch (_) {}
          }),
        );

        if (!signal.aborted) {
          setMetricsMap(mMap);
          setCampaignsMap(cMap);
          setAllActions(actionsAll.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
          setAllAssets(assetsAll);
          setLoading(false);
        }
      } catch (_) {
        if (!signal.aborted) setLoading(false);
      }
    }

    setLoading(true);
    loadAll();
    return () => controller.abort();
  }, [dateRange, refreshKey]);

  /* ── Derived: visible accounts ── */
  const visibleAccounts = useMemo(() => {
    if (!selectedAccount) return accounts;
    return accounts.filter(a => a.id === selectedAccount);
  }, [accounts, selectedAccount]);

  /* ── Derived: aggregated KPI metrics ── */
  const aggregatedMetrics = useMemo(() => {
    const cur = { total_spend: 0, conversions: 0, clicks: 0, impressions: 0, cost_per_lead: 0, budget: 0, ctr: 0, search_impression_share: 0, budget_pacing: 0 };
    const prev = { total_spend: 0, conversions: 0, clicks: 0, impressions: 0, cost_per_lead: 0, budget: 0, ctr: 0, search_impression_share: 0 };

    let isCount = 0;

    for (const acct of visibleAccounts) {
      const data = metricsMap[acct.id];
      if (!data) continue;

      if (data.current) {
        cur.total_spend += data.current.total_spend || 0;
        cur.conversions += data.current.conversions || 0;
        cur.clicks += data.current.clicks || 0;
        cur.budget += data.current.budget || 0;
      }
      if (data.previous) {
        prev.total_spend += data.previous.total_spend || 0;
        prev.conversions += data.previous.conversions || 0;
        prev.clicks += data.previous.clicks || 0;
        prev.budget += data.previous.budget || 0;
      }

      // Campaign-level impression data
      const camps = campaignsMap[acct.id] || [];
      for (const c of camps) {
        if (c.impressions) cur.impressions += c.impressions;
        if (c.search_impression_share != null) {
          cur.search_impression_share += c.search_impression_share;
          isCount++;
        }
      }
    }

    // Derived rates
    cur.cost_per_lead = cur.conversions > 0 ? cur.total_spend / cur.conversions : 0;
    prev.cost_per_lead = prev.conversions > 0 ? prev.total_spend / prev.conversions : 0;
    cur.ctr = cur.impressions > 0 ? (cur.clicks / cur.impressions) * 100 : 0;
    prev.ctr = prev.impressions > 0 ? (prev.clicks / prev.impressions) * 100 : 0;
    cur.search_impression_share = isCount > 0 ? (cur.search_impression_share / isCount) * 100 : 0;

    // Budget pacing
    const monthlyBudget = cur.budget * 30.4;
    cur.budget_pacing = monthlyBudget > 0 ? (cur.total_spend / monthlyBudget) * 100 : 0;

    return { current: cur, previous: prev };
  }, [visibleAccounts, metricsMap, campaignsMap]);

  /* ── Derived: flattened campaigns with client names ── */
  const allCampaigns = useMemo(() => {
    const result = [];
    for (const acct of visibleAccounts) {
      const camps = campaignsMap[acct.id] || [];
      for (const c of camps) {
        result.push({
          ...c,
          client_name: acct.name,
          client_id: acct.id,
        });
      }
    }
    return result;
  }, [visibleAccounts, campaignsMap]);

  /* ── Derived: visible actions ── */
  const visibleActions = useMemo(() => {
    if (!selectedAccount) return allActions;
    return allActions.filter(a => a.account_id === selectedAccount);
  }, [allActions, selectedAccount]);

  /* ── Derived: alerts ── */
  const alerts = useMemo(() => {
    return generateAlerts(visibleAccounts, metricsMap, campaignsMap)
      .filter(a => !dismissedAlerts.has(a.id));
  }, [visibleAccounts, metricsMap, campaignsMap, dismissedAlerts]);

  /* ── Derived: top movers ── */
  const { improvers, decliners } = useMemo(() => {
    return computeTopMovers(allCampaigns);
  }, [allCampaigns]);

  /* ── Derived: sparkline data ── */
  const sparklines = useMemo(() => {
    const c = aggregatedMetrics.current;
    const p = aggregatedMetrics.previous;
    const trend = (cur, prv) => calcDelta(cur, prv) > 0 ? 1 : calcDelta(cur, prv) < 0 ? -1 : 0;

    return {
      'Total Spend':             generateSparklineData(c.total_spend, trend(c.total_spend, p.total_spend)),
      'Total Conversions':       generateSparklineData(c.conversions, trend(c.conversions, p.conversions)),
      'Avg. Cost/Conversion':    generateSparklineData(c.cost_per_lead, trend(c.cost_per_lead, p.cost_per_lead)),
      'Avg. CTR':                generateSparklineData(c.ctr, trend(c.ctr, p.ctr)),
      'Search Impression Share': generateSparklineData(c.search_impression_share, 0),
      'Budget Pacing':           generateSparklineData(c.budget_pacing, 0),
    };
  }, [aggregatedMetrics]);

  /* ── Handlers ── */
  const handleDismissAlert = useCallback((alertId) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  }, []);

  const handleQuickAction = useCallback(async (action) => {
    if (action === 'sync_all') {
      for (const acct of accounts) {
        try { await fetch(`/api/accounts/${acct.id}/sync`, { method: 'POST' }); } catch (_) {}
      }
      setRefreshKey(k => k + 1);
    }
  }, [accounts]);

  /* ── Loading State ── */
  if (loading) {
    return (
      <div className="space-y-6 fade-up">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton variant="text" className="h-8 w-64 mb-2" />
            <Skeleton variant="text" className="h-4 w-96" />
          </div>
          <div className="flex gap-3">
            <Skeleton variant="text" className="h-11 w-64 rounded-xl" />
            <Skeleton variant="text" className="h-11 w-56 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} variant="stat" />)}
        </div>
        <Skeleton variant="card" className="h-12 rounded-xl" />
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <Skeleton variant="card" className="h-96 xl:col-span-8" />
          <Skeleton variant="card" className="h-96 xl:col-span-4" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <Skeleton variant="card" className="h-64 xl:col-span-7" />
          <Skeleton variant="card" className="h-64 xl:col-span-5" />
        </div>
      </div>
    );
  }

  const activeAgents = accounts.filter(a => a.settings?.agents_enabled).length;

  /* ── Render ── */
  return (
    <div className="space-y-8 fade-up">
      {/* ─── Header ─── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="ds-page-title">Mission Control</h1>
          <p className="text-sm text-on-surface-variant mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-ds-success pulse-dot" />
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} &middot; {activeAgents} AI agent{activeAgents !== 1 ? 's' : ''} active &middot; {allActions.length} actions this period
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ClientSwitcher accounts={accounts} selected={selectedAccount} onSelect={setSelectedAccount} />
          <TimeComparison selected={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* ─── KPI Strip ─── */}
      <KPIStrip
        current={aggregatedMetrics.current}
        previous={aggregatedMetrics.previous}
        sparklines={sparklines}
      />

      {/* ─── Quick Actions ─── */}
      <QuickActions onAction={handleQuickAction} />

      {/* ─── Campaign Table + Agent Feed ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8">
          <CampaignTable campaigns={allCampaigns} selectedAccount={selectedAccount} />
        </div>
        <div className="xl:col-span-4">
          <AgentFeed actions={visibleActions} accounts={accounts} />
        </div>
      </div>

      {/* ─── Top Performing Assets ─── */}
      <TopPerformingAssets
        assets={allAssets}
        accounts={accounts}
        selectedAccount={selectedAccount}
      />

      {/* ─── Alerts + Spend Pacing ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7">
          <AlertsPanel alerts={alerts} onDismiss={handleDismissAlert} />
        </div>
        <div className="xl:col-span-5">
          <SpendPacing accounts={visibleAccounts} metricsMap={metricsMap} />
        </div>
      </div>

      {/* ─── Top Movers ─── */}
      <TopMovers improvers={improvers} decliners={decliners} />
    </div>
  );
}
