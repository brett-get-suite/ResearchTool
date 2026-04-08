'use client';

import { useState } from 'react';

const REPORT_TYPE_LABELS = {
  keyword: 'Keyword Report',
  search_terms: 'Search Terms Report',
  campaign: 'Campaign Report',
  product: 'Product / Shopping Report',
};

const REPORT_TYPE_MAPPINGS = {
  keyword: [
    { internal: 'Campaign', label: 'Campaign name' },
    { internal: 'Ad group', label: 'Ad group name' },
    { internal: 'Keyword', label: 'Keyword' },
    { internal: 'Match type', label: 'Match type' },
    { internal: 'Impressions', label: 'Impressions' },
    { internal: 'Clicks', label: 'Clicks' },
    { internal: 'Cost', label: 'Cost / Spend' },
    { internal: 'Conversions', label: 'Conversions' },
  ],
  search_terms: [
    { internal: 'Campaign', label: 'Campaign name' },
    { internal: 'Ad group', label: 'Ad group name' },
    { internal: 'Search term', label: 'Search term / Query' },
    { internal: 'Match type', label: 'Match type' },
    { internal: 'Impressions', label: 'Impressions' },
    { internal: 'Clicks', label: 'Clicks' },
    { internal: 'Cost', label: 'Cost / Spend' },
    { internal: 'Conversions', label: 'Conversions' },
  ],
  campaign: [
    { internal: 'Campaign', label: 'Campaign name' },
    { internal: 'Clicks', label: 'Clicks' },
    { internal: 'Cost', label: 'Cost / Spend' },
    { internal: 'Conversions', label: 'Conversions' },
  ],
  product: [
    { internal: 'Product title', label: 'Product title' },
    { internal: 'Clicks', label: 'Clicks' },
    { internal: 'Cost', label: 'Cost / Spend' },
    { internal: 'Conversions', label: 'Conversions' },
    { internal: 'Conv. value', label: 'Conversion value' },
  ],
};

export default function ColumnMapper({ headers, sampleRows, onConfirm, onCancel }) {
  const [selectedType, setSelectedType] = useState('keyword');
  const [mapping, setMapping] = useState({});

  const requiredCols = REPORT_TYPE_MAPPINGS[selectedType] || [];

  const applyMapping = () => {
    const remappedRows = sampleRows.map(row => {
      const newRow = { ...row };
      Object.entries(mapping).forEach(([internal, userCol]) => {
        if (userCol && userCol !== internal && newRow[userCol] !== undefined) {
          newRow[internal] = newRow[userCol];
        }
      });
      return newRow;
    });
    onConfirm(selectedType, remappedRows);
  };

  return (
    <div className="card p-5 space-y-5">
      <div>
        <p className="font-headline font-bold text-on-surface mb-1">Map Your Columns</p>
        <p className="text-xs text-secondary font-label">Your file has non-standard column names. Map them to the expected fields.</p>
      </div>

      <div>
        <p className="text-xs font-label font-semibold text-on-surface mb-2">Report type</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(REPORT_TYPE_LABELS).map(([type, label]) => (
            <button
              key={type}
              onClick={() => { setSelectedType(type); setMapping({}); }}
              className={`text-xs font-label font-semibold px-3 py-2 rounded-lg border-2 transition-all ${
                selectedType === type
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]'
                  : 'border-surface-high text-secondary hover:border-[var(--primary)]/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-label font-semibold text-on-surface mb-2">Column mapping</p>
        <div className="space-y-2">
          {requiredCols.map(({ internal, label }) => (
            <div key={internal} className="flex items-center gap-3">
              <span className="text-xs font-label text-on-surface w-32 shrink-0">{label}</span>
              <span className="text-secondary text-xs">→</span>
              <select
                value={mapping[internal] || internal}
                onChange={e => setMapping(prev => ({ ...prev, [internal]: e.target.value }))}
                className="flex-1 text-xs font-label border border-surface-high rounded-lg px-2 py-1.5 bg-surface text-on-surface"
              >
                {headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="pill-btn-secondary flex-1 text-sm">Cancel</button>
        <button onClick={applyMapping} className="pill-btn-primary flex-1 text-sm">Confirm Mapping</button>
      </div>
    </div>
  );
}
