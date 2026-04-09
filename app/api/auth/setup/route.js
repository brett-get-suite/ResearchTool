import { NextResponse } from 'next/server';
import { hashPassword, generateSessionToken } from '@/lib/auth';
import { getUserCount, createUser, createSession } from '@/lib/supabase';

export async function POST(request) {
  try {
    const count = await getUserCount();
    if (count > 0) {
      return NextResponse.json({ error: 'Setup already completed' }, { status: 403 });
    }

    const { email, password, name } = await request.json();

    const superadminEmail = process.env.SUPERADMIN_EMAIL;
    if (!superadminEmail) {
      return NextResponse.json({ error: 'SUPERADMIN_EMAIL env var is not configured' }, { status: 500 });
    }
    if (email.toLowerCase() !== superadminEmail.toLowerCase()) {
      return NextResponse.json({ error: 'This email is not authorized for setup' }, { status: 403 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({
      email,
      passwordHash,
      name: name || '',
      role: 'superadmin',
      tenantId: null,
    });

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await createSession(user.id, token, expiresAt);

    const response = NextResponse.json({ ok: true, user });
    response.cookies.set('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (err) {
    console.error('Setup error:', err);
    return NextResponse.json({ error: 'Setup failed', detail: err?.message || String(err) }, { status: 500 });
  }
}
