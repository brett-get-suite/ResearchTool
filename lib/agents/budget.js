import { BaseAgent } from './base.js';
import { budgetOptimizationPrompt } from '../prompts.js';
import { fetchCampaigns, fetchCampaignMetrics } from '../google-ads-query.js';
import { updateCampaignBudget } from '../google-ads-write.js';

export class BudgetAgent extends BaseAgent {
  constructor(accountId, trigger = 'scheduled') {
    super(accountId, 'budget', trigger);
  }

  async observe() {
    const [campaigns, metrics] = await Promise.all([
      fetchCampaigns(this.client),
      fetchCampaignMetrics(this.client),
    ]);
    this._campaigns = campaigns; // store for use in execute — avoids N redundant API calls
    return { campaigns, metrics };
  }

  async analyze({ campaigns, metrics }) {
    return this.callAI(budgetOptimizationPrompt(campaigns, metrics));
  }

  async execute({ reallocations = [] }) {
    const MAX_CHANGE_RATIO = 1.15; // cap at ±15% per run
    for (const r of reallocations) {
      const safeNew = Math.min(r.newBudget, r.currentBudget * MAX_CHANGE_RATIO);
      const cappedNew = Math.max(safeNew, r.currentBudget / MAX_CHANGE_RATIO);
      const newAmountMicros = Math.round(cappedNew * 1_000_000);

      const campaign = this._campaigns.find(c => c.resourceName === r.campaign);
      if (!campaign?.budgetResource) continue;

      await updateCampaignBudget(this.client, campaign.budgetResource, newAmountMicros);
      await this.logAction({
        actionType: 'update',
        entityType: 'budget',
        entityResourceName: campaign.budgetResource,
        description: `Adjusted daily budget from $${r.currentBudget.toFixed(2)} to $${cappedNew.toFixed(2)}`,
        beforeState: { amountMicros: Math.round(r.currentBudget * 1_000_000) },
        afterState: { amountMicros: newAmountMicros },
        reasoning: r.reason,
      });
    }
  }
}
