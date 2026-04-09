import { NextResponse } from 'next/server';
import { enrichKeywords } from '@/lib/data-sources/index';

export const maxDuration = 30;

export async function POST(request) {
  try {
    const body = await request.json();
    const { keywords, geo, lat, lon, vertical } = body;

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json({ error: 'keywords array required' }, { status: 400 });
    }

    const result = await enrichKeywords(keywords, { geo, lat, lon, vertical });
    return NextResponse.json(result);
  } catch (err) {
    console.error('Keywords intelligence error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch keyword intelligence' }, { status: 500 });
  }
}
