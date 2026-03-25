'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',            label: 'Dashboard',          icon: 'dashboard' },
  { href: '/research',    label: 'New Research',        icon: 'manage_search' },
  { href: '/clients',     label: 'Client Management',   icon: 'groups' },
  { href: '/competitors', label: 'Competitor Analysis', icon: 'analytics' },
  { href: '/reports',     label: 'Reports',             icon: 'assessment' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="no-print fixed left-0 top-0 h-screen w-64 flex flex-col py-6 px-4 bg-slate-50 border-r border-outline-variant/10 z-50">
      {/* Brand */}
      <div className="mb-8 px-2">
        <h1 className="text-2xl font-headline font-bold text-primary tracking-tight">PPC Recon</h1>
        <p className="text-[10px] font-label font-semibold text-secondary mt-1 uppercase tracking-widest">
          Google Ads Intelligence
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {NAV.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive(href)
                ? 'text-primary font-semibold bg-primary/5 border-r-2 border-primary'
                : 'text-secondary font-medium hover:bg-surface-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
            <span className="font-label">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="pt-6 border-t border-outline-variant/15 space-y-0.5">
        <Link
          href="/research"
          className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-primary-container text-white rounded-lg text-sm font-label font-semibold shadow-fab/30 hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Research
        </Link>
        <a
          href="https://aistudio.google.com"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-3 px-3 py-2 text-secondary hover:bg-surface-high transition-colors rounded-lg text-sm font-label"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          API Settings
        </a>
        <a
          href="https://github.com/brett-get-suite/ResearchTool"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-3 px-3 py-2 text-secondary hover:bg-surface-high transition-colors rounded-lg text-sm font-label"
        >
          <span className="material-symbols-outlined text-[20px]">help</span>
          Help & Docs
        </a>
      </div>
    </aside>
  );
}
