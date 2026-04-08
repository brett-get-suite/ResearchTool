'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import StatCard from '@/components/ui/StatCard';
import GradientButton from '@/components/ui/GradientButton';
import GhostButton from '@/components/ui/GhostButton';
import Skeleton from '@/components/ui/Skeleton';

// Format a raw customer ID string/number into XXX-XXX-XXXX
function formatCustomerId(raw) {
  if (!raw) return '\u2014';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 9) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

// Relative time: "3 hours ago", "2 days ago", "Never"
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

// Format a large number with K/M suffixes
function fmtNum(n) {
  if (n == null) return '\u2014';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// Format currency
function fmtCost(micros) {
  if (micros == null) return '\u2014';
  const dollars = micros / 1_000_000;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [syncErrors, setSyncErrors] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/accounts', { signal });
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setAccounts(list);

        if (list.length) {
          const results = await Promise.all(
            list.map(a =>
              fetch(`/api/accounts/${a.id}/metrics`, { signal })
                .then(r => r.json())
                .then(m => [a.id, m])
                .catch(e => (e.name === 'AbortError' ? null : [a.id, null]))
            )
          );
          setMetrics(Object.fromEntries(results.filter(Boolean)));
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load accounts/metrics:', err);
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, []);

  const handleSync = async (accountId) => {
    setSyncing(s => ({ ...s, [accountId]: true }));
    setSyncErrors(s => ({ ...s, [accountId]: null }));
    try {
      await fetch(`/api/accounts/${accountId}/sync`, { method: 'POST' });
      const [accountRes, metricsRes] = await Promise.all([
        fetch(`/api/accounts/${accountId}`).then(r => r.json()),
        fetch(`/api/accounts/${accountId}/metrics`).then(r => r.json()).catch(() => null),
      ]);
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, ...accountRes } : a));
      setMetrics(prev => ({ ...prev, [accountId]: metricsRes }));
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncErrors(s => ({ ...s, [accountId]: 'Sync failed. Please try again.' }));
    } finally {
      setSyncing(s => ({ ...s, [accountId]: false }));
    }
  };

  // Summary stats
  const activeCount = accounts.filter(a => a.status === 'active').length;
  const totalSpend = Object.values(metrics).reduce((sum, m) => {
    return sum + (m?.account?.cost_micros ?? 0) / 1_000_000;
  }, 0);
  const fmtTotalSpend = totalSpend.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const totalConversions = Object.values(metrics).reduce((sum, m) => {
    return sum + (m?.account?.conversions ?? 0);
  }, 0);

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-on-surface mb-1">
            Managed Accounts
          </h2>
          <p className="text-on-surface-variant text-sm">Connect and manage Google Ads accounts</p>
        </div>
        <GradientButton onClick={() => { window.location.href = '/api/auth/google-ads'; }}>
          <span className="material-symbols-outlined text-lg">add_link</span>
          Connect Account
        </GradientButton>
      </div>

      {/* Summary stats row */}
      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Accounts" value={accounts.length} icon="account_tree" />
          <StatCard label="Active Accounts" value={activeCount} icon="verified" />
          <StatCard label="Total Monthly Spend" value={fmtTotalSpend} icon="attach_money" />
          <StatCard label="Total Conversions" value={fmtNum(totalConversions)} icon="conversion_path" />
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <Skeleton key={i} variant="card" className="h-48" />)}
        </div>
      ) : accounts.length === 0 ? (
        /* Empty state */
        <div className="bg-surface-container rounded-xl p-16 text-center">
          <span className="material-symbols-outlined text-[56px] text-on-surface-variant mb-4">
            account_balance
          </span>
          <p className="font-bold text-on-surface text-xl mb-2">
            No accounts connected yet
          </p>
          <p className="text-sm text-on-surface-variant mb-8 max-w-sm mx-auto">
            Connect a Google Ads account to start managing campaigns, tracking performance, and unlocking AI-powered insights.
          </p>
          <GradientButton onClick={() => { window.location.href = '/api/auth/google-ads'; }}>
            <span className="material-symbols-outlined text-lg">add_link</span>
            Connect Your First Account
          </GradientButton>
        </div>
      ) : (
        /* Account cards grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map(account => {
            const m = metrics[account.id];
            const acct = m?.account;
            const isSyncing = syncing[account.id];

            const pills = [
              { label: 'Impressions', value: fmtNum(acct?.impressions) },
              { label: 'Clicks', value: fmtNum(acct?.clicks) },
              { label: 'Cost', value: fmtCost(acct?.cost_micros) },
              { label: 'Conv.', value: fmtNum(acct?.conversions) },
            ];

            return (
              <div key={account.id} className="bg-surface-container rounded-xl p-5 flex flex-col gap-3">
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-on-surface leading-tight truncate">
                      {account.name || 'Unnamed Account'}
                    </p>
                    <p className="text-[11px] text-on-surface-variant font-label mt-0.5">
                      {formatCustomerId(account.google_customer_id)}
                    </p>
                  </div>
                  <StatusBadge status={account.status === 'active' ? 'active' : account.status === 'connecting' ? 'running' : 'idle'} label={account.status} />
                </div>

                {/* Last synced */}
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  <span>Synced {relativeTime(account.last_synced_at)}</span>
                </div>

                {/* Metric pills */}
                <div className="grid grid-cols-4 gap-2">
                  {pills.map(p => (
                    <div key={p.label} className="bg-surface-container-high rounded-xl p-2 text-center">
                      <p className="font-mono font-semibold text-on-surface text-sm leading-tight">{p.value}</p>
                      <p className="text-label-sm text-on-surface-variant mt-0.5">{p.label}</p>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-auto pt-1">
                  <Link
                    href={`/accounts/${account.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-on-primary bg-gradient-to-br from-primary to-primary-container"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    View Account
                  </Link>
                  <GhostButton
                    onClick={() => handleSync(account.id)}
                    disabled={isSyncing}
                    className="flex-1 justify-center text-sm"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin' : ''}`}>
                      {isSyncing ? 'progress_activity' : 'sync'}
                    </span>
                    {isSyncing ? 'Syncing...' : 'Sync'}
                  </GhostButton>
                </div>
                {syncErrors[account.id] && (
                  <p className="text-xs text-error mt-1">{syncErrors[account.id]}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
