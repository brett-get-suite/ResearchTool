/**
 * Agent registry and dispatcher.
 * Uses lazy imports so missing agent files only fail at invocation time,
 * not at module load time.
 */

const AGENT_MAP = {
  audit:    () => import('./audit.js').then(m => m.AuditAgent),
  keyword:  () => import('./keyword.js').then(m => m.KeywordAgent),
  bid:      () => import('./bid.js').then(m => m.BidAgent),
  budget:   () => import('./budget.js').then(m => m.BudgetAgent),
  ad_copy:  () => import('./ad-copy.js').then(m => m.AdCopyAgent),
  negative: () => import('./negative.js').then(m => m.NegativeAgent),
  brand:    () => import('./brand.js').then(m => m.BrandAgent),
};

export const AGENT_TYPES = Object.keys(AGENT_MAP);

/**
 * Run an agent for an account.
 * @param {string} type — one of AGENT_TYPES
 * @param {string} accountId
 * @param {string} trigger — 'scheduled' | 'manual' | 'initial'
 */
export async function runAgent(type, accountId, trigger = 'scheduled') {
  const loader = AGENT_MAP[type];
  if (!loader) throw new Error(`Unknown agent type: ${type}. Valid: ${AGENT_TYPES.join(', ')}`);

  const AgentClass = await loader();
  const agent = new AgentClass(accountId, trigger);
  return agent.run();
}
