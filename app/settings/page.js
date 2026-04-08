'use client';

import { useState } from 'react';
import GradientButton from '@/components/ui/GradientButton';
import GhostButton from '@/components/ui/GhostButton';
import TabNav from '@/components/ui/TabNav';

const TABS = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'integrations', label: 'Integrations', icon: 'extension' },
  { id: 'api', label: 'API Keys', icon: 'key' },
  { id: 'team', label: 'Team', icon: 'group' },
];

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-start justify-between gap-8 py-5 border-b border-outline-variant/10 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-on-surface">{label}</p>
        {description && <p className="text-xs text-on-surface-variant mt-1">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="space-y-6 fade-up max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Settings</h1>
        <p className="text-sm text-on-surface-variant mt-1">Manage your AdPilot configuration</p>
      </div>

      <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'general' && (
        <div className="bg-surface-container rounded-2xl p-6">
          <SettingRow label="Platform Name" description="Displayed in the sidebar and reports">
            <input
              type="text"
              defaultValue="AdPilot"
              className="px-3 py-2 rounded-xl bg-surface-container-high text-on-surface text-sm border border-outline-variant/20 focus:border-primary/40 focus:outline-none w-48"
            />
          </SettingRow>
          <SettingRow label="Default Date Range" description="Used as default across all dashboards">
            <select className="px-3 py-2 rounded-xl bg-surface-container-high text-on-surface text-sm border border-outline-variant/20 focus:outline-none">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </SettingRow>
          <SettingRow label="Currency" description="Used for cost and budget display">
            <select className="px-3 py-2 rounded-xl bg-surface-container-high text-on-surface text-sm border border-outline-variant/20 focus:outline-none">
              <option>USD ($)</option>
              <option>EUR (&euro;)</option>
              <option>GBP (&pound;)</option>
            </select>
          </SettingRow>
          <SettingRow label="AI Model" description="Primary model for analysis and recommendations">
            <select className="px-3 py-2 rounded-xl bg-surface-container-high text-on-surface text-sm border border-outline-variant/20 focus:outline-none">
              <option>Gemini 2.5 Flash</option>
              <option>Gemini 2.5 Pro</option>
            </select>
          </SettingRow>
          <div className="pt-4 flex justify-end gap-3">
            <GhostButton>Cancel</GhostButton>
            <GradientButton>Save Changes</GradientButton>
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="bg-surface-container rounded-2xl p-6">
          <div className="space-y-4">
            {[
              { name: 'Google Ads', icon: 'ads_click', status: 'connected', desc: 'Manage campaigns and sync performance data' },
              { name: 'Google Analytics', icon: 'analytics', status: 'not_connected', desc: 'Import conversion and audience data' },
              { name: 'Google Search Console', icon: 'travel_explore', status: 'not_connected', desc: 'Organic keyword and ranking data' },
            ].map((integration) => (
              <div key={integration.name} className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-low">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-xl">{integration.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-on-surface">{integration.name}</p>
                  <p className="text-xs text-on-surface-variant">{integration.desc}</p>
                </div>
                {integration.status === 'connected' ? (
                  <span className="px-3 py-1 rounded-pill bg-secondary/15 text-secondary text-xs font-medium">Connected</span>
                ) : (
                  <GradientButton className="text-xs px-3 py-1.5">Connect</GradientButton>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="bg-surface-container rounded-2xl p-6">
          <SettingRow label="Gemini API Key" description="Required for AI-powered analysis and recommendations">
            <input
              type="password"
              defaultValue="AIza...hidden"
              className="px-3 py-2 rounded-xl bg-surface-container-high text-on-surface text-sm border border-outline-variant/20 focus:border-primary/40 focus:outline-none w-56 font-mono"
            />
          </SettingRow>
          <SettingRow label="Google Ads Developer Token" description="Required for API access to Google Ads">
            <input
              type="password"
              defaultValue="***hidden***"
              className="px-3 py-2 rounded-xl bg-surface-container-high text-on-surface text-sm border border-outline-variant/20 focus:border-primary/40 focus:outline-none w-56 font-mono"
            />
          </SettingRow>
          <div className="pt-4 flex justify-end gap-3">
            <GhostButton>Cancel</GhostButton>
            <GradientButton>Save Keys</GradientButton>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="bg-surface-container rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-on-surface-variant">Manage who has access to your AdPilot workspace.</p>
            <GradientButton className="text-xs">
              <span className="material-symbols-outlined text-sm">person_add</span>
              Invite
            </GradientButton>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Admin', email: 'admin@adpilot.ai', role: 'Owner' },
            ].map((member) => (
              <div key={member.email} className="flex items-center gap-4 p-3 rounded-xl bg-surface-container-low">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-base">person</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-on-surface">{member.name}</p>
                  <p className="text-xs text-on-surface-variant">{member.email}</p>
                </div>
                <span className="text-xs text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded-pill">{member.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
