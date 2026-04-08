# Phase 2: Analysis Hub + CSV Upload + Audit Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the per-client Analysis Hub page in the new Intelligence Layer design system. Integrate the existing CSV upload engine and audit engine (parsers, n-gram analysis, SWOT, action items, conversational chat) into the new UI. First external demo milestone.

**Architecture:** The Analysis Hub (`/accounts/[id]`) becomes the primary per-client view. It combines website analysis, landing page audit, low-hanging fruit keywords, AI ad preview, CSV uploads, and full audit results. The existing parsers in `lib/parsers/` and analysis engine in `lib/analysis/` are preserved — this phase wraps them in the new UI. The audit results sub-page (`/accounts/[id]/analysis/[analysisId]`) is a dedicated page for deep-dive audit data.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS (Intelligence Layer tokens from Phase 1), Supabase, Gemini 2.5 Flash, PapaParse, Recharts, existing `lib/parsers/*` and `lib/analysis/*`

**Design Reference:** Read `docs/design-references/analysis_hub_client_insights/code.html` for exact component patterns. Read `docs/design-references/synthetix_intelligence/DESIGN.md` for design rules.

**Prerequisite:** Phase 1 must be complete (AppShell, design tokens, core UI components).

---

## File Map

**New files:**
- `components/analysis-hub/LandingPageAudit.js` — circular grade ring + checklist + scores
- `components/analysis-hub/WebsiteAnalysis.js` — detected services, USPs, service areas
- `components/analysis-hub/LowHangingFruit.js` — keyword opportunity table
- `components/analysis-hub/AdPreview.js` — Google search result mockup + focus suggestions
- `components/analysis-hub/UploadTab.js` — CSV upload integration with new design
- `components/analysis-hub/AuditResultsLink.js` — link to audit results with status
- `components/ui/CircularGrade.js` — SVG circle grade component (A-F)
- `components/ui/TabNav.js` — horizontal tab navigation component
- `app/accounts/[id]/page-new.js` — rewritten Analysis Hub (replaces old page)
- `app/accounts/[id]/analysis/[analysisId]/page-new.js` — rewritten audit results page

**Modified files:**
- `app/accounts/[id]/page.js` — full rewrite with new design
- `app/accounts/[id]/analysis/[analysisId]/page.js` — full rewrite with new design
- `components/upload/ReportUpload.js` — restyle to Intelligence Layer tokens (preserve logic)
- `components/upload/ColumnMapper.js` — restyle to Intelligence Layer tokens (preserve logic)

**Preserved (logic untouched):**
- `lib/parsers/*` — all 4 parsers + normalize + detect
- `lib/analysis/*` — ngram, keywords, campaigns, index
- `lib/prompts/swot.js` — SWOT prompt builder
- `lib/gemini.js` — Gemini API client
- `app/api/reports/*` — all report API routes
- `lib/supabase.js` — all CRUD functions

---

## Task 1: CircularGrade + TabNav Components

**Files:**
- Create: `components/ui/CircularGrade.js`
- Create: `components/ui/TabNav.js`

- [ ] **Step 1: Create CircularGrade SVG component**

Reference: the A- grade ring in `docs/design-references/analysis_hub_client_insights/code.html`.

Create `components/ui/CircularGrade.js`:

```js
const GRADE_COLORS = {
  'A+': 'var(--secondary)',
  'A': 'var(--secondary)',
  'A-': 'var(--secondary)',
  'B+': 'var(--primary)',
  'B': 'var(--primary)',
  'B-': 'var(--primary)',
  'C+': 'var(--tertiary)',
  'C': 'var(--tertiary)',
  'C-': 'var(--tertiary)',
  'D': 'var(--error)',
  'F': 'var(--error)',
};

export default function CircularGrade({ grade, score, size = 160, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.min(Math.max(score || 0, 0), 100);
  const offset = circumference - (normalizedScore / 100) * circumference;
  const color = GRADE_COLORS[grade] || 'var(--on-surface-variant)';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-container-high)"
          strokeWidth={strokeWidth}
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-on-surface">{grade}</span>
        <span className="text-label-sm text-on-surface-variant">Grade</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create TabNav component**

Create `components/ui/TabNav.js`:

```js
'use client';

