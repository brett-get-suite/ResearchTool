// app/api/reports/[accountId]/route.js
import { NextResponse } from 'next/server';
import { getReportUploads, deleteReportUpload } from '@/lib/supabase';

export async function GET(request, { params }) {
  const { accountId } = await params;
  try {
    const uploads = await getReportUploads(accountId);
    return NextResponse.json(uploads);
  } catch (err) {
    console.error('[reports/accountId] GET Error:', err);
    return NextResponse.json({ error: 'Failed to process report' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { accountId } = await params;
  const { searchParams } = new URL(request.url);
  const uploadId = searchParams.get('uploadId');
  if (!uploadId) {
    return NextResponse.json({ error: 'uploadId query param required' }, { status: 400 });
  }
  try {
    await deleteReportUpload(uploadId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[reports/accountId] DELETE Error:', err);
    return NextResponse.json({ error: 'Failed to process report' }, { status: 500 });
  }
}
