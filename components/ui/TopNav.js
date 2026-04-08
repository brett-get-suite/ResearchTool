'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/' },
  { label: 'Reports', href: '/reports' },
  { label: 'Accounts', href: '/accounts' },
];

function useClickOutside(ref, handler) {
  const savedHandler = useRef(handler);
  savedHandler.current = handler;

  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      savedHandler.current();
    };
    const escListener = (e) => {
      if (e.key === 'Escape') savedHandler.current();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('keydown', escListener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('keydown', escListener);
    };
  }, [ref]);
}

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const helpRef = useRef(null);

  useClickOutside(notifRef, () => setNotifOpen(false));
  useClickOutside(profileRef, () => setProfileOpen(false));
  useClickOutside(helpRef, () => setHelpOpen(false));

  return (
    <header
      className="fixed top-0 right-0 h-14 flex items-center justify-between px-6 z-30 backdrop-blur-xl"
      style={{
        left: 'var(--sidebar-width)',
        backgroundColor: 'rgba(10, 17, 32, 0.85)',
        borderBottom: '1px solid var(--outline-variant)',
      }}
    >
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
          search
        </span>
        <input
          type="text"
          placeholder="Search accounts, reports..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container text-on-surface text-sm placeholder:text-on-surface-variant/60 outline-none focus:ring-1 focus:ring-primary/40 transition-all border border-outline-variant/30 focus:border-primary/40"
        />
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-1 ml-4">
        {/* Nav links */}
        {NAV_LINKS.map((link) => {
          const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          return (
            <button
              key={link.label}
              onClick={() => router.push(link.href)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'text-primary font-medium'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {link.label}
            </button>
          );
        })}

        <div className="w-px h-6 bg-outline-variant/30 mx-2" />

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); setHelpOpen(false); }}
            aria-expanded={notifOpen}
            aria-haspopup="true"
            aria-label="Notifications"
            className="p-2 rounded-xl hover:bg-surface-variant/50 transition-colors relative"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-xl">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary pulse-dot" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 dropdown-panel p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-outline-variant/30">
                <p className="text-sm font-semibold text-on-surface">Notifications</p>
              </div>
              <div className="p-2 space-y-0.5 max-h-72 overflow-y-auto">
                {[
                  { icon: 'sync', text: 'Account sync completed', time: '2 min ago', color: 'text-secondary' },
                  { icon: 'query_stats', text: 'New analysis ready to review', time: '1 hour ago', color: 'text-primary' },
                  { icon: 'warning', text: 'Budget threshold reached on 2 campaigns', time: '3 hours ago', color: 'text-error' },
                ].map((n, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-surface-variant/30 cursor-pointer transition-colors">
                    <span className={`material-symbols-outlined text-lg mt-0.5 ${n.color}`}>{n.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-on-surface">{n.text}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-outline-variant/30">
                <button className="text-xs text-primary hover:underline w-full text-center">View all notifications</button>
              </div>
            </div>
          )}
        </div>

        {/* Help */}
        <div ref={helpRef} className="relative">
          <button
            onClick={() => { setHelpOpen(!helpOpen); setNotifOpen(false); setProfileOpen(false); }}
            aria-expanded={helpOpen}
            aria-haspopup="true"
            aria-label="Help and resources"
            className="p-2 rounded-xl hover:bg-surface-variant/50 transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-xl" aria-hidden="true">help</span>
          </button>

          {helpOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 dropdown-panel p-2">
              {[
                { icon: 'menu_book', label: 'Documentation', href: '#' },
                { icon: 'chat', label: 'Contact Support', href: '#' },
                { icon: 'lightbulb', label: 'Feature Requests', href: '#' },
                { icon: 'keyboard', label: 'Keyboard Shortcuts', href: '#' },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative ml-1">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); setHelpOpen(false); }}
            aria-expanded={profileOpen}
            aria-haspopup="true"
            aria-label="User menu"
            className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl hover:bg-surface-variant/50 transition-colors"
          >
            <div className="text-right hidden sm:block">
              <div className="text-sm text-on-surface font-medium leading-tight">Admin</div>
              <div className="text-[10px] text-on-surface-variant leading-tight">AdPilot</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/30 to-tertiary/30 flex items-center justify-center border border-outline-variant/30">
              <span className="material-symbols-outlined text-primary text-base">person</span>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 dropdown-panel p-2">
              <div className="px-3 py-2 mb-1">
                <p className="text-sm font-semibold text-on-surface">Admin</p>
                <p className="text-xs text-on-surface-variant">admin@adpilot.ai</p>
              </div>
              <div className="border-t border-outline-variant/30 pt-1 mt-1">
                {[
                  { icon: 'person', label: 'Profile', href: '/settings' },
                  { icon: 'settings', label: 'Settings', href: '/settings' },
                  { icon: 'key', label: 'API Keys', href: '/settings' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { router.push(item.href); setProfileOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface transition-colors w-full text-left"
                  >
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="border-t border-outline-variant/30 pt-1 mt-1">
                <button
                  onClick={() => router.push('/login')}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-error hover:bg-error/5 transition-colors w-full text-left"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
