import { NextResponse } from 'next/server';
import { getLatestSnapshot } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const snapshot = await getLatestSnapshot(params.id);
    if (!snapshot) return NextResponse.json(null);
    return NextResponse.json(snapshot);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch snapshot' }, { status: 500 });
  }
}
