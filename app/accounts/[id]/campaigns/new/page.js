'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import WizardNav, { WizardFooter, TOTAL_STEPS } from '@/components/campaign-wizard/WizardNav';
import StepStrategy from '@/components/campaign-wizard/StepStrategy';
import StepType from '@/components/campaign-wizard/StepType';
import StepStructure from '@/components/campaign-wizard/StepStructure';
import StepKeywords from '@/components/campaign-wizard/StepKeywords';
import StepMatchTypes from '@/components/campaign-wizard/StepMatchTypes';
import StepNegatives from '@/components/campaign-wizard/StepNegatives';
import StepAdCopy from '@/components/campaign-wizard/StepAdCopy';
import StepLandingPage from '@/components/campaign-wizard/StepLandingPage';
import StepAssets from '@/components/campaign-wizard/StepAssets';
import StepTargeting from '@/components/campaign-wizard/StepTargeting';
import StepSchedule from '@/components/campaign-wizard/StepSchedule';
import StepBudget from '@/components/campaign-wizard/StepBudget';
import StepReview from '@/components/campaign-wizard/StepReview';
import { buildCampaignPayload, buildEditorCSV } from '@/lib/campaign-builder';

// ─── Initial Form State ──────────────────────────────────────────────────────

const INITIAL_FORM = {
  // Step 1: Strategy
  strategy: '',
  // Step 2: Campaign Type
  campaignType: '',
  // Step 3: Structure
  structure: '',
  // Step 4: Keywords
  keywords: '',
  // Step 5: Match Types
  matchType: 'PHRASE',
  // Step 6: Negative Keywords
  negativeKeywords: '',
  // Step 7: Ad Copy
  finalUrl: '',
  headlines: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  descriptions: ['', '', '', ''],
  // Step 8: Landing Page
  landingPageUrl: '',
  // Step 9: Assets
  sitelinks: [{ headline: '', description1: '', description2: '', finalUrl: '' }],
  callouts: [''],
  structuredSnippets: { header: '', values: [''] },
  // Step 10: Targeting (location + language + demographics)
  locations: [],
  languages: ['en'],
  ageRanges: [],
  genders: [],
  householdIncomes: [],
  // Step 12: Schedule
  startDate: '',
  endDate: '',
  daypartSchedule: {},
  // Step 13: Budget & Bidding
  name: '',
  dailyBudget: '',
  biddingStrategy: 'MAXIMIZE_CONVERSIONS',
  targetCpaMicros: '',
  targetRoas: '',
  maxCpcBid: '',
  status: 'PAUSED',
};

// ─── Validation ──────────────────────────────────────────────────────────────

function validateStep(step, form) {
  switch (step) {
    case 1:
      if (!form.strategy) return 'Select a campaign strategy.';
      break;
    case 2:
      if (!form.campaignType) return 'Select a campaign type.';
      break;
    case 3:
      if (form.campaignType !== 'PERFORMANCE_MAX' && !form.structure) return 'Select a campaign structure.';
      break;
    case 4: {
      const kws = form.keywords.split('\n').filter((k) => k.trim());
      if (kws.length === 0) return 'Add at least one keyword.';
      break;
    }
    case 5:
      if (!form.matchType) return 'Select a match type.';
      break;
    // Steps 6 (negatives), 9 (assets), 10 (targeting demographics), 11 (demographics), 12 (schedule) are optional
    case 7:
      if (!form.finalUrl.trim()) return 'Final URL is required.';
      if (form.headlines.filter(Boolean).length < 3) return 'At least 3 headlines are required.';
      if (form.descriptions.filter(Boolean).length < 2) return 'At least 2 descriptions are required.';
      break;
    case 10:
      if (form.locations.length === 0) return 'Add at least one target location.';
      break;
    case 13:
      if (!form.name.trim()) return 'Campaign name is required.';
      if (!form.dailyBudget || Number(form.dailyBudget) < 1) return 'Daily budget must be at least $1.';
      break;
  }
  return null;
}

// ─── Success View ────────────────────────────────────────────────────────────

function SuccessView({ accountId, campaignName }) {
  return (
    <div className="flex flex-col items-center text-center py-12 gap-6">
      <div className="w-16 h-16 rounded-full bg-secondary/15 flex items-center justify-center">
        <span className="material-symbols-outlined text-secondary text-[32px]">check_circle</span>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-on-surface mb-2">Campaign Created</h2>
        <p className="text-sm text-on-surface-variant max-w-sm">
          <strong className="text-on-surface">{campaignName}</strong> has been created in Google Ads
          with all configured settings, keywords, and ad copy.
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function NewCampaignPage({ params }) {
  const { id } = use(params);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
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
    if (err) {
      setStepError(err);
      return;
    }
    setStepError('');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handleBack() {
    setStepError('');
    setSubmitError('');
    setStep((s) => Math.max(s - 1, 1));
  }

  function handleStepClick(targetStep) {
    if (targetStep < step) {
      setStepError('');
      setStep(targetStep);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = buildCampaignPayload(form);
      const res = await fetch(`/api/accounts/${id}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  function handleExportCSV() {
    const csv = buildEditorCSV(form);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.name || 'campaign'}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Step rendering ────────────────────────────────────────────────────────

  function renderStep() {
    const props = { form, onChange, accountId: id };
    switch (step) {
      case 1:  return <StepStrategy {...props} />;
      case 2:  return <StepType {...props} />;
      case 3:  return <StepStructure {...props} />;
      case 4:  return <StepKeywords {...props} />;
      case 5:  return <StepMatchTypes {...props} />;
      case 6:  return <StepNegatives {...props} />;
      case 7:  return <StepAdCopy {...props} />;
      case 8:  return <StepLandingPage {...props} />;
      case 9:  return <StepAssets {...props} />;
      case 10: return <StepTargeting {...props} section="location" />;
      case 11: return <StepTargeting {...props} section="demographics" />;
      case 12: return <StepSchedule {...props} />;
      case 13: return <StepBudget {...props} />;
      case 14: return (
        <StepReview
          form={form}
          onSubmit={handleSubmit}
          onBack={handleBack}
          onExportCSV={handleExportCSV}
          submitting={submitting}
          error={submitError}
        />
      );
      default: return null;
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="px-8 py-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/accounts/${id}`}
          className="pill-btn-secondary !px-3 !py-1.5 flex items-center gap-1.5 text-sm"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">Campaign Wizard</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Build a complete campaign in {TOTAL_STEPS} guided steps
          </p>
        </div>
      </div>

      {success ? (
        <div className="card p-6">
          <SuccessView accountId={id} campaignName={form.name} />
        </div>
      ) : (
        <div className="card p-6">
          <WizardNav currentStep={step} onStepClick={handleStepClick} />

          {/* Step content */}
          <div className="fade-up" key={step}>
            {renderStep()}
          </div>

          {/* Step error */}
          {stepError && step < TOTAL_STEPS && (
            <div className="mt-4 bg-error/10 border border-error/20 rounded-lg p-3 flex gap-2">
              <span className="material-symbols-outlined text-error text-[18px] shrink-0">error</span>
              <p className="text-sm text-error">{stepError}</p>
            </div>
          )}

          {/* Navigation (not on Review step — it has its own buttons) */}
          {step < TOTAL_STEPS && (
            <WizardFooter
              currentStep={step}
              onBack={handleBack}
              onNext={handleNext}
              onCancel={() => window.history.back()}
            />
          )}
        </div>
      )}
    </div>
  );
}
