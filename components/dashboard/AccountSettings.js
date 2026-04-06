'use client';

import { useState, useEffect } from 'react';

const DEFAULT_SETTINGS = {
  agents: { keyword: true, bid: true, budget: true, ad_copy: true, negative: true },
  bid_adjustment_cap: 20,
  budget_adjustment_cap: 15,
  excluded_campaigns: [],
};

export default function AccountSettings({ accountId, campaigns = [] }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/accounts/${accountId}`)
      .then(r => r.json())
      .then(data => {
        if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      })
      .catch(() => {});
  }, [accountId]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleAgent = (type) => {
    setSettings(prev => ({ ...prev, agents: { ...prev.agents, [type]: !prev.agents[type] } }));
  };

  const toggleExcluded = (campaignId) => {
    setSettings(prev => ({
      ...prev,
      excluded_campaigns: prev.excluded_campaigns.includes(campaignId)
        ? prev.excluded_campaigns.filter(id => id !== campaignId)
        : [...prev.excluded_campaigns, campaignId],
    }));
  };

  const AGENT_LABELS = { keyword: 'Keyword Optimizer', bid: 'Bid Manager', budget: 'Budget Allocator', ad_copy: 'Ad Copy Optimizer', negative: 'Negative Keywords' };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card p-5">
        <p className="font-headline font-bold text-on-surface mb-4">Agent Toggles</p>
        <div className="space-y-3">
          {Object.entries(AGENT_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm font-label text-on-surface">{label}</span>
              <button
                onClick={() => toggleAgent(type)}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.agents[type] ? 'bg-[var(--primary)]' : 'bg-surface-high'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${settings.agents[type] ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <p className="font-headline font-bold text-on-surface mb-1">Bid Adjustment Cap</p>
        <p className="text-xs text-secondary font-label mb-4">Maximum % change per bid adjustment (default ±20%)</p>
        <div className="flex items-center gap-4">
          <input type="range" min={5} max={35} value={settings.bid_adjustment_cap}
            onChange={e => setSettings(prev => ({ ...prev, bid_adjustment_cap: Number(e.target.value) }))}
            className="flex-1 accent-[var(--primary)]" />
          <span className="text-sm font-label font-semibold text-[var(--primary)] w-12 text-right">±{settings.bid_adjustment_cap}%</span>
        </div>
      </div>

      <div className="card p-5">
        <p className="font-headline font-bold text-on-surface mb-1">Budget Adjustment Cap</p>
        <p className="text-xs text-secondary font-label mb-4">Maximum % change per budget adjustment (default ±15%)</p>
        <div className="flex items-center gap-4">
          <input type="range" min={5} max={25} value={settings.budget_adjustment_cap}
            onChange={e => setSettings(prev => ({ ...prev, budget_adjustment_cap: Number(e.target.value) }))}
            className="flex-1 accent-[var(--primary)]" />
          <span className="text-sm font-label font-semibold text-[var(--primary)] w-12 text-right">±{settings.budget_adjustment_cap}%</span>
        </div>
      </div>

      {campaigns.length > 0 && (
        <div className="card p-5">
          <p className="font-headline font-bold text-on-surface mb-1">Excluded Campaigns</p>
          <p className="text-xs text-secondary font-label mb-4">Agents will skip these campaigns entirely</p>
          <div className="space-y-2">
            {campaigns.map(c => (
              <label key={c.id} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.excluded_campaigns.includes(c.id)}
                  onChange={() => toggleExcluded(c.id)} className="accent-[var(--primary)] w-4 h-4" />
                <span className="text-sm font-label text-on-surface">{c.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button onClick={save} disabled={saving} className="pill-btn-primary">
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  );
}
