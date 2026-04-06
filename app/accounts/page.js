'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

// Format a raw customer ID string/number into XXX-XXX-XXXX
function formatCustomerId(raw) {
  if (!raw) return '—';
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
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// Format currency
function fmtCost(micros) {
  if (micros == null) return '—';
  const dollars = micros / 1_000_000;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
}

const STATUS_STYLES = {
  active:       'bg-emerald-50 text-emerald-600',
  connecting:   'bg-amber-50 text-amber-600',
  paused:       'bg-slate-100 text-slate-600',
  disconnected: 'bg-red-50 text-red-600',
};

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || STATUS_STYLES.paused;
  return (
    <span className={`text-[10px] font-label font-bold px-2.5 py-1 rounded-full capitalize ${cls}`}>
      {status || 'unknown'}
    </span>
  );
}

// Skeleton card for loading state
function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="h-5 w-36 bg-outline-variant/20 rounded mb-2" />
          <div className="h-3 w-24 bg-outline-variant/10 rounded" />
        </div>
        <div className="h-6 w-16 bg-outline-variant/10 rounded-full" />
      </div>
      <div className="h-3 w-32 bg-outline-variant/10 rounded mb-4" />
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-14 bg-outline-variant/10 rounded-lg" />
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-8 flex-1 bg-outline-variant/10 rounded-full" />
        <div className="h-8 flex-1 bg-outline-variant/10 rounded-full" />
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [metrics, setMetrics] = useState({});    // { [accountId]: { account, campaigns } }
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});    // { [accountId]: bool }
  const [syncErrors, setSyncErrors] = useState({});

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setAccounts(list);
      return list;
    } catch (err) {
      console.error('Failed to load accounts:', err);
      return [];
    }
  }, []);

  const loadMetrics = useCallback(async (list) => {
    if (!list.length) return;
    try {
      const results = await Promise.all(
        list.map(a =>
          fetch(`/api/accounts/${a.id}/metrics`)
            .then(r => r.json())
            .then(m => [a.id, m])
            .catch(() => [a.id, null])
        )
      );
      setMetrics(Object.fromEntries(results));
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  }, []);

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
      // Refresh this account + its metrics
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
    <div className="px-8 py-10">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-1">
            Managed Accounts
          </h2>
          <p className="text-secondary text-sm">Connect and manage Google Ads accounts</p>
        </div>
        <button
          onClick={() => { window.location.href = '/api/auth/google-ads'; }}
          className="pill-btn-primary"
        >
          <span className="material-symbols-outlined text-[18px]">add_link</span>
          Connect Account
        </button>
      </div>

      {/* Summary stats row — only when accounts exist */}
      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { icon: 'account_tree',    label: 'Total Accounts',      value: accounts.length },
            { icon: 'verified',        label: 'Active Accounts',     value: activeCount },
            { icon: 'attach_money',    label: 'Total Monthly Spend', value: fmtTotalSpend },
            { icon: 'conversion_path', label: 'Total Conversions',   value: fmtNum(totalConversions) },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <span className="material-symbols-outlined text-primary text-[20px]">{s.icon}</span>
              <p className="text-xl font-headline font-bold text-on-surface mt-1">{s.value}</p>
              <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : accounts.length === 0 ? (
        /* Empty state */
        <div className="card p-16 text-center">
          <span className="material-symbols-outlined text-[56px] text-outline-variant mb-4">
            account_balance
          </span>
          <p className="font-headline font-bold text-on-surface text-xl mb-2">
            No accounts connected yet
          </p>
          <p className="text-sm text-secondary mb-8 max-w-sm mx-auto">
            Connect a Google Ads account to start managing campaigns, tracking performance, and unlocking AI-powered insights.
          </p>
          <button
            onClick={() => { window.location.href = '/api/auth/google-ads'; }}
            className="pill-btn-primary"
          >
            <span className="material-symbols-outlined text-[18px]">add_link</span>
            Connect Your First Account
          </button>
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
              { label: 'Clicks',      value: fmtNum(acct?.clicks) },
              { label: 'Cost',        value: fmtCost(acct?.cost_micros) },
              { label: 'Conv.',       value: fmtNum(acct?.conversions) },
            ];

            return (
              <div key={account.id} className="card p-5 flex flex-col gap-3">
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xl font-headline font-bold text-on-surface leading-tight truncate">
                      {account.name || 'Unnamed Account'}
                    </p>
                    <p className="text-[11px] text-secondary font-label mt-0.5">
                      {formatCustomerId(account.google_customer_id)}
                    </p>
                  </div>
                  <StatusBadge status={account.status} />
                </div>

                {/* Last synced */}
                <div className="flex items-center gap-1.5 text-xs text-secondary">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  <span>Synced {relativeTime(account.last_synced_at)}</span>
                </div>

                {/* Metric pills */}
                <div className="grid grid-cols-4 gap-2">
                  {pills.map(p => (
                    <div key={p.label} className="bg-surface-high rounded-lg p-2 text-center">
                      <p className="font-mono font-semibold text-on-surface text-sm leading-tight">{p.value}</p>
                      <p className="text-[9px] font-label font-bold text-secondary uppercase tracking-widest mt-0.5">{p.label}</p>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-auto pt-1">
                  <Link
                    href={`/accounts/${account.id}`}
                    className="pill-btn-primary flex-1 justify-center text-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    View Account
                  </Link>
                  <button
                    onClick={() => handleSync(account.id)}
                    disabled={isSyncing}
                    className="pill-btn-secondary flex-1 justify-center text-sm disabled:opacity-60"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin' : ''}`}>
                      {isSyncing ? 'progress_activity' : 'sync'}
                    </span>
                    {isSyncing ? 'Syncing…' : 'Sync'}
                  </button>
                </div>
                {syncErrors[account.id] && (
                  <p className="text-xs text-red-500 mt-1">{syncErrors[account.id]}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
