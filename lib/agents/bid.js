import { BaseAgent } from './base.js';
import { bidOptimizationPrompt } from '../prompts.js';
import { fetchKeywordMetrics } from '../google-ads-query.js';
import { updateKeywordBid } from '../google-ads-write.js';

export class BidAgent extends BaseAgent {
  constructor(accountId, trigger = 'scheduled') {
    super(accountId, 'bid', trigger);
  }

  async observe() {
    const metrics = await fetchKeywordMetrics(this.client);
    return { metrics };
  }

  async analyze({ metrics }) {
    const goals = {}; // account goals could be loaded from account.settings if needed
    return this.callAI(bidOptimizationPrompt(metrics, goals));
  }

  async execute({ adjustments = [] }) {
    const MAX_CHANGE_RATIO = 1.20; // cap at ±20% per run
    for (const adj of adjustments) {
      const safeBid = Math.min(adj.newBid, adj.currentBid * MAX_CHANGE_RATIO);
      const cappedBid = Math.max(safeBid, adj.currentBid / MAX_CHANGE_RATIO);
      const newBidMicros = Math.round(cappedBid * 1_000_000);

      await updateKeywordBid(this.client, adj.resource, newBidMicros);
      await this.logAction({
        actionType: 'update',
        entityType: 'keyword',
        entityResourceName: adj.resource,
        description: `Adjusted bid from $${adj.currentBid.toFixed(2)} to $${cappedBid.toFixed(2)}`,
        beforeState: { cpcBidMicros: Math.round(adj.currentBid * 1_000_000) },
        afterState: { cpcBidMicros: newBidMicros },
        reasoning: adj.reason,
      });
    }
  }
}
