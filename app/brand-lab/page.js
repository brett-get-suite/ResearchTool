'use client';

import { useEffect, useState } from 'react';

export default function BrandLabPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [brandProfile, setBrandProfile] = useState(null);
  const [error, setError] = useState(null);

  // Fetch all accounts on mount
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    fetch('/api/accounts', { signal })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setAccounts(list);
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.error('Failed to load accounts:', err);
      });

    return () => controller.abort();
  }, []);

  // When account is selected, fetch its details and check for existing brand_profile
  useEffect(() => {
    if (!selectedAccountId) {
      setSelectedAccount(null);
      setBrandProfile(null);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    fetch(`/api/accounts/${selectedAccountId}`, { signal })
      .then(r => r.json())
      .then(data => {
        setSelectedAccount(data);
        if (data.brand_profile) {
          setBrandProfile(data.brand_profile);
        } else {
          setBrandProfile(null);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.error('Failed to load account:', err);
      });

    return () => controller.abort();
  }, [selectedAccountId]);

  const handleGenerate = async () => {
    if (!selectedAccountId || !url) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/brand-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId, url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setBrandProfile(data.brandProfile);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const accountName = selectedAccount?.name || accounts.find(a => a.id === selectedAccountId)?.name || 'the account';

  return (
    <div className="px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-1">
          Brand Lab
        </h2>
        <p className="text-secondary text-sm">Generate an AI brand identity profile from any website</p>
      </div>

      {/* Account selector */}
      <div className="card p-6 mb-6">
        <label className="block text-sm font-label font-bold text-secondary uppercase tracking-widest mb-3">
          Account
        </label>
        <select
          value={selectedAccountId}
          onChange={e => setSelectedAccountId(e.target.value)}
          className="field-input w-full"
        >
          <option value="">Select an account to associate the brand profile with</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name || 'Unnamed Account'}</option>
          ))}
        </select>
      </div>

      {/* URL input + generate */}
      <div className="card p-6 mb-6">
        <label className="block text-sm font-label font-bold text-secondary uppercase tracking-widest mb-3">
          Website URL
        </label>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Enter website URL (e.g. https://yourbusiness.com)"
            className="field-input flex-1"
            disabled={loading}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !selectedAccountId || !url}
            className="pill-btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Analyzing website...
              </>
            ) : brandProfile ? (
              <>
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Regenerate
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                Generate Brand Identity
              </>
            )}
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-3">{error}</p>
        )}
      </div>

      {/* Results */}
      {brandProfile && (
        <div className="card p-6">
          {/* Brand name + industry */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-headline font-bold text-on-surface leading-tight">
                {brandProfile.brand_name || 'Brand Profile'}
              </h3>
            </div>
            {brandProfile.industry && (
              <span className="shrink-0 text-xs font-label font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary capitalize">
                {brandProfile.industry}
              </span>
            )}
          </div>

          {/* Tone + audience */}
          {(brandProfile.tone_of_voice || brandProfile.target_audience) && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {brandProfile.tone_of_voice && (
                <div>
                  <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1">
                    Tone of Voice
                  </p>
                  <p className="text-sm text-on-surface">{brandProfile.tone_of_voice}</p>
                </div>
              )}
              {brandProfile.target_audience && (
                <div>
                  <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-1">
                    Target Audience
                  </p>
                  <p className="text-sm text-on-surface">{brandProfile.target_audience}</p>
                </div>
              )}
            </div>
          )}

          {/* 3 list sections in 2-col grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Key Terminology */}
            {brandProfile.key_terminology?.length > 0 && (
              <div className="bg-surface-high rounded-xl p-4">
                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">sell</span>
                  Key Terminology
                </p>
                <ul className="space-y-1.5">
                  {brandProfile.key_terminology.map((term, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                      <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-primary" />
                      {term}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Unique Selling Points */}
            {brandProfile.usps?.length > 0 && (
              <div className="bg-surface-high rounded-xl p-4">
                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">star</span>
                  Unique Selling Points
                </p>
                <ul className="space-y-1.5">
                  {brandProfile.usps.map((usp, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                      <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-primary" />
                      {usp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Messaging Pillars — spans full width if alone, otherwise stays in grid */}
            {brandProfile.messaging_pillars?.length > 0 && (
              <div className="bg-surface-high rounded-xl p-4 col-span-2">
                <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">support_agent</span>
                  Messaging Pillars
                </p>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {brandProfile.messaging_pillars.map((pillar, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                      <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-primary" />
                      {pillar}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Apply to account confirmation note */}
          <div className="flex items-center gap-2 text-sm text-secondary border-t border-outline-variant pt-4">
            <span className="material-symbols-outlined text-[16px] text-emerald-500">check_circle</span>
            This profile has been saved to <span className="font-semibold text-on-surface">{accountName}</span>'s settings
          </div>
        </div>
      )}
    </div>
  );
}
