import { BaseAgent } from './base.js';
import { brandIdentityPrompt } from '../prompts.js';
import { updateAccount } from '../supabase.js';

export class BrandAgent extends BaseAgent {
  constructor(accountId, trigger = 'manual') {
    super(accountId, 'brand', trigger);
    this.websiteUrl = null; // set before run() if known
  }

  async observe() {
    const url = this.websiteUrl;
    if (!url) throw new Error('BrandAgent requires a websiteUrl before running');
    const res = await fetch(url, { headers: { 'User-Agent': 'PPCRecon/1.0' } });
    const html = await res.text();
    // strip tags, keep text content (simple approach)
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 5000);
    return { url, websiteContent: text };
  }

  async analyze({ url, websiteContent }) {
    return this.callAI(brandIdentityPrompt(url, websiteContent));
  }

  async execute(brandProfile) {
    await updateAccount(this.accountId, { brand_profile: brandProfile });
    await this.logAction({
      actionType: 'update',
      entityType: 'account',
      entityResourceName: null,
      description: `Generated brand profile for ${brandProfile.brand_name || 'account'}`,
      beforeState: null,
      afterState: brandProfile,
      reasoning: 'Initial brand identity extraction from website',
    });
  }
}
