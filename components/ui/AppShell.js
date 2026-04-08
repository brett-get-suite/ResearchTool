'use client';

import { usePathname } from 'next/navigation';
import SidebarNav from './SidebarNav';
import TopNav from './TopNav';

const BARE_ROUTES = ['/login', '/print'];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const isBare = BARE_ROUTES.some(r => pathname.startsWith(r));

  if (isBare) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <TopNav />
      <main
        className="pt-14 min-h-screen"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <div className="max-w-content mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
