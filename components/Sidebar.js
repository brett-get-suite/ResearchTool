'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';

const MANAGEMENT_NAV = [
  { href: '/',          label: 'Dashboard',  icon: 'dashboard' },
  { href: '/accounts',  label: 'Accounts',   icon: 'manage_accounts' },
  { href: '/agents',    label: 'Agents',     icon: 'smart_toy' },
  { href: '/brand-lab', label: 'Brand Lab',  icon: 'palette' },
];

const RESEARCH_NAV = [
  { href: '/research',    label: 'New Research',        icon: 'manage_search' },
  { href: '/clients',     label: 'Client Management',   icon: 'groups' },
  { href: '/competitors', label: 'Competitor Analysis', icon: 'analytics' },
  { href: '/reports',     label: 'Reports',             icon: 'assessment' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="no-print fixed left-0 top-0 h-screen w-64 flex flex-col py-6 px-4 bg-[#131820] border-r border-white/5 z-50">
      {/* Brand */}
      <div className="mb-8 px-2">
        <h1 className="text-2xl font-headline font-bold text-white tracking-tight">PPC Recon</h1>
        <p className="text-[10px] font-label font-semibold text-white/50 mt-1 uppercase tracking-widest">
          Google Ads Intelligence
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        <p className="text-[9px] font-label font-bold text-white/30 uppercase tracking-widest px-3 mb-1 mt-2">Management</p>
        {MANAGEMENT_NAV.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive(href)
                ? 'text-white font-semibold bg-white/10 border-r-2 border-[var(--primary)]'
                : 'text-white/60 font-medium hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
            <span className="font-label">{label}</span>
          </Link>
        ))}
        <div className="my-3 border-t border-outline-variant/10" />
        <p className="text-[9px] font-label font-bold text-white/30 uppercase tracking-widest px-3 mb-1">Research</p>
        {RESEARCH_NAV.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive(href)
                ? 'text-white font-semibold bg-white/10 border-r-2 border-[var(--primary)]'
                : 'text-white/60 font-medium hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
            <span className="font-label">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="pt-6 border-t border-white/10 space-y-0.5">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded-lg text-sm font-label mb-2"
        >
          <span className="material-symbols-outlined text-[20px]">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
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
          className="flex items-center gap-3 px-3 py-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors rounded-lg text-sm font-label"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          API Settings
        </a>
        <a
          href="https://github.com/brett-get-suite/ResearchTool"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-3 px-3 py-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors rounded-lg text-sm font-label"
        >
          <span className="material-symbols-outlined text-[20px]">help</span>
          Help & Docs
        </a>
      </div>
    </aside>
  );
}
