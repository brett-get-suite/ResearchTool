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
