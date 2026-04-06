import { BaseAgent } from './base.js';
import { adCopyOptimizationPrompt } from '../prompts.js';
import { fetchAdGroups, fetchAds } from '../google-ads-query.js';
import { createResponsiveSearchAd } from '../google-ads-write.js';
import { getAccount } from '../supabase.js';

export class AdCopyAgent extends BaseAgent {
  constructor(accountId, trigger = 'scheduled') {
    super(accountId, 'ad_copy', trigger);
  }

  async observe() {
    const account = await getAccount(this.accountId);
    const brandProfile = account?.brand_profile || null;
    const [adGroups, ads] = await Promise.all([
      fetchAdGroups(this.client),
      fetchAds(this.client),
    ]);
    this._ads = ads; // store for use in execute
    return { adGroups, ads, brandProfile };
  }

  async analyze({ adGroups, ads, brandProfile }) {
    // Run per-ad-group analysis for the first 3 ad groups
    // In a full implementation, iterate all ad groups with performance filtering
    const results = [];
    const targetGroups = adGroups.slice(0, 3);
    for (const ag of targetGroups) {
      const agAds = ads.filter(a => a.adGroupId === ag.id);
      const keywords = []; // simplified — keyword data could be passed in
      const decisions = await this.callAI(
        adCopyOptimizationPrompt(ag, keywords, brandProfile, agAds)
      );
      if (decisions?.headlines?.length) {
        results.push({ adGroup: ag, decisions });
      }
    }
    return results;
  }

  async execute(adGroupDecisions) {
    for (const { adGroup, decisions } of adGroupDecisions) {
      const { headlines, descriptions } = decisions;
      if (!headlines?.length || !descriptions?.length) continue;

      // TODO: pull finalUrl from existing ads in this ad group
      const agAds = this._ads?.filter(a => a.adGroupId === adGroup.id) || [];
      const finalUrl = agAds[0]?.finalUrl || 'https://example.com';

      const resourceName = await createResponsiveSearchAd(this.client, {
        adGroupResourceName: `customers/${this.client.customerId}/adGroups/${adGroup.id}`,
        headlines,
        descriptions,
        finalUrl,
      });

      await this.logAction({
        actionType: 'create',
        entityType: 'ad',
        entityResourceName: resourceName,
        description: `Created new RSA in ad group "${adGroup.name}" with ${headlines.length} headlines`,
        beforeState: null,
        afterState: { headlines, descriptions },
        reasoning: 'AI-generated ad copy based on brand profile and existing ad performance',
      });
    }
  }
}
