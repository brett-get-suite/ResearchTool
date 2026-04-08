# PPC Recon → Autonomous Ads Management Platform

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing read-only PPC research tool into a fully autonomous Google Ads management platform that connects to real accounts, runs AI agents to optimize campaigns, and tracks every change with undo capability.

**Architecture:** Next.js 14 app router on Vercel. New `/accounts` section alongside the existing research pages. Lib layer split into `google-ads-auth.js` (token management), `google-ads-query.js` (GAQL reads), `google-ads-write.js` (mutations), and `lib/agents/` (AI agents). Every AI change is logged in Supabase with before/after state for undo.

**Tech Stack:** Next.js 14, Supabase (PostgreSQL), Google Ads REST API v18, Gemini 2.5 Flash, Tailwind CSS, Material Symbols icons

---

## File Map

**New lib files:**
- `lib/google-ads-auth.js` — per-account token refresh + client factory
- `lib/google-ads-query.js` — GAQL read queries (campaigns, ad groups, keywords, ads, metrics)
- `lib/google-ads-write.js` — mutate operations (bids, budgets, keywords, ads, campaigns)
- `lib/agents/base.js` — observe→analyze→execute→log pattern
- `lib/agents/index.js` — registry + dispatcher
- `lib/agents/audit.js` — account health audit
- `lib/agents/keyword.js` — keyword optimization
- `lib/agents/bid.js` — bid management
- `lib/agents/budget.js` — budget allocation
- `lib/agents/ad-copy.js` — ad copy generation
- `lib/agents/negative.js` — negative keyword discovery
- `lib/agents/brand.js` — brand identity extraction

**Modified lib files:**
- `lib/supabase.js` — add account/action/run/snapshot CRUD
- `lib/google-ads.js` — add `getAccountClient()` that delegates to `google-ads-auth.js`
- `lib/prompts.js` — add 7 agent prompts

**New pages:**
- `app/accounts/page.js` — account list with connect button
- `app/accounts/[id]/page.js` — account detail with 8 tabs
- `app/accounts/[id]/campaigns/new/page.js` — campaign creation wizard
- `app/agents/page.js` — agent dashboard
- `app/brand-lab/page.js` — brand identity generator

**New API routes:**
- `app/api/auth/google-ads/route.js` — generate OAuth URL
- `app/api/auth/google-ads/callback/route.js` — handle callback, store token
- `app/api/accounts/route.js` — list/create accounts
- `app/api/accounts/[id]/route.js` — get/update/delete
- `app/api/accounts/[id]/sync/route.js` — import campaigns from Google Ads
- `app/api/accounts/[id]/metrics/route.js` — performance metrics
- `app/api/accounts/[id]/campaigns/route.js` — list/create campaigns
- `app/api/accounts/[id]/keywords/route.js` — list/add keywords
- `app/api/accounts/[id]/ads/route.js` — list/create RSAs
- `app/api/accounts/[id]/actions/route.js` — change log
- `app/api/accounts/[id]/actions/[actionId]/undo/route.js` — undo action
- `app/api/agents/run/route.js` — cron trigger
- `app/api/agents/[type]/route.js` — manual agent trigger
- `app/api/brand-lab/route.js` — brand identity generation

**Modified pages/components:**
- `components/Sidebar.js` — add Accounts, Agents, Brand Lab sections
- `app/page.js` — add managed accounts overview section

---

## Task 1: Supabase Tables + CRUD Functions

**Files:**
- Modify: `lib/supabase.js`

- [ ] **Step 1: Run these migrations in the Supabase SQL editor**

```sql
-- Connected Google Ads accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  google_customer_id TEXT NOT NULL UNIQUE,
  google_refresh_token TEXT NOT NULL,
  google_login_customer_id TEXT,
  status TEXT DEFAULT 'connecting',
  brand_profile JSONB,
  audit_data JSONB,
  settings JSONB DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Every AI-driven change (the undo log)
CREATE TABLE agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  run_id UUID,
  agent_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_resource_name TEXT,
  description TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  reasoning TEXT,
  status TEXT DEFAULT 'applied',
  undone_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent execution runs
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  trigger TEXT DEFAULT 'scheduled',
  status TEXT DEFAULT 'running',
  actions_taken INTEGER DEFAULT 0,
  summary JSONB,
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Campaign data cache
CREATE TABLE campaign_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  metrics_data JSONB,
  period TEXT DEFAULT 'last_30_days',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

- [ ] **Step 2: Add CRUD functions to `lib/supabase.js`**

Append to the end of the existing file:

```javascript
// ─── Account CRUD ─────────────────────────────────────────────────

