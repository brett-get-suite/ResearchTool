'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getClients, deleteClient, isSupabaseConfigured } from '@/lib/supabase';

const INDUSTRY_ICONS = {
  Plumbing: 'plumbing', HVAC: 'hvac', Electrical: 'bolt',
  Roofing: 'roofing', Landscaping: 'yard', default: 'build',
};

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    getClients().then(setClients).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}" and all their research data?`)) return;
    await deleteClient(id);
    setClients(p => p.filter(c => c.id !== id));
  };

  const filtered = clients.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.website.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || c.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="px-8 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-1">Client Management</h2>
          <p className="text-secondary text-sm">Browse and manage all saved research clients.</p>
        </div>
        <Link href="/research" className="pill-btn-primary">
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Research
        </Link>
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            className="field-input pl-10"
            placeholder="Search clients or websites..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-surface-high rounded-lg p-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'complete', label: 'Complete' },
            { id: 'draft', label: 'Draft' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-label font-semibold transition-colors ${
                filter === f.id ? 'bg-white shadow-card text-on-surface' : 'text-secondary hover:text-on-surface'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!isSupabaseConfigured() ? (
        <div className="card p-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">cloud_off</span>
          <p className="font-headline font-bold text-on-surface mb-1">Supabase not configured</p>
          <p className="text-sm text-secondary">Add your Supabase environment variables to enable client storage.</p>
        </div>
      ) : loading ? (
        <div className="card p-12 text-center">
          <span className="material-symbols-outlined text-primary text-[40px] animate-spin">progress_activity</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">groups</span>
          <p className="font-headline font-bold text-on-surface mb-1">{search ? 'No matches found' : 'No clients yet'}</p>
          <p className="text-sm text-secondary mb-6">{search ? 'Try a different search term' : 'Run your first research to create a client record'}</p>
          {!search && (
            <Link href="/research" className="pill-btn-primary text-sm">
              <span className="material-symbols-outlined text-[16px]">add</span>
              New Research
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Industry</th>
                <th>Service Areas</th>
                <th>Keywords</th>
                <th>Opportunities</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => {
                const icon = INDUSTRY_ICONS[client.industry] || INDUSTRY_ICONS.default;
                const kws = client.keyword_data?.keyword_groups?.flatMap(g => g.keywords).length || 0;
                const opps = client.low_hanging_fruit?.top_opportunities?.length || 0;
                const date = client.updated_at ? new Date(client.updated_at).toLocaleDateString() : '—';
                return (
                  <tr key={client.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary text-[16px]">{icon}</span>
                        </div>
                        <div>
                          <p className="font-label font-semibold text-on-surface text-sm">{client.name}</p>
                          <p className="text-[11px] text-secondary truncate max-w-[180px]">{client.website}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-on-variant font-label">{client.industry}</td>
                    <td className="text-sm text-on-variant font-label">
                      {(client.service_areas || []).slice(0, 2).join(', ')}
                      {(client.service_areas || []).length > 2 && ` +${client.service_areas.length - 2}`}
                    </td>
                    <td className="font-mono text-sm font-semibold text-on-surface">{kws || '—'}</td>
                    <td className="font-mono text-sm font-semibold text-on-surface">{opps || '—'}</td>
                    <td>
                      <span className={`text-[10px] font-label font-bold px-2.5 py-1 rounded-full ${
                        client.status === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                        client.status === 'analyzing' ? 'bg-amber-100 text-amber-700' :
                        'bg-surface-high text-secondary'
                      }`}>
                        {(client.status || 'draft').toUpperCase()}
                      </span>
                    </td>
                    <td className="text-xs text-secondary font-label">{date}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link href={`/clients/${client.id}`} className="p-1.5 hover:bg-surface-high rounded-lg transition-colors" title="View">
                          <span className="material-symbols-outlined text-[18px] text-secondary">open_in_new</span>
                        </Link>
                        <Link href={`/reports?client=${client.id}`} className="p-1.5 hover:bg-surface-high rounded-lg transition-colors" title="Export">
                          <span className="material-symbols-outlined text-[18px] text-secondary">download</span>
                        </Link>
                        <button onClick={() => handleDelete(client.id, client.name)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <span className="material-symbols-outlined text-[18px] text-error">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-6 py-3 border-t border-outline-variant/10 bg-surface-low">
            <p className="text-xs text-secondary font-label">{filtered.length} of {clients.length} clients</p>
          </div>
        </div>
      )}
    </div>
  );
}
