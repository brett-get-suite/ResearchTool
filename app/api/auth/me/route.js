import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-context';

export async function GET(request) {
  const user = getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json(user);
}
