'use client';

export default function StepAssets({ form, onChange }) {
  // ── Sitelinks ──────────────────────────────────────────────────────────────

  function updateSitelink(idx, field, value) {
    const updated = form.sitelinks.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
    onChange('sitelinks', updated);
  }

  function addSitelink() {
    if (form.sitelinks.length >= 6) return;
    onChange('sitelinks', [
      ...form.sitelinks,
      { headline: '', description1: '', description2: '', finalUrl: '' },
    ]);
  }

  function removeSitelink(idx) {
    if (form.sitelinks.length <= 1) return;
    onChange('sitelinks', form.sitelinks.filter((_, i) => i !== idx));
  }

  // ── Callouts ───────────────────────────────────────────────────────────────

  function updateCallout(idx, value) {
    const updated = form.callouts.map((c, i) => (i === idx ? value : c));
    onChange('callouts', updated);
  }

  function addCallout() {
    if (form.callouts.length >= 10) return;
    onChange('callouts', [...form.callouts, '']);
  }

  function removeCallout(idx) {
    if (form.callouts.length <= 1) return;
    onChange('callouts', form.callouts.filter((_, i) => i !== idx));
  }

  // ── Structured Snippets ────────────────────────────────────────────────────

  function updateSnippetValue(idx, value) {
    const updated = form.structuredSnippets.values.map((v, i) => (i === idx ? value : v));
    onChange('structuredSnippets', { ...form.structuredSnippets, values: updated });
  }

  function addSnippetValue() {
    if (form.structuredSnippets.values.length >= 10) return;
    onChange('structuredSnippets', {
      ...form.structuredSnippets,
      values: [...form.structuredSnippets.values, ''],
    });
  }

  const SNIPPET_HEADERS = [
    'Amenities', 'Brands', 'Courses', 'Degree programs', 'Destinations',
    'Featured hotels', 'Insurance coverage', 'Models', 'Neighborhoods',
    'Service catalog', 'Shows', 'Styles', 'Types',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-headline-sm text-on-surface mb-1">Ad Assets</h2>
        <p className="text-sm text-on-surface-variant">
          Extensions make your ads larger and more useful. They improve click-through rate and ad rank.
        </p>
      </div>

      {/* ── Sitelinks ──────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="field-label !mb-0">Sitelinks</label>
          <span className="text-xs text-on-surface-variant">{form.sitelinks.length}/6</span>
        </div>
        <div className="space-y-3">
          {form.sitelinks.map((sl, i) => (
            <div key={i} className="bg-surface-container-high rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface-variant">Sitelink {i + 1}</span>
                {form.sitelinks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSitelink(i)}
                    className="text-on-surface-variant/40 hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                className="field-input text-sm"
                placeholder="Sitelink headline (25 chars)"
                maxLength={25}
                value={sl.headline}
                onChange={(e) => updateSitelink(i, 'headline', e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  className="field-input text-sm"
                  placeholder="Description line 1 (35 chars)"
                  maxLength={35}
                  value={sl.description1}
                  onChange={(e) => updateSitelink(i, 'description1', e.target.value)}
                />
                <input
                  type="text"
                  className="field-input text-sm"
                  placeholder="Description line 2 (35 chars)"
                  maxLength={35}
                  value={sl.description2}
                  onChange={(e) => updateSitelink(i, 'description2', e.target.value)}
                />
              </div>
              <input
                type="url"
                className="field-input text-sm"
                placeholder="https://yourwebsite.com/page"
                value={sl.finalUrl}
                onChange={(e) => updateSitelink(i, 'finalUrl', e.target.value)}
              />
            </div>
          ))}
        </div>
        {form.sitelinks.length < 6 && (
          <button
            type="button"
            onClick={addSitelink}
            className="mt-2 text-xs text-primary font-semibold hover:text-primary/80 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Add Sitelink
          </button>
        )}
      </div>

      {/* ── Callouts ───────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="field-label !mb-0">Callouts</label>
          <span className="text-xs text-on-surface-variant">{form.callouts.length}/10</span>
        </div>
        <div className="space-y-2">
          {form.callouts.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                className="field-input text-sm flex-1"
                placeholder={`Callout ${i + 1} (25 chars) — e.g. "Free Estimates"`}
                maxLength={25}
                value={c}
                onChange={(e) => updateCallout(i, e.target.value)}
              />
              {form.callouts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCallout(i)}
                  className="text-on-surface-variant/40 hover:text-error shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          ))}
        </div>
        {form.callouts.length < 10 && (
          <button
            type="button"
            onClick={addCallout}
            className="mt-2 text-xs text-primary font-semibold hover:text-primary/80 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Add Callout
          </button>
        )}
      </div>

      {/* ── Structured Snippets ────────────────────────────────────────────── */}
      <div>
        <label className="field-label">Structured Snippets</label>
        <div className="space-y-2">
          <select
            className="field-input text-sm"
            value={form.structuredSnippets.header}
            onChange={(e) =>
              onChange('structuredSnippets', { ...form.structuredSnippets, header: e.target.value })
            }
          >
            <option value="">Select header type...</option>
            {SNIPPET_HEADERS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          {form.structuredSnippets.header && (
            <div className="space-y-2 mt-2">
              {form.structuredSnippets.values.map((v, i) => (
                <input
                  key={i}
                  type="text"
                  className="field-input text-sm"
                  placeholder={`Value ${i + 1} (25 chars)`}
                  maxLength={25}
                  value={v}
                  onChange={(e) => updateSnippetValue(i, e.target.value)}
                />
              ))}
              {form.structuredSnippets.values.length < 10 && (
                <button
                  type="button"
                  onClick={addSnippetValue}
                  className="text-xs text-primary font-semibold hover:text-primary/80 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Add Value
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
