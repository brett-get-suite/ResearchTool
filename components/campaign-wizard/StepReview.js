'use client';

// ─── Summary Row ─────────────────────────────────────────────────────────────

function SummaryRow({ label, value }) {
  return (
    <div className="flex gap-4 py-2 border-b border-outline-variant/10 last:border-0">
      <span className="text-sm text-on-surface-variant w-40 shrink-0">{label}</span>
      <span className="text-sm text-on-surface font-medium break-all">{value || '—'}</span>
    </div>
  );
}

function SummarySection({ title, icon, children }) {
  return (
    <div className="bg-surface-container-high rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary text-[18px]">{icon}</span>
        <h3 className="text-sm font-semibold text-on-surface uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Labels ──────────────────────────────────────────────────────────────────

const STRATEGY_LABELS = {
  prospecting: 'Prospecting',
  brand_protection: 'Brand Protection',
  competitor: 'Competitor Targeting',
};

const TYPE_LABELS = {
  SEARCH: 'Search',
  SHOPPING: 'Shopping',
  PERFORMANCE_MAX: 'Performance Max',
};

const STRUCTURE_LABELS = {
  skag: 'SKAG (Single Keyword Ad Groups)',
  stag: 'STAG (Single Theme Ad Groups)',
};

const BIDDING_LABELS = {
  MAXIMIZE_CONVERSIONS: 'Maximize Conversions',
  TARGET_CPA: 'Target CPA',
  MAXIMIZE_CLICKS: 'Maximize Clicks',
  TARGET_ROAS: 'Target ROAS',
  MANUAL_CPC: 'Manual CPC',
};

// ─── StepReview ──────────────────────────────────────────────────────────────

export default function StepReview({ form, onSubmit, onBack, onExportCSV, submitting, error }) {
  const keywords = (form.keywords || '')
    .split('\n')
    .map((k) => k.trim())
    .filter(Boolean);

  const negatives = (form.negativeKeywords || '')
    .split('\n')
    .map((k) => k.trim())
    .filter(Boolean);

  const filledHeadlines = form.headlines.filter(Boolean);
  const filledDescriptions = form.descriptions.filter(Boolean);
  const filledSitelinks = form.sitelinks.filter((s) => s.headline);
  const filledCallouts = form.callouts.filter(Boolean);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-headline-sm text-on-surface mb-1">Review & Launch</h2>
        <p className="text-sm text-on-surface-variant">
          Review your campaign settings before launching. You can go back to any step to make changes.
        </p>
      </div>

      {/* Strategy & Structure */}
      <SummarySection title="Strategy & Structure" icon="target">
        <SummaryRow label="Strategy" value={STRATEGY_LABELS[form.strategy]} />
        <SummaryRow label="Campaign Type" value={TYPE_LABELS[form.campaignType]} />
        <SummaryRow label="Structure" value={STRUCTURE_LABELS[form.structure]} />
      </SummarySection>

      {/* Keywords */}
      <SummarySection title="Keywords" icon="key">
        <SummaryRow label="Match Type" value={form.matchType} />
        <SummaryRow label="Keywords" value={`${keywords.length} keyword${keywords.length !== 1 ? 's' : ''}`} />
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {keywords.slice(0, 20).map((kw, i) => (
              <span key={i} className="text-xs bg-primary/8 text-primary px-2 py-0.5 rounded-full font-mono">
                {kw}
              </span>
            ))}
            {keywords.length > 20 && (
              <span className="text-xs text-on-surface-variant">+{keywords.length - 20} more</span>
            )}
          </div>
        )}
        <SummaryRow label="Negative Keywords" value={`${negatives.length} negative${negatives.length !== 1 ? 's' : ''}`} />
      </SummarySection>

      {/* Ad Copy */}
      <SummarySection title="Ad Copy & Assets" icon="edit_note">
        <SummaryRow label="Final URL" value={form.finalUrl} />
        <SummaryRow label="Headlines" value={`${filledHeadlines.length}/15`} />
        <SummaryRow label="Descriptions" value={`${filledDescriptions.length}/4`} />
        <SummaryRow label="Landing Page" value={form.landingPageUrl || form.finalUrl} />
        <SummaryRow label="Sitelinks" value={`${filledSitelinks.length}`} />
        <SummaryRow label="Callouts" value={`${filledCallouts.length}`} />
        {form.structuredSnippets.header && (
          <SummaryRow
            label="Snippets"
            value={`${form.structuredSnippets.header}: ${form.structuredSnippets.values.filter(Boolean).length} values`}
          />
        )}

        {/* Mini ad preview */}
        {filledHeadlines.length > 0 && (
          <div className="mt-3 bg-surface-container rounded-lg p-3">
            <div className="bg-white rounded-md p-2.5">
              <p className="text-[#1a0dab] font-medium text-sm">
                {filledHeadlines.slice(0, 3).join(' | ')}
              </p>
              <p className="text-[#006621] text-xs mt-0.5">
                {form.finalUrl || 'https://yourwebsite.com'}
              </p>
              <p className="text-[#545454] text-xs mt-0.5">
                {filledDescriptions.slice(0, 2).join(' ')}
              </p>
            </div>
          </div>
        )}
      </SummarySection>

      {/* Targeting */}
      <SummarySection title="Targeting" icon="my_location">
        <SummaryRow
          label="Locations"
          value={form.locations.length > 0 ? form.locations.join(', ') : 'All locations'}
        />
        <SummaryRow
          label="Languages"
          value={form.languages.length > 0 ? form.languages.join(', ').toUpperCase() : 'English'}
        />
        <SummaryRow
          label="Age Ranges"
          value={form.ageRanges.length > 0 ? form.ageRanges.join(', ') : 'All ages'}
        />
        <SummaryRow
          label="Genders"
          value={form.genders.length > 0 ? form.genders.join(', ') : 'All genders'}
        />
        {form.startDate && <SummaryRow label="Start Date" value={form.startDate} />}
        {form.endDate && <SummaryRow label="End Date" value={form.endDate} />}
        <SummaryRow
          label="Dayparting"
          value={
            Object.values(form.daypartSchedule || {}).some((h) => h?.length > 0)
              ? 'Custom schedule configured'
              : '24/7 (no restrictions)'
          }
        />
      </SummarySection>

      {/* Budget */}
      <SummarySection title="Budget & Bidding" icon="payments">
        <SummaryRow label="Campaign Name" value={form.name} />
        <SummaryRow label="Daily Budget" value={form.dailyBudget ? `$${Number(form.dailyBudget).toLocaleString()}` : '—'} />
        <SummaryRow
          label="Monthly Est."
          value={form.dailyBudget ? `~$${(parseFloat(form.dailyBudget) * 30.4).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
        />
        <SummaryRow label="Bidding" value={BIDDING_LABELS[form.biddingStrategy]} />
        {form.biddingStrategy === 'TARGET_CPA' && form.targetCpaMicros && (
          <SummaryRow label="Target CPA" value={`$${form.targetCpaMicros}`} />
        )}
        {form.biddingStrategy === 'TARGET_ROAS' && form.targetRoas && (
          <SummaryRow label="Target ROAS" value={`${form.targetRoas}%`} />
        )}
        {form.biddingStrategy === 'MANUAL_CPC' && form.maxCpcBid && (
          <SummaryRow label="Max CPC" value={`$${form.maxCpcBid}`} />
        )}
        <SummaryRow label="Launch Status" value={form.status === 'PAUSED' ? 'Paused' : 'Enabled'} />
      </SummarySection>

      {/* Error */}
      {error && (
        <div className="bg-error/15 rounded-lg p-3 flex gap-2.5">
          <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">error</span>
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 mt-2">
        <button type="button" onClick={onBack} className="pill-btn-secondary flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back
        </button>
        <div className="flex items-center gap-3">
          {onExportCSV && (
            <button
              type="button"
              onClick={onExportCSV}
              className="pill-btn-secondary flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export CSV
            </button>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="pill-btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Creating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                Launch Campaign
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
