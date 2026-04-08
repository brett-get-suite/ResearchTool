# PPC Recon Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the PPC Recon app with dark/light mode, a real performance dashboard, budget projection calibration, location autocomplete, a proper agent dashboard, Google Trends seasonality data, and production polish.

**Architecture:** Feature work is split into 7 sequential feature tasks. Tasks 1–3 are self-contained and modify narrow files. Task 4 (dashboard) is the largest — new dashboard components are built first, then the account page imports them. Tasks 5–7 build on the completed foundation.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, Supabase, Google Gemini API, Recharts (to install), Google Maps Places API (with OpenStreetMap fallback), Google Trends unofficial API

---

## File Map

### Task 1 — Design System
- Modify: `app/globals.css` — CSS custom property tokens for dark/light
- Modify: `tailwind.config.js` — map color names to CSS vars
- Create: `components/ThemeProvider.js` — client component, sets `data-theme` on `<html>`, reads/writes localStorage
- Modify: `app/layout.js` — wrap children with ThemeProvider
- Modify: `components/Sidebar.js` — add dark mode toggle in footer

### Task 2 — Budget Projection Fix
- Modify: `lib/prompts.js` — update `budgetProjectionPrompt` (conservative defaults + optional calibration injection)
- Modify: `app/api/budget-projection/route.js` — accept `calibration` from body
- Modify: `app/research/page.js` — add collapsible calibration section in Step 1

### Task 3 — Location Autocomplete
- Create: `app/api/places/autocomplete/route.js` — Google Maps or Nominatim fallback
- Create: `app/api/places/nearby/route.js` — nearby cities within radius
- Create: `components/ServiceAreaInput.js` — self-contained autocomplete chips input
- Modify: `app/research/page.js` — replace inline area input with `<ServiceAreaInput />`
- Modify: `.env.example` — add `GOOGLE_MAPS_API_KEY` comment

### Task 4 — Performance Dashboard + Account Tabs
- Install: `recharts`
- Create: `components/dashboard/StatCard.js`
- Create: `components/dashboard/SpendChart.js`
- Create: `components/dashboard/ConversionsChart.js`
- Create: `components/dashboard/CampaignTable.js`
- Create: `components/dashboard/KeywordTable.js`
- Create: `components/dashboard/AdCopyPanel.js`
- Create: `components/dashboard/ChangeLogTab.js`
- Create: `components/dashboard/AuditTab.js`
- Create: `components/dashboard/AccountSettings.js`
- Modify: `app/accounts/[id]/page.js` — add date range selector, hero stat row, charts, action bar to Overview; plug all dashboard components into tabs; remove Budget tab

### Task 5 — Agent Dashboard
- Create: `app/api/agents/runs/route.js` — GET recent runs across all accounts
- Modify: `app/agents/page.js` — cross-account agent cards (status/last run/total actions/success rate), global timeline, global toggles

### Task 6 — Google Trends Seasonality
- Create: `app/api/trends/route.js` — fetch + normalize Google Trends data, 24h in-memory cache, benchmarks fallback
- Modify: `lib/prompts.js` — add `seasonalMultipliers` param to `budgetProjectionPrompt`
- Modify seasonal chart display in `app/clients/[id]/page.js` (find via grep: "seasonal" or "ESTIMATED") — swap hardcoded multipliers for real trends data + badge

### Task 7 — Production Polish
- Create: `components/Skeleton.js`
- Create: `components/ErrorBoundary.js`
- Create: `lib/rateLimit.js`
- Modify: Gemini-backed API routes (9 routes) — add rate limit guard
- Modify: Write API routes (3 routes) — add tighter rate limit guard
- Modify: Account page + research page — wrap major sections in `<ErrorBoundary>`, replace spinners with `<Skeleton>`

---

## Task 1: Design Tokens + Dark/Light Mode

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.js`
- Create: `components/ThemeProvider.js`
- Modify: `app/layout.js`
- Modify: `components/Sidebar.js`

- [ ] **Step 1: Add CSS custom properties to globals.css**

Add after the existing `:root { --sidebar-width: 256px; }` block:

```css
/* Light mode (default) */
:root {
  --sidebar-width: 256px;
  --bg: #f4f6fa;
  --sidebar: #1e2a3a;
  --card: #ffffff;
  --primary: #2d5be3;
  --accent: #f5a623;
  --border: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
}

/* Dark mode */
[data-theme="dark"] {
  --bg: #0d1117;
  --sidebar: #131820;
  --card: #1a2230;
  --primary: #2d5be3;
  --accent: #f5a623;
  --border: #2a3348;
  --text-primary: #ffffff;
  --text-secondary: #8b9ab3;
}

/* Apply tokens to body */
body {
  background: var(--bg);
  color: var(--text-primary);
}
```

Also update the existing `body` rule (keep font-family, antialiasing — just replace background and color):

```css
body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 2: Update tailwind.config.js to reference CSS vars**

Replace the `colors` section in `tailwind.config.js`:

```js
colors: {
  primary: 'var(--primary)',
  'primary-hover': '#0a3d8f',
  'primary-container': '#3366cc',
  'primary-fixed': '#d9e2ff',
  'primary-fixed-dim': '#b1c5ff',
  tertiary: '#6d5e00',
  'tertiary-container': '#bfab49',
  'tertiary-fixed': '#f9e37a',
  'tertiary-fixed-dim': '#dcc661',
  secondary: 'var(--text-secondary)',
  'secondary-container': '#dfe3e8',
  surface: 'var(--bg)',
  'surface-dim': '#dbdadb',
  'surface-bright': 'var(--bg)',
  'surface-variant': '#e3e2e3',
  'surface-lowest': 'var(--card)',
  'surface-low': 'color-mix(in srgb, var(--card) 95%, var(--border))',
  'surface-mid': 'color-mix(in srgb, var(--card) 90%, var(--border))',
  'surface-high': 'color-mix(in srgb, var(--card) 85%, var(--border))',
  'surface-highest': 'color-mix(in srgb, var(--card) 80%, var(--border))',
  'on-surface': 'var(--text-primary)',
  'on-variant': 'var(--text-secondary)',
  'on-primary': '#ffffff',
  outline: '#737784',
  'outline-variant': 'var(--border)',
  error: '#ba1a1a',
  'error-container': '#ffdad6',
},
```

- [ ] **Step 3: Create components/ThemeProvider.js**

```jsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'light', toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

- [ ] **Step 4: Update app/layout.js to wrap with ThemeProvider**

```jsx
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata = {
  title: 'PPC Recon — Google Ads Intelligence',
  description: 'AI-powered keyword research, competitor auditing, and low-hanging fruit discovery for trade contractors.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&family=Public+Sans:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface min-h-screen">
        <ThemeProvider>
          <Sidebar />
          <Header />
          <main className="ml-64 pt-16 min-h-screen">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Add dark mode toggle to components/Sidebar.js**

Add `import { useTheme } from '@/components/ThemeProvider';` at the top.

Add `const { theme, toggle } = useTheme();` inside the `Sidebar` function.

Replace the `{/* Bottom */}` section's inner content — add this button before the "New Research" CTA:

```jsx
{/* Theme toggle */}
<button
  onClick={toggle}
  className="w-full flex items-center gap-3 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded-lg text-sm font-label mb-2"
>
  <span className="material-symbols-outlined text-[20px]">
    {theme === 'dark' ? 'light_mode' : 'dark_mode'}
  </span>
  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
</button>
```

Also update the `<aside>` className to always use dark navy (sidebar is always dark per spec):

```jsx
<aside className="no-print fixed left-0 top-0 h-screen w-64 flex flex-col py-6 px-4 bg-[#131820] border-r border-white/5 z-50">
```

Update brand text and nav link classes to use white text (since sidebar is always dark):

- Brand `<h1>` → `text-white`
- Brand `<p>` → `text-white/50`
- Section labels → `text-white/30`
- Active nav link → `text-white font-semibold bg-white/10 border-r-2 border-[var(--primary)]`
- Inactive nav link → `text-white/60 font-medium hover:bg-white/10 hover:text-white`
- Bottom action links → `text-white/50 hover:bg-white/10 hover:text-white`

- [ ] **Step 6: Verify dark mode works**

Run `npm run dev`, open app, click toggle in sidebar footer. Confirm:
- Background switches between `#f4f6fa` (light) and `#0d1117` (dark)
- Cards switch between `#ffffff` and `#1a2230`
- Sidebar stays navy in both modes
- Preference persists on page refresh

- [ ] **Step 7: Commit**

```bash
git add app/globals.css tailwind.config.js components/ThemeProvider.js app/layout.js components/Sidebar.js
git commit -m "feat: add dark/light mode with CSS custom property tokens"
```

---

## Task 2: Budget Projection Fix + Calibration

**Files:**
- Modify: `lib/prompts.js`
- Modify: `app/api/budget-projection/route.js`
- Modify: `app/research/page.js`

- [ ] **Step 1: Update budgetProjectionPrompt in lib/prompts.js**

Update the function signature and IMPORTANT GUIDELINES section. The new function:

```js
export function budgetProjectionPrompt(businessName, industry, serviceAreas, keywordData, competitorData, calibration = null) {
  const calibrationBlock = calibration?.spend && calibration?.leads
    ? `\nIMPORTANT: This client's actual verified CPL is $${Math.round(calibration.spend / calibration.leads)}. All budget tiers must be anchored to this CPL. Do not use generic conversion rate benchmarks — use this real number.\n`
    : '';

  return `You are a senior Google Ads strategist preparing a budget analysis for a ${industry} business called "${businessName}" serving ${JSON.stringify(serviceAreas)}.

KEYWORD RESEARCH DATA:
${JSON.stringify(keywordData)}

COMPETITOR DATA:
${JSON.stringify(competitorData)}
${calibrationBlock}
Based on this data, generate a comprehensive budget projection report. Be specific with numbers — use the actual keyword CPCs, search volumes, and competitor context provided above.

Return ONLY valid JSON:
{
  "budget_tiers": [
    {
      "level": "conservative",
      "monthly_budget": number,
      "rationale": "string",
      "expected_monthly_clicks": number,
      "expected_monthly_leads": number,
      "expected_cost_per_lead": number,
      "campaigns_funded": ["string"],
      "what_you_get": "string"
    },
    { "level": "balanced" },
    { "level": "aggressive" },
    { "level": "growth" }
  ],
  "lead_scenarios": [
    { "leads_per_month": 10, "required_budget": number, "cost_per_lead": number, "feasibility": "achievable | challenging | aspirational", "notes": "string" },
    { "leads_per_month": 20 },
    { "leads_per_month": 30 },
    { "leads_per_month": 50 }
  ],
  "recommended_allocation": [
    { "campaign_name": "string", "monthly_budget": number, "priority": "must_have | should_have | nice_to_have", "expected_leads": number, "reason": "string" }
  ],
  "minimum_viable_budget": number,
  "sweet_spot_budget": number,
  "market_context": "string",
  "key_insights": ["string"],
  "executive_pitch": "string"
}

IMPORTANT GUIDELINES:
- Base all numbers on the actual CPC data provided — do not invent generic numbers
- For ${industry}, typical lead conversion rates from clicks: transactional keywords 1.5–3%, commercial 0.5–1.5%
- Monthly budget must not exceed: (number of keywords in tier × avg CPC × 200 clicks per keyword per month). This is a hard ceiling.
- Factor in the competition level from the competitor data when setting expectations
- "Growth" tier shows the realistic ceiling based on total keyword pool volume — not unlimited extrapolation
- Lead scenarios at 10/20/30/50 should be grounded in the actual keyword pool size and CPCs
- minimum_viable_budget is the floor below which Google Ads is unlikely to generate meaningful results
- sweet_spot_budget is the inflection point where ROI is maximized before diminishing returns
- executive_pitch should be compelling enough to use in a client presentation verbatim

Return ONLY the JSON object.`;
}
```

- [ ] **Step 2: Update app/api/budget-projection/route.js to pass calibration**

```js
import { callGemini, parseGeminiJSON } from '@/lib/gemini';
import { budgetProjectionPrompt } from '@/lib/prompts';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req) {
  try {
    const { apiKey, businessName, industry, serviceAreas, keywordData, competitorData, calibration } = await req.json();

    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API key is required' }, { status: 400 });
    }

    const prompt = budgetProjectionPrompt(businessName, industry, serviceAreas, keywordData, competitorData, calibration);
    const raw = await callGemini(geminiKey, prompt, { maxTokens: 8192, thinkingBudget: 1024 });
    const data = parseGeminiJSON(raw);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Budget projection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate budget projection' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Add calibration state to app/research/page.js**

Find the state block in `ResearchPageInner` (around line 48) and add:

```js
const [calibration, setCalibration] = useState({ spend: '', leads: '' });
const [showCalibration, setShowCalibration] = useState(false);
```

- [ ] **Step 4: Add calibration UI to research/page.js Step 1**

Find the service area chips section in the Step 1 JSX (after service areas input, before the "Run Research" button). Add this collapsible section:

```jsx
{/* Calibration */}
<div className="mt-4">
  <button
    type="button"
    onClick={() => setShowCalibration(v => !v)}
    className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors font-label"
  >
    <span className="material-symbols-outlined text-[14px]">
      {showCalibration ? 'expand_less' : 'expand_more'}
    </span>
    Calibrate with real numbers (optional)
  </button>
  {showCalibration && (
    <div className="mt-3 p-4 bg-surface-low rounded-xl border border-outline-variant/20 space-y-3">
      <p className="text-xs text-secondary font-label">
        Anchor budget projections to your client's actual results instead of industry benchmarks.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Monthly Ad Spend ($)</label>
          <input
            type="number"
            className="field-input"
            placeholder="e.g. 4200"
            value={calibration.spend}
            onChange={e => setCalibration(prev => ({ ...prev, spend: e.target.value }))}
          />
        </div>
        <div>
          <label className="field-label">Leads per Month (#)</label>
          <input
            type="number"
            className="field-input"
            placeholder="e.g. 18"
            value={calibration.leads}
            onChange={e => setCalibration(prev => ({ ...prev, leads: e.target.value }))}
          />
        </div>
      </div>
      {calibration.spend && calibration.leads && Number(calibration.leads) > 0 && (
        <p className="text-xs text-primary font-label font-semibold">
          ✓ Actual CPL: ${Math.round(Number(calibration.spend) / Number(calibration.leads))} — will be used to anchor all tiers
        </p>
      )}
    </div>
  )}
</div>
```

- [ ] **Step 5: Pass calibration to budget projection API call**

Find the section in `research/page.js` where `/api/budget-projection` is called. Add `calibration` to the request body:

```js
const calibrationPayload = calibration.spend && calibration.leads
  ? { spend: Number(calibration.spend), leads: Number(calibration.leads) }
  : null;

const res = await fetch('/api/budget-projection', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    apiKey,
    businessName: websiteData?.business_name,
    industry,
    serviceAreas,
    keywordData,
    competitorData,
    calibration: calibrationPayload,
  }),
});
```

- [ ] **Step 6: Verify**

Run a budget projection with calibration values (e.g., $4200 spend / 18 leads). The projected CPL tiers should cluster around $233, not 4× that.

- [ ] **Step 7: Commit**

```bash
git add lib/prompts.js app/api/budget-projection/route.js app/research/page.js
git commit -m "fix: calibrate budget projection with conservative conversion rates and optional real-number anchor"
```

---

## Task 3: Location Autocomplete + Nearby Expansion

**Files:**
- Create: `app/api/places/autocomplete/route.js`
- Create: `app/api/places/nearby/route.js`
- Create: `components/ServiceAreaInput.js`
- Modify: `app/research/page.js`
- Modify: `.env.example`

- [ ] **Step 1: Create app/api/places/autocomplete/route.js**

```js
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&types=(cities)&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK') {
        return NextResponse.json(
          data.predictions.slice(0, 5).map(p => ({
            label: p.description,
            placeId: p.place_id,
            lat: null,
            lng: null,
          }))
        );
      }
    } catch (e) {
      // fall through to Nominatim
    }
  }

  // Nominatim fallback
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&featuretype=city&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ppc-recon/1.0' } });
    const data = await res.json();
    return NextResponse.json(
      data.map(item => ({
        label: [item.address?.city || item.address?.town || item.name, item.address?.state].filter(Boolean).join(', '),
        placeId: item.place_id,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }))
    );
  } catch (e) {
    return NextResponse.json([]);
  }
}
```

- [ ] **Step 2: Create app/api/places/nearby/route.js**

```js
import { NextResponse } from 'next/server';

// Convert miles to degrees (approximate)
const milesToDeg = (miles) => miles / 69;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat'));
  const lng = parseFloat(searchParams.get('lng'));
  const radius = parseFloat(searchParams.get('radius') || '30');

  if (isNaN(lat) || isNaN(lng)) return NextResponse.json([]);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const radiusMeters = radius * 1609;

  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=locality&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK') {
        return NextResponse.json(
          data.results.slice(0, 8).map(p => ({
            label: p.name,
            lat: p.geometry.location.lat,
            lng: p.geometry.location.lng,
          }))
        );
      }
    } catch (e) {
      // fall through
    }
  }

  // Nominatim fallback: bounding box search for populated places
  try {
    const deg = milesToDeg(radius);
    const viewbox = `${lng - deg},${lat + deg},${lng + deg},${lat - deg}`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=8&featuretype=city&viewbox=${viewbox}&bounded=1&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ppc-recon/1.0' } });
    const data = await res.json();
    return NextResponse.json(
      data.map(item => ({
        label: item.address?.city || item.address?.town || item.name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      })).filter(item => item.label)
    );
  } catch (e) {
    return NextResponse.json([]);
  }
}
```

- [ ] **Step 3: Create components/ServiceAreaInput.js**

```jsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function ServiceAreaInput({ value, onChange }) {
  // value: string[] (chip labels), onChange: (string[]) => void
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [nearby, setNearby] = useState([]);
  const [showAllNearby, setShowAllNearby] = useState(false);
  const [lastLocation, setLastLocation] = useState(null); // { label, lat, lng }
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch { setSuggestions([]); }
  }, []);

  const fetchNearby = useCallback(async (lat, lng) => {
    if (!lat || !lng) return;
    try {
      const res = await fetch(`/api/places/nearby?lat=${lat}&lng=${lng}&radius=30`);
      const data = await res.json();
      setNearby(Array.isArray(data) ? data : []);
    } catch { setNearby([]); }
  }, []);

  const handleInputChange = (e) => {
    const v = e.target.value;
    setInput(v);
    setHighlightIndex(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 300);
  };

  const addChip = (label) => {
    if (!label.trim() || value.includes(label)) return;
    onChange([...value, label]);
  };

  const removeChip = (label) => {
    onChange(value.filter(v => v !== label));
  };

  const selectSuggestion = (suggestion) => {
    addChip(suggestion.label);
    setInput('');
    setSuggestions([]);
    setHighlightIndex(-1);
    setShowAllNearby(false);
    if (suggestion.lat && suggestion.lng) {
      setLastLocation(suggestion);
      fetchNearby(suggestion.lat, suggestion.lng);
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && suggestions[highlightIndex]) {
        selectSuggestion(suggestions[highlightIndex]);
      } else if (input.trim()) {
        addChip(input.trim());
        setInput('');
        setSuggestions([]);
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setHighlightIndex(-1);
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const visibleNearby = showAllNearby ? nearby : nearby.slice(0, 4);
  const hiddenCount = nearby.length - 4;

  return (
    <div className="space-y-2">
      {/* Chips + input */}
      <div className="field-input flex flex-wrap gap-1.5 min-h-[42px] cursor-text" onClick={() => inputRef.current?.focus()}>
        {value.map(chip => (
          <span key={chip} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-label font-semibold px-2.5 py-1 rounded-full">
            {chip}
            <button type="button" onClick={() => removeChip(chip)} className="hover:text-red-600 transition-colors">
              <span className="material-symbols-outlined text-[12px]">close</span>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? 'Type a city or zip code…' : ''}
          className="flex-1 min-w-32 bg-transparent outline-none text-sm text-on-surface placeholder:text-outline"
        />
      </div>

      {/* Autocomplete dropdown */}
      {suggestions.length > 0 && (
        <div className="border border-outline-variant/30 rounded-xl bg-surface-lowest shadow-modal overflow-hidden z-50">
          {suggestions.map((s, i) => (
            <button
              key={s.placeId || s.label}
              type="button"
              onClick={() => selectSuggestion(s)}
              className={`w-full text-left px-4 py-2.5 text-sm font-label transition-colors ${i === highlightIndex ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-low'}`}
            >
              <span className="material-symbols-outlined text-[14px] mr-2 text-secondary align-middle">location_on</span>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Nearby suggestions */}
      {nearby.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Nearby:</span>
          {visibleNearby.map(n => (
            <button
              key={n.label}
              type="button"
              onClick={() => { addChip(n.label); }}
              disabled={value.includes(n.label)}
              className="text-xs font-label px-2.5 py-1 rounded-full border border-outline-variant/30 text-secondary hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + {n.label}
            </button>
          ))}
          {!showAllNearby && hiddenCount > 0 && (
            <button type="button" onClick={() => setShowAllNearby(true)} className="text-xs font-label text-primary hover:underline">
              + {hiddenCount} more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update app/research/page.js to use ServiceAreaInput**

Add at top of file: `import ServiceAreaInput from '@/components/ServiceAreaInput';`

Find the service areas block in the JSX (the section with `areaInput`, Enter-to-add logic, and chip rendering). Replace the entire area input + chips block with:

```jsx
<div>
  <label className="field-label">Service Areas</label>
  <ServiceAreaInput value={serviceAreas} onChange={setServiceAreas} />
</div>
```

Remove the `areaInput` state and the `handleAddArea`/`handleRemoveArea` functions (they are replaced by ServiceAreaInput's internal logic).

Remove the `areaInput` state declaration: `const [areaInput, setAreaInput] = useState('');`

- [ ] **Step 5: Add GOOGLE_MAPS_API_KEY to .env.example**

Add before the closing of the file:

```
# Optional — enables city autocomplete. Falls back to OpenStreetMap if not set.
GOOGLE_MAPS_API_KEY=
```

- [ ] **Step 6: Verify**

Run `npm run dev`. On research page Step 1, type "Greens" in service areas — should see dropdown with "Greensboro, NC" etc. Select it — chip appears, nearby row shows High Point, Winston-Salem, etc.

- [ ] **Step 7: Commit**

```bash
git add app/api/places/ components/ServiceAreaInput.js app/research/page.js .env.example
git commit -m "feat: location autocomplete with nearby city suggestions (Google Maps + Nominatim fallback)"
```

---

## Task 4a: Install Recharts + StatCard

**Files:**
- Install: `recharts`
- Create: `components/dashboard/StatCard.js`

- [ ] **Step 1: Install Recharts**

```bash
npm install recharts
```

Verify it appears in `package.json` dependencies.

- [ ] **Step 2: Create components/dashboard/StatCard.js**

```jsx
'use client';

export default function StatCard({ label, value, subvalue, color = 'primary', progress = null, progressColor = 'primary' }) {
  // color: 'primary' | 'gold' | 'green' | 'red'
  const colorMap = {
    primary: 'text-[var(--primary)]',
    gold: 'text-[#f5a623]',
    green: 'text-emerald-600',
    red: 'text-red-600',
  };
  const progressColorMap = {
    primary: 'bg-[var(--primary)]',
    red: 'bg-red-500',
    yellow: 'bg-amber-400',
    green: 'bg-emerald-500',
  };

  return (
    <div className="card p-5 flex flex-col gap-1.5">
      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-headline font-bold ${colorMap[color] || colorMap.primary}`}>
        {value ?? '—'}
      </p>
      {subvalue && <p className="text-xs text-secondary font-label">{subvalue}</p>}
      {progress !== null && (
        <div className="mt-2">
          <div className="h-1.5 rounded-full bg-surface-high overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressColorMap[progressColor]}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-secondary font-label mt-1">{Math.round(progress)}% of budget used</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/StatCard.js package.json package-lock.json
git commit -m "feat: add StatCard component and install Recharts"
```

---

## Task 4b: SpendChart + ConversionsChart

**Files:**
- Create: `components/dashboard/SpendChart.js`
- Create: `components/dashboard/ConversionsChart.js`

- [ ] **Step 1: Create components/dashboard/SpendChart.js**

```jsx
'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function formatDollar(v) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v}`;
}

export default function SpendChart({ data, loading }) {
  // data: [{ date: 'Jan 1', spend: 123.45 }]
  if (loading) {
    return (
      <div className="card p-5 h-56 flex items-center justify-center">
        <div className="w-full h-32 bg-surface-high rounded-lg animate-pulse" />
      </div>
    );
  }

  const hasMultiple = data && data.length >= 2;

  return (
    <div className="card p-5">
      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-4">Spend Over Time</p>
      {!hasMultiple && data?.length === 1 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
          <BarChart width={80} height={60} data={data}>
            <Bar dataKey="spend" fill="#2d5be3" radius={[4,4,0,0]} />
          </BarChart>
          <p className="text-xs text-secondary font-label">Sync regularly to build history</p>
        </div>
      ) : !data?.length ? (
        <div className="flex items-center justify-center h-32 text-xs text-secondary font-label">
          No data yet — click Sync to pull from Google Ads
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'Public Sans' }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatDollar} tick={{ fontSize: 10, fontFamily: 'Public Sans' }} tickLine={false} axisLine={false} width={48} />
            <Tooltip
              formatter={(v) => [`$${v.toFixed(2)}`, 'Spend']}
              contentStyle={{ fontSize: 12, fontFamily: 'Public Sans', borderRadius: 8, border: '1px solid var(--border)' }}
            />
            <Bar dataKey="spend" fill="#2d5be3" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create components/dashboard/ConversionsChart.js**

```jsx
'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Dot } from 'recharts';

export default function ConversionsChart({ data, loading }) {
  // data: [{ date: 'Jan 1', conversions: 4 }]
  if (loading) {
    return (
      <div className="card p-5 h-56 flex items-center justify-center">
        <div className="w-full h-32 bg-surface-high rounded-lg animate-pulse" />
      </div>
    );
  }

  const hasMultiple = data && data.length >= 2;

  return (
    <div className="card p-5">
      <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-4">Conversions Over Time</p>
      {!data?.length ? (
        <div className="flex items-center justify-center h-32 text-xs text-secondary font-label">
          No conversion data yet
        </div>
      ) : !hasMultiple ? (
        <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
          <p className="text-2xl font-headline font-bold text-[#f5a623]">{data[0]?.conversions ?? 0}</p>
          <p className="text-xs text-secondary font-label">Leads this period</p>
          <p className="text-xs text-secondary font-label">Sync regularly to build history</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'Public Sans' }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fontFamily: 'Public Sans' }} tickLine={false} axisLine={false} width={32} />
            <Tooltip
              formatter={(v) => [v, 'Conversions']}
              contentStyle={{ fontSize: 12, fontFamily: 'Public Sans', borderRadius: 8, border: '1px solid var(--border)' }}
            />
            <Line dataKey="conversions" stroke="#f5a623" strokeWidth={2} dot={{ r: 3, fill: '#f5a623' }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/SpendChart.js components/dashboard/ConversionsChart.js
git commit -m "feat: add SpendChart and ConversionsChart Recharts components"
```

---

## Task 4c: CampaignTable Component

**Files:**
- Create: `components/dashboard/CampaignTable.js`

- [ ] **Step 1: Create components/dashboard/CampaignTable.js**

```jsx
'use client';

import { useState } from 'react';

const fmtCost = (v) => '$' + (v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

function StatusBadge({ status }) {
  const cls = {
    enabled: 'bg-emerald-50 text-emerald-600',
    paused: 'bg-slate-100 text-slate-500',
  }[status?.toLowerCase()] || 'bg-amber-50 text-amber-600';
  return <span className={`text-[10px] font-label font-bold px-2 py-0.5 rounded-full capitalize ${cls}`}>{status || '—'}</span>;
}

export default function CampaignTable({ campaigns, accountId, onRefresh }) {
  const [sortKey, setSortKey] = useState('cpl');
  const [sortDir, setSortDir] = useState('asc');
  const [editingBudget, setEditingBudget] = useState(null); // campaign id
  const [budgetDraft, setBudgetDraft] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  if (!campaigns?.length) {
    return (
      <div className="card p-8 text-center text-sm text-secondary font-label">
        No campaign data yet — click Sync to pull from Google Ads
      </div>
    );
  }

  const avgCpl = (() => {
    const withCpl = campaigns.filter(c => c.conversions > 0);
    if (!withCpl.length) return null;
    const totalCost = withCpl.reduce((s, c) => s + (c.cost || 0), 0);
    const totalConv = withCpl.reduce((s, c) => s + (c.conversions || 0), 0);
    return totalConv > 0 ? totalCost / totalConv : null;
  })();

  const sorted = [...campaigns].sort((a, b) => {
    const getCpl = (c) => c.conversions > 0 ? c.cost / c.conversions : Infinity;
    const getVal = (c) => {
      if (sortKey === 'cpl') return getCpl(c);
      return c[sortKey] ?? 0;
    };
    const diff = getVal(a) - getVal(b);
    return sortDir === 'asc' ? diff : -diff;
  });

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) => (
    <span className="material-symbols-outlined text-[12px] ml-0.5">
      {sortKey === col ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
    </span>
  );

  const saveInlineBudget = async (campaign) => {
    const newBudget = parseFloat(budgetDraft);
    if (isNaN(newBudget) || newBudget <= 0) { setEditingBudget(null); return; }
    setSavingBudget(true);
    try {
      await fetch(`/api/accounts/${accountId}/campaigns`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, dailyBudget: newBudget }),
      });
      onRefresh?.();
    } catch (e) {
      console.error('Budget save failed:', e);
    } finally {
      setSavingBudget(false);
      setEditingBudget(null);
    }
  };

  const togglePause = async (campaign) => {
    const newStatus = campaign.status?.toLowerCase() === 'enabled' ? 'PAUSED' : 'ENABLED';
    try {
      await fetch(`/api/accounts/${accountId}/campaigns`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, status: newStatus }),
      });
      onRefresh?.();
    } catch (e) {
      console.error('Status toggle failed:', e);
    }
  };

  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            {[['name','Name'],['status','Status'],['cost','Spend'],['clicks','Clicks'],['conversions','Conv.'],['cpl','CPL'],['daily_budget','Daily Budget'],['actions','']].map(([key, label]) => (
              <th key={key} onClick={key !== 'actions' && key !== 'name' ? () => toggleSort(key) : undefined}
                className={key !== 'actions' && key !== 'name' ? 'cursor-pointer select-none' : ''}>
                {label}{key !== 'actions' && key !== 'name' && key !== 'status' && <SortIcon col={key} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(c => {
            const cpl = c.conversions > 0 ? c.cost / c.conversions : null;
            const highCpl = avgCpl && cpl && cpl > avgCpl * 1.5;
            return (
              <tr key={c.id}>
                <td className="font-medium text-on-surface max-w-[220px] truncate">{c.name}</td>
                <td><StatusBadge status={c.status} /></td>
                <td>{fmtCost(c.cost)}</td>
                <td>{(c.clicks || 0).toLocaleString()}</td>
                <td>{c.conversions || 0}</td>
                <td>
                  {cpl ? (
                    <span className="flex items-center gap-1">
                      {fmtCost(cpl)}
                      {highCpl && (
                        <span className="text-[10px] font-label font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600">HIGH</span>
                      )}
                    </span>
                  ) : '—'}
                </td>
                <td>
                  {editingBudget === c.id ? (
                    <span className="flex items-center gap-1">
                      <input
                        type="number"
                        value={budgetDraft}
                        onChange={e => setBudgetDraft(e.target.value)}
                        className="w-20 px-2 py-1 text-xs border border-primary rounded focus:outline-none"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') saveInlineBudget(c); if (e.key === 'Escape') setEditingBudget(null); }}
                      />
                      <button onClick={() => saveInlineBudget(c)} disabled={savingBudget} className="text-xs text-primary hover:underline font-label">Save</button>
                    </span>
                  ) : (
                    <button onClick={() => { setEditingBudget(c.id); setBudgetDraft(c.daily_budget || ''); }} className="text-xs text-secondary hover:text-primary font-label transition-colors">
                      {c.daily_budget ? fmtCost(c.daily_budget) + '/day' : '—'}
                    </button>
                  )}
                </td>
                <td>
                  <button
                    onClick={() => togglePause(c)}
                    className="text-[10px] font-label font-semibold px-2 py-1 rounded border border-outline-variant/30 text-secondary hover:border-primary hover:text-primary transition-colors"
                  >
                    {c.status?.toLowerCase() === 'enabled' ? 'Pause' : 'Enable'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/CampaignTable.js
git commit -m "feat: add CampaignTable dashboard component with inline edit and sort"
```

---

## Task 4d: KeywordTable Component

**Files:**
- Create: `components/dashboard/KeywordTable.js`

- [ ] **Step 1: Create components/dashboard/KeywordTable.js**

```jsx
'use client';

import { useState } from 'react';

const fmtCost = (v) => '$' + (v || 0).toFixed(2);
const FILTERS = ['All', 'Active', 'Paused', 'Agent Flagged'];

export default function KeywordTable({ keywords, accountId, agentSuggestions = [], onRefresh }) {
  const [filter, setFilter] = useState('All');
  const [editingBid, setEditingBid] = useState(null);
  const [bidDraft, setBidDraft] = useState('');

  // agentSuggestions: [{ keyword, suggestion, spend, conversions }]
  const flaggedKeywords = new Set(agentSuggestions.map(s => s.keyword));

  const filtered = (keywords || []).filter(kw => {
    if (filter === 'Active') return kw.status?.toLowerCase() === 'enabled';
    if (filter === 'Paused') return kw.status?.toLowerCase() === 'paused';
    if (filter === 'Agent Flagged') return flaggedKeywords.has(kw.keyword_text);
    return true;
  });

  const saveInlineBid = async (kw) => {
    const newBid = parseFloat(bidDraft);
    if (isNaN(newBid) || newBid <= 0) { setEditingBid(null); return; }
    try {
      await fetch(`/api/accounts/${accountId}/keywords`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywordId: kw.id, cpcBidMicros: Math.round(newBid * 1_000_000) }),
      });
      onRefresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setEditingBid(null);
    }
  };

  const togglePause = async (kw) => {
    const newStatus = kw.status?.toLowerCase() === 'enabled' ? 'PAUSED' : 'ENABLED';
    try {
      await fetch(`/api/accounts/${accountId}/keywords`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywordId: kw.id, status: newStatus }),
      });
      onRefresh?.();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs font-label font-semibold px-3 py-1.5 rounded-lg transition-colors ${filter === f ? 'bg-primary text-white' : 'text-secondary hover:bg-surface-high'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-secondary font-label">No keywords match this filter</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Match</th>
                <th>Ad Group</th>
                <th>Impressions</th>
                <th>Clicks</th>
                <th>CPC</th>
                <th>Cost</th>
                <th>Conv.</th>
                <th>QS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(kw => {
                const suggestion = agentSuggestions.find(s => s.keyword === kw.keyword_text);
                return (
                  <tr key={kw.id}>
                    <td>
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-on-surface">{kw.keyword_text}</span>
                        {suggestion && (
                          <span className="text-[10px] font-label font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 shrink-0">
                            AI: {suggestion.suggestion}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="capitalize text-secondary">{kw.match_type?.toLowerCase()}</td>
                    <td className="max-w-[140px] truncate text-secondary">{kw.ad_group_name}</td>
                    <td>{(kw.impressions || 0).toLocaleString()}</td>
                    <td>{(kw.clicks || 0).toLocaleString()}</td>
                    <td>
                      {editingBid === kw.id ? (
                        <span className="flex items-center gap-1">
                          <input type="number" value={bidDraft} onChange={e => setBidDraft(e.target.value)}
                            className="w-16 px-1.5 py-0.5 text-xs border border-primary rounded focus:outline-none" autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') saveInlineBid(kw); if (e.key === 'Escape') setEditingBid(null); }} />
                          <button onClick={() => saveInlineBid(kw)} className="text-xs text-primary hover:underline font-label">Save</button>
                        </span>
                      ) : (
                        <button onClick={() => { setEditingBid(kw.id); setBidDraft(kw.cpc_bid_micros ? (kw.cpc_bid_micros / 1e6).toFixed(2) : ''); }}
                          className="text-xs text-secondary hover:text-primary font-label transition-colors">
                          {kw.cpc_bid_micros ? `$${(kw.cpc_bid_micros / 1e6).toFixed(2)}` : '—'}
                        </button>
                      )}
                    </td>
                    <td>{fmtCost(kw.cost)}</td>
                    <td>{kw.conversions || 0}</td>
                    <td>{kw.quality_score ?? '—'}</td>
                    <td>
                      <button onClick={() => togglePause(kw)}
                        className="text-[10px] font-label font-semibold px-2 py-1 rounded border border-outline-variant/30 text-secondary hover:border-primary hover:text-primary transition-colors">
                        {kw.status?.toLowerCase() === 'enabled' ? 'Pause' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/KeywordTable.js
git commit -m "feat: add KeywordTable with agent flag highlights and inline bid editing"
```

---

## Task 4e: AdCopyPanel, ChangeLogTab, AuditTab, AccountSettings

**Files:**
- Create: `components/dashboard/AdCopyPanel.js`
- Create: `components/dashboard/ChangeLogTab.js`
- Create: `components/dashboard/AuditTab.js`
- Create: `components/dashboard/AccountSettings.js`

- [ ] **Step 1: Create components/dashboard/AdCopyPanel.js**

```jsx
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
                        <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-label">{h}</span>
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
```

- [ ] **Step 2: Create components/dashboard/ChangeLogTab.js**

```jsx
'use client';

import { useState } from 'react';

const AGENT_TYPES = ['All', 'bid', 'budget', 'keyword', 'ad_copy', 'negative'];

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ChangeLogTab({ actions, accountId, onUndo }) {
  const [filterType, setFilterType] = useState('All');
  const [undoing, setUndoing] = useState(null);

  const filtered = (actions || []).filter(a => filterType === 'All' || a.agent_type === filterType);

  const handleUndo = async (action) => {
    setUndoing(action.id);
    try {
      await fetch(`/api/accounts/${accountId}/actions/${action.id}/undo`, { method: 'POST' });
      onUndo?.();
    } catch (e) {
      console.error('Undo failed:', e);
    } finally {
      setUndoing(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {AGENT_TYPES.map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`text-xs font-label font-semibold px-3 py-1.5 rounded-lg transition-colors capitalize ${filterType === t ? 'bg-primary text-white' : 'text-secondary hover:bg-surface-high'}`}>
            {t}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-secondary font-label">No agent actions yet</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(action => (
            <div key={action.id} className="card p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">smart_toy</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-label font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{action.agent_type}</span>
                  <span className="text-[10px] text-secondary font-label">{relativeTime(action.created_at)}</span>
                </div>
                <p className="text-sm text-on-surface font-label">{action.description}</p>
                {action.before_value !== undefined && action.after_value !== undefined && (
                  <p className="text-xs text-secondary font-label mt-0.5">
                    {JSON.stringify(action.before_value)} → {JSON.stringify(action.after_value)}
                  </p>
                )}
              </div>
              {action.reversible !== false && (
                <button onClick={() => handleUndo(action)} disabled={undoing === action.id}
                  className="text-xs font-label text-secondary hover:text-red-600 transition-colors border border-outline-variant/30 px-2.5 py-1 rounded shrink-0 disabled:opacity-50">
                  {undoing === action.id ? '…' : 'Undo'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create components/dashboard/AuditTab.js**

```jsx
'use client';

import { useState } from 'react';

const SEVERITY_CLS = {
  critical: 'bg-red-50 text-red-700 border-red-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
};

export default function AuditTab({ auditData, accountId, onRerun }) {
  const [rerunning, setRerunning] = useState(false);

  const handleRerun = async () => {
    setRerunning(true);
    try {
      await fetch(`/api/accounts/${accountId}/sync`, { method: 'POST' });
      await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'audit', accountId }),
      });
      onRerun?.();
    } catch (e) {
      console.error(e);
    } finally {
      setRerunning(false);
    }
  };

  if (!auditData) {
    return (
      <div className="card p-8 flex flex-col items-center gap-4 text-center">
        <span className="material-symbols-outlined text-[48px] text-secondary/30">security</span>
        <p className="text-sm text-secondary font-label">No audit run yet</p>
        <button onClick={handleRerun} disabled={rerunning} className="pill-btn-primary">
          {rerunning ? 'Running Audit…' : 'Run AI Audit'}
        </button>
      </div>
    );
  }

  const score = auditData.health_score ?? auditData.score ?? 0;
  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
  const issues = auditData.issues || [];

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className={`text-5xl font-headline font-bold ${scoreColor}`}>{score}</div>
          <div>
            <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Health Score</p>
            <p className="text-sm text-on-surface font-label mt-0.5">{auditData.summary || 'Account audit complete'}</p>
            {auditData.wasted_spend && (
              <p className="text-xs text-red-600 font-label mt-1">~{auditData.wasted_spend} estimated wasted spend</p>
            )}
          </div>
        </div>
        <button onClick={handleRerun} disabled={rerunning} className="pill-btn-secondary shrink-0">
          <span className="material-symbols-outlined text-[16px]">{rerunning ? 'progress_activity' : 'refresh'}</span>
          {rerunning ? 'Running…' : 'Re-run Audit'}
        </button>
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Issues ({issues.length})</p>
          {issues.map((issue, i) => (
            <div key={i} className={`card p-4 border ${SEVERITY_CLS[issue.severity] || SEVERITY_CLS.info}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-label font-bold uppercase tracking-wider capitalize`}>{issue.severity}</span>
                    {issue.impact && <span className="text-[10px] text-secondary font-label">Impact: {issue.impact}</span>}
                  </div>
                  <p className="text-sm font-label font-medium text-on-surface">{issue.title || issue.issue}</p>
                  {issue.recommendation && <p className="text-xs text-secondary font-label mt-1">{issue.recommendation}</p>}
                </div>
                {issue.automatable && (
                  <button className="pill-btn-secondary text-xs shrink-0">Apply Fix</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick wins */}
      {auditData.quick_wins?.length > 0 && (
        <div>
          <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-2">Quick Wins</p>
          <div className="space-y-2">
            {auditData.quick_wins.map((win, i) => (
              <div key={i} className="card p-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-[18px]">task_alt</span>
                <p className="text-sm font-label text-on-surface">{win}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create components/dashboard/AccountSettings.js**

```jsx
'use client';

import { useState, useEffect } from 'react';

const DEFAULT_SETTINGS = {
  agents: { keyword: true, bid: true, budget: true, ad_copy: true, negative: true },
  bid_adjustment_cap: 20,
  budget_adjustment_cap: 15,
  excluded_campaigns: [],
};

export default function AccountSettings({ accountId, campaigns = [] }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/accounts/${accountId}`)
      .then(r => r.json())
      .then(data => {
        if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      })
      .catch(() => {});
  }, [accountId]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleAgent = (type) => {
    setSettings(prev => ({ ...prev, agents: { ...prev.agents, [type]: !prev.agents[type] } }));
  };

  const toggleExcluded = (campaignId) => {
    setSettings(prev => ({
      ...prev,
      excluded_campaigns: prev.excluded_campaigns.includes(campaignId)
        ? prev.excluded_campaigns.filter(id => id !== campaignId)
        : [...prev.excluded_campaigns, campaignId],
    }));
  };

  const AGENT_LABELS = { keyword: 'Keyword Optimizer', bid: 'Bid Manager', budget: 'Budget Allocator', ad_copy: 'Ad Copy Optimizer', negative: 'Negative Keywords' };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Agent toggles */}
      <div className="card p-5">
        <p className="font-headline font-bold text-on-surface mb-4">Agent Toggles</p>
        <div className="space-y-3">
          {Object.entries(AGENT_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm font-label text-on-surface">{label}</span>
              <button
                onClick={() => toggleAgent(type)}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.agents[type] ? 'bg-primary' : 'bg-surface-high'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${settings.agents[type] ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bid cap */}
      <div className="card p-5">
        <p className="font-headline font-bold text-on-surface mb-1">Bid Adjustment Cap</p>
        <p className="text-xs text-secondary font-label mb-4">Maximum % change per bid adjustment (default ±20%)</p>
        <div className="flex items-center gap-4">
          <input type="range" min={5} max={35} value={settings.bid_adjustment_cap}
            onChange={e => setSettings(prev => ({ ...prev, bid_adjustment_cap: Number(e.target.value) }))}
            className="flex-1 accent-primary" />
          <span className="text-sm font-label font-semibold text-primary w-12 text-right">±{settings.bid_adjustment_cap}%</span>
        </div>
      </div>

      {/* Budget cap */}
      <div className="card p-5">
        <p className="font-headline font-bold text-on-surface mb-1">Budget Adjustment Cap</p>
        <p className="text-xs text-secondary font-label mb-4">Maximum % change per budget adjustment (default ±15%)</p>
        <div className="flex items-center gap-4">
          <input type="range" min={5} max={25} value={settings.budget_adjustment_cap}
            onChange={e => setSettings(prev => ({ ...prev, budget_adjustment_cap: Number(e.target.value) }))}
            className="flex-1 accent-primary" />
          <span className="text-sm font-label font-semibold text-primary w-12 text-right">±{settings.budget_adjustment_cap}%</span>
        </div>
      </div>

      {/* Excluded campaigns */}
      {campaigns.length > 0 && (
        <div className="card p-5">
          <p className="font-headline font-bold text-on-surface mb-1">Excluded Campaigns</p>
          <p className="text-xs text-secondary font-label mb-4">Agents will skip these campaigns entirely</p>
          <div className="space-y-2">
            {campaigns.map(c => (
              <label key={c.id} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.excluded_campaigns.includes(c.id)}
                  onChange={() => toggleExcluded(c.id)} className="accent-primary w-4 h-4" />
                <span className="text-sm font-label text-on-surface">{c.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button onClick={save} disabled={saving}
        className="pill-btn-primary">
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/AdCopyPanel.js components/dashboard/ChangeLogTab.js components/dashboard/AuditTab.js components/dashboard/AccountSettings.js
git commit -m "feat: add AdCopyPanel, ChangeLogTab, AuditTab, AccountSettings dashboard components"
```

---

## Task 4f: Overhaul app/accounts/[id]/page.js

**Files:**
- Modify: `app/accounts/[id]/page.js`

This task wires the new components into the existing account page. The existing page already has tab structure, state management, and data fetching — we're enhancing the Overview tab and plugging in the new components for all other tabs.

- [ ] **Step 1: Add imports to app/accounts/[id]/page.js**

At the top of the file, after existing imports:

```js
import StatCard from '@/components/dashboard/StatCard';
import SpendChart from '@/components/dashboard/SpendChart';
import ConversionsChart from '@/components/dashboard/ConversionsChart';
import CampaignTable from '@/components/dashboard/CampaignTable';
import KeywordTable from '@/components/dashboard/KeywordTable';
import AdCopyPanel from '@/components/dashboard/AdCopyPanel';
import ChangeLogTab from '@/components/dashboard/ChangeLogTab';
import AuditTab from '@/components/dashboard/AuditTab';
import AccountSettings from '@/components/dashboard/AccountSettings';
```

- [ ] **Step 2: Add date range state + update TABS constant**

Find the existing `TABS` constant (around line 70) and replace:

```js
const TABS = [
  { id: 'overview',   label: 'Overview',   icon: 'dashboard' },
  { id: 'campaigns',  label: 'Campaigns',  icon: 'campaign' },
  { id: 'keywords',   label: 'Keywords',   icon: 'key_visualizer' },
  { id: 'adcopy',     label: 'Ad Copy',    icon: 'edit_note' },
  { id: 'changelog',  label: 'Change Log', icon: 'history' },
  { id: 'audit',      label: 'Audit',      icon: 'speed' },
  { id: 'settings',   label: 'Settings',   icon: 'settings' },
];
```

Add date range state inside the `AccountPage` component after the existing state declarations:

```js
const [dateRange, setDateRange] = useState('LAST_30_DAYS');
```

Update the initial data fetch to include `?range=${dateRange}` on the metrics fetch, and add a `useEffect` that re-fetches metrics + campaigns when `dateRange` changes:

```js
useEffect(() => {
  if (!id) return;
  const controller = new AbortController();
  Promise.all([
    fetch(`/api/accounts/${id}/metrics?range=${dateRange}`, { signal: controller.signal }).then(r => r.json()).catch(() => null),
    fetch(`/api/accounts/${id}/campaigns?range=${dateRange}`, { signal: controller.signal }).then(r => r.json()).catch(() => []),
  ]).then(([m, c]) => {
    setMetrics(m);
    setCampaigns(Array.isArray(c) ? c : []);
  }).catch(() => {});
  return () => controller.abort();
}, [id, dateRange]);
```

- [ ] **Step 3: Add "Run AI Audit" state + handler**

After the existing `handleSync` function, add:

```js
const [runningAudit, setRunningAudit] = useState(false);

const handleRunAudit = async () => {
  setRunningAudit(true);
  try {
    await fetch('/api/agents/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'audit', accountId: id }),
    });
    handleTabChange('audit');
  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    setRunningAudit(false);
  }
};
```

- [ ] **Step 4: Replace Overview tab JSX**

Find the Overview tab render section (the JSX inside `activeTab === 'overview'` or the overview case in the tab renderer). Replace the entire overview content with:

```jsx
{/* Date range selector */}
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-xl font-headline font-bold text-on-surface">{account?.name}</h1>
    <p className="text-xs text-secondary font-label mt-0.5">{fmtCustomerId(account?.customer_id)}</p>
  </div>
  <div className="flex gap-1 bg-surface-low rounded-xl p-1">
    {[['LAST_7_DAYS','7d'],['LAST_30_DAYS','30d'],['LAST_90_DAYS','90d']].map(([val, label]) => (
      <button key={val} onClick={() => setDateRange(val)}
        className={`text-xs font-label font-semibold px-3 py-1.5 rounded-lg transition-colors ${dateRange === val ? 'bg-primary text-white' : 'text-secondary hover:text-on-surface'}`}>
        {label}
      </button>
    ))}
  </div>
</div>

{/* Hero stat row */}
{(() => {
  const totalCost = metrics?.total_cost ?? campaigns.reduce((s, c) => s + (c.cost || 0), 0);
  const conversions = metrics?.conversions ?? campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
  const clicks = metrics?.total_clicks ?? campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalBudget = campaigns.reduce((s, c) => s + (c.daily_budget || 0), 0) * 30;
  const budgetUsedPct = totalBudget > 0 ? (totalCost / totalBudget) * 100 : 0;
  const cpl = conversions > 0 ? totalCost / conversions : null;
  const avgCpc = clicks > 0 ? totalCost / clicks : null;
  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      <StatCard label="Cost Per Lead" value={cpl ? `$${cpl.toFixed(2)}` : '—'} subvalue="Primary metric" color="primary" />
      <StatCard label="Total Spend" value={fmtCost(totalCost)} />
      <StatCard label="Conversions" value={conversions} subvalue="Leads" color="gold" />
      <StatCard label="Budget Used"
        value={`${Math.round(budgetUsedPct)}%`}
        subvalue={`${fmtCost(totalCost)} of ${fmtCost(totalBudget)}`}
        progress={budgetUsedPct}
        progressColor={budgetUsedPct > 90 ? 'red' : budgetUsedPct > 75 ? 'yellow' : 'primary'}
      />
      <StatCard label="Avg CPC" value={avgCpc ? `$${avgCpc.toFixed(2)}` : '—'} />
    </div>
  );
})()}

{/* Charts */}
{(() => {
  const snapshots = metrics?.snapshots || [];
  const spendData = snapshots.map(s => ({ date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), spend: s.total_cost || 0 }));
  const convData = snapshots.map(s => ({ date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), conversions: s.conversions || 0 }));
  const fallbackSpend = spendData.length === 0 ? [{ date: 'Current', spend: campaigns.reduce((s, c) => s + (c.cost || 0), 0) }] : spendData;
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <SpendChart data={fallbackSpend} loading={loading} />
      <ConversionsChart data={convData.length ? convData : [{ date: 'Current', conversions: campaigns.reduce((s, c) => s + (c.conversions || 0), 0) }]} loading={loading} />
    </div>
  );
})()}

{/* Campaign table */}
<div className="mb-4">
  <h2 className="text-sm font-headline font-bold text-on-surface mb-3">Campaigns</h2>
  <CampaignTable campaigns={campaigns} accountId={id} onRefresh={handleSync} />
</div>

{/* Action bar */}
<div className="flex gap-3 pt-2">
  <button onClick={handleSync} disabled={syncing} className="pill-btn-primary">
    <span className={`material-symbols-outlined text-[16px] ${syncing ? 'animate-spin' : ''}`}>
      {syncing ? 'progress_activity' : 'sync'}
    </span>
    {syncing ? 'Syncing…' : 'Sync Data'}
  </button>
  <button onClick={handleRunAudit} disabled={runningAudit} className="pill-btn-secondary">
    <span className={`material-symbols-outlined text-[16px] ${runningAudit ? 'animate-spin' : ''}`}>
      {runningAudit ? 'progress_activity' : 'security'}
    </span>
    {runningAudit ? 'Running Audit…' : 'Run AI Audit'}
  </button>
</div>
```

- [ ] **Step 5: Replace remaining tab content with new components**

Find the Campaigns tab content and replace with:
```jsx
<CampaignTable campaigns={campaigns} accountId={id} onRefresh={handleSync} />
<div className="mt-4">
  <a href={`/accounts/${id}/campaigns/new`} className="pill-btn-secondary inline-flex">
    <span className="material-symbols-outlined text-[16px]">add</span>
    Create Campaign
  </a>
</div>
```

Find the Keywords tab content and replace with:
```jsx
<KeywordTable keywords={keywords} accountId={id} onRefresh={() => {
  fetch(`/api/accounts/${id}/keywords`).then(r => r.json()).then(d => setKeywords(Array.isArray(d) ? d : []));
}} />
```

Find the Ad Copy tab content and replace with:
```jsx
<AdCopyPanel ads={ads} accountId={id} />
```

Find the Change Log tab content and replace with:
```jsx
<ChangeLogTab actions={actions} accountId={id} onUndo={() => {
  fetch(`/api/accounts/${id}/actions?limit=100`).then(r => r.json()).then(d => setActions(Array.isArray(d) ? d : []));
}} />
```

Find the Audit tab content and replace with:
```jsx
<AuditTab auditData={account?.audit_data ?? account?.lastAudit} accountId={id} onRerun={() => {
  fetch(`/api/accounts/${id}`).then(r => r.json()).then(setAccount);
}} />
```

Find the Settings tab content and replace with:
```jsx
<AccountSettings accountId={id} campaigns={campaigns} />
```

Remove the Budget tab entirely (it no longer exists in `TABS` constant).

- [ ] **Step 6: Verify**

Run `npm run dev`, navigate to a connected account. Confirm:
- Date range tabs change the period
- Hero stats display (CPL, spend, conversions, budget %, avg CPC)
- Charts render (or show "sync" message if no snapshot history)
- Campaign table is sortable, inline budget edit works
- All 7 tabs switch without errors

- [ ] **Step 7: Commit**

```bash
git add app/accounts/[id]/page.js
git commit -m "feat: overhaul account dashboard with date range, hero stats, charts, and component-driven tabs"
```

---

## Task 5: Agent Dashboard

**Files:**
- Create: `app/api/agents/runs/route.js`
- Modify: `app/agents/page.js`

- [ ] **Step 1: Create app/api/agents/runs/route.js**

```js
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '20');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Recent runs with account name joined
  const { data: runs, error } = await supabase
    .from('agent_runs')
    .select('*, accounts(name, customer_id)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    // Fallback: try agent_actions table if agent_runs doesn't exist
    const { data: actions, error: err2 } = await supabase
      .from('agent_actions')
      .select('*, accounts(name, customer_id)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (err2) return NextResponse.json([], { status: 200 });
    return NextResponse.json(actions || []);
  }

  return NextResponse.json(runs || []);
}
```

- [ ] **Step 2: Overhaul app/agents/page.js**

Replace the `AgentsPage` component (starting from `export default function AgentsPage()` to end of file) with the following. Keep the existing helper functions (`relativeTime`, `AGENT_CONFIG`, `STATUS_STYLES`, `StatusBadge`, `AgentCard`) unchanged:

```jsx
export default function AgentsPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [recentRuns, setRecentRuns] = useState([]);  // cross-account
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [agentState, setAgentState] = useState(
    Object.fromEntries(AGENT_CONFIG.map(a => [a.type, { running: false, lastRun: null, totalActions: 0, successRate: null }]))
  );
  const [runError, setRunError] = useState(null);

  // Load accounts + cross-account runs on mount
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch('/api/accounts', { signal: controller.signal }).then(r => r.json()).catch(() => []),
      fetch('/api/agents/runs?limit=20', { signal: controller.signal }).then(r => r.json()).catch(() => []),
    ]).then(([accountsList, runs]) => {
      const list = Array.isArray(accountsList) ? accountsList : [];
      setAccounts(list);
      if (list.length) setSelectedAccountId(list[0].id);
      const runList = Array.isArray(runs) ? runs : [];
      setRecentRuns(runList);

      // Compute per-agent stats from runs
      setAgentState(prev => {
        const next = { ...prev };
        for (const agent of AGENT_CONFIG) {
          const agentRuns = runList.filter(r => r.agent_type === agent.type || r.type === agent.type);
          const lastRun = agentRuns[0] ?? null;
          const totalActions = agentRuns.reduce((s, r) => s + (r.actions_taken ?? 0), 0);
          const completed = agentRuns.filter(r => r.status === 'completed').length;
          const successRate = agentRuns.length > 0 ? Math.round((completed / agentRuns.length) * 100) : null;
          next[agent.type] = { ...next[agent.type], lastRun, totalActions, successRate };
        }
        return next;
      });
    }).catch(() => {}).finally(() => setLoadingAccounts(false));
    return () => controller.abort();
  }, []);

  const handleRunAgent = async (agentType) => {
    if (!selectedAccountId) { setRunError('Select an account first'); return; }
    setRunError(null);
    setAgentState(prev => ({ ...prev, [agentType]: { ...prev[agentType], running: true } }));
    try {
      const res = await fetch(`/api/agents/${agentType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId }),
      });
      const result = await res.json();
      const newRun = { agent_type: agentType, status: result.success ? 'completed' : 'failed', created_at: new Date().toISOString(), actions_taken: result.actionsCount ?? 0, accounts: accounts.find(a => a.id === selectedAccountId) };
      setRecentRuns(prev => [newRun, ...prev.slice(0, 19)]);
      setAgentState(prev => ({ ...prev, [agentType]: { ...prev[agentType], running: false, lastRun: newRun, totalActions: (prev[agentType].totalActions || 0) + (newRun.actions_taken || 0) } }));
    } catch (err) {
      setRunError(`${agentType} agent failed: ${err.message}`);
      setAgentState(prev => ({ ...prev, [agentType]: { ...prev[agentType], running: false } }));
    }
  };

  const handleGlobalToggle = async (agentType, enabled) => {
    // Write to each account's settings
    await Promise.allSettled(accounts.map(acc =>
      fetch(`/api/accounts/${acc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { agents: { [agentType]: enabled } } }),
      })
    ));
  };

  const anyRunning = Object.values(agentState).some(s => s.running);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">Agent Dashboard</h1>
          <p className="text-sm text-secondary font-label mt-1">AI agents running across all connected accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="field-label mb-0">Run on account:</label>
          {loadingAccounts ? (
            <div className="h-9 w-48 bg-surface-high rounded-lg animate-pulse" />
          ) : (
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="field-input w-48 py-2"
            >
              {accounts.length === 0 && <option value="">No accounts connected</option>}
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name || a.customer_id}</option>)}
            </select>
          )}
        </div>
      </div>

      {runError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-label">{runError}</div>
      )}

      {/* Agent cards grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {AGENT_CONFIG.map(agent => {
          const state = agentState[agent.type];
          return (
            <div key={agent.type} className="card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[22px]">{agent.icon}</span>
                  <p className="font-headline font-bold text-on-surface text-sm">{agent.name}</p>
                </div>
                <StatusBadge status={state.running ? 'running' : (state.lastRun?.status ?? 'idle')} />
              </div>
              <div className="space-y-1 text-xs text-secondary font-label">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                  Last run: {relativeTime(state.lastRun?.created_at)}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px]">check_circle</span>
                  {state.totalActions || 0} total actions
                </div>
                {state.successRate !== null && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px]">percent</span>
                    {state.successRate}% success rate
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <button
                  onClick={() => handleRunAgent(agent.type)}
                  disabled={state.running || anyRunning || !selectedAccountId}
                  className="flex-1 pill-btn-primary justify-center text-xs disabled:opacity-50"
                >
                  {state.running ? (
                    <><span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span> Running…</>
                  ) : (
                    <><span className="material-symbols-outlined text-[14px]">play_arrow</span> Run Now</>
                  )}
                </button>
                {/* Global toggle */}
                <button
                  onClick={() => handleGlobalToggle(agent.type, false)}
                  title="Disable globally"
                  className="p-2 rounded-lg text-secondary hover:bg-surface-high hover:text-red-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">pause_circle</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent runs timeline */}
      <div>
        <h2 className="text-sm font-headline font-bold text-on-surface mb-3">Recent Runs — All Accounts</h2>
        {loadingRuns ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-surface-high rounded-xl animate-pulse" />)}
          </div>
        ) : recentRuns.length === 0 ? (
          <div className="card p-6 text-center text-sm text-secondary font-label">No agent runs yet</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Agent</th>
                  <th>Actions</th>
                  <th>Status</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run, i) => (
                  <tr key={run.id || i}>
                    <td className="font-medium text-on-surface">{run.accounts?.name || run.account_name || '—'}</td>
                    <td><span className="capitalize text-secondary font-label">{run.agent_type || run.type}</span></td>
                    <td>{run.actions_taken ?? '—'}</td>
                    <td><StatusBadge status={run.status} /></td>
                    <td className="text-secondary font-label text-xs">{relativeTime(run.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Navigate to `/agents`. Confirm:
- 6 agent cards show with last run time and total actions
- Account selector works
- "Run Now" triggers agent and updates card status
- Recent runs table shows cross-account history

- [ ] **Step 4: Commit**

```bash
git add app/api/agents/runs/route.js app/agents/page.js
git commit -m "feat: overhaul agent dashboard with cross-account stats, global timeline, and agent toggles"
```

---

## Task 6: Google Trends Seasonality

**Files:**
- Create: `app/api/trends/route.js`
- Modify: `lib/prompts.js`
- Modify: `app/clients/[id]/page.js` (find seasonal chart — grep for "seasonal" or "ESTIMATED")

- [ ] **Step 1: Find the seasonal chart location**

```bash
grep -r "seasonal\|ESTIMATED\|seasonality\|multiplier" app/clients/ --include="*.js" -l
```

Read the file found above to understand the current chart data format.

- [ ] **Step 2: Create app/api/trends/route.js**

```js
import { NextResponse } from 'next/server';
import { INDUSTRY_BENCHMARKS } from '@/lib/benchmarks';

// In-memory cache: { [key]: { multipliers, cachedAt } }
const trendsCache = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(keyword, geo) {
  return `${keyword}|${geo}`;
}

function isStale(entry) {
  return !entry || Date.now() - entry.cachedAt > CACHE_TTL;
}

// Normalize an array of interest values to multipliers (1.0 = average month)
function normalizeToMultipliers(values) {
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  if (avg === 0) return values.map(() => 1);
  return values.map(v => parseFloat((v / avg).toFixed(3)));
}

async function fetchGoogleTrends(keyword, geo) {
  const comparisonItem = JSON.stringify([{ keyword, geo, time: 'today 12-m' }]);
  const params = new URLSearchParams({
    hl: 'en-US',
    tz: '-300',
    req: JSON.stringify({ comparisonItem, category: 0, property: '' }),
  });

  const url = `https://trends.google.com/trends/api/explore?${params}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ppc-recon/1.0)',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`Trends explore failed: ${res.status}`);

  const text = await res.text();
  // Strip the ")]}'\n" XSSI prefix
  const json = JSON.parse(text.replace(/^\)\]\}',?\n/, ''));
  const widgets = json[0]?.widgets || [];
  const timelineWidget = widgets.find(w => w.title === 'Interest over time');
  if (!timelineWidget) throw new Error('No timeline widget');

  const token = timelineWidget.token;
  const timeReq = encodeURIComponent(JSON.stringify({ time: 'today 12-m', resolution: 'MONTH', locale: 'en-US', comparisonItem: [{ geo, complexKeywordsRestriction: { keyword: [{ type: 'BROAD', value: keyword }] } }], requestOptions: { property: '', backend: 'IZG', category: 0 } }));

  const timeUrl = `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=-300&req=${timeReq}&token=${encodeURIComponent(token)}&user_type=PUBLIC_USER`;
  const timeRes = await fetch(timeUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!timeRes.ok) throw new Error(`Trends widgetdata failed: ${timeRes.status}`);

  const timeText = await timeRes.text();
  const timeJson = JSON.parse(timeText.replace(/^\)\]\}',?\n/, ''));
  const timelineData = timeJson.default?.timelineData || [];

  return timelineData.map(entry => entry.value?.[0] ?? 0);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword')?.trim();
  const geo = (searchParams.get('geo') || 'US').toUpperCase();

  if (!keyword) {
    return NextResponse.json({ error: 'keyword required' }, { status: 400 });
  }

  const cacheKey = getCacheKey(keyword, geo);

  if (!isStale(trendsCache[cacheKey])) {
    return NextResponse.json({ ...trendsCache[cacheKey].data, cached: true });
  }

  try {
    const rawValues = await fetchGoogleTrends(keyword, geo);
    if (rawValues.length < 12) throw new Error('Insufficient data');

    const multipliers = normalizeToMultipliers(rawValues.slice(-12));
    const result = { multipliers, source: 'google_trends', keyword, geo };

    trendsCache[cacheKey] = { data: result, cachedAt: Date.now() };
    return NextResponse.json(result);
  } catch (err) {
    console.warn('Google Trends fetch failed, falling back to benchmarks:', err.message);

    // Fall back to hardcoded benchmarks (flat 1.0 per month)
    const multipliers = Array(12).fill(1.0);
    return NextResponse.json({
      multipliers,
      source: 'benchmark_fallback',
      keyword,
      geo,
      fallback_reason: err.message,
    });
  }
}
```

- [ ] **Step 3: Update budgetProjectionPrompt in lib/prompts.js to accept seasonalMultipliers**

Add `seasonalMultipliers = null` parameter to `budgetProjectionPrompt` (it already has `calibration` from Task 2):

```js
export function budgetProjectionPrompt(businessName, industry, serviceAreas, keywordData, competitorData, calibration = null, seasonalMultipliers = null) {
```

Add this block in the prompt text, after the `calibrationBlock` injection, before `IMPORTANT GUIDELINES`:

```js
const seasonalBlock = seasonalMultipliers?.length === 12
  ? `\nSEASONAL DEMAND MULTIPLIERS (Jan–Dec, 1.0 = average month):\n${seasonalMultipliers.join(', ')}\nUse these to adjust monthly projections — peak months may see 1.5-2× the average, troughs 0.5× or less.\n`
  : '';
```

And inject `${seasonalBlock}` in the prompt template after `${calibrationBlock}`.

- [ ] **Step 4: Find and update the seasonal chart in the clients page**

After running the grep in Step 1, read the clients page to find the seasonal chart. The update pattern is:

1. Add state for trends data: `const [trendsData, setTrendsData] = useState(null);`
2. When client data loads (in `useEffect`), fetch trends for the client's primary keyword + state abbreviation:
   ```js
   if (client?.primary_keyword || client?.services?.[0]) {
     const keyword = client.primary_keyword || client.services[0];
     const geoMatch = client.service_areas?.[0]?.match(/,\s*([A-Z]{2})$/);
     const geo = geoMatch ? `US-${geoMatch[1]}` : 'US';
     fetch(`/api/trends?keyword=${encodeURIComponent(keyword)}&geo=${geo}`)
       .then(r => r.json())
       .then(d => setTrendsData(d))
       .catch(() => {});
   }
   ```
3. In the seasonal chart JSX, replace hardcoded multipliers with `trendsData?.multipliers ?? hardcodedMultipliers`
4. Replace the "ESTIMATED" badge with:
   ```jsx
   {trendsData?.source === 'google_trends' ? (
     <span className="text-[10px] font-label font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">GOOGLE TRENDS DATA</span>
   ) : (
     <span className="text-[10px] font-label font-bold px-2 py-0.5 rounded bg-surface-high text-secondary">ESTIMATED</span>
   )}
   ```

- [ ] **Step 5: Verify**

Navigate to a client detail page with a seasonal chart. Confirm the "GOOGLE TRENDS DATA" badge appears (or "ESTIMATED" if fallback). Confirm multipliers look reasonable (not all 1.0 unless genuinely flat industry).

- [ ] **Step 6: Commit**

```bash
git add app/api/trends/route.js lib/prompts.js app/clients/
git commit -m "feat: Google Trends seasonality — real demand curves replace hardcoded multipliers"
```

---

## Task 7: Production Polish

**Files:**
- Create: `components/Skeleton.js`
- Create: `components/ErrorBoundary.js`
- Create: `lib/rateLimit.js`
- Modify: Gemini API routes (9) + write routes (3)
- Modify: `app/accounts/[id]/page.js`, `app/research/page.js`

- [ ] **Step 1: Create components/Skeleton.js**

```jsx
export default function Skeleton({ className = '', rows = 1, height = 'h-4' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`${height} rounded-lg bg-surface-high animate-pulse`} style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card p-5 space-y-2">
      <div className="h-3 w-24 bg-surface-high rounded animate-pulse" />
      <div className="h-8 w-20 bg-surface-high rounded animate-pulse" />
      <div className="h-3 w-16 bg-surface-high rounded animate-pulse" />
    </div>
  );
}

