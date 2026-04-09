import { NextResponse } from 'next/server';
import { getAccountClient } from '@/lib/google-ads-auth';
import { fetchKeywords, fetchKeywordMetrics } from '@/lib/google-ads-query';
import { addKeywords } from '@/lib/google-ads-write';

export async function GET(request, { params }) {
  try {
    const client = await getAccountClient(params.id);

    const [keywords, metrics] = await Promise.all([
      fetchKeywords(client),
      fetchKeywordMetrics(client),
    ]);

    const metricsById = {};
    for (const m of metrics) {
      metricsById[`${m.adGroupId}:${m.criterionId}`] = m;
    }

    const merged = keywords.map((keyword) => ({
      ...keyword,
      ...(metricsById[`${keyword.adGroupId}:${keyword.criterionId}`] || {}),
    }));

    return NextResponse.json(merged);
  } catch (err) {
    console.error('Keywords GET error:', err);
    return NextResponse.json({ error: 'Failed to process keywords request' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { adGroupResourceName, keywords } = await request.json();

    if (!adGroupResourceName || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: 'adGroupResourceName and keywords[] are required' }, { status: 400 });
    }

    const client = await getAccountClient(params.id);

    const resourceNames = await addKeywords(client, adGroupResourceName, keywords);

    return NextResponse.json({ resourceNames });
  } catch (err) {
    console.error('Keywords POST error:', err);
    return NextResponse.json({ error: 'Failed to process keywords request' }, { status: 500 });
  }
}
