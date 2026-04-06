'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getClients, isSupabaseConfigured, deleteClient } from '@/lib/supabase';

const INDUSTRY_ICONS = {
  Plumbing: 'plumbing',
  HVAC: 'hvac',
  Electrical: 'bolt',
  Roofing: 'roofing',
  Landscaping: 'yard',
  default: 'build',
};

function StatCard({ icon, label, value }) {
  return (
    <div className="card p-6 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-primary/[0.08] flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-headline font-bold text-on-surface">{value}</p>
        <p className="text-xs font-label text-secondary mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ClientRow({ client, onDelete }) {
  const icon = INDUSTRY_ICONS[client.industry] || INDUSTRY_ICONS.default;
  const hasResearch = client.status === 'complete';
  const allKw = client.keyword_data?.keyword_groups?.flatMap((g) => g.keywords) || [];
  const opps = client.low_hanging_fruit?.top_opportunities?.length || 0;

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-surface-low rounded-xl transition-colors group">
      <div className="w-10 h-10 rounded-lg bg-primary/[0.08] flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-primary text-[18px]">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-label font-semibold text-on-surface truncate">{client.name}</p>
        <p className="text-[11px] text-secondary truncate">{client.website}</p>
      </div>
      <div className="hidden sm:flex items-center gap-6 text-xs font-label text-secondary">
        <div className="text-center">
          <p className="font-bold text-on-surface">{allKw.length || '—'}</p>
          <p className="text-[10px]">Keywords</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-on-surface">{opps || '—'}</p>
          <p className="text-[10px]">Opportunities</p>
        </div>
      </div>
      <span className={`text-[10px] font-label font-bold px-2.5 py-1 rounded-full ${
        hasResearch
          ? 'bg-emerald-100 text-emerald-700'
          : client.status === 'analyzing'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-surface-high text-secondary'
      }`}>
        {hasResearch ? 'COMPLETE' : client.status === 'analyzing' ? 'IN PROGRESS' : 'DRAFT'}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link href={`/clients/${client.id}`} className="p-1.5 hover:bg-surface-high rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[18px] text-secondary">open_in_new</span>
        </Link>
        <button onClick={() => onDelete(client.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[18px] text-error">delete</span>
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supabaseOk, setSupabaseOk] = useState(false);
  const [quickUrl, setQuickUrl] = useState('');

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then(data => {
      setAccounts(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const ok = isSupabaseConfigured();
    setSupabaseOk(ok);
    if (ok) {
      getClients()
        .then(setClients)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this client and all their research data?')) return;
    await deleteClient(id);
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  const completed = clients.filter((c) => c.status === 'complete');
  const totalKeywords = completed.reduce((sum, c) => {
    return sum + (c.keyword_data?.keyword_groups?.flatMap((g) => g.keywords).length || 0);
  }, 0);
  const totalOpps = completed.reduce((sum, c) => {
    return sum + (c.low_hanging_fruit?.top_opportunities?.length || 0);
  }, 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';

  const topOpps = completed
    .flatMap((c) =>
      (c.low_hanging_fruit?.top_opportunities || []).map((o) => ({
        ...o,
        clientName: c.name,
        clientId: c.id,
      }))
    )
    .sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0))
    .slice(0, 5);

  return (
    <div className="px-8 py-10">
      {/* Page header */}
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-headline font-bold text-on-surface tracking-tight mb-1">
            Good {greeting}
          </h2>
          <p className="text-secondary font-body text-sm">
            {clients.length > 0
              ? `Managing ${clients.length} client${clients.length !== 1 ? 's' : ''} · ${completed.length} with completed research`
              : 'Start by running your first client research below'}
          </p>
        </div>
        <Link href="/research" className="pill-btn-primary">
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Research
        </Link>
      </div>

      {/* Managed Accounts summary */}
      {accounts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h3 className="text-lg font-headline font-bold text-on-surface">Managed Accounts</h3>
              <p className="text-secondary text-xs">Connected Google Ads accounts</p>
            </div>
            <Link href="/accounts" className="text-primary text-sm font-label font-semibold hover:underline">
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-2">
            <StatCard icon="link" label="Connected Accounts" value={accounts.length} />
            <StatCard icon="verified" label="Active" value={accounts.filter(a => a.status === 'active').length} />
            <StatCard icon="smart_toy" label="AI Agents" value="Active" />
          </div>
        </div>
      )}

      {/* Supabase warning */}
      {!supabaseOk && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">warning</span>
          <div>
            <p className="text-sm font-label font-semibold text-amber-800">Supabase not configured</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Add{' '}
              <code className="font-mono bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code className="font-mono bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
              to your Vercel environment variables to enable client data persistence.
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      {(() => {
        const pipelineRev = clients.filter(c => c.status_pipeline === 'active' || c.status_pipeline === 'prospect' || c.status_pipeline === 'proposal_sent')
          .reduce((s, c) => s + (c.monthly_mgmt_fee || 0), 0);
        const activeClients = clients.filter(c => c.status_pipeline === 'active').length;
        const avgCPL = completed.length > 0
          ? completed.filter(c => c.budget_projection?.budget_tiers?.find(t => t.level === 'balanced'))
            .reduce((s, c) => {
              const b = c.budget_projection.budget_tiers.find(t => t.level === 'balanced');
              return s + (b?.expected_cost_per_lead || 0);
            }, 0) / (completed.filter(c => c.budget_projection?.budget_tiers?.find(t => t.level === 'balanced')).length || 1)
          : 0;
        return (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
            <StatCard icon="groups" label="Total Clients" value={clients.length} />
            <StatCard icon="check_circle" label="Completed Research" value={completed.length} />
            <StatCard icon="key_visualizer" label="Keywords Generated" value={totalKeywords.toLocaleString()} />
            <StatCard icon="verified" label="Active Clients" value={activeClients} />
            <StatCard icon="attach_money" label="Pipeline Revenue" value={pipelineRev > 0 ? `$${pipelineRev.toLocaleString()}/mo` : '—'} />
          </div>
        );
      })()}

      {/* Research Queue — clients with incomplete data */}
      {(() => {
        const incomplete = clients.filter(c => c.status !== 'complete');
        if (incomplete.length === 0) return null;
        return (
          <div className="mb-6 card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-[20px]">pending_actions</span>
                <h3 className="font-headline font-bold text-on-surface">Research Queue</h3>
                <span className="text-[10px] font-label font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{incomplete.length}</span>
              </div>
            </div>
            <div className="px-4 py-2">
              {incomplete.map(client => {
                const icon = INDUSTRY_ICONS[client.industry] || INDUSTRY_ICONS.default;
                const missing = [];
                if (!client.keyword_data) missing.push('Keywords');
                if (!client.competitor_data) missing.push('Competitors');
                if (!client.low_hanging_fruit) missing.push('Opportunities');
                if (!client.budget_projection) missing.push('Budget');
                if (!client.ad_copy) missing.push('Ad Copy');
                const isStuck = client.status === 'analyzing';
                return (
                  <div key={client.id} className="flex items-center gap-4 p-3 hover:bg-surface-low rounded-xl transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-amber-700 text-[16px]">{icon}</span>
                    </div>
                    <Link href={`/clients/${client.id}`} className="flex-1 min-w-0">
                      <p className="font-label font-semibold text-on-surface text-sm truncate">{client.name}</p>
                      <p className="text-[10px] text-secondary truncate">
                        {isStuck ? 'Research failed or was interrupted' : missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'Processing...'}
                      </p>
                    </Link>
                    <span className={`text-[10px] font-label font-bold px-2.5 py-1 rounded-full ${
                      isStuck ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {isStuck ? 'STUCK' : 'INCOMPLETE'}
                    </span>
                    <Link
                      href={`/research?url=${encodeURIComponent(client.website || '')}&industry=${encodeURIComponent(client.industry || '')}`}
                      className="pill-btn-secondary text-[11px] shrink-0"
                    >
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      Re-run
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Recent clients list */}
        <section className="col-span-12 lg:col-span-8 card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/10">
            <h3 className="font-headline font-bold text-lg text-on-surface">Recent Clients</h3>
            <Link href="/clients" className="text-xs font-label font-bold text-primary hover:underline underline-offset-2">
              View All
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <span className="material-symbols-outlined text-primary text-[32px]" style={{ animation: 'spin 1s linear infinite' }}>
                progress_activity
              </span>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">manage_search</span>
              <p className="font-headline font-bold text-on-surface mb-1">No clients yet</p>
              <p className="text-sm text-secondary mb-6">
                Run your first research to get started. Enter a client website and we will analyze their services, keywords, and competitors.
              </p>
              <Link href="/research" className="pill-btn-primary text-sm">
                <span className="material-symbols-outlined text-[16px]">add</span>
                Start First Research
              </Link>
            </div>
          ) : (
            <div className="px-2 py-2">
              {clients.slice(0, 8).map((client) => (
                <ClientRow key={client.id} client={client} onDelete={handleDelete} />
              ))}
              {clients.length > 8 && (
                <div className="px-4 py-3 text-center border-t border-outline-variant/10">
                  <Link href="/clients" className="text-xs font-label font-bold text-primary hover:underline underline-offset-2">
                    View all {clients.length} clients
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right sidebar */}
        <aside className="col-span-12 lg:col-span-4 space-y-6">
          {/* Quick actions */}
          <div className="card p-6">
            <h3 className="font-headline font-bold mb-4 text-on-surface">Quick Actions</h3>
            <div className="space-y-1">
              {[
                { icon: 'manage_search', label: 'New Client Research', href: '/research', desc: 'Analyze a website & run full pipeline' },
                { icon: 'analytics',     label: 'Competitor Analysis',  href: '/competitors', desc: 'Deep-dive on a specific competitor' },
                { icon: 'groups',        label: 'All Clients',          href: '/clients', desc: 'Browse and manage saved clients' },
                { icon: 'assessment',    label: 'Reports & Exports',    href: '/reports', desc: 'Download CSV, ZIP, or print PDF' },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-low transition-colors group"
                >
                  <div className="w-8 h-8 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/[0.14] transition-colors">
                    <span className="material-symbols-outlined text-primary text-[16px]">{a.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-label font-semibold text-on-surface">{a.label}</p>
                    <p className="text-[11px] text-secondary mt-0.5">{a.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick-add client */}
          <div className="card p-6">
            <h3 className="font-headline font-bold mb-3 text-on-surface">Quick Add Client</h3>
            <form onSubmit={(e) => { e.preventDefault(); if (quickUrl.trim()) router.push(`/research?url=${encodeURIComponent(quickUrl.trim())}`); }}
              className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com"
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                className="field-input flex-1 text-sm"
                required
              />
              <button type="submit" className="pill-btn-primary text-sm shrink-0">
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                Go
              </button>
            </form>
            <p className="text-[10px] text-secondary mt-2">Enter a website to start full research pipeline</p>
          </div>

          {/* Top opportunities */}
          {topOpps.length > 0 && (
            <div className="card p-6">
              <h3 className="font-headline font-bold mb-4 text-on-surface">Top Opportunities</h3>
              <div className="space-y-3">
                {topOpps.map((opp, i) => (
                  <Link key={i} href={`/clients/${opp.clientId}`}
                    className="flex items-start gap-3 hover:bg-surface-low rounded-lg p-2 -mx-2 transition-colors">
                    <div className="w-7 h-7 rounded-md bg-tertiary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-tertiary font-label">
                      {opp.opportunity_score}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-label font-semibold text-on-surface truncate">{opp.keyword}</p>
                      <p className="text-[10px] text-secondary">
                        {opp.clientName} · ${(opp.estimated_cpc || 0).toFixed(2)} CPC · {opp.competition} comp
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <Link href="/reports" className="block mt-4 text-center text-xs font-label font-bold text-primary hover:underline underline-offset-2">
                All Reports &amp; Exports
              </Link>
            </div>
          )}
        </aside>
      </div>

      {/* Inline spin style */}
      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