export default function TabNav({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex items-center gap-1 border-b border-outline-variant/10 mb-6">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
              active
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.icon && (
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            )}
            {tab.label}
            {active && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/CircularGrade.js components/ui/TabNav.js
git commit -m "feat: add CircularGrade SVG and TabNav components"
```

---

## Task 2: Analysis Hub Sub-Components

**Files:**
- Create: `components/analysis-hub/LandingPageAudit.js`
- Create: `components/analysis-hub/WebsiteAnalysis.js`
- Create: `components/analysis-hub/LowHangingFruit.js`
- Create: `components/analysis-hub/AdPreview.js`

- [ ] **Step 1: Create LandingPageAudit component**

Create `components/analysis-hub/LandingPageAudit.js`:

```js
import CircularGrade from '@/components/ui/CircularGrade';
import StatusBadge from '@/components/ui/StatusBadge';

const AUDIT_CRITERIA = [
  { key: 'semantic_h1', label: 'Semantic H1 Structure', icon: 'check_circle' },
  { key: 'mobile', label: 'Mobile Fluidity', icon: 'check_circle' },
  { key: 'lcp', label: 'Fast LCP (<1.2s)', icon: 'check_circle' },
  { key: 'ssl', label: 'SSL Encryption', icon: 'check_circle' },
  { key: 'schema', label: 'JSON-LD Schema', icon: 'check_circle' },
  { key: 'cta', label: 'CTA Contrast Ratio', icon: 'error' },
  { key: 'alt_text', label: 'Alt-Text Compliance', icon: 'check_circle' },
  { key: 'internal_links', label: 'Internal Link Depth', icon: 'error' },
];

function getGrade(score) {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D';
  return 'F';
}

export default function LandingPageAudit({ audit }) {
  if (!audit) {
    return (
      <div className="bg-surface-container rounded-xl p-6">
        <h3 className="text-sm font-semibold text-on-surface mb-4">Landing Page Audit</h3>
        <p className="text-on-surface-variant text-sm">No audit data. Click "Re-crawl Site" to run.</p>
      </div>
    );
  }

  const overallScore = audit.overall_score || 0;
  const grade = getGrade(overallScore);
  const seoScore = audit.seo_score || 0;
  const uxIndex = audit.ux_index || 0;

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-xl">verified</span>
          <h3 className="text-sm font-semibold text-on-surface">Landing Page Audit</h3>
        </div>
        <StatusBadge
          status={overallScore >= 80 ? 'active' : overallScore >= 60 ? 'running' : 'alert'}
          label={overallScore >= 80 ? 'Optimized' : overallScore >= 60 ? 'Needs Work' : 'Critical'}
        />
      </div>

      <div className="flex items-start gap-6">
        <CircularGrade grade={grade} score={overallScore} />

        <div className="flex-1">
          {audit.summary && (
            <p className="text-on-surface-variant text-sm italic mb-4">"{audit.summary}"</p>
          )}
          <div className="flex items-center gap-6 mb-4">
            <div>
              <span className="text-2xl font-bold text-on-surface">{seoScore}</span>
              <span className="text-on-surface-variant text-sm">/100</span>
              <div className="text-label-sm text-on-surface-variant mt-0.5">SEO Score</div>
            </div>
            <div>
              <span className="text-2xl font-bold text-on-surface">{uxIndex}%</span>
              <div className="text-label-sm text-on-surface-variant mt-0.5">UX Index</div>
            </div>
          </div>
        </div>
      </div>

      {/* Criteria checklist */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-5">
        {AUDIT_CRITERIA.map((c) => {
          const passed = audit.criteria?.[c.key] !== false;
          return (
            <div key={c.key} className="flex items-center gap-2 text-sm">
              <span className={`material-symbols-outlined text-base ${passed ? 'text-secondary' : 'text-error'}`}>
                {passed ? 'check_circle' : 'cancel'}
              </span>
              <span className="text-on-surface-variant">{c.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create WebsiteAnalysis component**

Create `components/analysis-hub/WebsiteAnalysis.js`:

```js
export default function WebsiteAnalysis({ analysis }) {
  if (!analysis) {
    return (
      <div className="bg-surface-container rounded-xl p-6">
        <h3 className="text-sm font-semibold text-on-surface mb-4">Website Analysis</h3>
        <p className="text-on-surface-variant text-sm">No analysis yet. Click "Re-crawl Site" to scan.</p>
      </div>
    );
  }

  const services = analysis.services || [];
  const usps = analysis.usps || [];
  const serviceAreas = analysis.service_areas || [];
  const scannedAt = analysis.scanned_at;

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-on-surface">Website Analysis</h3>
        {scannedAt && (
          <span className="text-label-sm text-on-surface-variant">
            Scanned: {new Date(scannedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Detected Services */}
      {services.length > 0 && (
        <div className="mb-5">
          <div className="text-label-sm text-on-surface-variant mb-2">Detected Services</div>
          <div className="flex flex-wrap gap-2">
            {services.map((s, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface text-xs font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* USPs */}
      {usps.length > 0 && (
        <div className="mb-5">
          <div className="text-label-sm text-on-surface-variant mb-3">Core Unique Selling Points</div>
          <div className="grid grid-cols-2 gap-3">
            {usps.slice(0, 4).map((usp, i) => (
              <div key={i} className="bg-surface-container-low rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-secondary text-base">
                    {['shield', 'location_on', 'trending_up', 'bolt'][i % 4]}
                  </span>
                  <span className="text-sm font-semibold text-on-surface">{usp.title || usp}</span>
                </div>
                {usp.description && (
                  <p className="text-xs text-on-surface-variant">{usp.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Areas */}
      {serviceAreas.length > 0 && (
        <div>
          <div className="text-label-sm text-on-surface-variant mb-2">Target Service Areas</div>
          <div className="flex items-center gap-3 bg-surface-container-low rounded-xl p-3">
            <span className="material-symbols-outlined text-on-surface-variant">location_on</span>
            <span className="text-sm text-on-surface flex-1">{serviceAreas.join(', ')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create LowHangingFruit table component**

Create `components/analysis-hub/LowHangingFruit.js`:

```js
import StatusBadge from '@/components/ui/StatusBadge';

const INTENT_STYLES = {
  transactional: 'active',
  commercial: 'management',
  informational: 'running',
  navigational: 'pitching',
};

const ROI_COLORS = {
  'Very High': 'text-secondary font-semibold',
  'High': 'text-secondary',
  'Med': 'text-primary',
  'Low': 'text-on-surface-variant',
};

export default function LowHangingFruit({ keywords }) {
  if (!keywords || keywords.length === 0) {
    return (
      <div className="bg-surface-container rounded-xl p-6">
        <h3 className="text-sm font-semibold text-on-surface mb-4">Low-Hanging Fruit Keywords</h3>
        <p className="text-on-surface-variant text-sm">Run keyword research to discover opportunities.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-on-surface">Low-Hanging Fruit Keywords</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">High-value, low-competition opportunities</p>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant">auto_awesome</span>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-outline-variant/10">
            <th className="text-left px-0 py-3 text-label-sm text-on-surface-variant">Keyword Cluster</th>
            <th className="text-left px-3 py-3 text-label-sm text-on-surface-variant">Intent</th>
            <th className="text-right px-3 py-3 text-label-sm text-on-surface-variant">Avg. CPC</th>
            <th className="text-center px-3 py-3 text-label-sm text-on-surface-variant">Diff.</th>
            <th className="text-right px-0 py-3 text-label-sm text-on-surface-variant">Potential ROI</th>
          </tr>
        </thead>
        <tbody>
          {keywords.slice(0, 8).map((kw, i) => (
            <tr key={i} className="border-b border-outline-variant/5">
              <td className="py-3 pr-3">
                <div className="text-sm font-medium text-on-surface">{kw.keyword || kw.cluster}</div>
                {kw.subtext && <div className="text-xs text-on-surface-variant">{kw.subtext}</div>}
              </td>
              <td className="px-3 py-3">
                <StatusBadge
                  status={INTENT_STYLES[kw.intent?.toLowerCase()] || 'default'}
                  label={kw.intent}
                />
              </td>
              <td className="px-3 py-3 text-right text-sm text-on-surface">
                ${(kw.avg_cpc || kw.cpc || 0).toFixed(2)}
              </td>
              <td className="px-3 py-3">
                <div className="flex justify-center">
                  <div className="w-16 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        (kw.difficulty || 'low') === 'low' ? 'bg-secondary' : 'bg-primary'
                      }`}
                      style={{ width: `${kw.difficulty_pct || 30}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="py-3 pl-3 text-right">
                <span className={`text-sm ${ROI_COLORS[kw.roi] || ROI_COLORS['Med']}`}>
                  {kw.roi || 'Med'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Create AdPreview component**

Create `components/analysis-hub/AdPreview.js`:

```js
import GradientButton from '@/components/ui/GradientButton';

export default function AdPreview({ adCopy, brandProfile }) {
  const headline = adCopy?.headlines?.[0] || 'Your Ad Headline Here';
  const description = adCopy?.descriptions?.[0] || 'Your ad description will appear here with compelling copy.';
  const displayUrl = adCopy?.display_url || 'www.example.com';

  const suggestions = adCopy?.suggestions || {};

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface">AI Ad Preview</h3>
        <GradientButton className="text-xs px-3 py-1.5">
          <span className="material-symbols-outlined text-sm">bolt</span>
          Create Campaign
        </GradientButton>
      </div>

      {/* Google Search Preview */}
      <div className="bg-surface-container-low rounded-xl p-4 mb-4">
        <div className="flex items-center gap-1 mb-1">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span className="text-label-sm text-secondary">Google Search Preview</span>
        </div>
        <div className="text-xs text-on-surface-variant mb-1">Ad &middot; {displayUrl}</div>
        <div className="text-primary text-sm font-semibold mb-1 hover:underline cursor-pointer">
          {headline}
        </div>
        <div className="text-xs text-on-surface-variant leading-relaxed">{description}</div>
      </div>

      {/* Suggested Focus */}
      {Object.keys(suggestions).length > 0 && (
        <div className="mb-4">
          <div className="text-label-sm text-on-surface-variant mb-3">Suggested Focus</div>
          <div className="space-y-2">
            {Object.entries(suggestions).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">{key}</span>
                <span className="text-on-surface font-medium">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="w-full py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface transition-colors">
        Generate More Variations
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/analysis-hub/
git commit -m "feat: add Analysis Hub sub-components (audit, website, keywords, ad preview)"
```

---

## Task 3: Restyle Upload Components

**Files:**
- Modify: `components/upload/ReportUpload.js`
- Modify: `components/upload/ColumnMapper.js`

- [ ] **Step 1: Restyle ReportUpload to Intelligence Layer**

Read the current `components/upload/ReportUpload.js` first. Preserve all logic (drag-and-drop, file parsing, upload to API). Replace styling classes:

- Replace any `bg-white`, `bg-gray-*`, `border-gray-*` with surface token equivalents
- `bg-white` → `bg-surface-container`
- `bg-gray-50` → `bg-surface-container-low`
- `border-gray-200` → `border-outline-variant/10`
- `text-gray-500` → `text-on-surface-variant`
- `text-gray-900` → `text-on-surface`
- `bg-blue-500` → `gradient-primary`
- `text-blue-*` → `text-primary`
- `bg-green-*` → `bg-secondary/15 text-secondary`
- `bg-red-*` → `bg-error/15 text-error`
- `rounded-lg` → `rounded-xl`

The drop zone should use `bg-surface-container-low` with a dashed `border-outline-variant/20` border.

- [ ] **Step 2: Restyle ColumnMapper to Intelligence Layer**

Read the current `components/upload/ColumnMapper.js`. Apply the same color mapping as Step 1. Select dropdowns should use `bg-surface-container-high` with `text-on-surface`.

- [ ] **Step 3: Verify uploads still work**

Run: `npm run dev`

Navigate to an account page (if one exists) and test the upload flow. The styling should now match the Intelligence Layer theme. CSV parsing and API submission should work identically.

- [ ] **Step 4: Commit**

```bash
git add components/upload/ReportUpload.js components/upload/ColumnMapper.js
git commit -m "feat: restyle upload components to Intelligence Layer design"
```

---

## Task 4: Analysis Hub Page Rewrite

**Files:**
- Modify: `app/accounts/[id]/page.js`

- [ ] **Step 1: Rewrite the Analysis Hub page**

Read the current `app/accounts/[id]/page.js` to understand its data fetching patterns (account loading, metrics, campaigns, keywords, ads, actions, uploads, analyses). Preserve all `useEffect` data fetching logic and state management.

Replace the JSX with the new Intelligence Layer layout:

```js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAccount, getReportUploads, listReportAnalyses } from '@/lib/supabase';
import TabNav from '@/components/ui/TabNav';
import StatusBadge from '@/components/ui/StatusBadge';
import GradientButton from '@/components/ui/GradientButton';
import GhostButton from '@/components/ui/GhostButton';
import Skeleton from '@/components/ui/Skeleton';
import LandingPageAudit from '@/components/analysis-hub/LandingPageAudit';
import WebsiteAnalysis from '@/components/analysis-hub/WebsiteAnalysis';
import LowHangingFruit from '@/components/analysis-hub/LowHangingFruit';
import AdPreview from '@/components/analysis-hub/AdPreview';
import ReportUpload from '@/components/upload/ReportUpload';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'uploads', label: 'Uploads', icon: 'upload_file' },
  { id: 'campaigns', label: 'Campaigns', icon: 'campaign' },
  { id: 'keywords', label: 'Keywords', icon: 'key_visualizer' },
  { id: 'audit', label: 'Audit', icon: 'speed' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export default function AnalysisHub() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id;
  const [account, setAccount] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [acct, ups, ans] = await Promise.all([
        getAccount(accountId),
        getReportUploads(accountId),
        listReportAnalyses(accountId),
      ]);
      setAccount(acct);
      setUploads(ups || []);
      setAnalyses(ans || []);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6 fade-up">
        <Skeleton variant="text" className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton variant="card" className="h-64" />
          <Skeleton variant="card" className="h-64" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-20">
        <span className="material-symbols-outlined text-on-surface-variant text-5xl mb-4">error</span>
        <p className="text-on-surface-variant">Account not found</p>
      </div>
    );
  }

  const websiteAnalysis = account.brand_profile?.website_analysis || null;
  const landingPageAudit = account.audit_data?.landing_page || null;
  const adCopy = account.audit_data?.ad_copy || null;
  const lowHangingFruit = account.audit_data?.opportunities || [];

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-1">
            <button onClick={() => router.push('/')} className="hover:text-primary transition-colors">
              Clients
            </button>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-on-surface">{account.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Analysis Hub</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Comprehensive semantic audit and performance mapping
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GhostButton>
            <span className="material-symbols-outlined text-lg">download</span>
            Export PDF
          </GhostButton>
          <GradientButton>
            <span className="material-symbols-outlined text-lg">refresh</span>
            Re-crawl Site
          </GradientButton>
        </div>
      </div>

      {/* URL bar */}
      {account.google_customer_id && (
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-container rounded-xl">
          <span className="material-symbols-outlined text-secondary text-lg">language</span>
          <span className="text-sm text-on-surface">{account.google_customer_id}</span>
          <StatusBadge status="active" label="AI Scanned" />
        </div>
      )}

      {/* Tabs */}
      <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top row: Audit + Website Analysis */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-5">
              <LandingPageAudit audit={landingPageAudit} />
            </div>
            <div className="xl:col-span-7">
              <WebsiteAnalysis analysis={websiteAnalysis} />
            </div>
          </div>

          {/* Bottom row: Keywords + Ad Preview */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8">
              <LowHangingFruit keywords={lowHangingFruit} />
            </div>
            <div className="xl:col-span-4">
              <AdPreview adCopy={adCopy} brandProfile={account.brand_profile} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'uploads' && (
        <div className="space-y-6">
          <ReportUpload
            accountId={accountId}
            onUploadComplete={loadData}
          />
          {/* Existing uploads list */}
          {uploads.length > 0 && (
            <div className="bg-surface-container rounded-xl p-6">
              <h3 className="text-sm font-semibold text-on-surface mb-4">
                Upload History ({uploads.length})
              </h3>
              <div className="space-y-3">
                {uploads.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b border-outline-variant/5 last:border-0">
                    <div>
                      <div className="text-sm text-on-surface font-medium">{u.report_type}</div>
                      <div className="text-xs text-on-surface-variant">
                        {u.row_count} rows &middot; {new Date(u.uploaded_at || u.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <StatusBadge status="complete" label="Uploaded" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analyses list */}
          {analyses.length > 0 && (
            <div className="bg-surface-container rounded-xl p-6">
              <h3 className="text-sm font-semibold text-on-surface mb-4">Analyses</h3>
              <div className="space-y-3">
                {analyses.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => router.push(`/accounts/${accountId}/analysis/${a.id}`)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-xl hover:bg-surface-container-high transition-colors text-left"
                  >
                    <div>
                      <div className="text-sm text-on-surface font-medium">
                        Audit — {new Date(a.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-on-surface-variant">{a.mode} mode</div>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="bg-surface-container rounded-xl p-6">
          <p className="text-on-surface-variant text-sm">Campaign management coming in Phase 4.</p>
        </div>
      )}

      {activeTab === 'keywords' && (
        <div className="bg-surface-container rounded-xl p-6">
          <p className="text-on-surface-variant text-sm">Keyword Engine coming in Phase 3.</p>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-surface-container rounded-xl p-6">
          <p className="text-on-surface-variant text-sm">
            Upload CSV reports in the Uploads tab, then run an analysis to see audit results here.
          </p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-surface-container rounded-xl p-6">
          <p className="text-on-surface-variant text-sm">Account settings coming soon.</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the Analysis Hub renders**

Run: `npm run dev`

Navigate to `/accounts/{some-account-id}`. You should see:
- Breadcrumb: Clients > Account Name
- "Analysis Hub" heading with Export PDF + Re-crawl buttons
- Tab navigation (Overview, Uploads, Campaigns, Keywords, Audit, Settings)
- Overview tab: Landing Page Audit card, Website Analysis card, Low-Hanging Fruit table, Ad Preview
- Uploads tab: drag-and-drop zone, upload history, analysis links

- [ ] **Step 3: Commit**

```bash
git add app/accounts/[id]/page.js
git commit -m "feat: rewrite Analysis Hub page with Intelligence Layer design"
```

---

## Task 5: Audit Results Page Rewrite

**Files:**
- Modify: `app/accounts/[id]/analysis/[analysisId]/page.js`

- [ ] **Step 1: Read the existing audit results page**

Read `app/accounts/[id]/analysis/[analysisId]/page.js` to understand the current data loading and component structure. Note which components from `components/analysis/` it imports (NgramTable, WastedSpend, CampaignRanking, SwotPanel, ActionItems, AuditChat).

- [ ] **Step 2: Restyle the existing analysis sub-components**

For each file in `components/analysis/` (NgramTable.js, WastedSpend.js, CampaignRanking.js, SwotPanel.js, ActionItems.js, AuditChat.js), apply the same color token migration as Task 3:

- `bg-white` → `bg-surface-container`
- `bg-gray-50` → `bg-surface-container-low`
- `border-gray-*` → `border-outline-variant/10`
- `text-gray-*` → `text-on-surface-variant` or `text-on-surface`
- `bg-blue-*` → primary tokens
- `bg-green-*` → secondary tokens
- `bg-red-*` → error tokens
- `rounded-lg` → `rounded-xl`
- Table headers → `text-label-sm text-on-surface-variant`
- Table rows → `border-b border-outline-variant/5 hover:bg-surface-container-high`

- [ ] **Step 3: Rewrite the audit results page layout**

Preserve all data fetching from the existing page. Replace the layout with Intelligence Layer structure:

- Breadcrumb: Clients > Account Name > Analysis > Date
- Tab navigation: N-gram Analysis, Wasted Spend, Campaign Ranking, SWOT, Action Items
- AuditChat as collapsible right sidebar panel
- All cards use `bg-surface-container rounded-xl p-6`

- [ ] **Step 4: Verify audit results render**

If you have existing analysis data in Supabase, navigate to `/accounts/{id}/analysis/{analysisId}` and verify:
- All tabs render with new styling
- N-gram table is sortable
- SWOT panel shows four quadrants
- Chat panel opens/closes

- [ ] **Step 5: Commit**

```bash
git add app/accounts/[id]/analysis/ components/analysis/
git commit -m "feat: restyle audit results page and components to Intelligence Layer"
```

---

## Task 6: Accounts List Page Restyle

**Files:**
- Modify: `app/accounts/page.js`

- [ ] **Step 1: Restyle the accounts list page**

Read `app/accounts/page.js`. This page lists connected Google Ads accounts. Apply Intelligence Layer styling:

- Replace the page layout to use the same patterns as Pipeline Dashboard
- Account cards: `bg-surface-container rounded-xl p-6`
- Stat summary row: use `StatCard` components
- Status badges: use `StatusBadge` component
- Connect Account button: use `GradientButton`
- Sync buttons: use `GhostButton`
- Loading skeletons: use `Skeleton` component

- [ ] **Step 2: Verify and commit**

```bash
git add app/accounts/page.js
git commit -m "feat: restyle Accounts list page to Intelligence Layer"
```

---

## Task 7: Verify Full Phase 2 Delivery

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 2: Run existing tests**

```bash
npm test
```

Expected: All parser and analysis tests still pass (we didn't change any lib logic).

- [ ] **Step 3: Manual QA**

1. [ ] Pipeline Dashboard (`/`) renders with new design
2. [ ] Clicking a client row navigates to Analysis Hub
3. [ ] Analysis Hub shows Overview tab with audit + website + keywords + ad preview cards
4. [ ] Uploads tab shows drag-and-drop zone
5. [ ] CSV upload parses and stores correctly
6. [ ] Running analysis produces results
7. [ ] Audit results page renders with all tabs
8. [ ] All cards use tonal layering (no 1px borders)
9. [ ] Back navigation works (breadcrumbs)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Phase 2 complete — Analysis Hub with CSV upload and audit engine"
```
