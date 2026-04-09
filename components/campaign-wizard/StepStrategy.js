'use client';

const STRATEGIES = [
  {
    value: 'prospecting',
    icon: 'explore',
    label: 'Prospecting',
    description: 'Capture new customers actively searching for your services. Best for growth-focused accounts.',
    tags: ['New Leads', 'Market Expansion'],
  },
  {
    value: 'brand_protection',
    icon: 'shield',
    label: 'Brand Protection',
    description: 'Defend your brand terms from competitor bidding. Ensures you own your name in search results.',
    tags: ['Brand Defense', 'Low CPC'],
  },
  {
    value: 'competitor',
    icon: 'swords',
    label: 'Competitor Targeting',
    description: 'Bid on competitor brand names to intercept their traffic. Higher CPC but captures switchers.',
    tags: ['Aggressive', 'Market Share'],
  },
];

export default function StepStrategy({ form, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-headline-sm text-on-surface mb-1">Campaign Strategy</h2>
        <p className="text-sm text-on-surface-variant">
          Choose the primary objective for this campaign. This shapes keyword selection, bidding, and ad copy.
        </p>
      </div>

      <div className="grid gap-3">
        {STRATEGIES.map((s) => {
          const selected = form.strategy === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange('strategy', s.value)}
              className={`
                text-left p-5 rounded-xl transition-all
                ${selected
                  ? 'bg-primary/10 ring-1 ring-primary/30'
                  : 'bg-surface-container-high hover:bg-surface-bright'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    selected ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{s.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold ${selected ? 'text-primary' : 'text-on-surface'}`}>
                      {s.label}
                    </span>
                    {selected && (
                      <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                    )}
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{s.description}</p>
                  <div className="flex gap-2 mt-2">
                    {s.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`text-[0.625rem] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                          selected
                            ? 'bg-primary/15 text-primary'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
