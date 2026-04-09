/**
 * Centralized agent type definitions.
 * Single source of truth for icons, labels, colors, and scheduling defaults.
 * Used by Agent Controls UI, scheduling system, and sidebar badges.
 */

export const AGENT_TYPES = {
  audit: {
    key: 'audit',
    label: 'Audit Agent',
    icon: 'fact_check',
    color: 'bg-primary',
    textColor: 'text-primary',
    defaultFrequency: 'weekly',
    description: 'Comprehensive account health analysis',
  },
  bid: {
    key: 'bid',
    label: 'Bid Agent',
    icon: 'trending_up',
    color: 'bg-secondary',
    textColor: 'text-secondary',
    defaultFrequency: 'daily',
    description: 'Keyword bid optimization (±20% cap)',
  },
  ad_copy: {
    key: 'ad_copy',
    label: 'Ad Copy Agent',
    icon: 'edit_note',
    color: 'bg-tertiary',
    textColor: 'text-tertiary',
    defaultFrequency: 'biweekly',
    description: 'Responsive search ad testing and rotation',
  },
  budget: {
    key: 'budget',
    label: 'Budget Agent',
    icon: 'account_balance',
    color: 'bg-error',
    textColor: 'text-error',
    defaultFrequency: 'weekly',
    description: 'Campaign budget reallocation (±15% cap)',
  },
  keyword: {
    key: 'keyword',
    label: 'Keyword Agent',
    icon: 'key',
    color: 'bg-primary-container',
    textColor: 'text-primary-container',
    defaultFrequency: 'weekly',
    description: 'Keyword discovery and optimization',
  },
  negative: {
    key: 'negative',
    label: 'Negative KW Agent',
    icon: 'block',
    color: 'bg-on-surface-variant',
    textColor: 'text-on-surface-variant',
    defaultFrequency: 'weekly',
    description: 'Search term mining for negative keywords',
  },
  brand: {
    key: 'brand',
    label: 'Brand Agent',
    icon: 'palette',
    color: 'bg-tertiary',
    textColor: 'text-tertiary',
    defaultFrequency: 'on-demand',
    description: 'Website crawl for brand identity and voice',
  },
};

export const AGENT_TYPE_KEYS = Object.keys(AGENT_TYPES);

/**
 * Default schedule config for a new account.
 * Each agent has: enabled (bool), frequency (string), guardrails (object).
 */
export function getDefaultScheduleConfig() {
  return {
    audit:    { enabled: true,  frequency: 'weekly',   guardrails: {} },
    bid:      { enabled: true,  frequency: 'daily',    guardrails: { maxBidChangePct: 20 } },
    ad_copy:  { enabled: false, frequency: 'biweekly', guardrails: {} },
    budget:   { enabled: true,  frequency: 'weekly',   guardrails: { maxBudgetChangePct: 15 } },
    keyword:  { enabled: true,  frequency: 'weekly',   guardrails: {} },
    negative: { enabled: true,  frequency: 'weekly',   guardrails: {} },
    brand:    { enabled: false, frequency: 'on-demand', guardrails: {} },
  };
}

/**
 * Guardrail defaults applied per-account. These can be overridden in ScheduleConfig.
 */
export const GUARDRAIL_DEFAULTS = {
  maxDailyBudgetCap: null,
  maxBidCeiling: null,
  excludedCampaignIds: [],
  requireApprovalAbove: null,
};
