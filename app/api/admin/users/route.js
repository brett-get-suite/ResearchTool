import { NextResponse } from 'next/server';
import { getUsers, updateUserRole } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth-context';

export async function GET(request) {
  const user = getAuthUser(request);
  if (user?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const users = await getUsers();
    return NextResponse.json(users);
  } catch (err) {
    console.error('Users GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const user = getAuthUser(request);
  if (user?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { userId, role } = await request.json();
    if (!['superadmin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    const updated = await updateUserRole(userId, role);
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Users PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
