'use client';

const STATUS_CLS = {
  enabled: 'text-emerald-600',
  approved: 'text-emerald-600',
  under_review: 'text-amber-600',
  disapproved: 'text-red-600',
};

export default function AdCopyPanel({ ads, accountId }) {
  const grouped = (ads || []).reduce((acc, ad) => {
    const key = ad.ad_group_name || 'Unknown Ad Group';
    if (!acc[key]) acc[key] = [];
    acc[key].push(ad);
    return acc;
  }, {});

  const generateAds = async (adGroupId) => {
    await fetch('/api/agents/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ad_copy', accountId, adGroupId }),
    });
  };

  if (!ads?.length) {
    return <div className="card p-8 text-center text-sm text-secondary font-label">No ad copy data yet — sync your account</div>;
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([adGroup, groupAds]) => (
        <div key={adGroup} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-headline font-bold text-on-surface">{adGroup}</p>
            <button
              onClick={() => generateAds(groupAds[0]?.ad_group_id)}
              className="pill-btn-secondary text-xs"
            >
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              Generate New Ads
            </button>
          </div>
          <div className="space-y-3">
            {groupAds.map(ad => (
              <div key={ad.id} className="p-4 bg-surface-low rounded-xl border border-outline-variant/20">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className={`text-[10px] font-label font-bold uppercase tracking-widest ${STATUS_CLS[ad.status?.toLowerCase()] || 'text-secondary'}`}>
                    {ad.status}
                  </p>
                  {ad.ctr !== undefined && (
                    <p className="text-[10px] font-label text-secondary">CTR: {(ad.ctr * 100).toFixed(1)}%</p>
                  )}
                </div>
                {(ad.headlines || []).length > 0 && (
                  <div className="mb-1">
                    <p className="text-[10px] font-label text-secondary uppercase tracking-widest mb-1">Headlines</p>
                    <div className="flex flex-wrap gap-1">
                      {ad.headlines.map((h, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-label">{h}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(ad.descriptions || []).length > 0 && (
                  <div>
                    <p className="text-[10px] font-label text-secondary uppercase tracking-widest mb-1">Descriptions</p>
                    {ad.descriptions.map((d, i) => (
                      <p key={i} className="text-xs text-on-surface font-label leading-relaxed">{d}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
