'use client';

export default function TabNav({ tabs, activeTab, onTabChange, ariaLabel = 'Navigation tabs' }) {
  const handleKeyDown = (e, tabId, index) => {
    let targetIndex = -1;
    if (e.key === 'ArrowRight') targetIndex = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') targetIndex = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') targetIndex = 0;
    else if (e.key === 'End') targetIndex = tabs.length - 1;

    if (targetIndex >= 0) {
      e.preventDefault();
      onTabChange(tabs[targetIndex].id);
      const btn = e.currentTarget.parentElement.querySelectorAll('[role="tab"]')[targetIndex];
      btn?.focus();
    }
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className="flex items-center gap-1 border-b border-outline-variant/10 mb-6">
      {tabs.map((tab, index) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id, index)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
              active
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.icon && (
              <span className="material-symbols-outlined text-lg" aria-hidden="true">{tab.icon}</span>
            )}
            {tab.label}
            {active && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
