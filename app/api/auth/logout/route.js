import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/supabase';

export async function POST(request) {
  const token = request.cookies.get('session')?.value;
  if (token) {
    await deleteSession(token).catch(() => {});
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('session');
  return response;
}
