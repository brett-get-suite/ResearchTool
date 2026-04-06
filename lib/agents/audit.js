import { BaseAgent } from './base.js';
import { accountAuditPrompt } from '../prompts.js';
import { updateAccount } from '../supabase.js';
import { fetchCampaigns, fetchAdGroups, fetchKeywords, fetchAds, fetchCampaignMetrics } from '../google-ads-query.js';

export class AuditAgent extends BaseAgent {
  constructor(accountId, trigger = 'initial') {
    super(accountId, 'audit', trigger);
  }

  async observe() {
    const [campaigns, adGroups, keywords, ads, metrics] = await Promise.all([
      fetchCampaigns(this.client),
      fetchAdGroups(this.client),
      fetchKeywords(this.client),
      fetchAds(this.client),
      fetchCampaignMetrics(this.client, 'LAST_90_DAYS'),
    ]);
    return { campaigns, adGroups, keywords, ads, metrics };
  }

  async analyze({ campaigns, adGroups, keywords, ads, metrics }) {
    return this.callAI(accountAuditPrompt(campaigns, adGroups, keywords, ads, metrics));
  }

  async execute(auditReport) {
    await updateAccount(this.accountId, { audit_data: auditReport });
    await this.logAction({
      actionType: 'update',
      entityType: 'account',
      entityResourceName: null,
      description: `Account audit completed. Health score: ${auditReport.health_score || 'N/A'}. Issues found: ${auditReport.issues?.length || 0}`,
      beforeState: null,
      afterState: { health_score: auditReport.health_score, issues_count: auditReport.issues?.length },
      reasoning: 'Periodic account health audit',
    });
  }
}
