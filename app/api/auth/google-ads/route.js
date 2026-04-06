import { NextResponse } from 'next/server';
import { buildOAuthUrl } from '@/lib/google-ads-auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || crypto.randomUUID();

  const url = buildOAuthUrl(state);
  const response = NextResponse.redirect(url);
  response.cookies.set('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 600 });
  return response;
}
