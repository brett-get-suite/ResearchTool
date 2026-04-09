'use client';

import { useState } from 'react';

const AUDIT_CRITERIA = [
  { key: 'ssl', label: 'SSL Encryption', icon: 'lock' },
  { key: 'mobile', label: 'Mobile Friendly', icon: 'phone_android' },
  { key: 'speed', label: 'Fast Load Time', icon: 'speed' },
  { key: 'cta', label: 'Clear CTA', icon: 'ads_click' },
  { key: 'h1', label: 'Semantic H1', icon: 'title' },
  { key: 'schema', label: 'Schema Markup', icon: 'code' },
];

export default function StepLandingPage({ form, onChange, accountId }) {
  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);

  async function runAudit() {
    const url = form.landingPageUrl || form.finalUrl;
    if (!url) return;
    setAuditing(true);
    setAuditResult(null);
    try {
      const res = await fetch(`/api/accounts/${accountId}/website-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const data = await res.json();
        setAuditResult({
          score: data.score || data.overallScore || 75,
          criteria: {
            ssl: url.startsWith('https'),
            mobile: data.mobileFriendly !== false,
            speed: (data.lcp || 2) < 2.5,
            cta: data.ctaFound !== false,
            h1: data.h1Found !== false,
            schema: data.schemaFound === true,
          },
          summary: data.summary || 'Landing page analysis complete.',
        });
      } else {
        setAuditResult({
          score: null,
          criteria: { ssl: url.startsWith('https') },
          summary: 'Full audit unavailable — basic checks applied.',
        });
      }
    } catch {
      setAuditResult({
        score: null,
        criteria: { ssl: (form.landingPageUrl || form.finalUrl || '').startsWith('https') },
        summary: 'Audit service unavailable.',
      });
    } finally {
      setAuditing(false);
    }
  }

  const currentUrl = form.landingPageUrl || form.finalUrl || '';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-headline-sm text-on-surface mb-1">Landing Page</h2>
        <p className="text-sm text-on-surface-variant">
          Choose the landing page for your ads. A high-quality landing page improves Quality Score
          and conversion rates.
        </p>
      </div>

      <div>
        <label className="field-label">Landing Page URL <span className="text-error">*</span></label>
        <div className="flex gap-2 mt-1">
          <input
            type="url"
            className="field-input flex-1"
            placeholder="https://yourwebsite.com/service-page"
            value={form.landingPageUrl}
            onChange={(e) => {
              onChange('landingPageUrl', e.target.value);
              setAuditResult(null);
            }}
          />
          <button
            type="button"
            onClick={runAudit}
            disabled={auditing || !currentUrl}
            className="pill-btn-secondary flex items-center gap-1.5 shrink-0 disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[16px]">
              {auditing ? 'progress_activity' : 'fact_check'}
            </span>
            {auditing ? 'Auditing...' : 'Audit'}
          </button>
        </div>
        {form.finalUrl && !form.landingPageUrl && (
          <button
            type="button"
            onClick={() => onChange('landingPageUrl', form.finalUrl)}
            className="text-xs text-primary mt-1.5 hover:text-primary/80"
          >
            Use Final URL from Ad Copy: {form.finalUrl}
          </button>
        )}
      </div>

      {/* Audit results */}
      {auditResult && (
        <div className="bg-surface-container-high rounded-xl p-5 space-y-4 fade-up">
          {/* Score */}
          {auditResult.score !== null && (
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold ${
                  auditResult.score >= 80
                    ? 'bg-secondary/15 text-secondary'
                    : auditResult.score >= 60
                    ? 'bg-primary/15 text-primary'
                    : 'bg-error/15 text-error'
                }`}
              >
                {auditResult.score}
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">Landing Page Score</p>
                <p className="text-xs text-on-surface-variant">{auditResult.summary}</p>
              </div>
            </div>
          )}

          {/* Criteria checklist */}
          <div className="grid grid-cols-2 gap-2">
            {AUDIT_CRITERIA.map((c) => {
              const passed = auditResult.criteria?.[c.key];
              const unknown = auditResult.criteria?.[c.key] === undefined;
              return (
                <div
                  key={c.key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    unknown
                      ? 'bg-surface-container text-on-surface-variant/40'
                      : passed
                      ? 'bg-secondary/8 text-secondary'
                      : 'bg-error/8 text-error'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {unknown ? 'help' : passed ? 'check_circle' : 'cancel'}
                  </span>
                  <span>{c.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-tertiary/10 rounded-lg p-3 flex gap-2.5">
        <span className="material-symbols-outlined text-tertiary text-[18px] shrink-0 mt-0.5">lightbulb</span>
        <div className="text-xs text-on-surface-variant">
          <p className="font-medium text-on-surface mb-0.5">Landing page tips:</p>
          <ul className="space-y-0.5">
            <li>Match your ad's promise to the landing page content</li>
            <li>Use HTTPS — Google penalizes insecure pages</li>
            <li>Load time under 3 seconds improves Quality Score</li>
            <li>Clear CTA above the fold increases conversions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
