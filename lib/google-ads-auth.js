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
