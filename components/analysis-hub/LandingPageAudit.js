import CircularGrade from '@/components/ui/CircularGrade';
import StatusBadge from '@/components/ui/StatusBadge';

const AUDIT_CRITERIA = [
  { key: 'semantic_h1', label: 'Semantic H1 Structure', icon: 'check_circle' },
  { key: 'mobile', label: 'Mobile Fluidity', icon: 'check_circle' },
  { key: 'lcp', label: 'Fast LCP (<1.2s)', icon: 'check_circle' },
  { key: 'ssl', label: 'SSL Encryption', icon: 'check_circle' },
  { key: 'schema', label: 'JSON-LD Schema', icon: 'check_circle' },
  { key: 'cta', label: 'CTA Contrast Ratio', icon: 'error' },
  { key: 'alt_text', label: 'Alt-Text Compliance', icon: 'check_circle' },
  { key: 'internal_links', label: 'Internal Link Depth', icon: 'error' },
];

function getGrade(score) {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D';
  return 'F';
}

export default function LandingPageAudit({ audit }) {
  if (!audit) {
    return (
      <div className="bg-surface-container rounded-xl p-6">
        <h3 className="text-sm font-semibold text-on-surface mb-4">Landing Page Audit</h3>
        <p className="text-on-surface-variant text-sm">No audit data. Click &quot;Re-crawl Site&quot; to run.</p>
      </div>
    );
  }

  const overallScore = audit.overall_score || 0;
  const grade = getGrade(overallScore);
  const seoScore = audit.seo_score || 0;
  const uxIndex = audit.ux_index || 0;

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-xl">verified</span>
          <h3 className="text-sm font-semibold text-on-surface">Landing Page Audit</h3>
        </div>
        <StatusBadge
          status={overallScore >= 80 ? 'active' : overallScore >= 60 ? 'running' : 'alert'}
          label={overallScore >= 80 ? 'Optimized' : overallScore >= 60 ? 'Needs Work' : 'Critical'}
        />
      </div>

      <div className="flex items-start gap-6">
        <CircularGrade grade={grade} score={overallScore} />

        <div className="flex-1">
          {audit.summary && (
            <p className="text-on-surface-variant text-sm italic mb-4">&quot;{audit.summary}&quot;</p>
          )}
          <div className="flex items-center gap-6 mb-4">
            <div>
              <span className="text-2xl font-bold text-on-surface">{seoScore}</span>
              <span className="text-on-surface-variant text-sm">/100</span>
              <div className="text-label-sm text-on-surface-variant mt-0.5">SEO Score</div>
            </div>
            <div>
              <span className="text-2xl font-bold text-on-surface">{uxIndex}%</span>
              <div className="text-label-sm text-on-surface-variant mt-0.5">UX Index</div>
            </div>
          </div>
        </div>
      </div>

      {/* Criteria checklist */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-5">
        {AUDIT_CRITERIA.map((c) => {
          const passed = audit.criteria?.[c.key] !== false;
          return (
            <div key={c.key} className="flex items-center gap-2 text-sm">
              <span className={`material-symbols-outlined text-base ${passed ? 'text-secondary' : 'text-error'}`}>
                {passed ? 'check_circle' : 'cancel'}
              </span>
              <span className="text-on-surface-variant">{c.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
