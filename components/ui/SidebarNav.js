'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MAIN_NAV = [
  { href: '/', label: 'Dashboard', icon: 'space_dashboard' },
  { href: '/accounts', label: 'Ad Accounts', icon: 'account_tree' },
  { href: '/keyword-engine', label: 'Keyword Engine', icon: 'analytics' },
  { href: '/agents', label: 'Agent Controls', icon: 'smart_toy' },
  { href: '/research', label: 'Research', icon: 'query_stats' },
];

const TOOLS_NAV = [
  { href: '/brand-lab', label: 'Brand Lab', icon: 'palette' },
  { href: '/competitors', label: 'Competitors', icon: 'groups' },
  { href: '/reports', label: 'Reports', icon: 'assessment' },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUserRole(data.role); })
      .catch(() => {});
  }, []);

  // Extract account ID from current URL if on an account page
  const accountIdMatch = pathname.match(/\/accounts\/([^/]+)/);
  const currentAccountId = accountIdMatch ? accountIdMatch[1] : null;

  function isActive(href) {
    if (href === '/') return pathname === '/';
    if (href === '/keyword-engine') return pathname.startsWith('/keyword-engine') || pathname.includes('/keywords');
    return pathname.startsWith(href);
  }

  function resolveHref(href) {
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
      <nav className="flex-1 px-3 mt-1">
        <div className="text-label-sm text-on-surface-variant/70 px-3 pb-2 pt-6">Manage</div>
        <div className="space-y-0.5">
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
                    : 'text-on-surface-variant/80 hover:bg-surface-variant/50 hover:text-on-surface'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                )}
                <span className={`material-symbols-outlined text-xl ${!active ? 'opacity-70' : ''}`}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Tools Nav */}
        <div className="text-label-sm text-on-surface-variant/70 px-3 pb-2 pt-6">Tools</div>
        <div className="space-y-0.5">
          {TOOLS_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative ${
                  active
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-on-surface-variant/80 hover:bg-surface-variant/50 hover:text-on-surface'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                )}
                <span className={`material-symbols-outlined text-xl ${!active ? 'opacity-70' : ''}`}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {userRole === 'superadmin' && (
        <nav className="mt-4 px-3">
          <div className="text-[10px] uppercase tracking-wider text-on-surface-variant/50 font-semibold px-3 mb-2">
            Admin
          </div>
          <a
            href="/admin"
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
              isActive('/admin')
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
            Super Admin
          </a>
        </nav>
      )}

      {/* Footer */}
      <div className="px-3 pb-4">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative ${
            pathname === '/settings'
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-on-surface-variant/80 hover:bg-surface-variant/50 hover:text-on-surface'
          }`}
        >
          {pathname === '/settings' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
          )}
          <span className={`material-symbols-outlined text-xl ${pathname !== '/settings' ? 'opacity-70' : ''}`}>settings</span>
          Settings
        </Link>
      </div>
    </aside>
  );
}
