# Phase 1: Design System + Pipeline Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full visual rebuild of PPC Recon with a premium dark-mode design system ("The Intelligence Layer") and a new multi-client Pipeline Dashboard as the landing page.

**Architecture:** Replace the current Tailwind light/dark theme system with a dark-only design token layer using CSS custom properties. Build a new `AppShell` layout (264px sidebar + top nav + main content). All existing pages will break after this — that's intentional. This phase builds the foundation; subsequent phases rebuild each page in the new system. The Pipeline Dashboard (`/`) is the first fully functional page.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS (extended with custom tokens), CSS custom properties, Inter font (Google Fonts), Material Symbols Outlined icons, Supabase, Recharts

**Design Reference:** Read `docs/design-references/synthetix_intelligence/DESIGN.md` for the full design system spec. Read `docs/design-references/client_pipeline_dashboard/code.html` for the exact HTML/CSS patterns for the Pipeline Dashboard.

---

## File Map

**New files:**
- `app/globals-new.css` — new design token CSS (replaces `globals.css` content)
- `components/ui/AppShell.js` — layout wrapper: sidebar + top nav + main content
- `components/ui/SidebarNav.js` — new sidebar navigation component
- `components/ui/TopNav.js` — new top navigation bar
- `components/ui/StatCard.js` — hero metric card with trend delta
- `components/ui/StatusBadge.js` — color-coded pill badge
- `components/ui/DataTable.js` — sortable table with hover states
- `components/ui/GradientButton.js` — primary CTA button
- `components/ui/GhostButton.js` — secondary button
- `components/ui/GlassCard.js` — glassmorphism card
- `components/ui/Skeleton.js` — loading placeholder (replaces old)
- `components/pipeline/HeroMetrics.js` — 4-card metric row
- `components/pipeline/ClientAccountsTable.js` — client list table
- `components/pipeline/RecentReports.js` — AI reports sidebar
- `components/pipeline/PipelineFilters.js` — filter controls

**Modified files:**
- `app/globals.css` — full replacement with new design tokens
- `tailwind.config.js` — new color tokens, typography, shadows mapped to CSS vars
- `app/layout.js` — swap to new AppShell, remove old Sidebar/Header imports
- `app/page.js` — full rewrite as Pipeline Dashboard
- `middleware.js` — no changes (auth stays the same)
- `package.json` — no new dependencies needed (Inter, Material Symbols, Recharts already installed)

**Preserved (not modified):**
- `lib/supabase.js` — all CRUD functions stay
- `lib/*.js` — all lib files untouched
- `app/api/**` — all API routes untouched
- All other pages (`/accounts`, `/agents`, etc.) — will break visually after layout change, but that's expected; they get rebuilt in later phases

---

## Task 1: Design Tokens — CSS Custom Properties

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace globals.css with new design tokens**

Replace the entire contents of `app/globals.css` with the new design system. Keep the Tailwind directives and add all color tokens, typography, and utility classes.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ══════════════════════════════════════════════════════════════
   PPC Recon — "The Intelligence Layer" Design Tokens
   Dark mode only. No light theme.
   ══════════════════════════════════════════════════════════════ */

:root {
  /* ── Layout ── */
  --sidebar-width: 264px;

  /* ── Background ── */
  --background: #0b1326;

  /* ── Primary (Action Blue) ── */
  --primary: #adc6ff;
  --primary-container: #4d8efe;
  --on-primary: #ffffff;

  /* ── Secondary (Success/Growth Emerald) ── */
  --secondary: #4edea3;
  --secondary-container: #1a3d2e;
  --on-secondary-container: #4edea3;

  /* ── Tertiary (AI/Intelligence Violet) ── */
  --tertiary: #bdc2ff;
  --tertiary-container: #2a2d4a;
  --on-tertiary-container: #bdc2ff;

  /* ── Error ── */
  --error: #ffb4ab;
  --error-container: #3d1f1a;
  --on-error-container: #ffb4ab;

  /* ── Surface Tiers (Tonal Layering) ── */
  --surface-container-lowest: #060e20;
  --surface-container-low: #131b2e;
  --surface-container: #171f33;
  --surface-container-high: #222a3d;
  --surface-container-highest: #2d3548;

  /* ── Surface Variant (Glass backgrounds) ── */
  --surface-variant: #1e2638;
  --surface-bright: #2a3348;

  /* ── Text ── */
  --on-surface: #e0e0e0;
  --on-surface-variant: #8a919e;

  /* ── Outline ── */
  --outline: #5a6272;
  --outline-variant: #3a4255;
}

