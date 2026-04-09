import { NextResponse } from 'next/server';
import { buildOAuthUrl } from '@/lib/google-ads-auth';
import { MOCK_MODE } from '@/lib/google-ads-mock';

const MOCK_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

export async function GET(request) {
  // In mock mode, skip OAuth entirely and redirect to the demo account
  if (MOCK_MODE) {
    const base = process.env.NEXT_PUBLIC_APP_URL;
    if (!base) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL is not configured' }, { status: 500 });
    }
    return NextResponse.redirect(`${base}/accounts/${MOCK_ACCOUNT_ID}?connected=true`);
  }

  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || crypto.randomUUID();

  const url = buildOAuthUrl(state);
  const response = NextResponse.redirect(url);
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
  });
  return response;
}
