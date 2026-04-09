import { NextResponse } from 'next/server';
import { getAccountClient } from '@/lib/google-ads-auth';
import { fetchChangeHistory } from '@/lib/google-ads-query';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get('days') || '7', 10);

    const client = await getAccountClient(params.id);
    const changes = await fetchChangeHistory(client, daysBack);

    return NextResponse.json({ changes });
  } catch (err) {
    console.error('Change history GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
