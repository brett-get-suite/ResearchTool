// components/analysis/WastedSpend.js
'use client';

export default function WastedSpend({ keywords = [], terms = [], totalWastedOnKeywords = 0, totalWastedOnTerms = 0, onTermClick }) {
  const totalWasted = totalWastedOnKeywords + totalWastedOnTerms;

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div className="rounded-xl bg-error/10 p-4 flex items-center gap-4">
        <span className="material-symbols-outlined text-error text-[28px]">money_off</span>
        <div>
          <p className="font-bold text-error text-lg">${totalWasted.toLocaleString(undefined, { maximumFractionDigits: 0 })} wasted</p>
          <p className="text-xs text-error/80 font-label">
            ${totalWastedOnKeywords.toLocaleString(undefined, { maximumFractionDigits: 0 })} on zero-converting keywords
            {totalWastedOnTerms > 0 && ` · $${totalWastedOnTerms.toLocaleString(undefined, { maximumFractionDigits: 0 })} on zero-converting search terms`}
          </p>
        </div>
      </div>

      {/* Top wasted search terms */}
      {terms.length > 0 && (
        <div>
          <p className="font-label font-semibold text-on-surface text-sm mb-2">Top Zero-Converting Search Terms</p>
          <div className="space-y-1">
            {terms.slice(0, 15).map((t, i) => (
              <div key={i}
                onClick={() => onTermClick?.(t)}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container-low hover:bg-error/5 cursor-pointer transition-colors">
                <span className="text-sm font-label text-on-surface">{t.searchTerm}</span>
                <div className="flex items-center gap-4 text-xs text-on-surface-variant font-label">
                  <span>{t.clicks} clicks</span>
                  <span className="font-semibold text-error">${t.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })} wasted</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top wasted keywords */}
      {keywords.length > 0 && (
        <div>
          <p className="font-label font-semibold text-on-surface text-sm mb-2">Zero-Converting Keywords</p>
          <div className="space-y-1">
            {keywords.slice(0, 10).map((k, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container-low">
                <div>
                  <span className="text-sm font-label text-on-surface">{k.keyword}</span>
                  <span className="ml-2 text-[10px] text-on-surface-variant font-label capitalize">{k.matchType}</span>
                </div>
                <span className="text-xs font-semibold font-label text-error">
                  ${k.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })} wasted
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
