'use client';

import { useState, useEffect } from 'react';
import { getAccounts, isSupabaseConfigured } from '@/lib/supabase';
import HeroMetrics from '@/components/pipeline/HeroMetrics';
import ClientAccountsTable from '@/components/pipeline/ClientAccountsTable';
import RecentReports from '@/components/pipeline/RecentReports';
import GhostButton from '@/components/ui/GhostButton';
import Skeleton from '@/components/ui/Skeleton';

export default function PipelineDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Load accounts from Supabase
        if (isSupabaseConfigured()) {
          const accts = await getAccounts();
          setAccounts(accts || []);

          // Load metrics for each account
          const metricsMap = {};
          const actionsAll = [];
          await Promise.all(
            (accts || []).map(async (acct) => {
              try {
                const res = await fetch(`/api/accounts/${acct.id}/metrics`);
                if (res.ok) {
                  const data = await res.json();
                  metricsMap[acct.id] = data;
                }
              } catch (_) { /* skip failed metrics */ }

              try {
                const res = await fetch(`/api/accounts/${acct.id}/actions?limit=3`);
                if (res.ok) {
                  const data = await res.json();
                  (data.actions || []).forEach((a) => actionsAll.push({ ...a, account_id: acct.id }));
                }
              } catch (_) { /* skip */ }
            })
          );
          setMetrics(metricsMap);
          setActions(actionsAll.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 fade-up">
        <div>
          <Skeleton variant="text" className="h-5 w-48 mb-2" />
          <Skeleton variant="text" className="h-8 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="stat" />)}
        </div>
        <Skeleton variant="card" className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Pipeline Architecture</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary mr-2 pulse-dot" />
            {accounts.length > 0
              ? `${accounts.length} Active Intelligent Agent${accounts.length > 1 ? 's' : ''} optimizing ${accounts.length} account${accounts.length > 1 ? 's' : ''}`
              : 'No accounts connected yet'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GhostButton>
            <span className="material-symbols-outlined text-lg">download</span>
            Export CRM Data
          </GhostButton>
          <GhostButton>
            <span className="material-symbols-outlined text-lg">tune</span>
            Pipeline Filters
          </GhostButton>
        </div>
      </div>

      {/* Hero Metrics */}
      <HeroMetrics accounts={accounts} metrics={metrics} />

      {/* Main Content: Table + Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8">
          <ClientAccountsTable accounts={accounts} />
        </div>
        <div className="xl:col-span-4">
          <RecentReports actions={actions} />
        </div>
      </div>
    </div>
  );
}
