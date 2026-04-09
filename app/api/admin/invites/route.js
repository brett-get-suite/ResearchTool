import { NextResponse } from 'next/server';
import { getInvites, createInvite } from '@/lib/supabase';
import { generateInviteToken } from '@/lib/auth';
import { getAuthUser } from '@/lib/auth-context';

export async function GET(request) {
  const user = getAuthUser(request);
  if (user?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const invites = await getInvites();
    return NextResponse.json(invites);
  } catch (err) {
    console.error('Invites GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

export async function POST(request) {
  const user = getAuthUser(request);
  if (user?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { tenantId } = await request.json();
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant is required' }, { status: 400 });
    }

    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const invite = await createInvite({
      tenantId,
      token,
      expiresAt,
      createdBy: user.id,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const inviteUrl = `${baseUrl}/invite/${token}`;

    return NextResponse.json({ ...invite, url: inviteUrl }, { status: 201 });
  } catch (err) {
    console.error('Invites POST error:', err);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}