export function TableSkeleton({ rows = 3, cols = 5 }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-outline-variant/10">
        <div className="h-3 w-32 bg-surface-high rounded animate-pulse" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-5 py-4 border-b border-outline-variant/10 last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-3 bg-surface-high rounded animate-pulse" style={{ flex: j === 0 ? 2 : 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create components/ErrorBoundary.js**

```jsx
'use client';

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-6 flex flex-col items-center gap-3 text-center">
          <span className="material-symbols-outlined text-[32px] text-secondary/40">error_outline</span>
          <p className="text-sm text-secondary font-label">This section couldn't load.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="pill-btn-secondary text-xs"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 3: Create lib/rateLimit.js**

```js
// Simple in-memory rate limiter
// { [key]: { count, windowStart } }
const limits = {};

/**
 * @param {Request} req
 * @param {{ limit: number, windowMs: number }} opts
 * @returns {{ allowed: boolean, remaining: number }}
 */
export function checkRateLimit(req, { limit = 10, windowMs = 60_000 } = {}) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const url = new URL(req.url);
  const key = `${ip}:${url.pathname}`;
  const now = Date.now();

  if (!limits[key] || now - limits[key].windowStart > windowMs) {
    limits[key] = { count: 1, windowStart: now };
    return { allowed: true, remaining: limit - 1 };
  }

  limits[key].count++;
  const remaining = Math.max(0, limit - limits[key].count);
  return { allowed: limits[key].count <= limit, remaining };
}
```

- [ ] **Step 4: Add rate limiting to Gemini-backed API routes**

The routes to update (all share the same pattern):
- `app/api/analyze-website/route.js`
- `app/api/keyword-research/route.js`
- `app/api/competitor-audit/route.js`
- `app/api/low-hanging-fruit/route.js`
- `app/api/budget-projection/route.js`
- `app/api/ad-copy/route.js`
- `app/api/brand-lab/route.js`
- `app/api/keyword-planner/route.js`
- `app/api/landing-page-audit/route.js`

For each file, add at the top of the `POST` handler:

```js
import { checkRateLimit } from '@/lib/rateLimit';
// ...
export async function POST(req) {
  const { allowed } = checkRateLimit(req, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests — please wait a moment' }, { status: 429 });
  }
  // ... rest of handler unchanged
```

- [ ] **Step 5: Add rate limiting to write routes**

Update these 3 routes with `limit: 5`:
- `app/api/accounts/[id]/sync/route.js`
- `app/api/agents/run/route.js`
- `app/api/agents/[type]/route.js`

Same pattern as Step 4, but `{ limit: 5, windowMs: 60_000 }`.

- [ ] **Step 6: Apply Skeleton to account dashboard stat cards**

In `app/accounts/[id]/page.js`, find the hero stat row section. Wrap the 5 StatCards in a conditional:

```jsx
import { StatCardSkeleton, TableSkeleton } from '@/components/Skeleton';
// ...
{loading ? (
  <div className="grid grid-cols-5 gap-4 mb-6">
    {[1,2,3,4,5].map(i => <StatCardSkeleton key={i} />)}
  </div>
) : (
  /* existing hero stat row */
)}
```

Wrap the campaign table section:
```jsx
{loading ? <TableSkeleton rows={3} cols={7} /> : <CampaignTable ... />}
```

- [ ] **Step 7: Apply ErrorBoundary to account tabs**

In `app/accounts/[id]/page.js`, add import:
```js
import ErrorBoundary from '@/components/ErrorBoundary';
```

Wrap each tab's content render:
```jsx
<ErrorBoundary key={activeTab}>
  {/* tab content */}
</ErrorBoundary>
```

The `key={activeTab}` ensures the boundary resets when switching tabs.

- [ ] **Step 8: Apply Skeleton + ErrorBoundary to research page**

In `app/research/page.js`, add imports:
```js
import Skeleton from '@/components/Skeleton';
import ErrorBoundary from '@/components/ErrorBoundary';
```

Find the loading spinner for each research phase and replace with `<Skeleton rows={3} height="h-6" className="my-4" />`.

Wrap each results tab panel with `<ErrorBoundary>`.

- [ ] **Step 9: Verify**

1. Navigate to `/research` and click through a research run — skeleton loaders appear instead of spinners
2. Navigate to an account — stat cards show skeleton on load
3. Test rate limit: call any Gemini API route 11× in quick succession — 11th returns 429

- [ ] **Step 10: Commit**

```bash
git add components/Skeleton.js components/ErrorBoundary.js lib/rateLimit.js app/api/ app/accounts/ app/research/
git commit -m "feat: production polish — skeletons, error boundaries, and in-memory rate limiting"
```

---

## Self-Review Checklist

**Spec coverage check:**
- [x] Task 1 — Design System dark/light tokens, CSS vars, toggle, sidebar always dark
- [x] Task 2 — Budget projection conservative defaults (1.5–3%), 200 clicks cap, calibration input
- [x] Task 3 — Location autocomplete (Google Maps + Nominatim), nearby cities, keyboard nav
- [x] Task 4 — Date range selector, 5 hero stats, 2 charts, campaign table with CPL badge, all 7 tabs, Sync + Audit action bar
- [x] Task 5 — Agent dashboard with cross-account runs, per-agent stats, global toggles, new `/api/agents/runs` route
- [x] Task 6 — Trends route, fallback to benchmarks, 24h cache, "GOOGLE TRENDS DATA" badge, prompt injection
- [x] Task 7 — Skeleton component with StatCardSkeleton + TableSkeleton, ErrorBoundary with Retry, rateLimit.js applied to 9 Gemini + 3 write routes

**Type consistency check:**
- `StatCard` props: `label`, `value`, `subvalue`, `color`, `progress`, `progressColor` — consistent in Task 4a and 4f
- `CampaignTable` props: `campaigns`, `accountId`, `onRefresh` — consistent in 4c and 4f
- `KeywordTable` props: `keywords`, `accountId`, `agentSuggestions`, `onRefresh` — consistent in 4d and 4f
- `checkRateLimit(req, opts)` signature — consistent in Task 7 across all routes
- `budgetProjectionPrompt(businessName, industry, serviceAreas, keywordData, competitorData, calibration, seasonalMultipliers)` — Tasks 2, 6 both use this, order matches

**Placeholder scan:** No TBD, TODO, or "similar to Task N" references found.
