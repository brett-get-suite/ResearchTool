'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

const BREADCRUMBS = {
  '/':            [{ label: 'Dashboard' }],
  '/research':    [{ label: 'Research', href: '/research' }, { label: 'New Client Research' }],
  '/clients':     [{ label: 'Clients', href: '/clients' }],
  '/competitors': [{ label: 'Research', href: '/research' }, { label: 'Competitor Analysis' }],
  '/reports':     [{ label: 'Reports' }],
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const crumbs = (() => {
    if (BREADCRUMBS[pathname]) return BREADCRUMBS[pathname];
    if (pathname.startsWith('/clients/')) return [
      { label: 'Clients', href: '/clients' },
      { label: 'Client Detail' },
    ];
    return [];
  })();

  return (
    <header className="no-print fixed top-0 left-64 right-0 h-16 flex items-center justify-between px-8 z-40 bg-white/80 backdrop-blur-xl border-b border-outline-variant/10">
      {/* Left: breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm font-label">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            )}
            {crumb.href ? (
              <Link href={crumb.href} className="text-secondary hover:text-primary transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-on-surface font-semibold">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/research')}
          className="pill-btn-primary text-xs"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          New Research
        </button>
        <button
          onClick={() => router.push('/reports')}
          className="p-2 text-secondary hover:text-primary transition-colors rounded-lg hover:bg-surface-high"
          title="Reports"
        >
          <span className="material-symbols-outlined text-[20px]">assessment</span>
        </button>
      </div>
    </header>
  );
}
