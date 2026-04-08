import { NextResponse } from 'next/server';
import { fetchTrendMultipliers } from '@/lib/data-sources/trends';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword');
  const geo = searchParams.get('geo') || 'US';

  if (!keyword) {
    return NextResponse.json({ error: 'keyword parameter is required' }, { status: 400 });
  }

  const result = await fetchTrendMultipliers(keyword, geo);
  return NextResponse.json(result);
}
