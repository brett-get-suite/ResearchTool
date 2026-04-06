import { NextResponse } from 'next/server';
import { buildOAuthUrl } from '@/lib/google-ads-auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || crypto.randomUUID();

  const url = buildOAuthUrl(state);
  return NextResponse.redirect(url);
}
