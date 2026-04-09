// app/api/reports/[accountId]/analyses/[analysisId]/route.js
import { NextResponse } from 'next/server';
import { getReportAnalysis } from '@/lib/supabase';

export async function GET(request, { params }) {
  const { accountId, analysisId } = await params;
  try {
    const analysis = await getReportAnalysis(analysisId);
    if (!analysis || analysis.account_id !== accountId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 });
  }
}
