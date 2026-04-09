'use client';

const STRUCTURES = [
  {
    value: 'skag',
    label: 'SKAG — Single Keyword Ad Groups',
    icon: 'precision_manufacturing',
    description: 'One keyword per ad group. Maximum control over ad copy relevance and Quality Score.',
    pros: [
      'Highest Quality Scores — ad copy matches every keyword exactly',
      'Granular bid control per keyword',
      'Best for high-value, competitive keywords',
    ],
    cons: [
      'More ad groups to manage',
      'Requires more ad copy variations',
      'Can fragment data across many small groups',
    ],
    best_for: 'High-competition markets, brand terms, top-performing keywords',
  },
  {
    value: 'stag',
    label: 'STAG — Single Theme Ad Groups',
    icon: 'category',
    description: 'Group related keywords by theme. Balances relevance with manageability.',
    pros: [
      'Easier to manage at scale',
      'Consolidates data for faster optimization',
      'Good Quality Scores when themes are tight',
    ],
    cons: [
      'Ad copy less precisely matched to each keyword',
      'Less granular bid control',
      'Requires discipline to keep themes tight',
    ],
    best_for: 'Broad service verticals, moderate budgets, scaling campaigns',
  },
];

export default function StepStructure({ form, onChange }) {
  if (form.campaignType === 'PERFORMANCE_MAX') {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-headline-sm text-on-surface mb-1">Campaign Structure</h2>
          <p className="text-sm text-on-surface-variant">
            Performance Max campaigns use asset groups instead of traditional ad group structures.
            Google's AI handles keyword-to-ad matching automatically.
          </p>
        </div>
        <div className="bg-tertiary/10 rounded-lg p-4 flex gap-3">
          <span className="material-symbols-outlined text-tertiary text-xl shrink-0 mt-0.5">auto_awesome</span>
          <div>
            <p className="text-sm text-on-surface font-medium mb-1">Asset Group Structure</p>
            <p className="text-sm text-on-surface-variant">
              Your keywords, ads, and assets will be organized into asset groups. Google automatically
              matches the right creative to the right audience.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-headline-sm text-on-surface mb-1">Campaign Structure</h2>
        <p className="text-sm text-on-surface-variant">
          Choose how keywords are organized into ad groups. This affects Quality Score, ad relevance,
          and how granular your control is.
        </p>
      </div>

      <div className="grid gap-4">
        {STRUCTURES.map((s) => {
          const selected = form.structure === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange('structure', s.value)}
              className={`
                text-left p-5 rounded-xl transition-all
                ${selected
                  ? 'bg-primary/10 ring-1 ring-primary'
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
                  <p className="text-sm text-on-surface-variant mb-3">{s.description}</p>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-secondary mb-1.5 uppercase tracking-wider">Pros</p>
                      <ul className="space-y-1">
                        {s.pros.map((p, i) => (
                          <li key={i} className="flex gap-1.5 text-on-surface-variant">
                            <span className="material-symbols-outlined text-secondary text-[14px] shrink-0 mt-0.5">add</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-error mb-1.5 uppercase tracking-wider">Cons</p>
                      <ul className="space-y-1">
                        {s.cons.map((c, i) => (
                          <li key={i} className="flex gap-1.5 text-on-surface-variant">
                            <span className="material-symbols-outlined text-error text-[14px] shrink-0 mt-0.5">remove</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <p className="text-[0.625rem] text-on-surface-variant/60 mt-3 uppercase tracking-wider">
                    Best for: {s.best_for}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
