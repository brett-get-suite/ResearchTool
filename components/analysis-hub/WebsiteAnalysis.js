export default function WebsiteAnalysis({ analysis }) {
  if (!analysis) {
    return (
      <div className="bg-surface-container rounded-xl p-6">
        <h3 className="text-sm font-semibold text-on-surface mb-4">Website Analysis</h3>
        <p className="text-on-surface-variant text-sm">No analysis yet. Click &quot;Re-crawl Site&quot; to scan.</p>
      </div>
    );
  }

  const services = analysis.services || [];
  const usps = analysis.usps || [];
  const serviceAreas = analysis.service_areas || [];
  const scannedAt = analysis.scanned_at;

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-on-surface">Website Analysis</h3>
        {scannedAt && (
          <span className="text-label-sm text-on-surface-variant">
            Scanned: {new Date(scannedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Detected Services */}
      {services.length > 0 && (
        <div className="mb-5">
          <div className="text-label-sm text-on-surface-variant mb-2">Detected Services</div>
          <div className="flex flex-wrap gap-2">
            {services.map((s, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface text-xs font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* USPs */}
      {usps.length > 0 && (
        <div className="mb-5">
          <div className="text-label-sm text-on-surface-variant mb-3">Core Unique Selling Points</div>
          <div className="grid grid-cols-2 gap-3">
            {usps.slice(0, 4).map((usp, i) => (
              <div key={i} className="bg-surface-container-low rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-secondary text-base">
                    {['shield', 'location_on', 'trending_up', 'bolt'][i % 4]}
                  </span>
                  <span className="text-sm font-semibold text-on-surface">{usp.title || usp}</span>
                </div>
                {usp.description && (
                  <p className="text-xs text-on-surface-variant">{usp.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Areas */}
      {serviceAreas.length > 0 && (
        <div>
          <div className="text-label-sm text-on-surface-variant mb-2">Target Service Areas</div>
          <div className="flex items-center gap-3 bg-surface-container-low rounded-xl p-3">
            <span className="material-symbols-outlined text-on-surface-variant">location_on</span>
            <span className="text-sm text-on-surface flex-1">{serviceAreas.join(', ')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
