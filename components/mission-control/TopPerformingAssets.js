'use client';

import { useRef, useState } from 'react';

const PERF_LABEL = {
  BEST:           { label: 'Best',     badge: 'ds-status-badge--success' },
  GOOD:           { label: 'Good',     badge: 'ds-status-badge--info' },
  LOW:            { label: 'Low',      badge: 'ds-status-badge--error' },
  LEARNING:       { label: 'Learning', badge: 'ds-status-badge--warning' },
  PENDING:        { label: 'Pending',  badge: 'ds-status-badge--muted' },
  NOT_APPLICABLE: { label: 'N/A',      badge: 'ds-status-badge--muted' },
};

const FIELD_TYPE_LABEL = {
  HEADLINE:               'Headline',
  DESCRIPTION:            'Description',
  MARKETING_IMAGE:        'Image',
  SQUARE_MARKETING_IMAGE: 'Image',
  PORTRAIT_MARKETING_IMAGE: 'Image',
  LOGO:                   'Logo',
  LANDSCAPE_LOGO:         'Logo',
  VIDEO:                  'Video',
  YOUTUBE_VIDEO:          'Video',
  LONG_HEADLINE:          'Headline',
  BUSINESS_NAME:          'Business Name',
  CALL_TO_ACTION_SELECTION: 'CTA',
  AD_IMAGE:               'Image',
  BUSINESS_LOGO:          'Logo',
};

function getFieldLabel(fieldType, assetType) {
  if (FIELD_TYPE_LABEL[fieldType]) return FIELD_TYPE_LABEL[fieldType];
  if (assetType === 'IMAGE') return 'Image';
  if (assetType === 'YOUTUBE_VIDEO') return 'Video';
  if (assetType === 'TEXT') return 'Text';
  return fieldType || 'Asset';
}

function AssetCard({ asset }) {
  const perf = PERF_LABEL[asset.performanceLabel] || PERF_LABEL.PENDING;
  const typeLabel = getFieldLabel(asset.fieldType, asset.type);
  const isText = asset.type === 'TEXT' || (!asset.imageUrl && !asset.videoId);
  const isVideo = asset.videoId != null;
  const isImage = asset.imageUrl != null;

  return (
    <div className="bg-surface-container-high rounded-xl overflow-hidden flex-shrink-0 w-[220px] group hover:bg-surface-elevated transition-colors">
      {/* Thumbnail area */}
      <div className="relative h-[130px] bg-surface-container-lowest flex items-center justify-center overflow-hidden">
        {isImage && (
          <img
            src={asset.imageUrl}
            alt={asset.name || 'Ad asset'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {isVideo && (
          <img
            src={`https://img.youtube.com/vi/${asset.videoId}/mqdefault.jpg`}
            alt={asset.name || 'Video asset'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">play_arrow</span>
            </div>
          </div>
        )}
        {isText && (
          <div className="px-4 py-3 flex flex-col items-center justify-center h-full">
            <span className="material-symbols-outlined text-on-surface-variant/30 text-2xl mb-2">
              {asset.fieldType === 'HEADLINE' || asset.fieldType === 'LONG_HEADLINE' ? 'title' : 'notes'}
            </span>
            <p className="text-sm text-on-surface text-center font-medium leading-snug line-clamp-3">
              &ldquo;{asset.text}&rdquo;
            </p>
          </div>
        )}

        {/* Type badge overlay */}
        <span className="absolute top-2 left-2 ds-status-badge ds-status-badge--muted !bg-black/50 !text-white/90 backdrop-blur-sm">
          {typeLabel}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`ds-status-badge ${perf.badge}`}>{perf.label}</span>
        </div>
        <p className="text-xs text-on-surface-variant truncate">{asset.campaignName}</p>
        <p className="text-[11px] text-on-surface-variant/60 truncate">{asset.adGroupName}</p>
      </div>
    </div>
  );
}

export default function TopPerformingAssets({ assets = [], accounts = [], selectedAccount }) {
  const scrollRef = useRef(null);
  const [filter, setFilter] = useState('all');

  // Filter by selected account if provided
  const filtered = selectedAccount
    ? assets.filter(a => a._accountId === selectedAccount)
    : assets;

  // Summary counts
  const counts = { BEST: 0, GOOD: 0, LOW: 0 };
  for (const a of filtered) {
    if (counts[a.performanceLabel] !== undefined) counts[a.performanceLabel]++;
  }

  // Sort: BEST first, then GOOD, then others
  const sorted = [...filtered].sort((a, b) => {
    const rank = { BEST: 6, GOOD: 5, LOW: 4, LEARNING: 3, PENDING: 2 };
    return (rank[b.performanceLabel] || 0) - (rank[a.performanceLabel] || 0);
  });

  // Filter by label if user selected one
  const visible = filter === 'all'
    ? sorted
    : sorted.filter(a => a.performanceLabel === filter);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 240, behavior: 'smooth' });
  };

  return (
    <div className="bg-surface-card rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="ds-section-header flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">auto_awesome</span>
          Top Performing Assets
        </h3>
        <div className="flex items-center gap-3">
          {/* Summary strip */}
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-ds-success font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-ds-success" />{counts.BEST} Best
            </span>
            <span className="flex items-center gap-1.5 text-ds-primary font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-ds-primary" />{counts.GOOD} Good
            </span>
            <span className="flex items-center gap-1.5 text-ds-error font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-ds-error" />{counts.LOW} Low
            </span>
          </div>

          <div className="h-5 w-px bg-outline-variant/20 hidden sm:block" />

          {/* Filter */}
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="text-sm py-1.5 px-3 rounded-xl bg-surface-container-high border border-outline-variant/30"
          >
            <option value="all">All Labels</option>
            <option value="BEST">Best Only</option>
            <option value="GOOD">Good Only</option>
            <option value="LOW">Low Only</option>
          </select>
        </div>
      </div>

      {/* Carousel or empty state */}
      {visible.length === 0 ? (
        <div className="ds-empty-state !py-10">
          <span className="material-symbols-outlined ds-empty-state__icon">auto_awesome</span>
          <p className="ds-empty-state__title">No asset performance data yet</p>
          <p className="ds-empty-state__desc">
            Asset labels are generated by Google after sufficient impressions in Responsive Search Ads and Demand Gen campaigns.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Scroll arrows */}
          {visible.length > 4 && (
            <>
              <button
                onClick={() => scroll(-1)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 rounded-full bg-surface-elevated shadow-card flex items-center justify-center hover:bg-surface-container-highest transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface text-base">chevron_left</span>
              </button>
              <button
                onClick={() => scroll(1)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 rounded-full bg-surface-elevated shadow-card flex items-center justify-center hover:bg-surface-container-highest transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface text-base">chevron_right</span>
              </button>
            </>
          )}

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {visible.map((asset, i) => (
              <AssetCard key={`${asset.id}-${asset.fieldType}-${i}`} asset={asset} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
