'use client';

import { useState } from 'react';

function CharCounter({ value, max }) {
  const len = value?.length || 0;
  const over = len > max;
  return (
    <span className={`text-xs ml-auto ${over ? 'text-error font-medium' : 'text-on-surface-variant/40'}`}>
      {len}/{max}
    </span>
  );
}

function AdPreview({ headlines, descriptions, finalUrl }) {
  const h = headlines.filter(Boolean);
  const d = descriptions.filter(Boolean);
  return (
    <div className="bg-surface-container-high rounded-lg p-4 text-sm">
      <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider font-semibold">Ad Preview</p>
      <div className="bg-white rounded-md p-3">
        <p className="text-[#1a0dab] font-medium text-base leading-snug">
          {h.slice(0, 3).join(' | ') || 'Your Headline 1 | Headline 2 | Headline 3'}
        </p>
        <p className="text-[#006621] text-xs mt-1">
          {finalUrl || 'https://yourwebsite.com'}
        </p>
        <p className="text-[#545454] text-sm mt-1 leading-relaxed">
          {d.slice(0, 2).join(' ') || 'Your ad description will appear here.'}
        </p>
      </div>
    </div>
  );
}

export default function StepAdCopy({ form, onChange, accountId }) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  function updateHeadline(i, val) {
    const next = [...form.headlines];
    next[i] = val;
    onChange('headlines', next);
  }

  function updateDescription(i, val) {
    const next = [...form.descriptions];
    next[i] = val;
    onChange('descriptions', next);
  }

  async function generateAdCopy() {
    if (!accountId) return;
    setGenerating(true);
    setGenError('');
    try {
      const keywords = form.keywords?.split('\n').filter((k) => k.trim()).slice(0, 10) || [];
      const res = await fetch(`/api/accounts/${accountId}/ads/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          strategy: form.strategy,
          campaignType: form.campaignType,
          finalUrl: form.finalUrl || form.landingPageUrl,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.headlines?.length) {
          const newHeadlines = [...form.headlines];
          data.headlines.slice(0, 15).forEach((h, i) => {
            if (!newHeadlines[i]) newHeadlines[i] = h.slice(0, 30);
          });
          onChange('headlines', newHeadlines);
        }
        if (data.descriptions?.length) {
          const newDescs = [...form.descriptions];
          data.descriptions.slice(0, 4).forEach((d, i) => {
            if (!newDescs[i]) newDescs[i] = d.slice(0, 90);
          });
          onChange('descriptions', newDescs);
        }
      } else {
        setGenError('AI generation unavailable — enter ad copy manually.');
      }
    } catch {
      setGenError('AI generation unavailable — enter ad copy manually.');
    } finally {
      setGenerating(false);
    }
  }

  const filledHeadlines = form.headlines.filter(Boolean).length;
  const filledDescriptions = form.descriptions.filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-headline-sm text-on-surface mb-1">Ad Copy</h2>
        <p className="text-sm text-on-surface-variant">
          Write headlines and descriptions for your Responsive Search Ads.
          Google mixes and matches these to find the best combinations.
        </p>
      </div>

      {/* AI generate button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={generateAdCopy}
          disabled={generating}
          className="pill-btn-secondary flex items-center gap-2 !bg-tertiary/10 !text-tertiary hover:!bg-tertiary/20 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">
            {generating ? 'progress_activity' : 'auto_awesome'}
          </span>
          {generating ? 'Generating...' : 'AI Generate Ad Copy'}
        </button>
        <span className="text-xs text-on-surface-variant">Uses brand identity and keywords</span>
      </div>

      {genError && (
        <p className="text-xs text-on-surface-variant/60">{genError}</p>
      )}

      {/* Final URL */}
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

      {/* Headlines */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="field-label !mb-0">
            Headlines (max 30 chars) <span className="text-error">*</span>
          </label>
          <span className="text-xs text-on-surface-variant">
            {filledHeadlines}/15 filled (min 3 required)
          </span>
        </div>
        <div className="space-y-2">
          {form.headlines.map((h, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[0.625rem] text-on-surface-variant/60 font-mono w-4">{i + 1}.</span>
                <CharCounter value={h} max={30} />
              </div>
              <input
                type="text"
                className="field-input text-sm"
                placeholder={
                  i < 3
                    ? `Headline ${i + 1} (required)`
                    : `Headline ${i + 1} (optional)`
                }
                maxLength={30}
                value={h}
                onChange={(e) => updateHeadline(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Descriptions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="field-label !mb-0">
            Descriptions (max 90 chars) <span className="text-error">*</span>
          </label>
          <span className="text-xs text-on-surface-variant">
            {filledDescriptions}/4 filled (min 2 required)
          </span>
        </div>
        <div className="space-y-2">
          {form.descriptions.map((d, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[0.625rem] text-on-surface-variant/60 font-mono w-4">{i + 1}.</span>
                <CharCounter value={d} max={90} />
              </div>
              <textarea
                className="field-input text-sm resize-none h-16"
                placeholder={
                  i < 2
                    ? `Description ${i + 1} (required)`
                    : `Description ${i + 1} (optional)`
                }
                maxLength={90}
                value={d}
                onChange={(e) => updateDescription(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <AdPreview
        headlines={form.headlines}
        descriptions={form.descriptions}
        finalUrl={form.finalUrl}
      />
    </div>
  );
}
