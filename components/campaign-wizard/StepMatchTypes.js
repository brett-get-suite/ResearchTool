'use client';

const MATCH_TYPES = [
  {
    value: 'EXACT',
    label: 'Exact Match',
    icon: 'target',
    format: (kw) => `[${kw}]`,
    description: 'Ads show only for searches that match the exact meaning of your keyword.',
    budgetNote: 'Best for tight budgets — maximum relevance, minimum waste.',
  },
  {
    value: 'PHRASE',
    label: 'Phrase Match',
    icon: 'format_quote',
    format: (kw) => `"${kw}"`,
    description: 'Ads show for searches that include the meaning of your keyword, with additional context.',
    budgetNote: 'Best for moderate budgets — good balance of reach and relevance.',
  },
  {
    value: 'BROAD',
    label: 'Broad Match',
    icon: 'open_in_full',
    format: (kw) => kw,
    description: 'Ads show for searches related to your keyword, including synonyms and related topics.',
    budgetNote: 'Best for large budgets — maximum reach but requires strong negatives.',
  },
];

const BUDGET_RECOMMENDATIONS = {
  low: { threshold: 50, matchType: 'EXACT', label: 'Under $50/day' },
  mid: { threshold: 150, matchType: 'PHRASE', label: '$50 – $150/day' },
  high: { threshold: Infinity, matchType: 'BROAD', label: 'Over $150/day' },
};

function getRecommendation(dailyBudget) {
  const budget = parseFloat(dailyBudget) || 0;
  if (budget <= 0) return null;
  if (budget < BUDGET_RECOMMENDATIONS.low.threshold) return BUDGET_RECOMMENDATIONS.low;
  if (budget < BUDGET_RECOMMENDATIONS.mid.threshold) return BUDGET_RECOMMENDATIONS.mid;
  return BUDGET_RECOMMENDATIONS.high;
}

export default function StepMatchTypes({ form, onChange }) {
  const recommendation = getRecommendation(form.dailyBudget);
  const sampleKeyword = form.keywords?.split('\n').find((k) => k.trim()) || 'hvac repair';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-headline-sm text-on-surface mb-1">Match Types</h2>
        <p className="text-sm text-on-surface-variant">
          Match types control how closely a search query must match your keywords to trigger your ad.
        </p>
      </div>

      {/* Budget-based recommendation */}
      {recommendation && (
        <div className="bg-tertiary/10 rounded-lg p-4 flex gap-3">
          <span className="material-symbols-outlined text-tertiary text-xl shrink-0">auto_awesome</span>
          <div>
            <p className="text-sm text-on-surface font-medium">
              AI Recommendation: <span className="text-primary">{recommendation.matchType} Match</span>
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              Based on your daily budget ({recommendation.label}), we recommend{' '}
              <strong className="text-on-surface">{recommendation.matchType.toLowerCase()} match</strong> for
              the best balance of reach and budget efficiency.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {MATCH_TYPES.map((mt) => {
          const selected = form.matchType === mt.value;
          const isRecommended = recommendation?.matchType === mt.value;

          return (
            <button
              key={mt.value}
              type="button"
              onClick={() => onChange('matchType', mt.value)}
              className={`
                text-left p-4 rounded-xl transition-all
                ${selected
                  ? 'bg-primary/10 ring-1 ring-primary/30'
                  : 'bg-surface-container-high hover:bg-surface-bright'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    selected ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{mt.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-semibold text-sm ${selected ? 'text-primary' : 'text-on-surface'}`}>
                      {mt.label}
                    </span>
                    {isRecommended && (
                      <span className="text-[0.625rem] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary">
                        Recommended
                      </span>
                    )}
                    {selected && (
                      <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant">{mt.description}</p>
                  <div className="mt-2 bg-surface-container rounded-md px-3 py-1.5 inline-block">
                    <span className="font-mono text-xs text-primary">{mt.format(sampleKeyword)}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-on-surface-variant/60">
        {form.matchType === 'BROAD'
          ? 'Tip: Broad match works best with Smart Bidding strategies and a strong negative keyword list.'
          : form.matchType === 'EXACT'
          ? 'Tip: Exact match gives the most control but may limit reach. Consider adding more keyword variations.'
          : 'Tip: Phrase match is a strong default. It balances precision with discovery of new search queries.'}
      </p>
    </div>
  );
}
