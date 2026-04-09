'use client';

import { useState } from 'react';
import { AGENT_TYPES, AGENT_TYPE_KEYS, getDefaultScheduleConfig, GUARDRAIL_DEFAULTS } from '@/lib/agent-config';
import GradientButton from '@/components/ui/GradientButton';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'on-demand', label: 'On-demand' },
];

export default function ScheduleConfig({ accountId, initialConfig, onSave }) {
  const [config, setConfig] = useState(() => initialConfig || getDefaultScheduleConfig());
  const [guardrails, setGuardrails] = useState(() => initialConfig?.guardrails || { ...GUARDRAIL_DEFAULTS });
  const [saving, setSaving] = useState(false);

  function toggleAgent(type) {
    setConfig((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type]?.enabled },
    }));
  }

  function setFrequency(type, frequency) {
    setConfig((prev) => ({
      ...prev,
      [type]: { ...prev[type], frequency },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...config, guardrails };
      await onSave?.(payload);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-lg">schedule</span>
        Agent Scheduling &amp; Guardrails
      </h3>

      {/* Agent schedule table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-label-sm text-on-surface-variant">
              <th className="text-left py-2 pr-4">Agent</th>
              <th className="text-left py-2 pr-4">Enabled</th>
              <th className="text-left py-2 pr-4">Frequency</th>
              <th className="text-left py-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {AGENT_TYPE_KEYS.map((type) => {
              const agentDef = AGENT_TYPES[type];
              const agentConfig = config[type] || {};
              return (
                <tr key={type} className="bg-surface-container even:bg-surface-container-low/30">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-on-surface-variant">
                        {agentDef.icon}
                      </span>
                      <span className="text-on-surface font-medium">{agentDef.label}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => toggleAgent(type)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        agentConfig.enabled ? 'bg-secondary' : 'bg-surface-container-high'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${
                        agentConfig.enabled ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={agentConfig.frequency || agentDef.defaultFrequency}
                      onChange={(e) => setFrequency(type, e.target.value)}
                      disabled={type === 'brand'}
                      className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface text-sm outline-none disabled:opacity-50"
                    >
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 text-xs text-on-surface-variant">{agentDef.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Guardrails */}
      <div className="space-y-4 mb-6">
        <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Guardrails</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-on-surface-variant block mb-1">Max Daily Budget Cap ($)</label>
            <input
              type="number"
              value={guardrails.maxDailyBudgetCap || ''}
              onChange={(e) => setGuardrails((g) => ({ ...g, maxDailyBudgetCap: e.target.value ? Number(e.target.value) : null }))}
              placeholder="No cap"
              className="w-full px-3 py-2 rounded-lg bg-surface-container-high text-on-surface text-sm outline-none placeholder-on-surface-variant"
            />
          </div>
          <div>
            <label className="text-xs text-on-surface-variant block mb-1">Max Bid Ceiling ($ per click)</label>
            <input
              type="number"
              step="0.01"
              value={guardrails.maxBidCeiling || ''}
              onChange={(e) => setGuardrails((g) => ({ ...g, maxBidCeiling: e.target.value ? Number(e.target.value) : null }))}
              placeholder="No cap"
              className="w-full px-3 py-2 rounded-lg bg-surface-container-high text-on-surface text-sm outline-none placeholder-on-surface-variant"
            />
          </div>
          <div>
            <label className="text-xs text-on-surface-variant block mb-1">Require Approval Above ($)</label>
            <input
              type="number"
              value={guardrails.requireApprovalAbove || ''}
              onChange={(e) => setGuardrails((g) => ({ ...g, requireApprovalAbove: e.target.value ? Number(e.target.value) : null }))}
              placeholder="No threshold"
              className="w-full px-3 py-2 rounded-lg bg-surface-container-high text-on-surface text-sm outline-none placeholder-on-surface-variant"
            />
          </div>
          <div>
            <label className="text-xs text-on-surface-variant block mb-1">Excluded Campaign IDs (comma-separated)</label>
            <input
              type="text"
              value={(guardrails.excludedCampaignIds || []).join(', ')}
              onChange={(e) => setGuardrails((g) => ({
                ...g,
                excludedCampaignIds: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : [],
              }))}
              placeholder="None"
              className="w-full px-3 py-2 rounded-lg bg-surface-container-high text-on-surface text-sm outline-none placeholder-on-surface-variant"
            />
          </div>
        </div>
      </div>

      <GradientButton onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Schedule & Guardrails'}
      </GradientButton>
    </div>
  );
}
