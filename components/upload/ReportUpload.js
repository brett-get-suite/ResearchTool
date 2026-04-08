'use client';

import { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import { detectReportType } from '@/lib/parsers/index';
import { findHeaderRow } from '@/lib/parsers/normalize';
import ColumnMapper from './ColumnMapper';

const REPORT_TYPE_LABELS = {
  keyword: 'Keyword Report',
  search_terms: 'Search Terms Report',
  campaign: 'Campaign Report',
  product: 'Product / Shopping Report',
};

/**
 * Strips Google Ads metadata rows above the actual column headers.
 * Returns { headers: string[], rows: object[] } or null on failure.
 */
function extractData(rawRows) {
  const requiredKeywords = ['campaign', 'clicks', 'cost'];
  const allArrays = rawRows.map(r => (Array.isArray(r) ? r : Object.values(r)));
  const headerIdx = findHeaderRow(allArrays, requiredKeywords);
  if (headerIdx === -1) return null;

  const headers = allArrays[headerIdx];
  const dataRows = allArrays.slice(headerIdx + 1).filter(r => r.some(v => String(v).trim()));
  const rows = dataRows.map(arr =>
    Object.fromEntries(headers.map((h, i) => [h, arr[i] ?? '']))
  );
  return { headers, rows };
}

export default function ReportUpload({ accountId, onUploadComplete }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [detectedType, setDetectedType] = useState(null);
  const [needsMapping, setNeedsMapping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const inputRef = useRef();

  const reset = () => {
    setFile(null);
    setParsed(null);
    setDetectedType(null);
    setNeedsMapping(false);
    setError(null);
    setSuccess(null);
  };

  const processFile = useCallback((f) => {
    setError(null);
    setFile(f);
    Papa.parse(f, {
      header: false,
      skipEmptyLines: true,
      complete: (result) => {
        const extracted = extractData(result.data);
        if (!extracted) {
          setError("Could not find column headers in this file. Make sure it's a Google Ads CSV export.");
          return;
        }
        const type = detectReportType(extracted.headers);
        setDetectedType(type);
        setParsed(extracted);
        if (!type) setNeedsMapping(true);
      },
      error: (err) => setError(`Could not read file: ${err.message}`),
    });
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const handleFileInput = (e) => {
    const f = e.target.files[0];
    if (f) processFile(f);
  };

  const handleUpload = async (reportType, mappedRows) => {
    setUploading(true);
    setError(null);
    try {
      const rows = mappedRows || parsed.rows;
      const res = await fetch('/api/reports/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          rows,
          headers: parsed.headers,
          reportType,
          fileName: file?.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setSuccess(`${data.rowCount} rows uploaded as ${REPORT_TYPE_LABELS[reportType]}`);
      onUploadComplete?.({ type: reportType, rowCount: data.rowCount, uploadId: data.id });
      setTimeout(reset, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (needsMapping && parsed) {
    return (
      <ColumnMapper
        headers={parsed.headers}
        sampleRows={parsed.rows.slice(0, 3)}
        onConfirm={(type, remappedRows) => {
          setNeedsMapping(false);
          handleUpload(type, remappedRows);
        }}
        onCancel={reset}
      />
    );
  }

  return (
    <div className="space-y-4">
      {!file && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            dragging ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-surface-high hover:border-[var(--primary)]/50'
          }`}
        >
          <span className="material-symbols-outlined text-4xl text-secondary mb-3 block">upload_file</span>
          <p className="font-label font-semibold text-on-surface mb-1">Drop a Google Ads CSV here</p>
          <p className="text-xs text-secondary">Keyword, Search Terms, Campaign, or Product report</p>
          <input ref={inputRef} type="file" accept=".csv,.tsv" onChange={handleFileInput} className="hidden" />
        </div>
      )}

      {file && !success && (
        <div className="card p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-label font-semibold text-on-surface text-sm">{file.name}</p>
              {detectedType && (
                <p className="text-xs text-secondary mt-0.5">
                  Detected: <span className="text-[var(--primary)] font-semibold">{REPORT_TYPE_LABELS[detectedType]}</span>
                  {parsed && ` · ${parsed.rows.length.toLocaleString()} rows`}
                </p>
              )}
            </div>
            <button onClick={reset} className="text-secondary hover:text-on-surface text-xs font-label">
              Remove
            </button>
          </div>

          {detectedType && (
            <button
              onClick={() => handleUpload(detectedType)}
              disabled={uploading}
              className="pill-btn-primary w-full"
            >
              {uploading ? 'Uploading…' : `Upload as ${REPORT_TYPE_LABELS[detectedType]}`}
            </button>
          )}

          {!detectedType && !needsMapping && (
            <div>
              <p className="text-xs text-secondary font-label mb-2">Select report type manually:</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(REPORT_TYPE_LABELS).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => handleUpload(type)}
                    disabled={uploading}
                    className="text-xs font-label font-semibold px-3 py-2 rounded-lg border border-surface-high hover:border-[var(--primary)] transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {success && (
        <div className="card p-4 bg-emerald-50 border border-emerald-200">
          <p className="text-sm font-label font-semibold text-emerald-700">✓ {success}</p>
        </div>
      )}

      {error && (
        <div className="card p-4 bg-red-50 border border-red-200">
          <p className="text-sm font-label text-red-700">{error}</p>
          <button onClick={reset} className="text-xs text-red-600 font-semibold mt-1 underline">Try again</button>
        </div>
      )}
    </div>
  );
}
