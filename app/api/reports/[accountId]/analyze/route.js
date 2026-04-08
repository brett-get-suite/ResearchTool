// app/api/reports/[accountId]/analyze/route.js
import { NextResponse } from 'next/server';
import { getReportUpload, createReportAnalysis, getAccount } from '@/lib/supabase';
import { runAudit } from '@/lib/analysis/index';

export async function POST(request, { params }) {
  const { accountId } = await params;
  try {
    const { uploadIds } = await request.json();

    if (!Array.isArray(uploadIds) || uploadIds.length === 0) {
      return NextResponse.json({ error: 'uploadIds must be a non-empty array' }, { status: 400 });
    }

    // Fetch uploads and account mode in parallel
    const [uploads, account] = await Promise.all([
      Promise.all(uploadIds.map(id => getReportUpload(id))),
      getAccount(accountId),
    ]);

    const validUploads = uploads.filter(Boolean);
    if (validUploads.length === 0) {
      return NextResponse.json({ error: 'No valid uploads found for provided IDs' }, { status: 404 });
    }

    const mode = account?.mode || 'lead_gen';

    // Run pure computation (no AI)
    const computedData = runAudit(validUploads, mode);

    // Store result
    const analysis = await createReportAnalysis({
      account_id:               accountId,
      upload_ids:               uploadIds,
      mode,
      computed_data:            computedData,
      data_sufficiency_warnings: computedData.dataSufficiencyWarnings,
    });

    return NextResponse.json({
      analysisId: analysis?.id,
      mode,
      summary:    computedData.summary,
      warnings:   computedData.dataSufficiencyWarnings,
    });
  } catch (err) {
    console.error('[reports/analyze] Error:', err);
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 });
  }
}
