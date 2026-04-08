// app/api/reports/[accountId]/analyses/route.js
import { NextResponse } from 'next/server';
import { listReportAnalyses } from '@/lib/supabase';

export async function GET(request, { params }) {
  const { accountId } = await params;
  try {
    const analyses = await listReportAnalyses(accountId);
    return NextResponse.json(analyses);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
