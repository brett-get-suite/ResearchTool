'use client';

import { useState } from 'react';

// ─── Universal negatives that apply to almost every PPC campaign ──────────

const UNIVERSAL_NEGATIVES = [
  'free', 'cheap', 'diy', 'how to', 'what is', 'definition', 'wiki',
  'salary', 'jobs', 'careers', 'hiring', 'internship', 'training',
  'reviews', 'complaints', 'scam', 'lawsuit', 'class action',
  'youtube', 'reddit', 'craigslist', 'facebook', 'tiktok',
];

const INDUSTRY_NEGATIVES = {
  hvac: ['hvac school', 'hvac certification', 'hvac technician salary', 'hvac tools', 'hvac parts wholesale'],
  plumbing: ['plumbing school', 'plumber salary', 'plumbing code', 'plumbing tools', 'plumbing parts'],
  roofing: ['roofing jobs', 'roofing materials wholesale', 'roofing school', 'roofing supplies'],
  solar: ['solar stocks', 'solar energy facts', 'solar system planets', 'solar eclipse', 'solar calculator'],
  ecommerce: ['dropshipping', 'wholesale', 'alibaba', 'bulk order', 'manufacturer'],
  general: ['tutorial', 'guide', 'course', 'certification', 'degree', 'example', 'template'],
};

export default function StepNegatives({ form, onChange }) {
  const [industry, setIndustry] = useState('general');
  const [showAll, setShowAll] = useState(false);

  const parsed = form.negativeKeywords
    .split('\n')
    .map((k) => k.trim())
    .filter(Boolean);

  function addNegatives(keywords) {
    const existing = new Set(parsed);
    const toAdd = keywords.filter((k) => !existing.has(k));
    if (toAdd.length === 0) return;
    const updated = [...parsed, ...toAdd].join('\n');
    onChange('negativeKeywords', updated);
  }

  function removeNegative(idx) {
    const updated = parsed.filter((_, i) => i !== idx);
    onChange('negativeKeywords', updated.join('\n'));
  }

  const industryList = INDUSTRY_NEGATIVES[industry] || INDUSTRY_NEGATIVES.general;
  const allSuggested = [...UNIVERSAL_NEGATIVES, ...industryList];
  const addedSet = new Set(parsed);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-headline-sm text-on-surface mb-1">Negative Keywords</h2>
        <p className="text-sm text-on-surface-variant">
          Negative keywords prevent your ads from showing for irrelevant searches. We've pre-populated
          common negatives — review and customize for your campaign.
        </p>
      </div>

      {/* Quick-add panels */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-label-sm text-on-surface-variant">Industry:</span>
          <select
            className="field-input !w-auto !py-1.5 !px-3 text-sm"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            <option value="general">General</option>
            <option value="hvac">HVAC</option>
            <option value="plumbing">Plumbing</option>
            <option value="roofing">Roofing</option>
            <option value="solar">Solar</option>
            <option value="ecommerce">E-commerce</option>
          </select>
        </div>

        {/* Suggested negatives */}
        <div className="bg-surface-container-high rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-on-surface">Suggested Negatives</p>
            <button
              type="button"
              onClick={() => addNegatives(allSuggested)}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Add All ({allSuggested.filter((k) => !addedSet.has(k)).length} remaining)
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(showAll ? allSuggested : allSuggested.slice(0, 20)).map((kw) => {
              const isAdded = addedSet.has(kw);
              return (
                <button
                  key={kw}
                  type="button"
                  onClick={() => isAdded ? removeNegative(parsed.indexOf(kw)) : addNegatives([kw])}
                  className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                    isAdded
                      ? 'bg-secondary/15 text-secondary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  {isAdded && <span className="mr-1">✓</span>}
                  {kw}
                </button>
              );
            })}
          </div>
          {allSuggested.length > 20 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-primary mt-2 hover:text-primary/80"
            >
              {showAll ? 'Show less' : `Show all ${allSuggested.length}`}
            </button>
          )}
        </div>
      </div>

      {/* Manual entry */}
      <div>
        <label className="field-label">Custom Negatives</label>
        <p className="text-xs text-on-surface-variant mb-1.5">Add your own negatives, one per line.</p>
        <textarea
          className="field-input mt-1 h-24 resize-none font-mono text-sm"
          placeholder={"competitor name\nunrelated service\nirrelevant term"}
          value={form.negativeKeywords}
          onChange={(e) => onChange('negativeKeywords', e.target.value)}
        />
      </div>

      {/* Current count */}
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-[16px]">block</span>
        <span>{parsed.length} negative keyword{parsed.length !== 1 ? 's' : ''} configured</span>
      </div>
    </div>
  );
}