export async function getAccounts() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAccount(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createAccount(payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('accounts')
    .insert([{ ...payload, updated_at: new Date().toISOString() }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccount(id, payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('accounts')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAccount(id) {
  if (!supabase) return;
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw error;
}

// ─── Agent Actions ────────────────────────────────────────────────

export async function getAgentActions(accountId, { limit = 50, offset = 0, agentType } = {}) {
  if (!supabase) return [];
  let query = supabase
    .from('agent_actions')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (agentType) query = query.eq('agent_type', agentType);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getAgentAction(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('agent_actions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createAgentAction(payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('agent_actions')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markActionUndone(actionId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('agent_actions')
    .update({ status: 'undone', undone_at: new Date().toISOString() })
    .eq('id', actionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Agent Runs ───────────────────────────────────────────────────

export async function getAgentRuns(accountId, { limit = 20 } = {}) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('account_id', accountId)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function createAgentRun(payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('agent_runs')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAgentRun(id, payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('agent_runs')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Campaign Snapshots ───────────────────────────────────────────

export async function getLatestSnapshot(accountId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('campaign_snapshots')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function saveSnapshot(accountId, snapshotData, metricsData, period = 'last_30_days') {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('campaign_snapshots')
    .insert([{ account_id: accountId, snapshot_data: snapshotData, metrics_data: metricsData, period }])
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 3: Verify the functions are accessible**

Open the browser console on any page with Supabase configured, or test via `/api/accounts` once it's built. For now, just confirm the file saves without syntax errors.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/bread/Documents/GetSuite/ads-research-tool
git add lib/supabase.js
git commit -m "feat: add accounts/agent_actions/agent_runs/snapshots CRUD to supabase.js"
```

---

## Task 2: Google Ads Auth Layer (Multi-Account)

**Files:**
- Create: `lib/google-ads-auth.js`
- Modify: `lib/google-ads.js` (add `getAccountClient` export)

- [ ] **Step 1: Create `lib/google-ads-auth.js`**

```javascript
/**
 * Multi-account Google Ads OAuth token management.
 * Each account has its own refresh token stored in Supabase.
 * The legacy single-account flow (from env vars) is preserved in google-ads.js.
 */

import { getAccount } from './supabase.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const ADS_API_VERSION = 'v18';
export const ADS_API_BASE = `https://googleads.googleapis.com/${ADS_API_VERSION}`;

// Per-account in-memory token cache: { accountId: { token, expiry } }
const tokenCache = {};

/**
 * Exchange a refresh token for an access token.
 * Caches per accountId to avoid redundant requests within a serverless invocation.
 */
export async function refreshAccessToken(accountId, refreshToken) {
  const cached = tokenCache[accountId];
  if (cached && Date.now() < cached.expiry) return cached.token;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Google OAuth error: ${err.error_description || err.error || res.statusText}`);
  }

  const data = await res.json();
  tokenCache[accountId] = {
    token: data.access_token,
    expiry: Date.now() + (data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

/**
 * Build the auth headers for a Google Ads API call.
 */
export function buildHeaders(accessToken, loginCustomerId) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    'Content-Type': 'application/json',
  };
  if (loginCustomerId) {
    headers['login-customer-id'] = loginCustomerId.replace(/-/g, '');
  }
  return headers;
}

/**
 * Load a connected account from Supabase and return an API client object.
 * The client object is passed to all query/write functions.
 *
 * @param {string} accountId — Supabase UUID for the account
 * @returns {{ accessToken, customerId, loginCustomerId, headers }}
 */
export async function getAccountClient(accountId) {
  const account = await getAccount(accountId);
  if (!account) throw new Error(`Account ${accountId} not found`);
  if (!account.google_refresh_token) throw new Error(`Account ${accountId} has no refresh token`);

  const accessToken = await refreshAccessToken(accountId, account.google_refresh_token);
  const customerId = account.google_customer_id.replace(/-/g, '');
  const loginCustomerId = account.google_login_customer_id?.replace(/-/g, '') || null;

  return {
    accessToken,
    customerId,
    loginCustomerId,
    headers: buildHeaders(accessToken, loginCustomerId),
  };
}

/**
 * Generate the Google OAuth authorization URL for connecting a new account.
 * Redirects to /api/auth/google-ads/callback after user consent.
 */
export function buildOAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-ads/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/adwords',
    access_type: 'offline',
    prompt: 'consent',
    state: state || '',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Exchange an authorization code for refresh + access tokens.
 */
export async function exchangeCodeForTokens(code) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-ads/callback`,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Token exchange failed: ${err.error_description || err.error || res.statusText}`);
  }

  return res.json(); // { access_token, refresh_token, expires_in, ... }
}
```

- [ ] **Step 2: Add `NEXT_PUBLIC_APP_URL` to `.env.local`**

Open `.env.local` and add:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
(On Vercel, set this to your production URL.)

- [ ] **Step 3: Add `getAccountClient` re-export to `lib/google-ads.js`**

Add at the end of `lib/google-ads.js`:

```javascript
// ─── Multi-account client factory ────────────────────────────────

export { getAccountClient } from './google-ads-auth.js';
```

- [ ] **Step 4: Commit**

```bash
git add lib/google-ads-auth.js lib/google-ads.js .env.local
git commit -m "feat: add multi-account Google Ads auth layer"
```

---

## Task 3: Google Ads Query Engine

**Files:**
- Create: `lib/google-ads-query.js`

- [ ] **Step 1: Create `lib/google-ads-query.js`**

```javascript
/**
 * GAQL read queries for Google Ads campaigns, ad groups, keywords, ads, and metrics.
 * All functions accept a client object from getAccountClient().
 */

import { ADS_API_BASE } from './google-ads-auth.js';

/**
 * Run any GAQL query against an account.
 * @param {object} client — from getAccountClient()
 * @param {string} query — GAQL query string
 * @returns {Array} rows
 */
export async function queryGoogleAds(client, query) {
  const res = await fetch(
    `${ADS_API_BASE}/customers/${client.customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: client.headers,
      body: JSON.stringify({ query }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err[0]?.error?.message || err.error?.message || res.statusText;
    throw new Error(`Google Ads query failed (${res.status}): ${msg}`);
  }

  // searchStream returns newline-delimited JSON objects
  const text = await res.text();
  const rows = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '[' || trimmed === ']') continue;
    try {
      const parsed = JSON.parse(trimmed.replace(/^,/, ''));
      if (parsed.results) rows.push(...parsed.results);
    } catch (_) {}
  }
  return rows;
}

export async function fetchCampaigns(client) {
  const rows = await queryGoogleAds(client, `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.bidding_strategy_type,
      campaign_budget.amount_micros,
      campaign_budget.resource_name
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.name
  `);
  return rows.map(r => ({
    id: r.campaign.id,
    name: r.campaign.name,
    status: r.campaign.status,
    type: r.campaign.advertisingChannelType,
    biddingStrategy: r.campaign.biddingStrategyType,
    budgetAmountMicros: r.campaignBudget?.amountMicros,
    budgetResource: r.campaignBudget?.resourceName,
    resourceName: `customers/${client.customerId}/campaigns/${r.campaign.id}`,
  }));
}

export async function fetchAdGroups(client, campaignId) {
  let whereClause = "ad_group.status != 'REMOVED'";
  if (campaignId) whereClause += ` AND campaign.id = ${campaignId}`;

  const rows = await queryGoogleAds(client, `
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group.cpc_bid_micros,
      campaign.id,
      campaign.name
    FROM ad_group
    WHERE ${whereClause}
    ORDER BY ad_group.name
  `);
  return rows.map(r => ({
    id: r.adGroup.id,
    name: r.adGroup.name,
    status: r.adGroup.status,
    cpcBidMicros: r.adGroup.cpcBidMicros,
    campaignId: r.campaign.id,
    campaignName: r.campaign.name,
    resourceName: `customers/${client.customerId}/adGroups/${r.adGroup.id}`,
  }));
}

export async function fetchKeywords(client, adGroupId) {
  let whereClause = "ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.status != 'REMOVED'";
  if (adGroupId) whereClause += ` AND ad_group.id = ${adGroupId}`;

  const rows = await queryGoogleAds(client, `
    SELECT
      ad_group_criterion.criterion_id,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status,
      ad_group_criterion.cpc_bid_micros,
      ad_group_criterion.quality_info.quality_score,
      ad_group.id,
      ad_group.name,
      campaign.id,
      campaign.name
    FROM ad_group_criterion
    WHERE ${whereClause}
    ORDER BY ad_group_criterion.keyword.text
  `);
  return rows.map(r => ({
    criterionId: r.adGroupCriterion.criterionId,
    keyword: r.adGroupCriterion.keyword?.text,
    matchType: r.adGroupCriterion.keyword?.matchType,
    status: r.adGroupCriterion.status,
    cpcBidMicros: r.adGroupCriterion.cpcBidMicros,
    qualityScore: r.adGroupCriterion.qualityInfo?.qualityScore,
    adGroupId: r.adGroup.id,
    adGroupName: r.adGroup.name,
    campaignId: r.campaign.id,
    campaignName: r.campaign.name,
    resourceName: `customers/${client.customerId}/adGroupCriteria/${r.adGroup.id}~${r.adGroupCriterion.criterionId}`,
  }));
}

export async function fetchAds(client, adGroupId) {
  let whereClause = "ad_group_ad.status != 'REMOVED'";
  if (adGroupId) whereClause += ` AND ad_group.id = ${adGroupId}`;

  const rows = await queryGoogleAds(client, `
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      ad_group_ad.ad.type,
      ad_group_ad.ad.responsive_search_ad.headlines,
      ad_group_ad.ad.responsive_search_ad.descriptions,
      ad_group_ad.ad.final_urls,
      ad_group_ad.status,
      ad_group.id,
      ad_group.name,
      campaign.id,
      campaign.name
    FROM ad_group_ad
    WHERE ${whereClause}
    ORDER BY ad_group_ad.ad.id
  `);
  return rows.map(r => ({
    id: r.adGroupAd.ad.id,
    name: r.adGroupAd.ad.name,
    type: r.adGroupAd.ad.type,
    headlines: r.adGroupAd.ad.responsiveSearchAd?.headlines || [],
    descriptions: r.adGroupAd.ad.responsiveSearchAd?.descriptions || [],
    finalUrls: r.adGroupAd.ad.finalUrls || [],
    status: r.adGroupAd.status,
    adGroupId: r.adGroup.id,
    adGroupName: r.adGroup.name,
    campaignId: r.campaign.id,
    campaignName: r.campaign.name,
    resourceName: `customers/${client.customerId}/adGroupAds/${r.adGroup.id}~${r.adGroupAd.ad.id}`,
  }));
}

export async function fetchCampaignMetrics(client, dateRange = 'LAST_30_DAYS') {
  const rows = await queryGoogleAds(client, `
    SELECT
      campaign.id,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE segments.date DURING ${dateRange}
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
  `);
  return rows.map(r => ({
    campaignId: r.campaign.id,
    campaignName: r.campaign.name,
    impressions: parseInt(r.metrics.impressions) || 0,
    clicks: parseInt(r.metrics.clicks) || 0,
    costMicros: parseInt(r.metrics.costMicros) || 0,
    cost: (parseInt(r.metrics.costMicros) || 0) / 1_000_000,
    conversions: parseFloat(r.metrics.conversions) || 0,
    ctr: parseFloat(r.metrics.ctr) || 0,
    avgCpc: (parseInt(r.metrics.averageCpc) || 0) / 1_000_000,
  }));
}

export async function fetchAccountMetrics(client, dateRange = 'LAST_30_DAYS') {
  const rows = await queryGoogleAds(client, `
    SELECT
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr
    FROM customer
    WHERE segments.date DURING ${dateRange}
  `);
  if (!rows.length) return { impressions: 0, clicks: 0, cost: 0, conversions: 0, ctr: 0 };
  const r = rows[0].metrics;
  return {
    impressions: parseInt(r.impressions) || 0,
    clicks: parseInt(r.clicks) || 0,
    costMicros: parseInt(r.costMicros) || 0,
    cost: (parseInt(r.costMicros) || 0) / 1_000_000,
    conversions: parseFloat(r.conversions) || 0,
    ctr: parseFloat(r.ctr) || 0,
  };
}

export async function fetchKeywordMetrics(client, dateRange = 'LAST_30_DAYS') {
  const rows = await queryGoogleAds(client, `
    SELECT
      ad_group_criterion.criterion_id,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group.id,
      campaign.id,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM keyword_view
    WHERE segments.date DURING ${dateRange}
      AND ad_group_criterion.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 1000
  `);
  return rows.map(r => ({
    criterionId: r.adGroupCriterion.criterionId,
    keyword: r.adGroupCriterion.keyword?.text,
    matchType: r.adGroupCriterion.keyword?.matchType,
    adGroupId: r.adGroup.id,
    campaignId: r.campaign.id,
    impressions: parseInt(r.metrics.impressions) || 0,
    clicks: parseInt(r.metrics.clicks) || 0,
    cost: (parseInt(r.metrics.costMicros) || 0) / 1_000_000,
    conversions: parseFloat(r.metrics.conversions) || 0,
    ctr: parseFloat(r.metrics.ctr) || 0,
    avgCpc: (parseInt(r.metrics.averageCpc) || 0) / 1_000_000,
  }));
}

export async function fetchSearchTerms(client, dateRange = 'LAST_30_DAYS') {
  const rows = await queryGoogleAds(client, `
    SELECT
      search_term_view.search_term,
      search_term_view.status,
      ad_group.id,
      campaign.id,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM search_term_view
    WHERE segments.date DURING ${dateRange}
    ORDER BY metrics.cost_micros DESC
    LIMIT 500
  `);
  return rows.map(r => ({
    searchTerm: r.searchTermView.searchTerm,
    status: r.searchTermView.status,
    adGroupId: r.adGroup.id,
    campaignId: r.campaign.id,
    impressions: parseInt(r.metrics.impressions) || 0,
    clicks: parseInt(r.metrics.clicks) || 0,
    cost: (parseInt(r.metrics.costMicros) || 0) / 1_000_000,
    conversions: parseFloat(r.metrics.conversions) || 0,
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/google-ads-query.js
git commit -m "feat: add GAQL query engine for campaigns, ad groups, keywords, metrics"
```

---

## Task 4: Google Ads Write Operations

**Files:**
- Create: `lib/google-ads-write.js`

- [ ] **Step 1: Create `lib/google-ads-write.js`**

```javascript
/**
 * Google Ads mutate operations.
 * All functions accept a client from getAccountClient() and return the resource name.
 */

import { ADS_API_BASE } from './google-ads-auth.js';

async function mutate(client, operations) {
  const res = await fetch(
    `${ADS_API_BASE}/customers/${client.customerId}/googleAds:mutate`,
    {
      method: 'POST',
      headers: client.headers,
      body: JSON.stringify({ mutateOperations: operations }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || err[0]?.error?.message || res.statusText;
    throw new Error(`Google Ads mutate failed (${res.status}): ${msg}`);
  }

  return res.json();
}

// ─── Campaign Operations ──────────────────────────────────────────

export async function createCampaignBudget(client, { name, amountMicros, deliveryMethod = 'STANDARD' }) {
  const result = await mutate(client, [{
    campaignBudgetOperation: {
      create: {
        name,
        amountMicros: String(amountMicros),
        deliveryMethod,
      },
    },
  }]);
  return result.mutateOperationResponses[0]?.campaignBudgetResult?.resourceName;
}

export async function createCampaign(client, { name, budgetResourceName, biddingStrategy, networkSettings, status = 'PAUSED' }) {
  const campaign = {
    name,
    status,
    campaignBudget: budgetResourceName,
    advertisingChannelType: 'SEARCH',
    networkSettings: networkSettings || {
      targetGoogleSearch: true,
      targetSearchNetwork: true,
      targetContentNetwork: false,
    },
  };

  if (biddingStrategy === 'MAXIMIZE_CONVERSIONS') {
    campaign.maximizeConversions = {};
  } else if (biddingStrategy === 'TARGET_CPA') {
    campaign.targetCpa = { targetCpaMicros: String(5_000_000) }; // $5 default
  } else {
    campaign.manualCpc = { enhancedCpcEnabled: true };
  }

  const result = await mutate(client, [{ campaignOperation: { create: campaign } }]);
  return result.mutateOperationResponses[0]?.campaignResult?.resourceName;
}

export async function updateCampaign(client, resourceName, updates) {
  const updateMask = Object.keys(updates).join(',');
  const result = await mutate(client, [{
    campaignOperation: {
      update: { resourceName, ...updates },
      updateMask,
    },
  }]);
  return result.mutateOperationResponses[0]?.campaignResult?.resourceName;
}

export async function setCampaignStatus(client, resourceName, status) {
  return updateCampaign(client, resourceName, { status });
}

export async function updateCampaignBudget(client, budgetResourceName, newAmountMicros) {
  const result = await mutate(client, [{
    campaignBudgetOperation: {
      update: { resourceName: budgetResourceName, amountMicros: String(newAmountMicros) },
      updateMask: 'amount_micros',
    },
  }]);
  return result.mutateOperationResponses[0]?.campaignBudgetResult?.resourceName;
}

// ─── Ad Group Operations ──────────────────────────────────────────

export async function createAdGroup(client, { campaignResourceName, name, cpcBidMicros }) {
  const result = await mutate(client, [{
    adGroupOperation: {
      create: {
        name,
        campaign: campaignResourceName,
        status: 'ENABLED',
        cpcBidMicros: String(cpcBidMicros || 1_000_000),
      },
    },
  }]);
  return result.mutateOperationResponses[0]?.adGroupResult?.resourceName;
}

export async function updateAdGroup(client, resourceName, updates) {
  const updateMask = Object.keys(updates).join(',');
  const result = await mutate(client, [{
    adGroupOperation: {
      update: { resourceName, ...updates },
      updateMask,
    },
  }]);
  return result.mutateOperationResponses[0]?.adGroupResult?.resourceName;
}

// ─── Keyword Operations ───────────────────────────────────────────

/**
 * @param {object} client
 * @param {string} adGroupResourceName
 * @param {Array<{text: string, matchType: string}>} keywords
 */
export async function addKeywords(client, adGroupResourceName, keywords) {
  const operations = keywords.map(kw => ({
    adGroupCriterionOperation: {
      create: {
        adGroup: adGroupResourceName,
        status: 'ENABLED',
        keyword: {
          text: kw.text,
          matchType: kw.matchType || 'BROAD',
        },
      },
    },
  }));
  const result = await mutate(client, operations);
  return result.mutateOperationResponses.map(r => r.adGroupCriterionResult?.resourceName);
}

export async function updateKeywordBid(client, resourceName, newBidMicros) {
  const result = await mutate(client, [{
    adGroupCriterionOperation: {
      update: { resourceName, cpcBidMicros: String(newBidMicros) },
      updateMask: 'cpc_bid_micros',
    },
  }]);
  return result.mutateOperationResponses[0]?.adGroupCriterionResult?.resourceName;
}

export async function setKeywordStatus(client, resourceName, status) {
  const result = await mutate(client, [{
    adGroupCriterionOperation: {
      update: { resourceName, status },
      updateMask: 'status',
    },
  }]);
  return result.mutateOperationResponses[0]?.adGroupCriterionResult?.resourceName;
}

export async function addNegativeKeywords(client, campaignResourceName, keywords) {
  const operations = keywords.map(kw => ({
    campaignCriterionOperation: {
      create: {
        campaign: campaignResourceName,
        negative: true,
        keyword: {
          text: kw.text,
          matchType: kw.matchType || 'BROAD',
        },
      },
    },
  }));
  const result = await mutate(client, operations);
  return result.mutateOperationResponses.map(r => r.campaignCriterionResult?.resourceName);
}

// ─── Ad Operations ────────────────────────────────────────────────

export async function createResponsiveSearchAd(client, { adGroupResourceName, headlines, descriptions, finalUrl }) {
  const result = await mutate(client, [{
    adGroupAdOperation: {
      create: {
        adGroup: adGroupResourceName,
        status: 'ENABLED',
        ad: {
          responsiveSearchAd: {
            headlines: headlines.map((text, i) => ({ text, pinnedField: i < 1 ? 'HEADLINE_1' : null })),
            descriptions: descriptions.map(text => ({ text })),
          },
          finalUrls: [finalUrl],
        },
      },
    },
  }]);
  return result.mutateOperationResponses[0]?.adGroupAdResult?.resourceName;
}

export async function setAdStatus(client, resourceName, status) {
  const result = await mutate(client, [{
    adGroupAdOperation: {
      update: { resourceName, status },
      updateMask: 'status',
    },
  }]);
  return result.mutateOperationResponses[0]?.adGroupAdResult?.resourceName;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/google-ads-write.js
git commit -m "feat: add Google Ads write operations (campaigns, ad groups, keywords, ads)"
```

---

## Task 5: OAuth Flow + Account Connection API

**Files:**
- Create: `app/api/auth/google-ads/route.js`
- Create: `app/api/auth/google-ads/callback/route.js`

- [ ] **Step 1: Create `app/api/auth/google-ads/route.js`**

This generates the OAuth authorization URL. The user is redirected here when they click "Connect Google Ads Account".

```javascript
import { NextResponse } from 'next/server';
import { buildOAuthUrl } from '@/lib/google-ads-auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || crypto.randomUUID();

  const url = buildOAuthUrl(state);
  return NextResponse.redirect(url);
}
```

- [ ] **Step 2: Create `app/api/auth/google-ads/callback/route.js`**

This handles the redirect from Google after the user authorizes. It exchanges the code, fetches the account name, creates the DB record, and redirects to the new account page.

```javascript
import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, ADS_API_BASE, buildHeaders, refreshAccessToken } from '@/lib/google-ads-auth';
import { createAccount } from '@/lib/supabase';

// Fetch the accessible Google Ads customer accounts for this token.
async function fetchAccessibleAccounts(accessToken) {
  const res = await fetch(`${ADS_API_BASE}/customers:listAccessibleCustomers`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.resourceNames || [];
}

// Fetch the name and basic info for a customer resource.
async function fetchCustomerInfo(accessToken, customerId) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    'Content-Type': 'application/json',
  };
  const res = await fetch(
    `${ADS_API_BASE}/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: 'SELECT customer.descriptive_name, customer.id FROM customer LIMIT 1' }),
    }
  );
  if (!res.ok) return null;
  const text = await res.text();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '[' || trimmed === ']') continue;
    try {
      const parsed = JSON.parse(trimmed.replace(/^,/, ''));
      if (parsed.results?.[0]) return parsed.results[0].customer;
    } catch (_) {}
  }
  return null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/accounts?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/accounts?error=no_code`
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      throw new Error('No refresh token received. Make sure access_type=offline and prompt=consent.');
    }

    // Find the first accessible customer account
    const resourceNames = await fetchAccessibleAccounts(accessToken);
    const firstId = resourceNames[0]?.replace('customers/', '');

    let accountName = 'Google Ads Account';
    let customerId = firstId || 'unknown';

    if (firstId) {
      const info = await fetchCustomerInfo(accessToken, firstId);
      if (info) {
        accountName = info.descriptiveName || accountName;
        customerId = String(info.id);
      }
    }

    const account = await createAccount({
      name: accountName,
      google_customer_id: customerId,
      google_refresh_token: refreshToken,
      status: 'active',
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/accounts/${account.id}?connected=true`
    );
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/accounts?error=${encodeURIComponent(err.message)}`
    );
  }
}
```

- [ ] **Step 3: Create accounts API route `app/api/accounts/route.js`**

```javascript
import { NextResponse } from 'next/server';
import { getAccounts, createAccount } from '@/lib/supabase';

export async function GET() {
  try {
    const accounts = await getAccounts();
    return NextResponse.json(accounts);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const account = await createAccount(body);
    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create `app/api/accounts/[id]/route.js`**

```javascript
import { NextResponse } from 'next/server';
import { getAccount, updateAccount, deleteAccount } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const account = await getAccount(params.id);
    if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(account);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const account = await updateAccount(params.id, body);
    return NextResponse.json(account);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await deleteAccount(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 5: Create `app/api/accounts/[id]/sync/route.js`**

```javascript
import { NextResponse } from 'next/server';
import { getAccountClient } from '@/lib/google-ads-auth';
import { fetchCampaigns, fetchAdGroups, fetchKeywords, fetchCampaignMetrics } from '@/lib/google-ads-query';
import { saveSnapshot, updateAccount } from '@/lib/supabase';

export async function POST(request, { params }) {
  try {
    const client = await getAccountClient(params.id);

    const [campaigns, adGroups, keywords, metrics] = await Promise.all([
      fetchCampaigns(client),
      fetchAdGroups(client),
      fetchKeywords(client),
      fetchCampaignMetrics(client),
    ]);

    const snapshotData = { campaigns, adGroups, keywords };
    const metricsData = { campaigns: metrics };

    await saveSnapshot(params.id, snapshotData, metricsData);
    await updateAccount(params.id, { last_synced_at: new Date().toISOString() });

    return NextResponse.json({
      campaigns: campaigns.length,
      adGroups: adGroups.length,
      keywords: keywords.length,
    });
  } catch (err) {
    console.error('Sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 6: Create `app/api/accounts/[id]/metrics/route.js`**

```javascript
import { NextResponse } from 'next/server';
import { getAccountClient } from '@/lib/google-ads-auth';
import { fetchAccountMetrics, fetchCampaignMetrics } from '@/lib/google-ads-query';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('range') || 'LAST_30_DAYS';

    const client = await getAccountClient(params.id);
    const [account, campaigns] = await Promise.all([
      fetchAccountMetrics(client, dateRange),
      fetchCampaignMetrics(client, dateRange),
    ]);

    return NextResponse.json({ account, campaigns });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 7: Create `app/api/accounts/[id]/actions/route.js`**

```javascript
import { NextResponse } from 'next/server';
import { getAgentActions } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;
    const agentType = searchParams.get('type') || undefined;

    const actions = await getAgentActions(params.id, { limit, offset, agentType });
    return NextResponse.json(actions);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 8: Create `app/api/accounts/[id]/actions/[actionId]/undo/route.js`**

```javascript
import { NextResponse } from 'next/server';
import { getAgentAction, markActionUndone } from '@/lib/supabase';
import { getAccountClient } from '@/lib/google-ads-auth';
import { updateKeywordBid, setKeywordStatus, updateCampaignBudget, setCampaignStatus } from '@/lib/google-ads-write';

export async function POST(request, { params }) {
  try {
    const action = await getAgentAction(params.actionId);
    if (!action) return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    if (action.status === 'undone') return NextResponse.json({ error: 'Already undone' }, { status: 400 });
    if (!action.before_state) return NextResponse.json({ error: 'No before state to restore' }, { status: 400 });

    const client = await getAccountClient(params.id);
    const resourceName = action.entity_resource_name;
    const before = action.before_state;

    // Restore based on entity type
    if (action.entity_type === 'keyword') {
      if (before.status) await setKeywordStatus(client, resourceName, before.status);
      if (before.cpcBidMicros) await updateKeywordBid(client, resourceName, before.cpcBidMicros);
    } else if (action.entity_type === 'campaign') {
      if (before.status) await setCampaignStatus(client, resourceName, before.status);
    } else if (action.entity_type === 'budget') {
      if (before.amountMicros) await updateCampaignBudget(client, resourceName, before.amountMicros);
    }

    await markActionUndone(params.actionId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Undo error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add app/api/auth/ app/api/accounts/
git commit -m "feat: OAuth flow + account CRUD + sync + metrics + undo API routes"
```

---

## Task 6: Agent Prompts

**Files:**
- Modify: `lib/prompts.js`

- [ ] **Step 1: Append agent prompts to `lib/prompts.js`**

```javascript
// ─── Agent Prompts ────────────────────────────────────────────────

export function brandIdentityPrompt(url, websiteContent) {
  return `You are a brand strategist. Analyze this website and extract brand identity.

URL: ${url}
CONTENT SAMPLE: ${websiteContent?.slice(0, 2000) || '(not available)'}

Return ONLY valid JSON:
{
  "brand_name": "string",
  "industry": "string",
  "tone_of_voice": "string (e.g., 'professional and trustworthy', 'friendly and approachable')",
  "key_terminology": ["string (industry-specific words they use)"],
  "target_audience": "string (who they serve)",
  "usps": ["string (unique selling points)"],
  "messaging_pillars": ["string (core themes: reliability, speed, price, quality, etc.)"],
  "color_sentiment": "string (inferred from site — e.g., 'blue/professional, orange/energetic')",
  "services": ["string"]
}`;
}

export function accountAuditPrompt(campaigns, adGroups, keywords, ads, metrics) {
  return `You are a senior Google Ads auditor. Analyze this account and identify all issues and opportunities.

CAMPAIGNS: ${JSON.stringify(campaigns?.slice(0, 20))}
AD GROUPS: ${JSON.stringify(adGroups?.slice(0, 30))}
KEYWORDS (sample): ${JSON.stringify(keywords?.slice(0, 50))}
CAMPAIGN METRICS: ${JSON.stringify(metrics)}

Return ONLY valid JSON:
{
  "health_score": number (0-100),
  "issues": [
    {
      "category": "string (structure | keywords | ads | bidding | budget)",
      "severity": "critical | warning | suggestion",
      "issue": "string (specific problem)",
      "recommendation": "string (specific fix)"
    }
  ],
  "wasted_spend_estimate": number (monthly dollars estimated wasting),
  "quick_wins": ["string (things that can be fixed immediately for high impact)"],
  "strengths": ["string (what is working well)"],
  "summary": "string (3-4 sentence overall assessment)"
}`;
}

export function keywordOptimizationPrompt(keywords, searchTerms, metrics, brandProfile) {
  return `You are a Google Ads keyword optimizer. Analyze keyword performance and recommend changes.

KEYWORDS WITH METRICS: ${JSON.stringify(keywords?.slice(0, 100))}
SEARCH TERMS REPORT: ${JSON.stringify(searchTerms?.slice(0, 100))}
BRAND PROFILE: ${JSON.stringify(brandProfile)}

Rules:
- Pause keywords with cost > $30 and 0 conversions in 30 days
- Add high-performing search terms (>5 clicks, cost/click < $15) as exact match keywords
- Flag broad match keywords with high spend for match type review

Return ONLY valid JSON:
{
  "pause": [
    {
      "resource_name": "string",
      "keyword": "string",
      "reason": "string",
      "cost_wasted": number
    }
  ],
  "add": [
    {
      "text": "string",
      "match_type": "EXACT | PHRASE",
      "ad_group_resource": "string",
      "ad_group_name": "string",
      "reason": "string"
    }
  ],
  "summary": "string"
}`;
}

export function bidOptimizationPrompt(keywords, goals) {
  return `You are a Google Ads bid strategist. Recommend bid adjustments based on performance.

KEYWORDS WITH METRICS: ${JSON.stringify(keywords?.slice(0, 100))}
GOALS: ${JSON.stringify(goals || { target_cpa: null, maximize: 'conversions' })}

Rules:
- Increase bids by up to 20% on keywords with conversion rate > 3% and cost below target CPA
- Decrease bids by up to 20% on keywords with 0 conversions and cost > $20
- Never adjust bids more than 20% in a single run

Return ONLY valid JSON:
{
  "adjustments": [
    {
      "resource_name": "string",
      "keyword": "string",
      "current_bid_micros": number,
      "new_bid_micros": number,
      "reason": "string"
    }
  ],
  "summary": "string"
}`;
}

export function budgetOptimizationPrompt(campaigns, metrics) {
  return `You are a Google Ads budget allocator. Recommend budget reallocation across campaigns.

CAMPAIGNS WITH METRICS: ${JSON.stringify(metrics)}
CURRENT BUDGETS: ${JSON.stringify(campaigns?.map(c => ({ name: c.name, budgetAmountMicros: c.budgetAmountMicros, budgetResource: c.budgetResource })))}

Rules:
- Shift budget from campaigns with CPA > 2x average to campaigns performing below average CPA
- Never change any campaign budget by more than 15% in one run
- Only recommend changes if there's a meaningful performance gap

Return ONLY valid JSON:
{
  "reallocations": [
    {
      "campaign_name": "string",
      "budget_resource": "string",
      "current_amount_micros": number,
      "new_amount_micros": number,
      "reason": "string"
    }
  ],
  "summary": "string"
}`;
}

export function adCopyOptimizationPrompt(adGroup, keywords, brandProfile, existingAds) {
  return `You are a Google Ads copywriter. Generate new RSA ad variants for this ad group.

AD GROUP: ${adGroup.name}
KEYWORDS: ${JSON.stringify(keywords?.slice(0, 10)?.map(k => k.keyword))}
BRAND PROFILE: ${JSON.stringify(brandProfile)}
EXISTING ADS: ${JSON.stringify(existingAds?.slice(0, 3))}

Character limits are HARD: headlines max 30 chars, descriptions max 90 chars.

Return ONLY valid JSON:
{
  "headlines": ["string (max 30 chars each — 10 variants)"],
  "descriptions": ["string (max 90 chars each — 4 variants)"],
  "rationale": "string"
}`;
}

export function negativeKeywordPrompt(searchTerms, existingNegatives, brandProfile) {
  return `You are a Google Ads negative keyword specialist. Identify search terms that are wasting budget.

SEARCH TERMS (with spend): ${JSON.stringify(searchTerms?.slice(0, 100))}
EXISTING NEGATIVES: ${JSON.stringify(existingNegatives?.slice(0, 50))}
BUSINESS CONTEXT: ${JSON.stringify(brandProfile)}

Identify irrelevant search terms: jobs/careers, DIY/how-to with no buying intent, wrong industry, free/cheap with no commercial intent, competitor brand names.

Return ONLY valid JSON:
{
  "negatives": [
    {
      "keyword": "string",
      "match_type": "EXACT | PHRASE | BROAD",
      "reason": "string",
      "wasted_spend": number,
      "search_term": "string (the triggering search term)"
    }
  ],
  "summary": "string"
}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/prompts.js
git commit -m "feat: add 7 AI agent prompts (brand, audit, keyword, bid, budget, ad copy, negative)"
```

---

## Task 7: AI Agent Infrastructure

**Files:**
- Create: `lib/agents/base.js`
- Create: `lib/agents/index.js`

- [ ] **Step 1: Create `lib/agents/base.js`**

```javascript
/**
 * Base agent class implementing the observe → analyze → execute → log pattern.
 * All agents extend this class and implement observe(), analyze(), and execute().
 */

import { createAgentRun, updateAgentRun, createAgentAction } from '../supabase.js';
import { getAccountClient } from '../google-ads-auth.js';
import { callGemini, parseGeminiJSON } from '../gemini.js';

export class BaseAgent {
  /**
   * @param {string} accountId — Supabase UUID
   * @param {string} agentType — 'audit' | 'keyword' | 'bid' | 'budget' | 'ad_copy' | 'negative'
   * @param {string} trigger — 'scheduled' | 'manual' | 'initial'
   */
  constructor(accountId, agentType, trigger = 'scheduled') {
    this.accountId = accountId;
    this.agentType = agentType;
    this.trigger = trigger;
    this.run = null;
    this.client = null;
    this.actions = [];
  }

  async run() {
    this.run = await createAgentRun({
      account_id: this.accountId,
      agent_type: this.agentType,
      trigger: this.trigger,
      status: 'running',
    });

    try {
      this.client = await getAccountClient(this.accountId);
      const data = await this.observe();
      const decisions = await this.analyze(data);
      await this.execute(decisions);

      await updateAgentRun(this.run.id, {
        status: 'completed',
        actions_taken: this.actions.length,
        summary: this.buildSummary(),
        completed_at: new Date().toISOString(),
      });

      return { success: true, actionsCount: this.actions.length, summary: this.buildSummary() };
    } catch (err) {
      console.error(`[${this.agentType}] Agent failed:`, err);
      await updateAgentRun(this.run.id, {
        status: 'failed',
        error: err.message,
        completed_at: new Date().toISOString(),
      });
      throw err;
    }
  }

  /** Subclasses must implement: fetch current state from Google Ads */
  async observe() {
    throw new Error(`${this.agentType} must implement observe()`);
  }

  /** Subclasses must implement: send data to Gemini, get decisions */
  async analyze(data) {
    throw new Error(`${this.agentType} must implement analyze()`);
  }

  /** Subclasses must implement: apply decisions via Google Ads API */
  async execute(decisions) {
    throw new Error(`${this.agentType} must implement execute()`);
  }

  /** Record a change in agent_actions */
  async logAction({ actionType, entityType, entityResourceName, description, beforeState, afterState, reasoning }) {
    const action = await createAgentAction({
      account_id: this.accountId,
      run_id: this.run.id,
      agent_type: this.agentType,
      action_type: actionType,
      entity_type: entityType,
      entity_resource_name: entityResourceName,
      description,
      before_state: beforeState,
      after_state: afterState,
      reasoning,
      status: 'applied',
    });
    this.actions.push(action);
    return action;
  }

  /** Call Gemini with a prompt, return parsed JSON */
  async callAI(prompt) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const raw = await callGemini(geminiKey, prompt, { temperature: 0.2, maxTokens: 8192 });
    return parseGeminiJSON(raw);
  }

  buildSummary() {
    const counts = {};
    for (const a of this.actions) {
      counts[a.action_type] = (counts[a.action_type] || 0) + 1;
    }
    return counts;
  }
}
```

- [ ] **Step 2: Create `lib/agents/index.js`**

```javascript
/**
 * Agent registry and dispatcher.
 * Import and run agents by type string.
 */

import { AuditAgent } from './audit.js';
import { KeywordAgent } from './keyword.js';
import { BidAgent } from './bid.js';
import { BudgetAgent } from './budget.js';
import { AdCopyAgent } from './ad-copy.js';
import { NegativeAgent } from './negative.js';

const AGENTS = {
  audit: AuditAgent,
  keyword: KeywordAgent,
  bid: BidAgent,
  budget: BudgetAgent,
  ad_copy: AdCopyAgent,
  negative: NegativeAgent,
};

export const AGENT_TYPES = Object.keys(AGENTS);

/**
 * Run an agent for an account.
 * @param {string} type — one of AGENT_TYPES
 * @param {string} accountId
 * @param {string} trigger — 'scheduled' | 'manual' | 'initial'
 */
export async function runAgent(type, accountId, trigger = 'scheduled') {
  const AgentClass = AGENTS[type];
  if (!AgentClass) throw new Error(`Unknown agent type: ${type}. Valid: ${AGENT_TYPES.join(', ')}`);

  const agent = new AgentClass(accountId, type, trigger);
  return agent.run();
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/agents/base.js lib/agents/index.js
git commit -m "feat: add base agent class and agent registry"
```

---

## Task 8: Individual AI Agents

**Files:**
- Create: `lib/agents/audit.js`
- Create: `lib/agents/keyword.js`
- Create: `lib/agents/bid.js`
- Create: `lib/agents/budget.js`
- Create: `lib/agents/ad-copy.js`
- Create: `lib/agents/negative.js`
- Create: `lib/agents/brand.js`

- [ ] **Step 1: Create `lib/agents/audit.js`**

```javascript
import { BaseAgent } from './base.js';
import { fetchCampaigns, fetchAdGroups, fetchKeywords, fetchAds, fetchCampaignMetrics } from '../google-ads-query.js';
import { accountAuditPrompt } from '../prompts.js';
import { updateAccount } from '../supabase.js';

export class AuditAgent extends BaseAgent {
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

  async analyze(data) {
    const prompt = accountAuditPrompt(data.campaigns, data.adGroups, data.keywords, data.ads, data.metrics);
    return this.callAI(prompt);
  }

  async execute(decisions) {
    // Audit doesn't make changes — it writes the report to the account record
    await updateAccount(this.accountId, {
      audit_data: {
        ...decisions,
        audited_at: new Date().toISOString(),
      },
    });

    await this.logAction({
      actionType: 'audit',
      entityType: 'account',
      entityResourceName: null,
      description: `Account audit completed — health score: ${decisions.health_score}/100. Issues found: ${decisions.issues?.length || 0}`,
      beforeState: null,
      afterState: { health_score: decisions.health_score, issues_count: decisions.issues?.length },
      reasoning: decisions.summary,
    });
  }
}
```

- [ ] **Step 2: Create `lib/agents/keyword.js`**

```javascript
import { BaseAgent } from './base.js';
import { fetchKeywordMetrics, fetchSearchTerms } from '../google-ads-query.js';
import { setKeywordStatus, addKeywords } from '../google-ads-write.js';
import { keywordOptimizationPrompt } from '../prompts.js';
import { getAccount } from '../supabase.js';

export class KeywordAgent extends BaseAgent {
  async observe() {
    const [keywords, searchTerms] = await Promise.all([
      fetchKeywordMetrics(this.client, 'LAST_30_DAYS'),
      fetchSearchTerms(this.client, 'LAST_30_DAYS'),
    ]);
    return { keywords, searchTerms };
  }

  async analyze(data) {
    const account = await getAccount(this.accountId);
    const prompt = keywordOptimizationPrompt(data.keywords, data.searchTerms, [], account.brand_profile);
    return this.callAI(prompt);
  }

  async execute(decisions) {
    // Pause underperforming keywords
    for (const item of decisions.pause || []) {
      await setKeywordStatus(this.client, item.resource_name, 'PAUSED');
      await this.logAction({
        actionType: 'update',
        entityType: 'keyword',
        entityResourceName: item.resource_name,
        description: `Paused keyword "${item.keyword}" — ${item.reason}`,
        beforeState: { status: 'ENABLED' },
        afterState: { status: 'PAUSED' },
        reasoning: item.reason,
      });
    }

    // Add high-performing search terms as keywords
    const addsByAdGroup = {};
    for (const item of decisions.add || []) {
      if (!addsByAdGroup[item.ad_group_resource]) addsByAdGroup[item.ad_group_resource] = [];
      addsByAdGroup[item.ad_group_resource].push({ text: item.text, matchType: item.match_type });
    }

    for (const [adGroupResource, kwList] of Object.entries(addsByAdGroup)) {
      await addKeywords(this.client, adGroupResource, kwList);
      for (const kw of kwList) {
        const item = decisions.add.find(a => a.text === kw.text);
        await this.logAction({
          actionType: 'create',
          entityType: 'keyword',
          entityResourceName: adGroupResource,
          description: `Added keyword "${kw.text}" [${kw.matchType}] — ${item?.reason || ''}`,
          beforeState: null,
          afterState: { keyword: kw.text, matchType: kw.matchType },
          reasoning: item?.reason,
        });
      }
    }
  }
}
```

- [ ] **Step 3: Create `lib/agents/bid.js`**

```javascript
import { BaseAgent } from './base.js';
import { fetchKeywordMetrics } from '../google-ads-query.js';
import { updateKeywordBid } from '../google-ads-write.js';
import { bidOptimizationPrompt } from '../prompts.js';
import { getAccount } from '../supabase.js';

const MAX_BID_CHANGE = 0.20; // 20% cap

export class BidAgent extends BaseAgent {
  async observe() {
    const keywords = await fetchKeywordMetrics(this.client, 'LAST_30_DAYS');
    return { keywords };
  }

  async analyze(data) {
    const account = await getAccount(this.accountId);
    const goals = account.settings?.bid_goals || {};
    const prompt = bidOptimizationPrompt(data.keywords, goals);
    return this.callAI(prompt);
  }

  async execute(decisions) {
    for (const item of decisions.adjustments || []) {
      const currentMicros = item.current_bid_micros;
      const proposedMicros = item.new_bid_micros;

      // Enforce ±20% cap
      const maxMicros = Math.round(currentMicros * (1 + MAX_BID_CHANGE));
      const minMicros = Math.round(currentMicros * (1 - MAX_BID_CHANGE));
      const clampedMicros = Math.max(minMicros, Math.min(maxMicros, proposedMicros));

      if (clampedMicros === currentMicros) continue;

      await updateKeywordBid(this.client, item.resource_name, clampedMicros);
      await this.logAction({
        actionType: 'update',
        entityType: 'keyword',
        entityResourceName: item.resource_name,
        description: `Adjusted bid for "${item.keyword}" from $${(currentMicros/1e6).toFixed(2)} to $${(clampedMicros/1e6).toFixed(2)}`,
        beforeState: { cpcBidMicros: currentMicros },
        afterState: { cpcBidMicros: clampedMicros },
        reasoning: item.reason,
      });
    }
  }
}
```

- [ ] **Step 4: Create `lib/agents/budget.js`**

```javascript
import { BaseAgent } from './base.js';
import { fetchCampaigns, fetchCampaignMetrics } from '../google-ads-query.js';
import { updateCampaignBudget } from '../google-ads-write.js';
import { budgetOptimizationPrompt } from '../prompts.js';

const MAX_BUDGET_CHANGE = 0.15; // 15% cap

export class BudgetAgent extends BaseAgent {
  async observe() {
    const [campaigns, metrics] = await Promise.all([
      fetchCampaigns(this.client),
      fetchCampaignMetrics(this.client, 'LAST_30_DAYS'),
    ]);
    return { campaigns, metrics };
  }

  async analyze(data) {
    const prompt = budgetOptimizationPrompt(data.campaigns, data.metrics);
    return this.callAI(prompt);
  }

  async execute(decisions) {
    for (const item of decisions.reallocations || []) {
      const currentMicros = item.current_amount_micros;
      const proposedMicros = item.new_amount_micros;

      const maxMicros = Math.round(currentMicros * (1 + MAX_BUDGET_CHANGE));
      const minMicros = Math.round(currentMicros * (1 - MAX_BUDGET_CHANGE));
      const clampedMicros = Math.max(minMicros, Math.min(maxMicros, proposedMicros));

      if (clampedMicros === currentMicros) continue;

      await updateCampaignBudget(this.client, item.budget_resource, clampedMicros);
      await this.logAction({
        actionType: 'update',
        entityType: 'budget',
        entityResourceName: item.budget_resource,
        description: `Budget for "${item.campaign_name}" changed from $${(currentMicros/1e6).toFixed(2)}/day to $${(clampedMicros/1e6).toFixed(2)}/day`,
        beforeState: { amountMicros: currentMicros },
        afterState: { amountMicros: clampedMicros },
        reasoning: item.reason,
      });
    }
  }
}
```

- [ ] **Step 5: Create `lib/agents/ad-copy.js`**

```javascript
import { BaseAgent } from './base.js';
import { fetchAdGroups, fetchKeywords, fetchAds } from '../google-ads-query.js';
import { createResponsiveSearchAd } from '../google-ads-write.js';
import { adCopyOptimizationPrompt } from '../prompts.js';
import { getAccount } from '../supabase.js';

export class AdCopyAgent extends BaseAgent {
  async observe() {
    const [adGroups, keywords, ads] = await Promise.all([
      fetchAdGroups(this.client),
      fetchKeywords(this.client),
      fetchAds(this.client),
    ]);
    return { adGroups, keywords, ads };
  }

  async analyze(data) {
    const account = await getAccount(this.accountId);
    const brandProfile = account.brand_profile;

    // Process one ad group at a time to avoid token limits
    const results = [];
    for (const adGroup of data.adGroups.slice(0, 5)) { // limit to 5 per run
      const groupKeywords = data.keywords.filter(k => k.adGroupId === adGroup.id);
      const groupAds = data.ads.filter(a => a.adGroupId === adGroup.id);
      const prompt = adCopyOptimizationPrompt(adGroup, groupKeywords, brandProfile, groupAds);
      const decision = await this.callAI(prompt);
      results.push({ adGroup, decision });
    }
    return results;
  }

  async execute(results) {
    for (const { adGroup, decision } of results) {
      const headlines = decision.headlines?.slice(0, 15) || [];
      const descriptions = decision.descriptions?.slice(0, 4) || [];

      if (headlines.length < 3 || descriptions.length < 2) continue;

      const account = await getAccount(this.accountId);
      const finalUrl = account.brand_profile?.website || '';

      const resourceName = await createResponsiveSearchAd(this.client, {
        adGroupResourceName: adGroup.resourceName,
        headlines: headlines.slice(0, 3),
        descriptions: descriptions.slice(0, 2),
        finalUrl,
      });

      await this.logAction({
        actionType: 'create',
        entityType: 'ad',
        entityResourceName: resourceName,
        description: `Created new RSA in "${adGroup.name}" with ${headlines.length} headlines`,
        beforeState: null,
        afterState: { headlines: headlines.slice(0, 3), descriptions: descriptions.slice(0, 2) },
        reasoning: decision.rationale,
      });
    }
  }
}
```

- [ ] **Step 6: Create `lib/agents/negative.js`**

```javascript
import { BaseAgent } from './base.js';
import { fetchSearchTerms, fetchCampaigns } from '../google-ads-query.js';
import { addNegativeKeywords } from '../google-ads-write.js';
import { negativeKeywordPrompt } from '../prompts.js';
import { getAccount } from '../supabase.js';

export class NegativeAgent extends BaseAgent {
  async observe() {
    const [searchTerms, campaigns] = await Promise.all([
      fetchSearchTerms(this.client, 'LAST_30_DAYS'),
      fetchCampaigns(this.client),
    ]);
    return { searchTerms, campaigns };
  }

  async analyze(data) {
    const account = await getAccount(this.accountId);
    const prompt = negativeKeywordPrompt(data.searchTerms, [], account.brand_profile);
    return this.callAI(prompt);
  }

  async execute(decisions) {
    if (!decisions.negatives?.length) return;

    // Group by campaign — add at campaign level
    const data = await this.observe();
    for (const campaign of data.campaigns.slice(0, 10)) {
      const negatives = decisions.negatives.map(n => ({
        text: n.keyword,
        matchType: n.match_type || 'EXACT',
      }));

      await addNegativeKeywords(this.client, campaign.resourceName, negatives.slice(0, 20));

      for (const item of decisions.negatives.slice(0, 20)) {
        await this.logAction({
          actionType: 'create',
          entityType: 'negative_keyword',
          entityResourceName: campaign.resourceName,
          description: `Added negative "${item.keyword}" to "${campaign.name}" — triggered by "${item.search_term}"`,
          beforeState: null,
          afterState: { keyword: item.keyword, matchType: item.match_type },
          reasoning: item.reason,
        });
      }
    }
  }
}
```

- [ ] **Step 7: Create `lib/agents/brand.js`**

This is a standalone function (not an agent subclass) since it's used by Brand Lab, not the agent scheduler.

```javascript
/**
 * Brand identity extraction — analyzes a website URL and returns a brand profile.
 * Used by /api/brand-lab and can be triggered from the account settings.
 */

import { callGemini, parseGeminiJSON } from '../gemini.js';
import { brandIdentityPrompt } from '../prompts.js';

export async function extractBrandIdentity(url) {
  // Attempt to fetch website content for richer analysis
  let websiteContent = '';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PPCRecon/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const html = await res.text();
      // Extract text content roughly
      websiteContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000);
    }
  } catch (_) {
    // Fetch failed — proceed with URL only
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const prompt = brandIdentityPrompt(url, websiteContent);
  const raw = await callGemini(geminiKey, prompt, { temperature: 0.2, maxTokens: 4096 });
  return parseGeminiJSON(raw);
}
```

- [ ] **Step 8: Commit**

```bash
git add lib/agents/
git commit -m "feat: add all 6 AI agents (audit, keyword, bid, budget, ad-copy, negative) + brand extractor"
```

---

## Task 9: Agent API Routes + Brand Lab API

**Files:**
- Create: `app/api/agents/run/route.js`
- Create: `app/api/agents/[type]/route.js`
- Create: `app/api/brand-lab/route.js`

- [ ] **Step 1: Create `app/api/agents/run/route.js`** (Vercel cron endpoint)

```javascript
import { NextResponse } from 'next/server';
import { getAccounts } from '@/lib/supabase';
import { runAgent, AGENT_TYPES } from '@/lib/agents/index';

// Called by Vercel cron: POST /api/agents/run
// Body: { agent_type: 'keyword' } or omit to run all scheduled agents
export async function POST(request) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const agentType = body.agent_type;

    const accounts = await getAccounts();
    const activeAccounts = accounts.filter(a => a.status === 'active');

    const results = [];
    for (const account of activeAccounts) {
      const types = agentType ? [agentType] : AGENT_TYPES.filter(t => t !== 'audit');
      for (const type of types) {
        try {
          const result = await runAgent(type, account.id, 'scheduled');
          results.push({ accountId: account.id, agentType: type, ...result });
        } catch (err) {
          results.push({ accountId: account.id, agentType: type, success: false, error: err.message });
        }
      }
    }

    return NextResponse.json({ results, accountsProcessed: activeAccounts.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `app/api/agents/[type]/route.js`** (manual trigger for one account)

```javascript
import { NextResponse } from 'next/server';
import { runAgent, AGENT_TYPES } from '@/lib/agents/index';

export async function POST(request, { params }) {
  try {
    const { type } = params;
    if (!AGENT_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid agent type. Valid: ${AGENT_TYPES.join(', ')}` }, { status: 400 });
    }

    const body = await request.json();
    const { accountId } = body;
    if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

    const result = await runAgent(type, accountId, 'manual');
    return NextResponse.json(result);
  } catch (err) {
    console.error('Agent run error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create `app/api/brand-lab/route.js`**

```javascript
import { NextResponse } from 'next/server';
import { extractBrandIdentity } from '@/lib/agents/brand';
import { updateAccount } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { url, accountId } = await request.json();
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

    const brandProfile = await extractBrandIdentity(url);

    // Optionally save to account
    if (accountId) {
      await updateAccount(accountId, {
        brand_profile: { ...brandProfile, url, generated_at: new Date().toISOString() },
      });
    }

    return NextResponse.json(brandProfile);
  } catch (err) {
    console.error('Brand lab error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Add `vercel.json` cron config**

Open `vercel.json` (or create it) and add/merge:

```json
{
  "crons": [
    {
      "path": "/api/agents/run",
      "schedule": "0 8 * * *"
    }
  ]
}
```

(Runs daily at 8 AM UTC. Adjust as needed.)

- [ ] **Step 5: Commit**

```bash
git add app/api/agents/ app/api/brand-lab/ vercel.json
git commit -m "feat: add agent trigger routes (cron + manual) and brand lab API"
```

---

## Task 10: Accounts List Page

**Files:**
- Create: `app/accounts/page.js`

- [ ] **Step 1: Create `app/accounts/page.js`**

```javascript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.json())
      .then(data => { setAccounts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">Google Ads Accounts</h1>
          <p className="text-secondary text-sm mt-1">Connect and manage your Google Ads accounts</p>
        </div>
        <a
          href="/api/auth/google-ads"
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Connect Google Ads Account
        </a>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <span className="font-semibold">Connection failed:</span> {decodeURIComponent(error)}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-40 bg-surface-high rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && accounts.length === 0 && (
        <div className="text-center py-24 text-secondary">
          <span className="material-symbols-outlined text-[64px] block mb-4 opacity-30">account_balance</span>
          <p className="text-lg font-medium mb-2">No accounts connected</p>
          <p className="text-sm mb-6">Connect your first Google Ads account to get started</p>
          <a
            href="/api/auth/google-ads"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Connect Account
          </a>
        </div>
      )}

      {/* Account grid */}
      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(account => (
            <Link
              key={account.id}
              href={`/accounts/${account.id}`}
              className="block p-5 bg-white border border-outline-variant/20 rounded-xl hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-on-surface">{account.name}</h3>
                  <p className="text-xs text-secondary mt-0.5">ID: {account.google_customer_id}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  account.status === 'active' ? 'bg-green-100 text-green-700' :
                  account.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {account.status}
                </span>
              </div>
              <div className="text-xs text-secondary">
                {account.last_synced_at
                  ? `Last synced: ${new Date(account.last_synced_at).toLocaleDateString()}`
                  : 'Never synced'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/accounts/page.js
git commit -m "feat: add accounts list page with connect button"
```

---

## Task 11: Account Detail Page (Tabbed)

**Files:**
- Create: `app/accounts/[id]/page.js`

- [ ] **Step 1: Create `app/accounts/[id]/page.js`**

This is the main management hub. It's large — build it in a single file with inline tab components.

```javascript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'campaigns', label: 'Campaigns', icon: 'campaign' },
  { id: 'keywords', label: 'Keywords', icon: 'key' },
  { id: 'changelog', label: 'Change Log', icon: 'history' },
  { id: 'audit', label: 'Audit', icon: 'fact_check' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-outline-variant/20 rounded-xl p-4">
      <p className="text-xs text-secondary font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-on-surface mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}

function OverviewTab({ account, metrics, actions }) {
  const m = metrics?.account;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Impressions" value={m?.impressions?.toLocaleString()} />
        <StatCard label="Clicks" value={m?.clicks?.toLocaleString()} />
        <StatCard label="CTR" value={m?.ctr ? `${(m.ctr * 100).toFixed(2)}%` : '—'} />
        <StatCard label="Cost" value={m?.cost ? `$${m.cost.toFixed(2)}` : '—'} />
        <StatCard label="Conversions" value={m?.conversions?.toFixed(1)} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-on-surface mb-3">Recent Agent Activity</h3>
        {!actions?.length && <p className="text-sm text-secondary">No agent activity yet.</p>}
        <div className="space-y-2">
          {actions?.slice(0, 5).map(action => (
            <div key={action.id} className="flex items-start gap-3 p-3 bg-white border border-outline-variant/15 rounded-lg">
              <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">auto_awesome</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-on-surface">{action.description}</p>
                <p className="text-xs text-secondary mt-0.5">{new Date(action.created_at).toLocaleString()}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${action.status === 'applied' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                {action.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CampaignsTab({ accountId, snapshot, metrics }) {
  const [syncing, setSyncing] = useState(false);
  const campaigns = snapshot?.snapshot_data?.campaigns || [];
  const metricsMap = {};
  for (const m of (metrics?.campaigns || [])) {
    metricsMap[m.campaignId] = m;
  }

  const sync = async () => {
    setSyncing(true);
    await fetch(`/api/accounts/${accountId}/sync`, { method: 'POST' });
    setSyncing(false);
    window.location.reload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface">{campaigns.length} Campaigns</h3>
        <div className="flex gap-2">
          <button onClick={sync} disabled={syncing} className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant/30 rounded-lg text-xs text-secondary hover:bg-surface-high transition-colors disabled:opacity-50">
            <span className="material-symbols-outlined text-[14px]">{syncing ? 'sync' : 'refresh'}</span>
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
          <Link href={`/accounts/${accountId}/campaigns/new`} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-[14px]">add</span>
            New Campaign
          </Link>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <p className="text-sm text-secondary py-8 text-center">No campaigns synced yet. Click Sync to import.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15">
                <th className="text-left py-2 px-3 text-xs font-medium text-secondary">Campaign</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-secondary">Status</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-secondary">Budget/day</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-secondary">Clicks</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-secondary">Cost</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-secondary">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const m = metricsMap[c.id] || {};
                return (
                  <tr key={c.id} className="border-b border-outline-variant/10 hover:bg-surface-high/50">
                    <td className="py-2.5 px-3 font-medium text-on-surface">{c.name}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'ENABLED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-secondary">{c.budgetAmountMicros ? `$${(c.budgetAmountMicros/1e6).toFixed(2)}` : '—'}</td>
                    <td className="py-2.5 px-3 text-right">{m.clicks?.toLocaleString() || '—'}</td>
                    <td className="py-2.5 px-3 text-right">{m.cost ? `$${m.cost.toFixed(2)}` : '—'}</td>
                    <td className="py-2.5 px-3 text-right">{m.conversions?.toFixed(1) || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KeywordsTab({ snapshot }) {
  const keywords = snapshot?.snapshot_data?.keywords || [];
  const [sortBy, setSortBy] = useState('keyword');

  const sorted = [...keywords].sort((a, b) => {
    if (sortBy === 'keyword') return (a.keyword || '').localeCompare(b.keyword || '');
    return 0;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface">{keywords.length} Keywords</h3>
      </div>
      {keywords.length === 0 ? (
        <p className="text-sm text-secondary py-8 text-center">Sync campaigns first to see keywords.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15">
                <th className="text-left py-2 px-3 text-xs font-medium text-secondary">Keyword</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-secondary">Match</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-secondary">Status</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-secondary">Ad Group</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-secondary">Bid</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-secondary">QS</th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 200).map((kw, i) => (
                <tr key={i} className="border-b border-outline-variant/10 hover:bg-surface-high/50">
                  <td className="py-2 px-3 font-medium text-on-surface">{kw.keyword}</td>
                  <td className="py-2 px-3 text-secondary text-xs">{kw.matchType?.replace('_', ' ')}</td>
                  <td className="py-2 px-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${kw.status === 'ENABLED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {kw.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-secondary text-xs">{kw.adGroupName}</td>
                  <td className="py-2 px-3 text-right">{kw.cpcBidMicros ? `$${(kw.cpcBidMicros/1e6).toFixed(2)}` : '—'}</td>
                  <td className="py-2 px-3 text-right">{kw.qualityScore || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChangeLogTab({ accountId, actions, setActions }) {
  const [undoing, setUndoing] = useState(null);

  const undo = async (actionId) => {
    setUndoing(actionId);
    try {
      const res = await fetch(`/api/accounts/${accountId}/actions/${actionId}/undo`, { method: 'POST' });
      if (res.ok) {
        setActions(prev => prev.map(a => a.id === actionId ? { ...a, status: 'undone' } : a));
      }
    } finally {
      setUndoing(null);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-on-surface mb-4">All AI Actions</h3>
      {!actions?.length && <p className="text-sm text-secondary">No changes made yet.</p>}
      <div className="space-y-2">
        {actions?.map(action => (
          <div key={action.id} className="flex items-start gap-3 p-3 bg-white border border-outline-variant/15 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-on-surface">{action.description}</p>
              {action.reasoning && <p className="text-xs text-secondary mt-0.5 italic">{action.reasoning}</p>}
              <p className="text-xs text-secondary mt-1">{new Date(action.created_at).toLocaleString()} · {action.agent_type}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                action.status === 'applied' ? 'bg-blue-50 text-blue-600' :
                action.status === 'undone' ? 'bg-gray-100 text-gray-500' :
                'bg-red-50 text-red-600'
              }`}>
                {action.status}
              </span>
              {action.status === 'applied' && action.before_state && (
                <button
                  onClick={() => undo(action.id)}
                  disabled={undoing === action.id}
                  className="text-xs text-secondary hover:text-primary transition-colors disabled:opacity-50"
                >
                  {undoing === action.id ? 'Undoing...' : 'Undo'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditTab({ accountId, account }) {
  const [running, setRunning] = useState(false);
  const audit = account?.audit_data;

  const runAudit = async () => {
    setRunning(true);
    try {
      await fetch(`/api/agents/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      window.location.reload();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface">Account Audit</h3>
        <button
          onClick={runAudit}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <span className="material-symbols-outlined text-[14px]">play_arrow</span>
          {running ? 'Running...' : 'Run Audit'}
        </button>
      </div>

      {!audit && <p className="text-sm text-secondary py-8 text-center">No audit run yet. Click "Run Audit" to analyze this account.</p>}

      {audit && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-4xl font-bold ${audit.health_score >= 70 ? 'text-green-600' : audit.health_score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                {audit.health_score}
              </div>
              <div className="text-xs text-secondary">Health Score</div>
            </div>
            <p className="text-sm text-on-surface flex-1">{audit.summary}</p>
          </div>

          {audit.quick_wins?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Quick Wins</h4>
              <ul className="space-y-1">
                {audit.quick_wins.map((win, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                    <span className="material-symbols-outlined text-[14px] text-green-600 mt-0.5">check_circle</span>
                    {win}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {audit.issues?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Issues ({audit.issues.length})</h4>
              <div className="space-y-2">
                {audit.issues.map((issue, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${issue.severity === 'critical' ? 'bg-red-50 border-red-200' : issue.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                    <p className="text-sm font-medium text-on-surface">{issue.issue}</p>
                    <p className="text-xs text-secondary mt-0.5">{issue.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ accountId, account }) {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(account?.settings || {});

  const save = async () => {
    setSaving(true);
    await fetch(`/api/accounts/${accountId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    setSaving(false);
  };

  return (
    <div className="max-w-lg space-y-4">
      <h3 className="text-sm font-semibold text-on-surface">Agent Settings</h3>
      <p className="text-xs text-secondary">Control how agents behave for this account.</p>

      <div className="space-y-3">
        {['keyword', 'bid', 'budget', 'ad_copy', 'negative'].map(agent => (
          <label key={agent} className="flex items-center justify-between p-3 bg-white border border-outline-variant/20 rounded-lg cursor-pointer hover:bg-surface-high/50">
            <span className="text-sm font-medium capitalize text-on-surface">{agent.replace('_', ' ')} agent</span>
            <input
              type="checkbox"
              checked={settings[`${agent}_enabled`] !== false}
              onChange={e => setSettings(s => ({ ...s, [`${agent}_enabled`]: e.target.checked }))}
              className="w-4 h-4 text-primary"
            />
          </label>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

export default function AccountDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [account, setAccount] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const connected = searchParams.get('connected');

  const loadData = useCallback(async () => {
    try {
      const [accountRes, metricsRes, actionsRes, snapshotRes] = await Promise.all([
        fetch(`/api/accounts/${id}`).then(r => r.json()),
        fetch(`/api/accounts/${id}/metrics`).then(r => r.json()).catch(() => null),
        fetch(`/api/accounts/${id}/actions`).then(r => r.json()).catch(() => []),
        fetch(`/api/accounts/${id}/sync`).then(() => null).catch(() => null), // don't auto-sync
      ]);
      setAccount(accountRes);
      setMetrics(metricsRes);
      setActions(Array.isArray(actionsRes) ? actionsRes : []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load snapshot from the DB instead of auto-syncing
  useEffect(() => {
    fetch(`/api/accounts/${id}`)
      .then(r => r.json())
      .then(async (acc) => {
        setAccount(acc);
        // Load snapshot
        const snapRes = await fetch(`/api/accounts/${id}/snapshot`).catch(() => null);
        if (snapRes?.ok) setSnapshot(await snapRes.json());
        // Load metrics
        const metRes = await fetch(`/api/accounts/${id}/metrics`).catch(() => null);
        if (metRes?.ok) setMetrics(await metRes.json());
        // Load actions
        const actRes = await fetch(`/api/accounts/${id}/actions`).catch(() => null);
        if (actRes?.ok) setActions(await actRes.json());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-secondary text-sm">Loading account...</div>;
  if (!account || account.error) return <div className="p-8 text-red-600 text-sm">Account not found.</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-secondary mb-1">
            <Link href="/accounts" className="hover:text-primary">Accounts</Link>
            <span>/</span>
            <span>{account.name}</span>
          </div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">{account.name}</h1>
          <p className="text-xs text-secondary mt-1">Customer ID: {account.google_customer_id}</p>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${
          account.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {account.status}
        </span>
      </div>

      {connected && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Account connected successfully! Sync your campaigns to get started.
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-outline-variant/15 mb-6">
        <nav className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && <OverviewTab account={account} metrics={metrics} actions={actions} />}
        {activeTab === 'campaigns' && <CampaignsTab accountId={id} snapshot={snapshot} metrics={metrics} />}
        {activeTab === 'keywords' && <KeywordsTab snapshot={snapshot} />}
        {activeTab === 'changelog' && <ChangeLogTab accountId={id} actions={actions} setActions={setActions} />}
        {activeTab === 'audit' && <AuditTab accountId={id} account={account} />}
        {activeTab === 'settings' && <SettingsTab accountId={id} account={account} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add snapshot API route `app/api/accounts/[id]/snapshot/route.js`**

```javascript
import { NextResponse } from 'next/server';
import { getLatestSnapshot } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const snapshot = await getLatestSnapshot(params.id);
    if (!snapshot) return NextResponse.json(null);
    return NextResponse.json(snapshot);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/accounts/[id]/ app/api/accounts/
git commit -m "feat: add account detail page with Overview/Campaigns/Keywords/ChangeLog/Audit/Settings tabs"
```

---

## Task 12: Brand Lab Page

**Files:**
- Create: `app/brand-lab/page.js`

- [ ] **Step 1: Create `app/brand-lab/page.js`**

```javascript
'use client';

import { useState } from 'react';

export default function BrandLabPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    setProfile(null);
    try {
      const res = await fetch('/api/brand-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setProfile(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-headline font-bold text-on-surface">Brand Lab</h1>
        <p className="text-secondary text-sm mt-1">Analyze any website URL to generate a brand identity profile for AI-powered ad copy</p>
      </div>

      {/* URL input */}
      <div className="flex gap-3 mb-8">
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://example.com"
          onKeyDown={e => e.key === 'Enter' && generate()}
          className="flex-1 px-4 py-2.5 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <button
          onClick={generate}
          disabled={loading || !url}
          className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {loading && (
        <div className="py-16 text-center text-secondary text-sm">
          <div className="animate-spin material-symbols-outlined text-[32px] text-primary mb-3 block">refresh</div>
          Analyzing website...
        </div>
      )}

      {profile && (
        <div className="space-y-6">
          <div className="bg-white border border-outline-variant/20 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-on-surface mb-1">{profile.brand_name}</h2>
            <p className="text-xs text-secondary uppercase tracking-wide">{profile.industry}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-outline-variant/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Tone of Voice</h3>
              <p className="text-sm text-on-surface">{profile.tone_of_voice}</p>
            </div>
            <div className="bg-white border border-outline-variant/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Target Audience</h3>
              <p className="text-sm text-on-surface">{profile.target_audience}</p>
            </div>
          </div>

          <div className="bg-white border border-outline-variant/20 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Unique Selling Points</h3>
            <ul className="space-y-1">
              {profile.usps?.map((usp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-[14px] text-primary mt-0.5">check</span>
                  {usp}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-outline-variant/20 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Key Terminology</h3>
            <div className="flex flex-wrap gap-2">
              {profile.key_terminology?.map((term, i) => (
                <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">{term}</span>
              ))}
            </div>
          </div>

          <div className="bg-white border border-outline-variant/20 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Messaging Pillars</h3>
            <div className="flex flex-wrap gap-2">
              {profile.messaging_pillars?.map((pillar, i) => (
                <span key={i} className="px-2 py-1 bg-surface-high text-on-surface rounded text-xs">{pillar}</span>
              ))}
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
            <strong>Tip:</strong> Save this profile to an account via the account's Settings tab to enable brand-aware AI ad copy generation.
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/brand-lab/
git commit -m "feat: add Brand Lab page for website brand identity extraction"
```

---

## Task 13: Agent Dashboard Page

**Files:**
- Create: `app/agents/page.js`

- [ ] **Step 1: Create `app/agents/page.js`**

```javascript
'use client';

import { useState, useEffect } from 'react';
import { AGENT_TYPES } from '@/lib/agents/index';

const AGENT_INFO = {
  audit: { label: 'Account Audit', icon: 'fact_check', schedule: 'On demand', color: 'blue' },
  keyword: { label: 'Keyword Optimizer', icon: 'key', schedule: 'Weekly', color: 'purple' },
  bid: { label: 'Bid Manager', icon: 'trending_up', schedule: 'Daily', color: 'green' },
  budget: { label: 'Budget Allocator', icon: 'account_balance_wallet', schedule: 'Weekly', color: 'orange' },
  ad_copy: { label: 'Ad Copy Optimizer', icon: 'edit_note', schedule: 'Bi-weekly', color: 'pink' },
  negative: { label: 'Negative Keywords', icon: 'block', schedule: 'Weekly', color: 'red' },
};

export default function AgentsPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [running, setRunning] = useState(null);
  const [results, setResults] = useState({});

  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.json())
      .then(data => {
        const accs = Array.isArray(data) ? data.filter(a => a.status === 'active') : [];
        setAccounts(accs);
        if (accs.length > 0) setSelectedAccount(accs[0].id);
      });
  }, []);

  const runAgent = async (type) => {
    if (!selectedAccount) return;
    setRunning(type);
    setResults(r => ({ ...r, [type]: null }));
    try {
      const res = await fetch(`/api/agents/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccount }),
      });
      const data = await res.json();
      setResults(r => ({ ...r, [type]: { success: res.ok, ...data } }));
    } catch (err) {
      setResults(r => ({ ...r, [type]: { success: false, error: err.message } }));
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-headline font-bold text-on-surface">Agent Dashboard</h1>
        <p className="text-secondary text-sm mt-1">Monitor and manually trigger AI agents across your accounts</p>
      </div>

      {/* Account selector */}
      {accounts.length > 1 && (
        <div className="mb-6">
          <label className="text-xs text-secondary font-medium block mb-1">Account</label>
          <select
            value={selectedAccount}
            onChange={e => setSelectedAccount(e.target.value)}
            className="px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      {accounts.length === 0 && (
        <div className="text-center py-16 text-secondary text-sm">
          <p>No active accounts connected. <a href="/accounts" className="text-primary hover:underline">Connect an account</a> first.</p>
        </div>
      )}

      {/* Agent cards */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(AGENT_INFO).map(([type, info]) => {
            const result = results[type];
            const isRunning = running === type;
            return (
              <div key={type} className="bg-white border border-outline-variant/20 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[22px] text-primary">{info.icon}</span>
                    <div>
                      <h3 className="font-semibold text-sm text-on-surface">{info.label}</h3>
                      <p className="text-xs text-secondary">{info.schedule}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => runAgent(type)}
                    disabled={!!running}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[14px]">{isRunning ? 'hourglass_empty' : 'play_arrow'}</span>
                    {isRunning ? 'Running...' : 'Run Now'}
                  </button>
                </div>

                {result && (
                  <div className={`mt-3 p-2.5 rounded-lg text-xs ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {result.success
                      ? `Done — ${result.actionsCount || 0} action(s) taken`
                      : `Error: ${result.error}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/agents/
git commit -m "feat: add agent dashboard page with manual run buttons"
```

---

## Task 14: Campaign Creation Wizard

**Files:**
- Create: `app/accounts/[id]/campaigns/new/page.js`
- Create: `app/api/accounts/[id]/campaigns/route.js`

- [ ] **Step 1: Create `app/api/accounts/[id]/campaigns/route.js`**

```javascript
import { NextResponse } from 'next/server';
import { getAccountClient } from '@/lib/google-ads-auth';
import { fetchCampaigns } from '@/lib/google-ads-query';
import { createCampaign, createCampaignBudget, createAdGroup, addKeywords, createResponsiveSearchAd } from '@/lib/google-ads-write';

export async function GET(request, { params }) {
  try {
    const client = await getAccountClient(params.id);
    const campaigns = await fetchCampaigns(client);
    return NextResponse.json(campaigns);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const client = await getAccountClient(params.id);

    const { name, dailyBudgetUsd, biddingStrategy, adGroups } = body;

    // 1. Create budget
    const budgetResource = await createCampaignBudget(client, {
      name: `${name} Budget`,
      amountMicros: Math.round(dailyBudgetUsd * 1_000_000),
    });

    // 2. Create campaign
    const campaignResource = await createCampaign(client, {
      name,
      budgetResourceName: budgetResource,
      biddingStrategy: biddingStrategy || 'MANUAL_CPC',
      status: 'PAUSED', // Always start paused — user enables after review
    });

    // 3. Create ad groups, keywords, and ads
    for (const ag of adGroups || []) {
      const adGroupResource = await createAdGroup(client, {
        campaignResourceName: campaignResource,
        name: ag.name,
        cpcBidMicros: Math.round((ag.defaultBidUsd || 2) * 1_000_000),
      });

      if (ag.keywords?.length) {
        await addKeywords(client, adGroupResource, ag.keywords.map(k => ({
          text: k,
          matchType: 'EXACT',
        })));
      }

      if (ag.ad) {
        await createResponsiveSearchAd(client, {
          adGroupResourceName: adGroupResource,
          headlines: ag.ad.headlines.slice(0, 15),
          descriptions: ag.ad.descriptions.slice(0, 4),
          finalUrl: ag.ad.finalUrl,
        });
      }
    }

    return NextResponse.json({ campaignResource, status: 'created' }, { status: 201 });
  } catch (err) {
    console.error('Campaign creation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `app/accounts/[id]/campaigns/new/page.js`**

```javascript
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const STEPS = ['Campaign', 'Ad Groups & Keywords', 'Review & Launch'];

export default function NewCampaignPage() {
  const { id } = useParams();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [campaign, setCampaign] = useState({
    name: '',
    dailyBudgetUsd: 30,
    biddingStrategy: 'MANUAL_CPC',
  });

  const [adGroups, setAdGroups] = useState([
    { name: '', keywords: '', defaultBidUsd: 2, ad: { headlines: ['', '', ''], descriptions: ['', ''], finalUrl: '' } }
  ]);

  const addAdGroup = () => {
    setAdGroups(prev => [...prev, { name: '', keywords: '', defaultBidUsd: 2, ad: { headlines: ['', '', ''], descriptions: ['', ''], finalUrl: '' } }]);
  };

  const updateAdGroup = (i, field, value) => {
    setAdGroups(prev => prev.map((ag, idx) => idx === i ? { ...ag, [field]: value } : ag));
  };

  const updateAdGroupAd = (i, field, value) => {
    setAdGroups(prev => prev.map((ag, idx) => idx === i ? { ...ag, ad: { ...ag.ad, [field]: value } } : ag));
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...campaign,
        adGroups: adGroups.map(ag => ({
          name: ag.name,
          defaultBidUsd: ag.defaultBidUsd,
          keywords: ag.keywords.split('\n').map(k => k.trim()).filter(Boolean),
          ad: {
            ...ag.ad,
            headlines: ag.ad.headlines.filter(Boolean),
            descriptions: ag.ad.descriptions.filter(Boolean),
          },
        })),
      };

      const res = await fetch(`/api/accounts/${id}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create campaign');
      router.push(`/accounts/${id}?tab=campaigns`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-secondary mb-6">
        <Link href="/accounts" className="hover:text-primary">Accounts</Link>
        <span>/</span>
        <Link href={`/accounts/${id}`} className="hover:text-primary">Account</Link>
        <span>/</span>
        <span>New Campaign</span>
      </div>

      <h1 className="text-2xl font-headline font-bold text-on-surface mb-6">Create Campaign</h1>

      {/* Step indicators */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className={`flex items-center gap-2 text-sm ${i <= step ? 'text-primary' : 'text-secondary'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? 'bg-primary text-white' : 'bg-surface-high text-secondary'}`}>{i + 1}</span>
            {s}
            {i < STEPS.length - 1 && <span className="ml-2 text-secondary">›</span>}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

      {/* Step 0: Campaign settings */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Campaign Name</label>
            <input type="text" value={campaign.name} onChange={e => setCampaign(c => ({ ...c, name: e.target.value }))}
              placeholder="e.g., Emergency Plumbing - Search"
              className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Daily Budget (USD)</label>
            <input type="number" value={campaign.dailyBudgetUsd} min="1" onChange={e => setCampaign(c => ({ ...c, dailyBudgetUsd: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Bidding Strategy</label>
            <select value={campaign.biddingStrategy} onChange={e => setCampaign(c => ({ ...c, biddingStrategy: e.target.value }))}
              className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="MANUAL_CPC">Manual CPC</option>
              <option value="MAXIMIZE_CONVERSIONS">Maximize Conversions</option>
              <option value="TARGET_CPA">Target CPA</option>
            </select>
          </div>
          <button onClick={() => setStep(1)} disabled={!campaign.name}
            className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity">
            Next: Ad Groups →
          </button>
        </div>
      )}

      {/* Step 1: Ad groups */}
      {step === 1 && (
        <div className="space-y-6">
          {adGroups.map((ag, i) => (
            <div key={i} className="border border-outline-variant/20 rounded-xl p-4 space-y-3">
              <h3 className="font-medium text-sm text-on-surface">Ad Group {i + 1}</h3>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Ad Group Name</label>
                <input type="text" value={ag.name} onChange={e => updateAdGroup(i, 'name', e.target.value)}
                  placeholder="e.g., Emergency Plumber"
                  className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Keywords (one per line, exact match)</label>
                <textarea rows={4} value={ag.keywords} onChange={e => updateAdGroup(i, 'keywords', e.target.value)}
                  placeholder="emergency plumber&#10;plumber near me&#10;24 hour plumber"
                  className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Default Bid (USD)</label>
                <input type="number" value={ag.defaultBidUsd} min="0.01" step="0.01" onChange={e => updateAdGroup(i, 'defaultBidUsd', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Headline 1 (max 30 chars)</label>
                <input type="text" maxLength={30} value={ag.ad.headlines[0]} onChange={e => updateAdGroupAd(i, 'headlines', [e.target.value, ag.ad.headlines[1], ag.ad.headlines[2]])}
                  className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Final URL</label>
                <input type="url" value={ag.ad.finalUrl} onChange={e => updateAdGroupAd(i, 'finalUrl', e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          ))}
          <button onClick={addAdGroup} className="w-full py-2 border-2 border-dashed border-outline-variant/30 rounded-xl text-sm text-secondary hover:border-primary/30 hover:text-primary transition-colors">
            + Add Another Ad Group
          </button>
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="flex-1 py-2.5 border border-outline-variant/30 rounded-lg text-sm text-secondary hover:bg-surface-high">← Back</button>
            <button onClick={() => setStep(2)} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">Review →</button>
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white border border-outline-variant/20 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-sm text-on-surface">{campaign.name}</h3>
            <p className="text-xs text-secondary">Budget: ${campaign.dailyBudgetUsd}/day · Bidding: {campaign.biddingStrategy}</p>
            <p className="text-xs text-secondary">{adGroups.length} ad group(s) · {adGroups.reduce((n, ag) => n + ag.keywords.split('\n').filter(Boolean).length, 0)} keywords</p>
          </div>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
            Campaign will be created in PAUSED status. Enable it in Google Ads once you've reviewed it.
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-2.5 border border-outline-variant/30 rounded-lg text-sm text-secondary hover:bg-surface-high">← Back</button>
            <button onClick={submit} disabled={submitting} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity">
              {submitting ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/accounts/[id]/campaigns/ app/api/accounts/[id]/campaigns/
git commit -m "feat: add campaign creation wizard (3-step) + campaign creation API"
```

---

## Task 15: Updated Sidebar + Dashboard

**Files:**
- Modify: `components/Sidebar.js`
- Modify: `app/page.js`

- [ ] **Step 1: Replace the NAV array in `components/Sidebar.js`**

Replace the entire file content:

```javascript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_MANAGEMENT = [
  { href: '/',            label: 'Dashboard',       icon: 'dashboard' },
  { href: '/accounts',   label: 'Accounts',         icon: 'account_balance' },
  { href: '/agents',     label: 'Agents',           icon: 'smart_toy' },
  { href: '/brand-lab',  label: 'Brand Lab',        icon: 'palette' },
];

const NAV_RESEARCH = [
  { href: '/research',    label: 'New Research',       icon: 'manage_search' },
  { href: '/clients',     label: 'Client Management',  icon: 'groups' },
  { href: '/competitors', label: 'Competitor Analysis', icon: 'analytics' },
  { href: '/reports',     label: 'Reports',            icon: 'assessment' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const NavLink = ({ href, label, icon }) => (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
        isActive(href)
          ? 'text-primary font-semibold bg-primary/5 border-r-2 border-primary'
          : 'text-secondary font-medium hover:bg-surface-high hover:text-on-surface'
      }`}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      <span className="font-label">{label}</span>
    </Link>
  );

  return (
    <aside className="no-print fixed left-0 top-0 h-screen w-64 flex flex-col py-6 px-4 bg-slate-50 border-r border-outline-variant/10 z-50">
      {/* Brand */}
      <div className="mb-8 px-2">
        <h1 className="text-2xl font-headline font-bold text-primary tracking-tight">PPC Recon</h1>
        <p className="text-[10px] font-label font-semibold text-secondary mt-1 uppercase tracking-widest">
          Autonomous Ads Platform
        </p>
      </div>

      {/* Management section */}
      <nav className="flex-1 space-y-0.5">
        <p className="text-[9px] font-semibold text-secondary/60 uppercase tracking-widest px-3 mb-1">Management</p>
        {NAV_MANAGEMENT.map(item => <NavLink key={item.href} {...item} />)}

        <div className="my-3 border-t border-outline-variant/15" />

        <p className="text-[9px] font-semibold text-secondary/60 uppercase tracking-widest px-3 mb-1">Research</p>
        {NAV_RESEARCH.map(item => <NavLink key={item.href} {...item} />)}
      </nav>

      {/* Bottom */}
      <div className="pt-6 border-t border-outline-variant/15 space-y-0.5">
        <Link
          href="/accounts"
          className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-primary-container text-white rounded-lg text-sm font-label font-semibold shadow-fab/30 hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Connect Account
        </Link>
        <a
          href="https://aistudio.google.com"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-3 px-3 py-2 text-secondary hover:bg-surface-high transition-colors rounded-lg text-sm font-label"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          API Settings
        </a>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Add managed accounts section to `app/page.js`**

Read the current `app/page.js` first, then add an accounts overview section. Add this component before or after the existing content (wherever the layout fits best):

```javascript
// Add this import at the top of app/page.js:
// import { useEffect, useState } from 'react'; (if not already there)

// Add this section inside the page, in a visible area:
/*
<section className="mb-8">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-base font-semibold text-on-surface">Managed Accounts</h2>
    <a href="/accounts" className="text-xs text-primary hover:underline">View all →</a>
  </div>
  <ManagedAccountsWidget />
</section>
*/
```

The exact integration depends on the current `app/page.js` structure. Read the file and insert naturally — the goal is a widget that shows connected accounts and their status.

- [ ] **Step 3: Commit**

```bash
git add components/Sidebar.js app/page.js
git commit -m "feat: update sidebar with management/research sections + accounts overview on dashboard"
```

---

## Task 16: Environment Variables + Final Polish

- [ ] **Step 1: Update `.env.example` with new variables**

```
# Existing
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=

# New
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your-random-secret-here
```

- [ ] **Step 2: Test the full OAuth flow**

1. Start dev server: `npm run dev`
2. Navigate to `/accounts`
3. Click "Connect Google Ads Account"
4. Authorize with a Google account that has Google Ads access
5. Verify redirect to `/accounts/[id]?connected=true`
6. Verify account appears in Supabase `accounts` table with refresh token

- [ ] **Step 3: Test campaign sync**

1. On the account detail page, click Sync
2. Verify campaigns/ad groups/keywords appear in the Campaigns and Keywords tabs
3. Check Supabase `campaign_snapshots` table has a new row

- [ ] **Step 4: Test agent run**

1. Navigate to `/agents`
2. Select the connected account
3. Click "Run Now" on Audit
4. Wait for completion
5. Navigate back to the account's Audit tab
6. Verify audit report is populated

- [ ] **Step 5: Test undo**

1. Manually trigger the Keyword agent on a test account
2. Find a logged action in the Change Log tab
3. Click Undo
4. Verify status changes to 'undone' in the UI and in Supabase

- [ ] **Step 6: Final commit**

```bash
git add .env.example
git commit -m "chore: update env example with new required variables"
```

---

## Summary of All Files Created/Modified

### New (34 files)
```
lib/google-ads-auth.js
lib/google-ads-query.js
lib/google-ads-write.js
lib/agents/base.js
lib/agents/index.js
lib/agents/audit.js
lib/agents/keyword.js
lib/agents/bid.js
lib/agents/budget.js
lib/agents/ad-copy.js
lib/agents/negative.js
lib/agents/brand.js
app/accounts/page.js
app/accounts/[id]/page.js
app/accounts/[id]/campaigns/new/page.js
app/agents/page.js
app/brand-lab/page.js
app/api/auth/google-ads/route.js
app/api/auth/google-ads/callback/route.js
app/api/accounts/route.js
app/api/accounts/[id]/route.js
app/api/accounts/[id]/sync/route.js
app/api/accounts/[id]/metrics/route.js
app/api/accounts/[id]/snapshot/route.js
app/api/accounts/[id]/campaigns/route.js
app/api/accounts/[id]/actions/route.js
app/api/accounts/[id]/actions/[actionId]/undo/route.js
app/api/agents/run/route.js
app/api/agents/[type]/route.js
app/api/brand-lab/route.js
```

### Modified (5 files)
```
lib/supabase.js
lib/google-ads.js
lib/prompts.js
components/Sidebar.js
app/page.js
```

### Config
```
.env.local (NEXT_PUBLIC_APP_URL)
.env.example (updated)
vercel.json (cron)
```
