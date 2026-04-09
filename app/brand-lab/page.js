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
  const [editing, setEditing] = useState(false);
  const [editProfile, setEditProfile] = useState(null);
  const [showAdPreview, setShowAdPreview] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/accounts', { signal: controller.signal })
      .then(r => r.json())
      .then(data => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedAccountId) { setSelectedAccount(null); setBrandProfile(null); return; }
    const controller = new AbortController();
    fetch(`/api/accounts/${selectedAccountId}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        setSelectedAccount(data);
        setBrandProfile(data.brand_profile || null);
        setEditProfile(data.brand_profile ? { ...data.brand_profile } : null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [selectedAccountId]);

  const handleGenerate = async () => {
    if (!selectedAccountId || !url) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/brand-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId, url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setBrandProfile(data.brandProfile);
      setEditProfile({ ...data.brandProfile });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSaveEdits = async () => {
    if (!selectedAccountId || !editProfile) return;
    try {
      await fetch(`/api/accounts/${selectedAccountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_profile: editProfile }),
      });
      setBrandProfile(editProfile);
      setEditing(false);
    } catch (err) { setError(err.message); }
  };

  const accountName = selectedAccount?.name || accounts.find(a => a.id === selectedAccountId)?.name || 'the account';

  // Find accounts with existing brand profiles
  const accountsWithProfiles = accounts.filter(a => a.brand_profile);

  // Sample ad headlines from brand profile
  const sampleAds = brandProfile ? [
    { headline: `${brandProfile.brand_name || 'Expert'} ${brandProfile.industry || 'Services'} | ${(brandProfile.usps || ['Trusted Pros'])[0]}`, desc: `${(brandProfile.messaging_pillars || ['Professional service'])[0]}. Call today for a free estimate!` },
    { headline: `${(brandProfile.key_terminology || ['Professional'])[0]} ${brandProfile.industry || ''} Services`, desc: `${brandProfile.target_audience || 'Homeowners'} trust ${brandProfile.brand_name || 'us'}. ${(brandProfile.usps || ['Licensed & insured'])[1] || 'Same-day service'}.` },
    { headline: `Need ${brandProfile.industry || 'Help'}? ${brandProfile.brand_name || 'We'} Can Help`, desc: `${(brandProfile.messaging_pillars || ['Quality work'])[1] || 'Quality work guaranteed'}. Serving your area with ${(brandProfile.tone_of_voice || 'professional').toLowerCase()} service.` },
  ] : [];

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-on-surface mb-1">Brand Lab</h2>
          <p className="text-on-surface-variant text-sm">Generate and manage AI brand identity profiles</p>
        </div>
      </div>

      {/* Existing Brand Profiles */}
      {accountsWithProfiles.length > 0 && !selectedAccountId && (
        <div className="bg-surface-container rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/10">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">diamond</span>
              Existing Brand Profiles ({accountsWithProfiles.length})
            </h3>
          </div>
          <div className="divide-y divide-outline-variant/5">
            {accountsWithProfiles.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedAccountId(a.id)}
                className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-surface-container-high transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-lg">palette</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-on-surface">{a.name}</div>
                  <div className="text-xs text-on-surface-variant">
                    {a.brand_profile?.brand_name} &middot; {a.brand_profile?.industry || 'N/A'}
                    {a.brand_profile?.tone_of_voice && ` &middot; ${a.brand_profile.tone_of_voice}`}
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Account selector */}
      <div className="bg-surface-container rounded-xl p-6">
        <label className="text-label-sm text-on-surface-variant block mb-3">Account</label>
        <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full text-sm py-2.5 px-3 rounded-xl bg-surface-container-high border border-outline-variant/20">
          <option value="">Select an account</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name || 'Unnamed Account'}</option>)}
        </select>
      </div>

      {/* URL input + generate (only if no existing profile) */}
      {selectedAccountId && (
        <div className="bg-surface-container rounded-xl p-6">
          <label className="text-label-sm text-on-surface-variant block mb-3">Website URL</label>
          <div className="flex gap-3">
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yourbusiness.com" className="flex-1 text-sm py-2.5 px-3 rounded-xl bg-surface-container-high border border-outline-variant/20" disabled={loading} />
            <button onClick={handleGenerate} disabled={loading || !url} className="pill-btn-primary disabled:opacity-50 whitespace-nowrap">
              {loading ? (<><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Analyzing...</>) :
                brandProfile ? (<><span className="material-symbols-outlined text-[18px]">refresh</span>Regenerate</>) :
                (<><span className="material-symbols-outlined text-[18px]">auto_awesome</span>Generate Brand Identity</>)}
            </button>
          </div>
          {error && <p className="text-xs text-error mt-3">{error}</p>}
        </div>
      )}

      {/* Brand Profile Display */}
      {brandProfile && (
        <div className="bg-surface-container rounded-xl p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-on-surface">{brandProfile.brand_name || 'Brand Profile'}</h3>
              {brandProfile.industry && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize mt-1 inline-block">{brandProfile.industry}</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(!editing); setEditProfile({ ...brandProfile }); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/10 transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{editing ? 'close' : 'edit'}</span>
                {editing ? 'Cancel' : 'Edit'}
              </button>
              {editing && (
                <button onClick={handleSaveEdits} className="pill-btn-primary text-xs">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>save</span>
                  Save
                </button>
              )}
            </div>
          </div>

          {/* Tone + Audience */}
          <div className="grid grid-cols-2 gap-6">
            {brandProfile.tone_of_voice && (
              <div>
                <p className="text-label-sm text-on-surface-variant mb-1">Tone of Voice</p>
                {editing ? (
                  <input value={editProfile?.tone_of_voice || ''} onChange={e => setEditProfile(p => ({ ...p, tone_of_voice: e.target.value }))} className="text-sm py-2 px-3 rounded-lg bg-surface-container-high border-outline-variant/20 w-full" />
                ) : (
                  <p className="text-sm text-on-surface">{brandProfile.tone_of_voice}</p>
                )}
              </div>
            )}
            {brandProfile.target_audience && (
              <div>
                <p className="text-label-sm text-on-surface-variant mb-1">Target Audience</p>
                {editing ? (
                  <input value={editProfile?.target_audience || ''} onChange={e => setEditProfile(p => ({ ...p, target_audience: e.target.value }))} className="text-sm py-2 px-3 rounded-lg bg-surface-container-high border-outline-variant/20 w-full" />
                ) : (
                  <p className="text-sm text-on-surface">{brandProfile.target_audience}</p>
                )}
              </div>
            )}
          </div>

          {/* Key Terminology + USPs */}
          <div className="grid grid-cols-2 gap-4">
            {brandProfile.key_terminology?.length > 0 && (
              <div className="bg-surface-container-high rounded-xl p-4">
                <p className="text-label-sm text-on-surface-variant mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>sell</span>
                  Key Terminology
                </p>
                <div className="flex flex-wrap gap-2">
                  {(editing ? editProfile : brandProfile).key_terminology.map((term, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/15">{term}</span>
                  ))}
                </div>
              </div>
            )}
            {brandProfile.usps?.length > 0 && (
              <div className="bg-surface-container-high rounded-xl p-4">
                <p className="text-label-sm text-on-surface-variant mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>star</span>
                  Unique Selling Points
                </p>
                <ul className="space-y-1.5">
                  {(editing ? editProfile : brandProfile).usps.map((usp, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />
                      {usp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Messaging Pillars */}
          {brandProfile.messaging_pillars?.length > 0 && (
            <div className="bg-surface-container-high rounded-xl p-4">
              <p className="text-label-sm text-on-surface-variant mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>support_agent</span>
                Messaging Pillars
              </p>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {(editing ? editProfile : brandProfile).messaging_pillars.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-tertiary flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-on-surface-variant border-t border-outline-variant/20 pt-4">
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: 16 }}>check_circle</span>
            Saved to <span className="font-semibold text-on-surface">{accountName}</span>
          </div>
        </div>
      )}

      {/* Ad Copy Preview */}
      {brandProfile && (
        <div className="bg-surface-container rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">preview</span>
              Ad Copy Preview
            </h3>
            <span className="text-xs text-on-surface-variant">Generated from brand profile</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sampleAds.map((ad, i) => (
              <div key={i} className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/10">
                <p className="text-sm font-semibold text-primary mb-1 line-clamp-2">{ad.headline}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{ad.desc}</p>
                <div className="mt-3 pt-2 border-t border-outline-variant/10 flex items-center gap-1">
                  <span className="text-[10px] text-secondary font-medium">Ad</span>
                  <span className="text-[10px] text-on-surface-variant">&middot; {brandProfile.brand_name || accountName}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-on-surface-variant mt-3">These are sample ads the Ad Copy Agent would generate. Enable the agent to start testing variations.</p>
        </div>
      )}
    </div>
  );
}
