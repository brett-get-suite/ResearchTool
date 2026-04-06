'use client';

import { useState } from 'react';

const SEVERITY_CLS = {
  critical: 'bg-red-50 text-red-700 border-red-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
};

export default function AuditTab({ auditData, accountId, onRerun }) {
  const [rerunning, setRerunning] = useState(false);

  const handleRerun = async () => {
    setRerunning(true);
    try {
      await fetch(`/api/accounts/${accountId}/sync`, { method: 'POST' });
      await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'audit', accountId }),
      });
      onRerun?.();
    } catch (e) {
      console.error(e);
    } finally {
      setRerunning(false);
    }
  };

  if (!auditData) {
    return (
      <div className="card p-8 flex flex-col items-center gap-4 text-center">
        <span className="material-symbols-outlined text-[48px] text-secondary/30">security</span>
        <p className="text-sm text-secondary font-label">No audit run yet</p>
        <button onClick={handleRerun} disabled={rerunning} className="pill-btn-primary">
          {rerunning ? 'Running Audit…' : 'Run AI Audit'}
        </button>
      </div>
    );
  }

  const score = auditData.health_score ?? auditData.score ?? 0;
  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
  const issues = auditData.issues || [];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className={`text-5xl font-headline font-bold ${scoreColor}`}>{score}</div>
          <div>
            <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Health Score</p>
            <p className="text-sm text-on-surface font-label mt-0.5">{auditData.summary || 'Account audit complete'}</p>
            {auditData.wasted_spend && (
              <p className="text-xs text-red-600 font-label mt-1">~{auditData.wasted_spend} estimated wasted spend</p>
            )}
          </div>
        </div>
        <button onClick={handleRerun} disabled={rerunning} className="pill-btn-secondary shrink-0">
          <span className={`material-symbols-outlined text-[16px] ${rerunning ? 'animate-spin' : ''}`}>
            {rerunning ? 'progress_activity' : 'refresh'}
          </span>
          {rerunning ? 'Running…' : 'Re-run Audit'}
        </button>
      </div>

      {issues.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Issues ({issues.length})</p>
          {issues.map((issue, i) => (
            <div key={i} className={`card p-4 border ${SEVERITY_CLS[issue.severity] || SEVERITY_CLS.info}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-label font-bold uppercase tracking-wider capitalize">{issue.severity}</span>
                    {issue.impact && <span className="text-[10px] text-secondary font-label">Impact: {issue.impact}</span>}
                  </div>
                  <p className="text-sm font-label font-medium text-on-surface">{issue.title || issue.issue}</p>
                  {issue.recommendation && <p className="text-xs text-secondary font-label mt-1">{issue.recommendation}</p>}
                </div>
                {issue.automatable && (
                  <button className="pill-btn-secondary text-xs shrink-0">Apply Fix</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {auditData.quick_wins?.length > 0 && (
        <div>
          <p className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest mb-2">Quick Wins</p>
          <div className="space-y-2">
            {auditData.quick_wins.map((win, i) => (
              <div key={i} className="card p-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-[18px]">task_alt</span>
                <p className="text-sm font-label text-on-surface">{win}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
