'use client';

export default function TabNav({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex items-center gap-1 border-b border-outline-variant/10 mb-6">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
              active
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.icon && (
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
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
