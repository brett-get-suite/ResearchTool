'use client';

import { use, useState } from 'react';
import Link from 'next/link';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ['Campaign Settings', 'Keywords', 'Ad Copy', 'Review & Launch'];

const BIDDING_STRATEGIES = [
  { value: 'MAXIMIZE_CONVERSIONS', label: 'Maximize Conversions' },
  { value: 'TARGET_CPA',           label: 'Target CPA' },
  { value: 'MANUAL_CPC',           label: 'Manual CPC' },
];

const MATCH_TYPES = [
  { value: 'EXACT',  label: 'Exact' },
  { value: 'PHRASE', label: 'Phrase' },
  { value: 'BROAD',  label: 'Broad' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseKeywords(raw) {
  return raw
    .split('\n')
    .map((k) => k.trim())
    .filter(Boolean);
}

function formatKeyword(kw, matchType) {
  if (matchType === 'EXACT')  return `[${kw}]`;
  if (matchType === 'PHRASE') return `"${kw}"`;
  return kw;
}

function CharCounter({ value, max }) {
  const len = value?.length || 0;
  const over = len > max;
  return (
    <span className={`text-xs ml-auto ${over ? 'text-error font-medium' : 'text-on-surface/40'}`}>
      {len}/{max}
    </span>
  );
}

// ─── Ad Preview ───────────────────────────────────────────────────────────────

function AdPreview({ headlines, descriptions, finalUrl }) {
  return (
    <div className="border border-outline-variant/20 rounded-lg p-4 bg-surface-high text-sm">
      <p className="text-[#1a0dab] font-medium">
        {headlines.filter(Boolean).join(' | ') || 'Your Headline 1 | Headline 2 | Headline 3'}
      </p>
      <p className="text-[#006621] text-xs mt-0.5">
        {finalUrl || 'https://yourwebsite.com'}
      </p>
      <p className="text-on-surface/80 mt-1">
        {descriptions.filter(Boolean).join(' ') || 'Your ad description will appear here.'}
      </p>
    </div>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ step }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <div key={s} className="contents">
          <div className={`flex items-center gap-2 ${i + 1 <= step ? 'text-primary' : 'text-on-surface/40'}`}>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                ${i + 1 < step
                  ? 'bg-primary text-white'
                  : i + 1 === step
                  ? 'bg-primary/10 text-primary border border-primary'
                  : 'bg-surface-high text-on-surface/40'}`}
            >
              {i + 1 < step
                ? <span className="material-symbols-outlined text-[16px]">check</span>
                : i + 1}
            </div>
            <span className="text-sm font-label font-medium whitespace-nowrap">{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-px ${i + 1 < step ? 'bg-primary' : 'bg-outline-variant/20'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Campaign Settings ────────────────────────────────────────────────

function StepCampaignSettings({ form, onChange }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="field-label">Campaign Name <span className="text-error">*</span></label>
        <input
          type="text"
          className="field-input mt-1"
          placeholder="e.g. Summer Sale 2025"
          value={form.name}
          onChange={(e) => onChange('name', e.target.value)}
        />
      </div>

      <div>
        <label className="field-label">Daily Budget (USD) <span className="text-error">*</span></label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/50 text-sm">$</span>
          <input
            type="number"
            className="field-input pl-7"
            placeholder="50"
            min="1"
            step="1"
            value={form.dailyBudget}
            onChange={(e) => onChange('dailyBudget', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="field-label">Bidding Strategy</label>
        <select
          className="field-input mt-1"
          value={form.biddingStrategy}
          onChange={(e) => onChange('biddingStrategy', e.target.value)}
        >
          {BIDDING_STRATEGIES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {form.biddingStrategy === 'TARGET_CPA' && (
        <div>
          <label className="field-label">Target CPA (USD)</label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/50 text-sm">$</span>
            <input
              type="number"
              className="field-input pl-7"
              placeholder="25"
              min="1"
              step="0.01"
              value={form.targetCpaMicros}
              onChange={(e) => onChange('targetCpaMicros', e.target.value)}
            />
          </div>
        </div>
      )}

      <div>
        <label className="field-label">Status</label>
        <select
          className="field-input mt-1"
          value={form.status}
          onChange={(e) => onChange('status', e.target.value)}
        >
          <option value="PAUSED">Paused (recommended)</option>
          <option value="ENABLED">Enabled</option>
        </select>
        <p className="text-xs text-on-surface/50 mt-1.5">
          Start paused to review before spending budget.
        </p>
      </div>
    </div>
  );
}

// ─── Step 2: Keywords ─────────────────────────────────────────────────────────

function StepKeywords({ form, onChange }) {
  const parsed = parseKeywords(form.keywords);

  return (
    <div className="space-y-5">
      <div>
        <label className="field-label">Ad Group Name <span className="text-error">*</span></label>
        <input
          type="text"
          className="field-input mt-1"
          placeholder="e.g. Brand Keywords"
          value={form.adGroupName}
          onChange={(e) => onChange('adGroupName', e.target.value)}
        />
      </div>

      <div>
        <label className="field-label">Match Type (applied to all keywords)</label>
        <select
          className="field-input mt-1"
          value={form.matchType}
          onChange={(e) => onChange('matchType', e.target.value)}
        >
          {MATCH_TYPES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label">Keywords <span className="text-error">*</span></label>
        <p className="text-xs text-on-surface/50 mb-1.5">One keyword per line.</p>
        <textarea
          className="field-input mt-1 h-36 resize-none font-mono text-sm"
          placeholder={"running shoes\nbest sneakers\nbuy shoes online"}
          value={form.keywords}
          onChange={(e) => onChange('keywords', e.target.value)}
        />
      </div>

      {parsed.length > 0 && (
        <div>
          <p className="text-sm font-label font-medium text-on-surface/60 mb-2">
            Preview — {parsed.length} keyword{parsed.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {parsed.map((kw, i) => (
              <span
                key={i}
                className="text-xs bg-primary/8 text-primary px-2.5 py-1 rounded-full font-mono"
              >
                {formatKeyword(kw, form.matchType)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-tertiary/10 border border-tertiary/20 rounded-lg p-3 flex gap-2.5">
        <span className="material-symbols-outlined text-amber-500 text-[18px] shrink-0 mt-0.5">info</span>
        <p className="text-xs text-amber-800">
          Keywords and ad groups will be saved to your account after the campaign is created.
          You can manage them from the Campaigns tab.
        </p>
      </div>
    </div>
  );
}

// ─── Step 3: Ad Copy ──────────────────────────────────────────────────────────

function StepAdCopy({ form, onChange }) {
  const updateHeadline = (i, val) => {
    const next = [...form.headlines];
    next[i] = val;
    onChange('headlines', next);
  };

  const updateDescription = (i, val) => {
    const next = [...form.descriptions];
    next[i] = val;
    onChange('descriptions', next);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="field-label">Final URL <span className="text-error">*</span></label>
        <input
          type="url"
          className="field-input mt-1"
          placeholder="https://yourwebsite.com/landing-page"
          value={form.finalUrl}
          onChange={(e) => onChange('finalUrl', e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <label className="field-label">Headlines (max 30 chars each) <span className="text-error">*</span></label>
        {form.headlines.map((h, i) => (
          <div key={i}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-on-surface/50 font-label">Headline {i + 1}{i < 2 ? ' *' : ''}</span>
              <CharCounter value={h} max={30} />
            </div>
            <input
              type="text"
              className="field-input"
              placeholder={`Headline ${i + 1}`}
              maxLength={30}
              value={h}
              onChange={(e) => updateHeadline(i, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <label className="field-label">Descriptions (max 90 chars each) <span className="text-error">*</span></label>
        {form.descriptions.map((d, i) => (
          <div key={i}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-on-surface/50 font-label">Description {i + 1} *</span>
              <CharCounter value={d} max={90} />
            </div>
            <input
              type="text"
              className="field-input"
              placeholder={`Description ${i + 1}`}
              maxLength={90}
              value={d}
              onChange={(e) => updateDescription(i, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div>
        <p className="text-sm font-label font-medium text-on-surface/60 mb-2">Ad Preview</p>
        <AdPreview
          headlines={form.headlines}
          descriptions={form.descriptions}
          finalUrl={form.finalUrl}
        />
      </div>
    </div>
  );
}

// ─── Step 4: Review & Launch ──────────────────────────────────────────────────

function SummaryRow({ label, value }) {
  return (
    <div className="flex gap-4 py-2 border-b border-outline-variant/10 last:border-0">
      <span className="text-sm text-on-surface/50 w-36 shrink-0">{label}</span>
      <span className="text-sm text-on-surface font-medium break-all">{value || '—'}</span>
    </div>
  );
}

function StepReview({ form, onSubmit, onBack, submitting, error }) {
  const parsed = parseKeywords(form.keywords);
  const strategy = BIDDING_STRATEGIES.find((s) => s.value === form.biddingStrategy)?.label || form.biddingStrategy;

  return (
    <div className="space-y-6">
      {/* Campaign */}
      <div className="card p-5">
        <h3 className="text-sm font-label font-semibold text-on-surface/60 uppercase tracking-wide mb-3">
          Campaign Settings
        </h3>
        <SummaryRow label="Name" value={form.name} />
        <SummaryRow label="Daily Budget" value={`$${Number(form.dailyBudget).toLocaleString()}`} />
        <SummaryRow label="Bidding Strategy" value={strategy} />
        {form.biddingStrategy === 'TARGET_CPA' && form.targetCpaMicros && (
          <SummaryRow label="Target CPA" value={`$${form.targetCpaMicros}`} />
        )}
        <SummaryRow label="Status" value={form.status} />
      </div>

      {/* Keywords */}
      <div className="card p-5">
        <h3 className="text-sm font-label font-semibold text-on-surface/60 uppercase tracking-wide mb-3">
          Keywords
        </h3>
        <SummaryRow label="Ad Group" value={form.adGroupName} />
        <SummaryRow label="Match Type" value={form.matchType} />
        <div className="pt-2">
          <span className="text-sm text-on-surface/50 block mb-2">{parsed.length} keyword{parsed.length !== 1 ? 's' : ''}</span>
          <div className="flex flex-wrap gap-1.5">
            {parsed.map((kw, i) => (
              <span key={i} className="text-xs bg-primary/8 text-primary px-2.5 py-1 rounded-full font-mono">
                {formatKeyword(kw, form.matchType)}
              </span>
            ))}
            {parsed.length === 0 && <span className="text-sm text-on-surface/40">No keywords entered</span>}
          </div>
        </div>
      </div>

      {/* Ad Copy */}
      <div className="card p-5">
        <h3 className="text-sm font-label font-semibold text-on-surface/60 uppercase tracking-wide mb-3">
          Ad Copy
        </h3>
        <SummaryRow label="Final URL" value={form.finalUrl} />
        {form.headlines.map((h, i) => (
          <SummaryRow key={i} label={`Headline ${i + 1}`} value={h} />
        ))}
        {form.descriptions.map((d, i) => (
          <SummaryRow key={i} label={`Description ${i + 1}`} value={d} />
        ))}
        <div className="mt-4">
          <p className="text-xs text-on-surface/50 mb-2">Preview</p>
          <AdPreview
            headlines={form.headlines}
            descriptions={form.descriptions}
            finalUrl={form.finalUrl}
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2.5">
        <span className="material-symbols-outlined text-blue-500 text-[18px] shrink-0 mt-0.5">info</span>
        <p className="text-xs text-blue-800">
          This will create your campaign in Google Ads. Ad groups and keywords can be added
          from the Campaigns tab after creation.
        </p>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-3 flex gap-2.5">
          <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">error</span>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-5 border-t border-outline-variant/10">
        <button onClick={onBack} className="pill-btn-secondary flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="pill-btn-primary flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              Creating Campaign…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              Create Campaign
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Success State ─────────────────────────────────────────────────────────────

function SuccessView({ accountId, campaignName }) {
  return (
    <div className="flex flex-col items-center text-center py-12 gap-6">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
        <span className="material-symbols-outlined text-secondary text-[32px]">check_circle</span>
      </div>
      <div>
        <h2 className="text-xl font-display font-semibold text-on-surface mb-2">
          Campaign Created
        </h2>
        <p className="text-sm text-on-surface/60 max-w-sm">
          <strong className="text-on-surface">{campaignName}</strong> has been created in Google Ads.
          Ad groups and keywords can be added from the Campaigns tab.
        </p>
      </div>
      <Link
        href={`/accounts/${accountId}?tab=campaigns`}
        className="pill-btn-primary flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-[18px]">campaign</span>
        View Campaigns
      </Link>
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep(step, form) {
  if (step === 1) {
    if (!form.name.trim()) return 'Campaign name is required.';
    if (!form.dailyBudget || Number(form.dailyBudget) < 1) return 'Daily budget must be at least $1.';
  }
  if (step === 2) {
    if (!form.adGroupName.trim()) return 'Ad group name is required.';
    if (!form.keywords.trim()) return 'At least one keyword is required.';
  }
  if (step === 3) {
    if (!form.finalUrl.trim()) return 'Final URL is required.';
    if (!form.headlines[0].trim() || !form.headlines[1].trim()) return 'At least 2 headlines are required.';
    if (!form.descriptions[0].trim() || !form.descriptions[1].trim()) return 'Both descriptions are required.';
  }
  return null;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function NewCampaignPage({ params }) {
  const { id } = use(params);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    dailyBudget: '',
    biddingStrategy: 'MAXIMIZE_CONVERSIONS',
    status: 'PAUSED',
    targetCpaMicros: '',
    adGroupName: '',
    keywords: '',
    matchType: 'EXACT',
    finalUrl: '',
    headlines: ['', '', ''],
    descriptions: ['', ''],
  });
  const [stepError, setStepError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  function onChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setStepError('');
  }

  function handleNext() {
    const err = validateStep(step, form);
    if (err) { setStepError(err); return; }
    setStepError('');
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStepError('');
    setSubmitError('');
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`/api/accounts/${id}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          budgetAmountMicros: Math.round(Number(form.dailyBudget) * 1_000_000),
          biddingStrategy: form.biddingStrategy,
          status: form.status,
          ...(form.biddingStrategy === 'TARGET_CPA' && form.targetCpaMicros
            ? { targetCpaMicros: Math.round(Number(form.targetCpaMicros) * 1_000_000) }
            : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create campaign.');
      setSuccess(true);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-8 py-10 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/accounts/${id}`}
          className="pill-btn-secondary !px-3 !py-1.5 flex items-center gap-1.5 text-sm"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-display font-semibold text-on-surface">New Campaign</h1>
          <p className="text-sm text-on-surface/50 mt-0.5">Set up a new Google Ads campaign</p>
        </div>
      </div>

      {success ? (
        <div className="card p-6">
          <SuccessView accountId={id} campaignName={form.name} />
        </div>
      ) : (
        <div className="card p-6">
          <Stepper step={step} />

          {/* Step content */}
          {step === 1 && <StepCampaignSettings form={form} onChange={onChange} />}
          {step === 2 && <StepKeywords form={form} onChange={onChange} />}
          {step === 3 && <StepAdCopy form={form} onChange={onChange} />}
          {step === 4 && (
            <StepReview
              form={form}
              onSubmit={handleSubmit}
              onBack={handleBack}
              submitting={submitting}
              error={submitError}
            />
          )}

          {/* Step error (steps 1–3) */}
          {stepError && step < 4 && (
            <div className="mt-4 bg-error/10 border border-error/20 rounded-lg p-3 flex gap-2">
              <span className="material-symbols-outlined text-error text-[18px] shrink-0">error</span>
              <p className="text-sm text-red-700">{stepError}</p>
            </div>
          )}

          {/* Navigation (steps 1–3) */}
          {step < 4 && (
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-outline-variant/10">
              <div>
                {step > 1 ? (
                  <button onClick={handleBack} className="pill-btn-secondary flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back
                  </button>
                ) : (
                  <Link href={`/accounts/${id}`} className="pill-btn-secondary flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                    Cancel
                  </Link>
                )}
              </div>
              <button onClick={handleNext} className="pill-btn-primary flex items-center gap-2">
                Next
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
