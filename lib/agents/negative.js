import { BaseAgent } from './base.js';
import { negativeKeywordPrompt } from '../prompts.js';
import { fetchSearchTerms, fetchCampaigns } from '../google-ads-query.js';
import { addNegativeKeywords } from '../google-ads-write.js';
import { getAccount } from '../supabase.js';

export class NegativeAgent extends BaseAgent {
  constructor(accountId, trigger = 'scheduled') {
    super(accountId, 'negative', trigger);
  }

  async observe() {
    const account = await getAccount(this.accountId);
    const brandProfile = account?.brand_profile || null;
    const [searchTerms, campaigns] = await Promise.all([
      fetchSearchTerms(this.client),
      fetchCampaigns(this.client),
    ]);
    this._campaigns = campaigns; // store for use in execute
    return { searchTerms, campaigns, brandProfile };
  }

  async analyze({ searchTerms, brandProfile }) {
    return this.callAI(negativeKeywordPrompt(searchTerms, [], brandProfile));
  }

  async execute({ negatives = [] }) {
    if (!negatives.length) return;

    // Group negatives by campaign resource name; fall back to first active campaign
    const byCampaign = {};
    for (const n of negatives) {
      const key = n.campaign || '__default__';
      if (!byCampaign[key]) byCampaign[key] = [];
      byCampaign[key].push(n);
    }

    // Resolve the default campaign once if needed
    let defaultCampaignResource = null;
    if (byCampaign['__default__']) {
      const active = this._campaigns.find(c => c.status === 'ENABLED') || this._campaigns[0];
      if (!active) return;
      defaultCampaignResource = active.resourceName;
    }

    for (const [key, items] of Object.entries(byCampaign)) {
      const campaignResource = key === '__default__' ? defaultCampaignResource : key;
      if (!campaignResource) continue;

      const kwList = items.map(n => ({ text: n.keyword, matchType: n.matchType || 'BROAD' }));
      await addNegativeKeywords(this.client, campaignResource, kwList);

      for (const n of items) {
        await this.logAction({
          actionType: 'create',
          entityType: 'keyword',
          entityResourceName: null,
          description: `Added negative keyword "${n.keyword}" [${n.matchType || 'BROAD'}] — wasted spend: $${(n.wastedSpend || 0).toFixed(2)}`,
          beforeState: null,
          afterState: { keyword: n.keyword, matchType: n.matchType || 'BROAD', negative: true },
          reasoning: n.reason,
        });
      }
    }
  }
}
