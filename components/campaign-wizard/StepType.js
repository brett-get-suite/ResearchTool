'use client';

const CAMPAIGN_TYPES = [
  {
    value: 'SEARCH',
    icon: 'search',
    label: 'Search',
    description: 'Text ads on Google Search results. Best for lead gen and high-intent traffic.',
    recommended: true,
  },
  {
    value: 'SHOPPING',
    icon: 'shopping_cart',
    label: 'Shopping',
    description: 'Product listing ads with images and prices. Best for e-commerce.',
    recommended: false,
  },
  {
    value: 'PERFORMANCE_MAX',
    icon: 'auto_awesome',
    label: 'Performance Max',
    description: 'AI-driven cross-channel campaigns. Google optimizes placement across Search, Display, YouTube, and more.',
    recommended: false,
  },
];

export default function StepType({ form, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-headline-sm text-on-surface mb-1">Campaign Type</h2>
        <p className="text-sm text-on-surface-variant">
          Select the campaign type. This determines available features and ad formats.
        </p>
      </div>

      <div className="grid gap-3">
        {CAMPAIGN_TYPES.map((type) => {
          const selected = form.campaignType === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange('campaignType', type.value)}
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
                  <span className="material-symbols-outlined text-xl">{type.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold ${selected ? 'text-primary' : 'text-on-surface'}`}>
                      {type.label}
                    </span>
                    {type.recommended && (
                      <span className="text-[0.625rem] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">
                        Recommended
                      </span>
                    )}
                    {selected && (
                      <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                    )}
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{type.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {form.campaignType === 'PERFORMANCE_MAX' && (
        <div className="bg-tertiary/10 rounded-lg p-3 flex gap-2.5">
          <span className="material-symbols-outlined text-tertiary text-[18px] shrink-0 mt-0.5">auto_awesome</span>
          <p className="text-xs text-on-surface-variant">
            Performance Max uses AI to optimize across all Google channels. Some wizard steps
            (match types, dayparting) will be simplified since Google manages these automatically.
          </p>
        </div>
      )}
    </div>
  );
}
