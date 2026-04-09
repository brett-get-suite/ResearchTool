'use client';

const BIDDING_STRATEGIES = [
  {
    value: 'MAXIMIZE_CONVERSIONS',
    label: 'Maximize Conversions',
    description: 'Google automatically sets bids to get the most conversions within your budget.',
    icon: 'trending_up',
    recommended: true,
  },
  {
    value: 'TARGET_CPA',
    label: 'Target CPA',
    description: 'Set a target cost per acquisition. Google adjusts bids to hit your target.',
    icon: 'price_check',
    recommended: false,
  },
  {
    value: 'MAXIMIZE_CLICKS',
    label: 'Maximize Clicks',
    description: 'Get the most clicks possible within your budget. Good for traffic goals.',
    icon: 'ads_click',
    recommended: false,
  },
  {
    value: 'TARGET_ROAS',
    label: 'Target ROAS',
    description: 'Set a target return on ad spend. Best for e-commerce with conversion values.',
    icon: 'monitoring',
    recommended: false,
  },
  {
    value: 'MANUAL_CPC',
    label: 'Manual CPC',
    description: 'Set bids manually at the keyword level. Maximum control but requires active management.',
    icon: 'tune',
    recommended: false,
  },
];

export default function StepBudget({ form, onChange }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-headline-sm text-on-surface mb-1">Budget & Bidding</h2>
        <p className="text-sm text-on-surface-variant">
          Set your daily budget and choose how Google optimizes your bids.
        </p>
      </div>

      {/* Campaign Name */}
      <div>
        <label className="field-label">Campaign Name <span className="text-error">*</span></label>
        <input
          type="text"
          className="field-input mt-1"
          placeholder="e.g. HVAC Repair - Phoenix - Prospecting"
          value={form.name}
          onChange={(e) => onChange('name', e.target.value)}
        />
        <p className="text-xs text-on-surface-variant/60 mt-1">
          Use a clear naming convention: Service - Location - Strategy
        </p>
      </div>

      {/* Daily Budget */}
      <div>
        <label className="field-label">Daily Budget (USD) <span className="text-error">*</span></label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">$</span>
          <input
            type="number"
            className="field-input pl-7"
            placeholder="50"
            min="1"
            step="1"
            value={form.dailyBudget}
            onChange={(e) => onChange('dailyBudget', e.target.value)}
          />
        </div>
        {form.dailyBudget && (
          <p className="text-xs text-on-surface-variant/60 mt-1">
            ~${(parseFloat(form.dailyBudget) * 30.4).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month estimated
          </p>
        )}
      </div>

      {/* Bidding Strategy */}
      <div>
        <label className="field-label">Bidding Strategy</label>
        <div className="space-y-2 mt-2">
          {BIDDING_STRATEGIES.map((bs) => {
            const selected = form.biddingStrategy === bs.value;
            return (
              <button
                key={bs.value}
                type="button"
                onClick={() => onChange('biddingStrategy', bs.value)}
                className={`
                  w-full text-left px-4 py-3 rounded-xl transition-all flex items-start gap-3
                  ${selected
                    ? 'bg-primary/10 ring-1 ring-primary/30'
                    : 'bg-surface-container-high hover:bg-surface-bright'
                  }
                `}
              >
                <span
                  className={`material-symbols-outlined text-lg mt-0.5 ${
                    selected ? 'text-primary' : 'text-on-surface-variant'
                  }`}
                >
                  {bs.icon}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-on-surface'}`}>
                      {bs.label}
                    </span>
                    {bs.recommended && (
                      <span className="text-[0.625rem] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">{bs.description}</p>
                </div>
                {selected && (
                  <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">check_circle</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditional fields based on bidding strategy */}
      {form.biddingStrategy === 'TARGET_CPA' && (
        <div>
          <label className="field-label">Target CPA (USD)</label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">$</span>
            <input
              type="number"
              className="field-input pl-7"
              placeholder="25"
              min="1"
              step="0.01"
              value={form.targetCpaMicros}
              onChange={(e) => onChange('targetCpaMicros', e.target.value)}
            />
          </div>
        </div>
      )}

      {form.biddingStrategy === 'TARGET_ROAS' && (
        <div>
          <label className="field-label">Target ROAS (%)</label>
          <div className="relative mt-1">
            <input
              type="number"
              className="field-input"
              placeholder="300"
              min="1"
              step="1"
              value={form.targetRoas}
              onChange={(e) => onChange('targetRoas', e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">%</span>
          </div>
          <p className="text-xs text-on-surface-variant/60 mt-1">e.g. 300% = $3 return for every $1 spent</p>
        </div>
      )}

      {form.biddingStrategy === 'MANUAL_CPC' && (
        <div>
          <label className="field-label">Max CPC Bid (USD)</label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">$</span>
            <input
              type="number"
              className="field-input pl-7"
              placeholder="2.50"
              min="0.01"
              step="0.01"
              value={form.maxCpcBid}
              onChange={(e) => onChange('maxCpcBid', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Campaign Status */}
      <div>
        <label className="field-label">Launch Status</label>
        <select
          className="field-input mt-1"
          value={form.status}
          onChange={(e) => onChange('status', e.target.value)}
        >
          <option value="PAUSED">Paused (review before spending)</option>
          <option value="ENABLED">Enabled (start spending immediately)</option>
        </select>
      </div>

      {/* AI guardrails info */}
      <div className="bg-tertiary/10 rounded-lg p-3 flex gap-2.5">
        <span className="material-symbols-outlined text-tertiary text-[18px] shrink-0 mt-0.5">shield</span>
        <div className="text-xs text-on-surface-variant">
          <p className="font-medium text-on-surface mb-0.5">AI Guardrails Active</p>
          <p>
            Once launched, the Bid Agent and Budget Agent will monitor this campaign.
            They respect your budget cap and bidding strategy settings. You can configure
            per-campaign guardrails in Agent Controls after launch.
          </p>
        </div>
      </div>
    </div>
  );
}
