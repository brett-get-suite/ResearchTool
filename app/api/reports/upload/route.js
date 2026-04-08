// app/api/reports/upload/route.js
import { NextResponse } from 'next/server';
import { createReportUpload } from '@/lib/supabase';
import { parseReport, detectReportType } from '@/lib/parsers/index';

export async function POST(request) {
  try {
    const body = await request.json();
    const { accountId, rows, headers, fileName, reportType: providedType, dateRangeStart, dateRangeEnd } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'rows must be a non-empty array' }, { status: 400 });
    }

    // Use provided type or auto-detect from headers
    const reportType = providedType || detectReportType(headers || Object.keys(rows[0] || {}));
    if (!reportType) {
      return NextResponse.json({
        error: 'Could not detect report type. Please select manually.',
        detectedHeaders: headers || Object.keys(rows[0] || {}),
      }, { status: 422 });
    }

    const normalizedRows = parseReport(rows, reportType);

    const upload = await createReportUpload({
      account_id: accountId,
      report_type: reportType,
      date_range_start: dateRangeStart || null,
      date_range_end: dateRangeEnd || null,
      row_count: normalizedRows.length,
      raw_data: normalizedRows,
      file_name: fileName || null,
    });

    return NextResponse.json({
      id: upload?.id,
      reportType,
      rowCount: normalizedRows.length,
      message: `${normalizedRows.length} rows parsed and stored`,
    });
  } catch (err) {
    console.error('[reports/upload] Error:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
