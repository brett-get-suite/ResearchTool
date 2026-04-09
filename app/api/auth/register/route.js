import { NextResponse } from 'next/server';
import { hashPassword, generateSessionToken } from '@/lib/auth';
import { getInviteByToken, markInviteUsed, createUser, createSession } from '@/lib/supabase';

export async function GET(request) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    return NextResponse.json({ valid: false });
  }
  const invite = await getInviteByToken(token);
  if (!invite) {
    return NextResponse.json({ valid: false });
  }
  return NextResponse.json({ valid: true, tenantName: invite.tenants?.name || 'Unknown' });
}

export async function POST(request) {
  try {
    const { token, email, password, name } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json({ error: 'Token, email, and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const invite = await getInviteByToken(token);
    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({
      email,
      passwordHash,
      name: name || '',
      role: 'member',
      tenantId: invite.tenant_id,
    });

    await markInviteUsed(invite.id, user.id);

    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await createSession(user.id, sessionToken, expiresAt);

    const response = NextResponse.json({ ok: true, user });
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
