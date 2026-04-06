import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, ADS_API_BASE } from '@/lib/google-ads-auth';
import { createAccount } from '@/lib/supabase';

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
      `${process.env.NEXT_PUBLIC_APP_URL}/accounts?error=oauth_denied`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/accounts?error=no_code`
    );
  }

  const state = searchParams.get('state');
  const expectedState = request.cookies.get('oauth_state')?.value;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/accounts?error=invalid_state`
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      throw new Error('No refresh token received. Make sure access_type=offline and prompt=consent.');
    }

    const resourceNames = await fetchAccessibleAccounts(accessToken);
    const firstId = resourceNames[0]?.replace('customers/', '');

    if (!firstId) {
      throw new Error('No accessible Google Ads accounts found for this Google login.');
    }

    let accountName = 'Google Ads Account';
    let customerId = firstId;

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

    const successRedirect = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/accounts/${account.id}?connected=true`
    );
    successRedirect.cookies.delete('oauth_state');
    return successRedirect;
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/accounts?error=connection_failed`
    );
  }
}
