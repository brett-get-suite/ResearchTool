import { NextResponse } from 'next/server';

async function computeSessionToken(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'ads-recon-v1');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(request) {
  const { password } = await request.json();

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured on this server.' }, { status: 500 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
  }

  const token = await computeSessionToken(adminPassword);
  const response = NextResponse.json({ ok: true });
  response.cookies.set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return response;
}
