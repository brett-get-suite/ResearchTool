'use client';

import { useState, useRef, useEffect } from 'react';
import { DATE_PRESETS } from '@/lib/dashboard-utils';

const ICONS = { week: 'calendar_view_week', month: 'calendar_month', quarter: 'calendar_today' };

export default function TimeComparison({ selected = 'month', onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = DATE_PRESETS.find(p => p.key === selected) || DATE_PRESETS[1];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/30 hover:border-primary/40 transition-colors"
      >
        <span className="material-symbols-outlined text-primary text-xl">date_range</span>
        <span className="text-sm font-medium text-on-surface whitespace-nowrap">{current.label}</span>
        <span className="material-symbols-outlined text-on-surface-variant text-lg">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 dropdown-panel z-50 py-2 min-w-[280px]">
          {DATE_PRESETS.map(preset => (
            <button
              key={preset.key}
              onClick={() => { onChange(preset.key); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container transition-colors ${
                selected === preset.key ? 'bg-primary/5 text-primary' : 'text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{ICONS[preset.key]}</span>
              <span className="text-sm flex-1">{preset.label}</span>
              {selected === preset.key && (
                <span className="material-symbols-outlined text-primary text-lg">check</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
