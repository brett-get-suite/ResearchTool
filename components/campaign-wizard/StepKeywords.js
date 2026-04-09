'use client';

import { useState, useEffect } from 'react';

function formatKeyword(kw, matchType) {
  if (matchType === 'EXACT') return `[${kw}]`;
  if (matchType === 'PHRASE') return `"${kw}"`;
  return kw;
}

export default function StepKeywords({ form, onChange, accountId }) {
  const [engineKeywords, setEngineKeywords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('manual'); // 'manual' | 'engine'

  // Pull keywords from Keyword Engine for this account
  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/accounts/${accountId}/keywords`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setEngineKeywords(Array.isArray(data) ? data : []))
      .catch((err) => { if (err.name !== 'AbortError') setEngineKeywords([]); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [accountId]);

  const parsed = form.keywords
    .split('\n')
    .map((k) => k.trim())
    .filter(Boolean);

  function addFromEngine(keyword) {
    const text = typeof keyword === 'string' ? keyword : keyword.keyword || keyword.text || '';
    if (!text) return;
    const existing = parsed;
    if (existing.includes(text)) return;
    onChange('keywords', [...existing, text].join('\n'));
  }

  function removeKeyword(idx) {
    const updated = parsed.filter((_, i) => i !== idx);
    onChange('keywords', updated.join('\n'));
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-headline-sm text-on-surface mb-1">Keywords</h2>
        <p className="text-sm text-on-surface-variant">
          Add keywords for your campaign.
          {form.structure === 'skag'
            ? ' Each keyword will get its own ad group (SKAG structure).'
            : ' Group related keywords by theme (STAG structure).'}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-surface-container-high rounded-lg p-1">
        <button
          type="button"
          onClick={() => setTab('manual')}
          className={`flex-1 text-sm py-2 px-3 rounded-md transition-all ${
            tab === 'manual'
              ? 'bg-primary/15 text-primary font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Manual Entry
        </button>
        <button
          type="button"
          onClick={() => setTab('engine')}
          className={`flex-1 text-sm py-2 px-3 rounded-md transition-all ${
            tab === 'engine'
              ? 'bg-primary/15 text-primary font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          From Keyword Engine
          {engineKeywords.length > 0 && (
            <span className="ml-1.5 text-[0.625rem] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
              {engineKeywords.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'manual' ? (
        <div>
          <label className="field-label">
            Keywords <span className="text-error">*</span>
          </label>
          <p className="text-xs text-on-surface-variant mb-1.5">One keyword per line.</p>
          <textarea
            className="field-input mt-1 h-36 resize-none font-mono text-sm"
            placeholder={"hvac repair near me\nac installation\nemergency plumber"}
            value={form.keywords}
            onChange={(e) => onChange('keywords', e.target.value)}
          />
        </div>
      ) : (
        <div>
          {loading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              Loading keywords from engine...
            </div>
          ) : engineKeywords.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-on-surface-variant/30 text-4xl mb-2">search_off</span>
              <p className="text-sm text-on-surface-variant">
                No keywords found in the Keyword Engine for this account.
              </p>
              <p className="text-xs text-on-surface-variant/60 mt-1">
                Run keyword research first, or enter keywords manually.
              </p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {engineKeywords.map((kw, i) => {
                const text = typeof kw === 'string' ? kw : kw.keyword || kw.text || '';
                const isAdded = parsed.includes(text);
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                      isAdded ? 'bg-secondary/10' : 'bg-surface-container-high hover:bg-surface-bright'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-on-surface truncate">{text}</span>
                      {kw.avgCpc && (
                        <span className="text-[0.625rem] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-full shrink-0">
                          ${kw.avgCpc}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => isAdded ? removeKeyword(parsed.indexOf(text)) : addFromEngine(kw)}
                      className={`shrink-0 ml-2 text-xs font-semibold px-2 py-1 rounded-md transition-all ${
                        isAdded
                          ? 'text-secondary bg-secondary/15 hover:bg-secondary/25'
                          : 'text-primary bg-primary/10 hover:bg-primary/20'
                      }`}
                    >
                      {isAdded ? 'Added' : 'Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Keyword preview */}
      {parsed.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-on-surface-variant mb-2">
            {parsed.length} keyword{parsed.length !== 1 ? 's' : ''} selected
          </p>
          <div className="flex flex-wrap gap-1.5">
            {parsed.map((kw, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs bg-primary/8 text-primary px-2.5 py-1 rounded-full font-mono group"
              >
                {formatKeyword(kw, form.matchType || 'BROAD')}
                <button
                  type="button"
                  onClick={() => removeKeyword(i)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-primary/60 hover:text-error"
                >
                  <span className="material-symbols-outlined text-[12px]">close</span>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
