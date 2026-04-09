'use client';

import { useState, useRef, useEffect } from 'react';

export default function ClientSwitcher({ accounts = [], selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedAccount = selected ? accounts.find(a => a.id === selected) : null;
  const displayLabel = selectedAccount ? selectedAccount.name : 'All Accounts (Portfolio)';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/30 hover:border-primary/40 transition-colors min-w-[260px]"
      >
        <span className="material-symbols-outlined text-primary text-xl">
          {selected ? 'person' : 'hub'}
        </span>
        <div className="flex-1 text-left">
          <div className="text-[10px] uppercase tracking-wider text-on-surface-variant">Viewing</div>
          <div className="text-sm font-medium text-on-surface truncate">{displayLabel}</div>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant text-lg">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[300px] dropdown-panel z-50 py-2 max-h-[400px] overflow-y-auto">
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container transition-colors ${
              !selected ? 'bg-primary/5 text-primary' : 'text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg">hub</span>
            <div>
              <div className="text-sm font-medium">All Accounts (Portfolio)</div>
              <div className="text-xs text-on-surface-variant">{accounts.length} accounts</div>
            </div>
          </button>

          <div className="border-t border-outline-variant/20 my-1" />

          {accounts.map(account => (
            <button
              key={account.id}
              onClick={() => { onSelect(account.id); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container transition-colors ${
                selected === account.id ? 'bg-primary/5 text-primary' : 'text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-lg">person</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{account.name}</div>
                <div className="text-xs text-on-surface-variant">
                  {account.google_customer_id || 'Not linked'}
                </div>
              </div>
              {account.status === 'active' && (
                <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
