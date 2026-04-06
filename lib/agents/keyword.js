import { BaseAgent } from './base.js';
import { keywordOptimizationPrompt } from '../prompts.js';
import { fetchKeywords, fetchKeywordMetrics, fetchSearchTerms } from '../google-ads-query.js';
import { setKeywordStatus, addKeywords } from '../google-ads-write.js';

export class KeywordAgent extends BaseAgent {
  constructor(accountId, trigger = 'scheduled') {
    super(accountId, 'keyword', trigger);
  }

  async observe() {
    const [keywords, metrics, searchTerms] = await Promise.all([
      fetchKeywords(this.client),
      fetchKeywordMetrics(this.client),
      fetchSearchTerms(this.client),
    ]);
    return { keywords, metrics, searchTerms };
  }

  async analyze({ keywords, metrics, searchTerms }) {
    const brandProfile = null; // agents don't load brand profile for now
    return this.callAI(keywordOptimizationPrompt(keywords, searchTerms, metrics, brandProfile));
  }

  async execute({ pause = [], add = [] }) {
    // Pause underperforming keywords
    for (const item of pause) {
      await setKeywordStatus(this.client, item.resource, 'PAUSED');
      await this.logAction({
        actionType: 'update',
        entityType: 'keyword',
        entityResourceName: item.resource,
        description: `Paused keyword: ${item.reason}`,
        beforeState: { status: 'ENABLED' },
        afterState: { status: 'PAUSED' },
        reasoning: item.reason,
      });
    }

    // Add new keywords grouped by ad group
    const byAdGroup = {};
    for (const item of add) {
      if (!byAdGroup[item.adGroup]) byAdGroup[item.adGroup] = [];
      byAdGroup[item.adGroup].push({ text: item.text, matchType: item.matchType });
    }
    for (const [adGroupResource, kws] of Object.entries(byAdGroup)) {
      const resourceNames = await addKeywords(this.client, adGroupResource, kws);
      for (let i = 0; i < kws.length; i++) {
        await this.logAction({
          actionType: 'create',
          entityType: 'keyword',
          entityResourceName: resourceNames[i] || null,
          description: `Added keyword "${kws[i].text}" [${kws[i].matchType}] to ad group`,
          beforeState: null,
          afterState: { text: kws[i].text, matchType: kws[i].matchType, status: 'ENABLED' },
          reasoning: add.find(a => a.text === kws[i].text)?.reason || '',
        });
      }
    }
  }
}
