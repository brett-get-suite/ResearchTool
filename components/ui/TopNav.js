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
