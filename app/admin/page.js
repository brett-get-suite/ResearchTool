'use client';

import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [tab, setTab] = useState('tenants');
  const [tenants, setTenants] = useState([]);
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTenantName, setNewTenantName] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [editingTenant, setEditingTenant] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/tenants').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/invites').then(r => r.json()),
    ]).then(([t, u, i]) => {
      setTenants(t);
      setUsers(u);
      setInvites(i);
    }).finally(() => setLoading(false));
  }, []);

  const createTenant = async () => {
    if (!newTenantName.trim()) return;
    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTenantName.trim() }),
    });
    if (res.ok) {
      const tenant = await res.json();
      setTenants(prev => [tenant, ...prev]);
      setNewTenantName('');
    }
  };

  const saveTenantName = async (id) => {
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTenants(prev => prev.map(t => t.id === id ? updated : t));
      setEditingTenant(null);
    }
  };

  const deleteTenant = async (id) => {
    if (!confirm('Delete this tenant? All users in it will lose their tenant association.')) return;
    const res = await fetch(`/api/admin/tenants/${id}`, { method: 'DELETE' });
    if (res.ok) setTenants(prev => prev.filter(t => t.id !== id));
  };

  const createInvite = async () => {
    if (!selectedTenantId) return;
    const res = await fetch('/api/admin/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: selectedTenantId }),
    });
    if (res.ok) {
      const invite = await res.json();
      setInviteUrl(invite.url);
      setInvites(prev => [invite, ...prev]);
    }
  };

  const toggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'superadmin' ? 'member' : 'superadmin';
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: newRole }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u));
    }
  };

  const tabs = [
    { id: 'tenants', label: 'Tenants', icon: 'domain' },
    { id: 'users', label: 'Users', icon: 'group' },
    { id: 'invites', label: 'Invites', icon: 'mail' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="material-symbols-outlined text-2xl animate-spin text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-on-surface">Super Admin</h1>
        <p className="text-sm text-on-surface-variant mt-1">Manage tenants, users, and invitations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">{t.icon}</span>
            {t.label}
            <span className="text-xs opacity-70">
              ({t.id === 'tenants' ? tenants.length : t.id === 'users' ? users.length : invites.length})
            </span>
          </button>
        ))}
      </div>

      {/* Tenants Tab */}
      {tab === 'tenants' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={newTenantName}
              onChange={(e) => setNewTenantName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createTenant()}
              placeholder="New tenant name..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none text-sm"
            />
            <button
              onClick={createTenant}
              disabled={!newTenantName.trim()}
              className="px-4 py-2.5 rounded-xl gradient-primary text-on-primary text-sm font-medium disabled:opacity-50"
            >
              Create Tenant
            </button>
          </div>

          <div className="bg-surface-card rounded-2xl divide-y divide-outline-variant/10">
            {tenants.map(t => (
              <div key={t.id} className="flex items-center justify-between px-5 py-4">
                {editingTenant === t.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveTenantName(t.id)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/30 text-sm"
                      autoFocus
                    />
                    <button onClick={() => saveTenantName(t.id)} className="text-primary text-sm font-medium">Save</button>
                    <button onClick={() => setEditingTenant(null)} className="text-on-surface-variant text-sm">Cancel</button>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="text-sm font-medium text-on-surface">{t.name}</div>
                      <div className="text-xs text-on-surface-variant">
                        {users.filter(u => u.tenant_id === t.id).length} users
                        {' \u00b7 '}
                        Created {new Date(t.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingTenant(t.id); setEditName(t.name); }}
                        className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button
                        onClick={() => deleteTenant(t.id)}
                        className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {tenants.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-on-surface-variant">
                No tenants yet. Create one above to start inviting users.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="bg-surface-card rounded-2xl divide-y divide-outline-variant/10">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-sm font-medium text-on-surface">
                  {u.name || u.email}
                  {u.role === 'superadmin' && (
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      SUPER ADMIN
                    </span>
                  )}
                </div>
                <div className="text-xs text-on-surface-variant">
                  {u.email}
                  {u.tenant_id && ` \u00b7 ${tenants.find(t => t.id === u.tenant_id)?.name || 'Unknown tenant'}`}
                </div>
              </div>
              <button
                onClick={() => toggleRole(u.id, u.role)}
                className="text-xs px-3 py-1.5 rounded-lg border border-outline-variant/30 hover:bg-surface-container-high text-on-surface-variant"
              >
                {u.role === 'superadmin' ? 'Demote' : 'Promote'}
              </button>
            </div>
          ))}
          {users.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-on-surface-variant">No users found.</div>
          )}
        </div>
      )}

      {/* Invites Tab */}
      {tab === 'invites' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Send invite to tenant</label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/30 text-sm"
              >
                <option value="">Select a tenant...</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={createInvite}
              disabled={!selectedTenantId}
              className="px-4 py-2.5 rounded-xl gradient-primary text-on-primary text-sm font-medium disabled:opacity-50"
            >
              Generate Link
            </button>
          </div>

          {inviteUrl && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="text-xs font-medium text-primary mb-2">Invite link (expires in 24 hours):</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-container-high text-on-surface text-xs font-mono"
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteUrl); }}
                  className="px-3 py-2 rounded-lg bg-primary text-on-primary text-xs font-medium"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <div className="bg-surface-card rounded-2xl divide-y divide-outline-variant/10">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="text-sm font-medium text-on-surface">
                    {inv.tenants?.name || 'Unknown tenant'}
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    Created by {inv.creator?.email || 'unknown'}
                    {' \u00b7 '}
                    {inv.used_at ? (
                      <span className="text-secondary">Used</span>
                    ) : new Date(inv.expires_at) < new Date() ? (
                      <span className="text-error">Expired</span>
                    ) : (
                      <span className="text-primary">Active</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-on-surface-variant tabular-nums">
                  {new Date(inv.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {invites.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-on-surface-variant">
                No invites sent yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
