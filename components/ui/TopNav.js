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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const helpRef = useRef(null);
  const searchRef = useRef(null);

  useClickOutside(notifRef, () => setNotifOpen(false));
  useClickOutside(profileRef, () => setProfileOpen(false));
  useClickOutside(helpRef, () => setHelpOpen(false));
  useClickOutside(searchRef, () => { setSearchResults(null); });

  // Global search — fetch accounts, match against campaigns/keywords/reports
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults(null); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch('/api/accounts');
        const accounts = await res.json();
        const q = searchQuery.toLowerCase();
        const results = { accounts: [], campaigns: [], keywords: [] };

        for (const acct of (Array.isArray(accounts) ? accounts : [])) {
          if ((acct.name || '').toLowerCase().includes(q) || (acct.google_customer_id || '').includes(q)) {
            results.accounts.push(acct);
          }
        }

        // Fetch campaigns for matched accounts (or all if no account match)
        const targetAccounts = results.accounts.length > 0 ? results.accounts : (Array.isArray(accounts) ? accounts.slice(0, 5) : []);
        await Promise.all(targetAccounts.map(async (acct) => {
          try {
            const cRes = await fetch(`/api/accounts/${acct.id}/campaigns`);
            if (cRes.ok) {
              const data = await cRes.json();
              const camps = Array.isArray(data) ? data : data.campaigns || [];
              camps.forEach(c => {
                if ((c.name || '').toLowerCase().includes(q)) {
                  results.campaigns.push({ ...c, account_name: acct.name, account_id: acct.id });
                }
              });
            }
          } catch (_) {}
        }));

        setSearchResults(results);
      } catch (_) {
        setSearchResults({ accounts: [], campaigns: [], keywords: [] });
      }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const hasResults = searchResults && (searchResults.accounts.length > 0 || searchResults.campaigns.length > 0);

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
      <div ref={searchRef} className="relative flex-1 max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
          search
        </span>
        <input
          type="text"
          placeholder="Search accounts, campaigns, keywords..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-sm placeholder:text-on-surface-variant/60 outline-none transition-all border border-outline-variant/30 focus:border-primary/40"
        />
        {searchLoading && (
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary text-base animate-spin">
            progress_activity
          </span>
        )}

        {/* Search Results Dropdown */}
        {searchResults && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-highest border border-outline-variant/30 rounded-xl shadow-2xl overflow-hidden z-50">
            {!hasResults ? (
              <div className="px-4 py-6 text-center text-sm text-on-surface-variant">
                No results for &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {searchResults.accounts.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-high">
                      Accounts
                    </div>
                    {searchResults.accounts.slice(0, 5).map(a => (
                      <button
                        key={a.id}
                        onClick={() => { router.push(`/accounts/${a.id}`); setSearchQuery(''); setSearchResults(null); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-surface-container-high transition-colors text-left"
                      >
                        <span className="material-symbols-outlined text-primary text-base">account_circle</span>
                        <div className="min-w-0">
                          <div className="text-sm text-on-surface truncate">{a.name}</div>
                          <div className="text-[11px] text-on-surface-variant">{a.google_customer_id || 'No ID'}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.campaigns.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-high">
                      Campaigns
                    </div>
                    {searchResults.campaigns.slice(0, 5).map((c, i) => (
                      <button
                        key={`${c.account_id}-${i}`}
                        onClick={() => { router.push(`/accounts/${c.account_id}`); setSearchQuery(''); setSearchResults(null); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-surface-container-high transition-colors text-left"
                      >
                        <span className="material-symbols-outlined text-secondary text-base">campaign</span>
                        <div className="min-w-0">
                          <div className="text-sm text-on-surface truncate">{c.name}</div>
                          <div className="text-[11px] text-on-surface-variant">{c.account_name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
                  ? 'text-primary font-medium bg-primary/8'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30'
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
