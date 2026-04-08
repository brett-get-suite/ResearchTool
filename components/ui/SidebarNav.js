'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MAIN_NAV = [
  { href: '/', label: 'Dashboard', icon: 'space_dashboard' },
  { href: '/accounts', label: 'Ad Accounts', icon: 'account_tree' },
  { href: '/keywords', label: 'Keyword Engine', icon: 'analytics' },
  { href: '/agents', label: 'AI Agents', icon: 'smart_toy' },
  { href: '/research', label: 'Research', icon: 'query_stats' },
];

const TOOLS_NAV = [
  { href: '/brand-lab', label: 'Brand Lab', icon: 'palette' },
  { href: '/competitors', label: 'Competitors', icon: 'groups' },
  { href: '/reports', label: 'Reports', icon: 'assessment' },
];

export default function SidebarNav() {
  const pathname = usePathname();

  // Extract account ID from current URL if on an account page
  const accountIdMatch = pathname.match(/\/accounts\/([^/]+)/);
  const currentAccountId = accountIdMatch ? accountIdMatch[1] : null;

  function isActive(href) {
    if (href === '/') return pathname === '/';
    if (href === '/keywords') return pathname.includes('/keywords');
    return pathname.startsWith(href);
  }

  function resolveHref(href) {
    if (href === '/keywords' && currentAccountId) {
      return `/accounts/${currentAccountId}/keywords`;
    }
    return href;
  }

  return (
    <aside
      className="fixed top-0 left-0 h-screen flex flex-col bg-surface-container-lowest z-40"
      style={{ width: 'var(--sidebar-width)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-fab">
          <span className="material-symbols-outlined text-on-primary text-lg">rocket_launch</span>
        </div>
        <div>
          <div className="text-on-surface font-bold text-sm tracking-tight">AdPilot</div>
          <div className="text-on-surface-variant text-[10px] tracking-wide uppercase">Autonomous Ads AI</div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 mt-1 space-y-0.5">
        <div className="text-label-sm text-on-surface-variant/60 px-3 pb-1.5 pt-3">Manage</div>
        {MAIN_NAV.map((item) => {
          const active = isActive(item.href);
          const href = resolveHref(item.href);
          return (
            <Link
              key={item.href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative ${
                active
                  ? 'bg-primary/10 text-primary font-semibold'
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
        <div className="pt-4 pb-2">
          <Link
            href="/research"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-on-primary text-sm font-semibold transition-transform active:scale-[0.97] w-full shadow-fab"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            New Analysis
          </Link>
        </div>

        {/* Tools Nav */}
        <div className="space-y-0.5">
          <div className="text-label-sm text-on-surface-variant/60 px-3 pb-1.5 pt-3">Tools</div>
          {TOOLS_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative ${
                  active
                    ? 'bg-primary/10 text-primary font-semibold'
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
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-0.5">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
            pathname === '/settings'
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-xl">settings</span>
          Settings
        </Link>
      </div>
    </aside>
  );
}