/* ── Global Resets ── */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  background-color: var(--background);
  color: var(--on-surface);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  min-height: 100vh;
  background-color: var(--background);
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--outline-variant); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--outline); }

/* ── Glass Effect ── */
.glass {
  background: rgba(30, 38, 56, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

/* ── Gradient Button ── */
.gradient-primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-container));
}

/* ── Animations ── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-up {
  animation: fadeUp 0.3s ease-out forwards;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.pulse-dot {
  animation: pulse-dot 2s ease-in-out infinite;
}

/* ── Typography Utilities ── */
.text-display-lg {
  font-size: 3.5rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.text-headline-sm {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.3;
}

.text-body-md {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
}

.text-label-sm {
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.4;
}
```

- [ ] **Step 2: Verify the CSS loads**

Run: `npm run dev`

Open `http://localhost:3000`. The page will look broken (old components using old classes) — that's expected. Confirm in browser DevTools that the CSS custom properties are set on `:root` (Elements tab → inspect `<html>` → Computed styles should show `--background: #0b1326`).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: replace design tokens with Intelligence Layer dark-mode system"
```

---

## Task 2: Tailwind Config — Map Tokens to Utility Classes

**Files:**
- Modify: `tailwind.config.js`

- [ ] **Step 1: Replace tailwind.config.js**

Replace the entire contents with the new config that maps CSS custom properties to Tailwind utility classes:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        primary: 'var(--primary)',
        'primary-container': 'var(--primary-container)',
        'on-primary': 'var(--on-primary)',
        secondary: 'var(--secondary)',
        'secondary-container': 'var(--secondary-container)',
        'on-secondary-container': 'var(--on-secondary-container)',
        tertiary: 'var(--tertiary)',
        'tertiary-container': 'var(--tertiary-container)',
        'on-tertiary-container': 'var(--on-tertiary-container)',
        error: 'var(--error)',
        'error-container': 'var(--error-container)',
        'on-error-container': 'var(--on-error-container)',
        'surface-container-lowest': 'var(--surface-container-lowest)',
        'surface-container-low': 'var(--surface-container-low)',
        'surface-container': 'var(--surface-container)',
        'surface-container-high': 'var(--surface-container-high)',
        'surface-container-highest': 'var(--surface-container-highest)',
        'surface-variant': 'var(--surface-variant)',
        'surface-bright': 'var(--surface-bright)',
        'on-surface': 'var(--on-surface)',
        'on-surface-variant': 'var(--on-surface-variant)',
        outline: 'var(--outline)',
        'outline-variant': 'var(--outline-variant)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        headline: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '2px',
        lg: '4px',
        xl: '8px',
        full: '12px',
        pill: '9999px',
      },
      boxShadow: {
        ambient: '0 24px 48px rgba(0, 0, 0, 0.4)',
        card: '0 4px 12px rgba(0, 0, 0, 0.2)',
        fab: '0 8px 24px rgba(77, 142, 254, 0.3)',
      },
      spacing: {
        sidebar: 'var(--sidebar-width)',
      },
      maxWidth: {
        content: '1600px',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Verify Tailwind processes the new tokens**

Run: `npm run dev`

Open browser DevTools, inspect any element, try typing `bg-background` in the Elements panel styles — the autocomplete should recognize it. The existing pages will still look broken, which is expected.

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js
git commit -m "feat: map Intelligence Layer tokens to Tailwind utility classes"
```

---

## Task 3: AppShell Layout — Sidebar + TopNav + Content Area

**Files:**
- Create: `components/ui/SidebarNav.js`
- Create: `components/ui/TopNav.js`
- Create: `components/ui/AppShell.js`
- Modify: `app/layout.js`

- [ ] **Step 1: Create SidebarNav component**

Reference: `docs/design-references/client_pipeline_dashboard/code.html` — the `<aside>` element with nav links.

Create `components/ui/SidebarNav.js`:

```js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PRIMARY_NAV = [
  { href: '/', label: 'Client Pipeline', icon: 'trending_up' },
  { href: '/analysis', label: 'Analysis Hub', icon: 'query_stats' },
  { href: '/keywords', label: 'Keyword Engine', icon: 'grid_view' },
  { href: '/agents', label: 'Agent Controls', icon: 'smart_toy' },
];

const SECONDARY_NAV = [
  { href: '/brand-lab', label: 'Brand Lab', icon: 'palette' },
  { href: '/reports', label: 'Reports', icon: 'assessment' },
];

export default function SidebarNav() {
  const pathname = usePathname();

  function isActive(href) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed top-0 left-0 h-screen flex flex-col bg-surface-container-lowest z-40"
           style={{ width: 'var(--sidebar-width)' }}>
      {/* Logo */}
      <div className="px-6 py-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-on-primary text-lg">architecture</span>
        </div>
        <div>
          <div className="text-on-surface font-bold text-sm tracking-tight">PPC Recon</div>
          <div className="text-on-surface-variant text-label-sm">AI-Driven Marketing</div>
        </div>
      </div>

      {/* Primary Nav */}
      <nav className="flex-1 px-3 mt-2 space-y-1">
        {PRIMARY_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors relative ${
                active
                  ? 'bg-surface-variant text-primary font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
              )}
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* New Analysis CTA */}
        <div className="pt-4">
          <Link
            href="/research"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl gradient-primary text-on-primary text-sm font-semibold transition-transform active:scale-95 w-full"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            New Analysis
          </Link>
        </div>

        {/* Secondary Nav */}
        <div className="pt-6 space-y-1">
          {SECONDARY_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  active
                    ? 'bg-surface-variant text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 pb-5 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
          Settings
        </Link>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-xl">help</span>
          Support
        </a>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create TopNav component**

Reference: `docs/design-references/client_pipeline_dashboard/code.html` — the `<header>` element.

Create `components/ui/TopNav.js`:

```js
'use client';

import { usePathname } from 'next/navigation';

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header
      className="fixed top-0 right-0 h-16 flex items-center justify-between px-8 z-30 backdrop-blur-xl"
      style={{
        left: 'var(--sidebar-width)',
        backgroundColor: 'rgba(11, 19, 38, 0.8)',
      }}
    >
      {/* Search */}
      <div className="relative flex-1 max-w-xl">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
          search
        </span>
        <input
          type="text"
          placeholder="Search pipeline..."
          className="w-full pl-10 pr-4 py-2 rounded-pill bg-surface-container-low text-on-surface text-sm placeholder:text-on-surface-variant outline-none focus:ring-1 focus:ring-primary/30 transition-all"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-6">
        {/* Top nav links */}
        {['Dashboard', 'Reports', 'History'].map((label) => (
          <button
            key={label}
            className="px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            {label}
          </button>
        ))}

        {/* Notification bell */}
        <button className="p-2 rounded-xl hover:bg-surface-variant/50 transition-colors relative">
          <span className="material-symbols-outlined text-on-surface-variant text-xl">notifications</span>
        </button>

        {/* Help */}
        <button className="p-2 rounded-xl hover:bg-surface-variant/50 transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant text-xl">help</span>
        </button>

        {/* User profile */}
        <div className="flex items-center gap-3 ml-2 pl-4 border-l border-outline-variant/15">
          <div className="text-right">
            <div className="text-sm text-on-surface font-medium">Admin</div>
            <div className="text-label-sm text-on-surface-variant">PPC Recon</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant text-lg">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create AppShell layout wrapper**

Create `components/ui/AppShell.js`:

```js
import SidebarNav from './SidebarNav';
import TopNav from './TopNav';

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <TopNav />
      <main
        className="pt-16 min-h-screen"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <div className="max-w-content mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Update layout.js to use AppShell**

Replace the contents of `app/layout.js`:

```js
import './globals.css';
import AppShell from '@/components/ui/AppShell';

export const metadata = {
  title: 'PPC Recon — AI-Driven Marketing',
  description: 'Autonomous Google Ads research, audit, and optimization platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify the shell renders**

Run: `npm run dev`

Open `http://localhost:3000`. You should see:
- Dark navy background
- Left sidebar with PPC Recon logo, 4 primary nav items, "New Analysis" CTA, Settings/Support footer
- Top nav bar with search input, notification/help icons, user profile section
- Main content area (will show broken old dashboard content — that's fine)

- [ ] **Step 6: Commit**

```bash
git add components/ui/SidebarNav.js components/ui/TopNav.js components/ui/AppShell.js app/layout.js
git commit -m "feat: add AppShell layout with Intelligence Layer sidebar and top nav"
```

---

## Task 4: Core UI Components

**Files:**
- Create: `components/ui/StatCard.js`
- Create: `components/ui/StatusBadge.js`
- Create: `components/ui/DataTable.js`
- Create: `components/ui/GradientButton.js`
- Create: `components/ui/GhostButton.js`
- Create: `components/ui/GlassCard.js`
- Create: `components/ui/Skeleton.js`

- [ ] **Step 1: Create StatCard**

Reference: the metric cards in `docs/design-references/client_pipeline_dashboard/code.html`.

Create `components/ui/StatCard.js`:

```js
export default function StatCard({ label, value, delta, deltaLabel, icon, className = '' }) {
  const isPositive = delta && !delta.startsWith('-');
  const deltaColor = isPositive ? 'text-secondary' : 'text-error';

  return (
    <div className={`bg-surface-container rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-label-sm text-on-surface-variant">{label}</span>
        {icon && (
          <span className="material-symbols-outlined text-on-surface-variant text-2xl opacity-30">
            {icon}
          </span>
        )}
      </div>
      <div className="text-display-lg text-on-surface">{value}</div>
      {(delta || deltaLabel) && (
        <div className="flex items-center gap-2 mt-2">
          {delta && (
            <span className={`flex items-center gap-0.5 text-sm font-medium ${deltaColor}`}>
              <span className="material-symbols-outlined text-base">
                {isPositive ? 'trending_up' : 'trending_down'}
              </span>
              {delta}
            </span>
          )}
          {deltaLabel && (
            <span className="text-label-sm text-on-surface-variant">{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create StatusBadge**

Create `components/ui/StatusBadge.js`:

```js
const VARIANTS = {
  active: 'bg-secondary/15 text-secondary',
  idle: 'bg-surface-variant text-on-surface-variant',
  running: 'bg-primary/15 text-primary',
  alert: 'bg-error/15 text-error',
  complete: 'bg-secondary/15 text-secondary',
  pitching: 'bg-tertiary/15 text-tertiary',
  management: 'bg-secondary/15 text-secondary',
  analysis: 'bg-primary/15 text-primary',
  default: 'bg-surface-variant text-on-surface-variant',
};

export default function StatusBadge({ status, label, pulse = false, className = '' }) {
  const key = status?.toLowerCase() || 'default';
  const variant = VARIANTS[key] || VARIANTS.default;
  const displayLabel = label || status;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-widest ${variant} ${className}`}>
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current pulse-dot" />
      )}
      {displayLabel}
    </span>
  );
}
```

- [ ] **Step 3: Create DataTable**

Create `components/ui/DataTable.js`:

```js
'use client';

import { useState } from 'react';

export default function DataTable({ columns, rows, onRowClick, emptyMessage = 'No data' }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  function handleSort(colKey) {
    if (sortCol === colKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(colKey);
      setSortDir('asc');
    }
  }

  const sorted = sortCol
    ? [...rows].sort((a, b) => {
        const aVal = a[sortCol];
        const bVal = b[sortCol];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : rows;

  return (
    <div className="bg-surface-container rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-outline-variant/10">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable !== false && handleSort(col.key)}
                className={`text-left px-6 py-4 text-label-sm text-on-surface-variant ${
                  col.sortable !== false ? 'cursor-pointer hover:text-on-surface select-none' : ''
                }`}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {sortCol === col.key && (
                    <span className="material-symbols-outlined text-xs">
                      {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-on-surface-variant text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr
                key={row.id || i}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-outline-variant/5 transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-surface-container-high' : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4 text-sm text-on-surface">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Create GradientButton, GhostButton, GlassCard, Skeleton**

Create `components/ui/GradientButton.js`:

```js
export default function GradientButton({ children, onClick, href, className = '', disabled = false }) {
  const classes = `inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-on-primary text-sm font-semibold transition-transform active:scale-95 ${
    disabled ? 'opacity-50 pointer-events-none' : ''
  } ${className}`;

  if (href) {
    return <a href={href} className={classes}>{children}</a>;
  }
  return <button onClick={onClick} className={classes} disabled={disabled}>{children}</button>;
}
```

Create `components/ui/GhostButton.js`:

```js
export default function GhostButton({ children, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-on-surface-variant text-sm font-medium hover:bg-surface-variant/50 hover:text-on-surface transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
```

Create `components/ui/GlassCard.js`:

```js
export default function GlassCard({ children, className = '' }) {
  return (
    <div className={`glass rounded-xl p-6 ${className}`}>
      {children}
    </div>
  );
}
```

Create `components/ui/Skeleton.js`:

```js
export default function Skeleton({ className = '', variant = 'rect' }) {
  const base = 'animate-pulse bg-surface-container-high rounded-xl';
  const variants = {
    rect: 'h-4 w-full',
    circle: 'h-10 w-10 rounded-full',
    card: 'h-32 w-full',
    text: 'h-3 w-3/4',
    stat: 'h-24 w-full',
  };
  return <div className={`${base} ${variants[variant] || variants.rect} ${className}`} />;
}
```

- [ ] **Step 5: Commit**

```bash
git add components/ui/StatCard.js components/ui/StatusBadge.js components/ui/DataTable.js components/ui/GradientButton.js components/ui/GhostButton.js components/ui/GlassCard.js components/ui/Skeleton.js
git commit -m "feat: add core UI components (StatCard, StatusBadge, DataTable, buttons, Skeleton)"
```

---

## Task 5: Pipeline Dashboard — Page Rewrite

**Files:**
- Modify: `app/page.js`
- Create: `components/pipeline/HeroMetrics.js`
- Create: `components/pipeline/ClientAccountsTable.js`
- Create: `components/pipeline/RecentReports.js`

- [ ] **Step 1: Create HeroMetrics component**

Create `components/pipeline/HeroMetrics.js`:

```js
import StatCard from '@/components/ui/StatCard';

export default function HeroMetrics({ accounts, metrics }) {
  const totalSpend = Object.values(metrics).reduce((sum, m) => {
    const cost = m?.account?.cost_micros ? m.account.cost_micros / 1_000_000 : 0;
    return sum + cost;
  }, 0);

  const totalConversions = Object.values(metrics).reduce((sum, m) => {
    return sum + (m?.account?.conversions || 0);
  }, 0);

  const totalConvValue = Object.values(metrics).reduce((sum, m) => {
    return sum + (m?.account?.conversions_value || 0);
  }, 0);

  const avgRoas = totalSpend > 0 ? totalConvValue / totalSpend : 0;

  const activeAgents = accounts.filter(a => a.settings?.agents_enabled !== false).length;
  const totalAgentSlots = accounts.length;

  function fmtMoney(n) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <StatCard
        label="Total Ad Spend"
        value={fmtMoney(totalSpend)}
        delta="+12.4%"
        deltaLabel="vs last mo"
        icon="payments"
      />
      <StatCard
        label="Avg. ROAS"
        value={`${avgRoas.toFixed(2)}x`}
        delta="+0.5x"
        deltaLabel="portfolio-wide"
        icon="trending_up"
      />
      <StatCard
        label="Total Leads"
        value={totalConversions >= 1000 ? `${(totalConversions / 1000).toFixed(1)}k` : String(totalConversions)}
        deltaLabel="Across all channels"
        icon="group"
      />
      <StatCard
        label="AI Agents Active"
        value={`${activeAgents}/${totalAgentSlots}`}
        deltaLabel="Processing Live Streams"
        icon="smart_toy"
      />
    </div>
  );
}
```

- [ ] **Step 2: Create ClientAccountsTable component**

Create `components/pipeline/ClientAccountsTable.js`:

```js
'use client';

import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';

function relativeTime(isoString) {
  if (!isoString) return '—';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function getStatusVariant(account) {
  if (account.settings?.agents_enabled) return 'management';
  if (account.audit_data) return 'analysis';
  return 'pitching';
}

function getStatusLabel(account) {
  if (account.settings?.agents_enabled) return 'Active Management';
  if (account.audit_data) return 'Analysis Hub';
  return 'Pitching';
}

export default function ClientAccountsTable({ accounts }) {
  const router = useRouter();

  const columns = [
    {
      key: 'name',
      label: 'Client & Source',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant text-lg">diamond</span>
          </div>
          <div>
            <div className="text-on-surface font-medium">{row.name}</div>
            <div className="text-on-surface-variant text-xs">{row.google_customer_id || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => (
        <StatusBadge status={getStatusVariant(row)} label={getStatusLabel(row)} />
      ),
    },
    {
      key: 'monthly_fee',
      label: 'Fee',
      render: (val) => val ? `$${Number(val).toLocaleString()}/mo` : '—',
    },
    {
      key: 'updated_at',
      label: 'Last Activity',
      render: (val) => (
        <span className="text-on-surface-variant text-sm">{relativeTime(val)}</span>
      ),
    },
  ];

  const rows = accounts.map((a) => ({
    ...a,
    monthly_fee: a.monthly_mgmt_fee || a.settings?.monthly_fee,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-headline-sm text-on-surface">Client Accounts</h2>
        <span className="text-label-sm text-on-surface-variant">
          Showing {accounts.length} total entities
        </span>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        onRowClick={(row) => router.push(`/accounts/${row.id}`)}
        emptyMessage="No accounts connected yet. Click 'New Analysis' to get started."
      />
      {accounts.length > 5 && (
        <div className="text-center mt-4">
          <button className="text-label-sm text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest">
            View Full Portfolio
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create RecentReports sidebar component**

Create `components/pipeline/RecentReports.js`:

```js
'use client';

import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';

const REPORT_TYPE_STYLES = {
  keyword: { label: 'Keyword Report', variant: 'active' },
  website: { label: 'Website Analysis', variant: 'analysis' },
  audit: { label: 'Full Audit', variant: 'running' },
  roas: { label: 'ROAS Strategy', variant: 'alert' },
  default: { label: 'Report', variant: 'default' },
};

function relativeTime(isoString) {
  if (!isoString) return '—';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RecentReports({ actions }) {
  const router = useRouter();

  const reports = (actions || []).slice(0, 5).map((action) => {
    const type = REPORT_TYPE_STYLES[action.agent_type] || REPORT_TYPE_STYLES.default;
    return { ...action, typeStyle: type };
  });

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-on-surface">Recent AI Reports</h3>
        <span className="material-symbols-outlined text-on-surface-variant text-xl">auto_awesome</span>
      </div>

      <div className="space-y-4">
        {reports.length === 0 ? (
          <p className="text-on-surface-variant text-sm">No recent reports</p>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              onClick={() => report.account_id && router.push(`/accounts/${report.account_id}`)}
              className="cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-1">
                <StatusBadge status={report.typeStyle.variant} label={report.typeStyle.label} />
                <span className="text-label-sm text-on-surface-variant">
                  {relativeTime(report.created_at)}
                </span>
              </div>
              <div className="text-sm font-medium text-on-surface mt-1.5 group-hover:text-primary transition-colors">
                {report.description}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite app/page.js as Pipeline Dashboard**

Replace the entire contents of `app/page.js`:

```js
'use client';

import { useState, useEffect } from 'react';
import { getAccounts, isSupabaseConfigured } from '@/lib/supabase';
import HeroMetrics from '@/components/pipeline/HeroMetrics';
import ClientAccountsTable from '@/components/pipeline/ClientAccountsTable';
import RecentReports from '@/components/pipeline/RecentReports';
import GhostButton from '@/components/ui/GhostButton';
import Skeleton from '@/components/ui/Skeleton';

export default function PipelineDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Load accounts from Supabase
        if (isSupabaseConfigured()) {
          const accts = await getAccounts();
          setAccounts(accts || []);

          // Load metrics for each account
          const metricsMap = {};
          const actionsAll = [];
          await Promise.all(
            (accts || []).map(async (acct) => {
              try {
                const res = await fetch(`/api/accounts/${acct.id}/metrics`);
                if (res.ok) {
                  const data = await res.json();
                  metricsMap[acct.id] = data;
                }
              } catch (_) { /* skip failed metrics */ }

              try {
                const res = await fetch(`/api/accounts/${acct.id}/actions?limit=3`);
                if (res.ok) {
                  const data = await res.json();
                  (data.actions || []).forEach((a) => actionsAll.push({ ...a, account_id: acct.id }));
                }
              } catch (_) { /* skip */ }
            })
          );
          setMetrics(metricsMap);
          setActions(actionsAll.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 fade-up">
        <div>
          <Skeleton variant="text" className="h-5 w-48 mb-2" />
          <Skeleton variant="text" className="h-8 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="stat" />)}
        </div>
        <Skeleton variant="card" className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Pipeline Architecture</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary mr-2 pulse-dot" />
            {accounts.length > 0
              ? `${accounts.length} Active Intelligent Agent${accounts.length > 1 ? 's' : ''} optimizing ${accounts.length} account${accounts.length > 1 ? 's' : ''}`
              : 'No accounts connected yet'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GhostButton>
            <span className="material-symbols-outlined text-lg">download</span>
            Export CRM Data
          </GhostButton>
          <GhostButton>
            <span className="material-symbols-outlined text-lg">tune</span>
            Pipeline Filters
          </GhostButton>
        </div>
      </div>

      {/* Hero Metrics */}
      <HeroMetrics accounts={accounts} metrics={metrics} />

      {/* Main Content: Table + Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8">
          <ClientAccountsTable accounts={accounts} />
        </div>
        <div className="xl:col-span-4">
          <RecentReports actions={actions} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify the full Pipeline Dashboard**

Run: `npm run dev`

Open `http://localhost:3000`. You should see:
- Dark background with the Intelligence Layer theme
- Sidebar with 4 primary nav items (Client Pipeline active)
- Top nav with search, notifications, user profile
- "Pipeline Architecture" heading with agent count
- 4 hero metric cards (values may be 0/$0 if no accounts connected — that's fine)
- Client Accounts table (empty or populated based on Supabase data)
- Recent AI Reports sidebar
- Export CRM Data and Pipeline Filters ghost buttons

- [ ] **Step 6: Commit**

```bash
git add app/page.js components/pipeline/HeroMetrics.js components/pipeline/ClientAccountsTable.js components/pipeline/RecentReports.js
git commit -m "feat: rebuild Pipeline Dashboard with Intelligence Layer design system"
```

---

## Task 6: Clean Up Old Components

**Files:**
- Delete or archive: `components/Sidebar.js`
- Delete or archive: `components/Header.js`
- Delete or archive: `components/ThemeProvider.js`
- Delete or archive: `components/Skeleton.js`

- [ ] **Step 1: Remove old layout components**

The old Sidebar, Header, ThemeProvider, and Skeleton are no longer imported by `layout.js`. Remove them:

```bash
rm components/Sidebar.js components/Header.js components/ThemeProvider.js components/Skeleton.js
```

- [ ] **Step 2: Verify nothing breaks**

Run: `npm run dev`

Open `http://localhost:3000`. The Pipeline Dashboard should still render correctly. Check browser console for any import errors — there should be none since `layout.js` no longer imports the old components.

Note: Other pages (`/accounts`, `/clients`, `/research`, etc.) may still import `ThemeProvider` or old components. Those pages will error when navigated to — that's expected and will be fixed in subsequent phases.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old Sidebar, Header, ThemeProvider replaced by AppShell"
```

---

## Task 7: Verify Full Phase 1 Delivery

- [ ] **Step 1: Run a production build**

```bash
npm run build
```

Expected: Build succeeds. There may be warnings about unused pages that import deleted components — note them but they don't block this phase.

- [ ] **Step 2: Manual QA checklist**

Open `http://localhost:3000` and verify:

1. [ ] Background is `#0b1326` (dark navy)
2. [ ] Sidebar is darker (`#060e20`), 264px wide, fixed
3. [ ] "Client Pipeline" nav item is highlighted with primary color pill
4. [ ] "New Analysis" button has gradient from light blue to deeper blue
5. [ ] Top nav has search pill, notification/help icons, user profile
6. [ ] Top nav has backdrop blur effect
7. [ ] 4 hero stat cards with large numbers and trend deltas
8. [ ] Client accounts table with hover row highlighting
9. [ ] Recent AI Reports sidebar on the right
10. [ ] No 1px borders anywhere (tonal layering only)
11. [ ] Scrollbar is thin and dark-themed
12. [ ] Clicking a nav item navigates (even if target page is broken)

- [ ] **Step 3: Final commit with phase tag**

```bash
git add -A
git commit -m "feat: Phase 1 complete — Intelligence Layer design system + Pipeline Dashboard"
```
