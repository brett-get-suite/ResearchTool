'use client';

import { useState } from 'react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
];

const AGE_RANGES = [
  { value: '18-24', label: '18–24' },
  { value: '25-34', label: '25–34' },
  { value: '35-44', label: '35–44' },
  { value: '45-54', label: '45–54' },
  { value: '55-64', label: '55–64' },
  { value: '65+', label: '65+' },
];

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'UNDETERMINED', label: 'Unknown' },
];

const HOUSEHOLD_INCOMES = [
  { value: 'TOP_10', label: 'Top 10%' },
  { value: 'TOP_20', label: '11–20%' },
  { value: 'TOP_30', label: '21–30%' },
  { value: 'TOP_40', label: '31–40%' },
  { value: 'TOP_50', label: '41–50%' },
  { value: 'LOWER_50', label: 'Lower 50%' },
];

function ToggleChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full transition-all font-medium ${
        active
          ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
          : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-bright'
      }`}
    >
      {active && <span className="mr-1">✓</span>}
      {label}
    </button>
  );
}

export default function StepTargeting({ form, onChange, section = 'all' }) {
  const [locationInput, setLocationInput] = useState('');

  function addLocation() {
    const loc = locationInput.trim();
    if (!loc || form.locations.includes(loc)) return;
    onChange('locations', [...form.locations, loc]);
    setLocationInput('');
  }

  function removeLocation(idx) {
    onChange('locations', form.locations.filter((_, i) => i !== idx));
  }

  function toggleArrayValue(field, value) {
    const current = form[field] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange(field, updated);
  }

  function toggleLanguage(code) {
    toggleArrayValue('languages', code);
  }

  const showLocations = section === 'all' || section === 'location';
  const showDemographics = section === 'all' || section === 'demographics';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-headline-sm text-on-surface mb-1">
          {section === 'demographics' ? 'Demographics' : section === 'location' ? 'Location & Language' : 'Targeting'}
        </h2>
        <p className="text-sm text-on-surface-variant">
          {section === 'demographics'
            ? 'Narrow your audience by age, gender, and household income.'
            : section === 'location'
            ? 'Define where your ads will show and what languages to target.'
            : 'Define who sees your ads — location, language, and demographics.'}
        </p>
      </div>

      {/* ── Locations ──────────────────────────────────────────────────────── */}
      {showLocations && <div>
        <label className="field-label">Locations <span className="text-error">*</span></label>
        <p className="text-xs text-on-surface-variant mb-2">
          Enter cities, states, ZIP codes, or radius targets.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            className="field-input flex-1"
            placeholder="e.g. Phoenix, AZ or 85001"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
          />
          <button
            type="button"
            onClick={addLocation}
            disabled={!locationInput.trim()}
            className="pill-btn-secondary shrink-0 disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add
          </button>
        </div>
        {form.locations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {form.locations.map((loc, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full group"
              >
                <span className="material-symbols-outlined text-[12px]">location_on</span>
                {loc}
                <button
                  type="button"
                  onClick={() => removeLocation(i)}
                  className="opacity-0 group-hover:opacity-100 text-primary/60 hover:text-error transition-opacity"
                >
                  <span className="material-symbols-outlined text-[12px]">close</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>}

      {/* ── Languages ──────────────────────────────────────────────────────── */}
      {showLocations && <div>
        <label className="field-label">Languages</label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {LANGUAGES.map((lang) => (
            <ToggleChip
              key={lang.code}
              label={lang.label}
              active={form.languages.includes(lang.code)}
              onClick={() => toggleLanguage(lang.code)}
            />
          ))}
        </div>
      </div>}

      {/* ── Demographics ───────────────────────────────────────────────────── */}
      {showDemographics && <div>
        <label className="field-label">Age Ranges</label>
        <p className="text-xs text-on-surface-variant mb-2">Leave empty to target all ages.</p>
        <div className="flex flex-wrap gap-1.5">
          {AGE_RANGES.map((age) => (
            <ToggleChip
              key={age.value}
              label={age.label}
              active={form.ageRanges.includes(age.value)}
              onClick={() => toggleArrayValue('ageRanges', age.value)}
            />
          ))}
        </div>
      </div>}

      {showDemographics && <div>
        <label className="field-label">Gender</label>
        <p className="text-xs text-on-surface-variant mb-2">Leave empty to target all genders.</p>
        <div className="flex flex-wrap gap-1.5">
          {GENDERS.map((g) => (
            <ToggleChip
              key={g.value}
              label={g.label}
              active={form.genders.includes(g.value)}
              onClick={() => toggleArrayValue('genders', g.value)}
            />
          ))}
        </div>
      </div>}

      {showDemographics && <div>
        <label className="field-label">Household Income</label>
        <p className="text-xs text-on-surface-variant mb-2">Leave empty to target all income levels.</p>
        <div className="flex flex-wrap gap-1.5">
          {HOUSEHOLD_INCOMES.map((inc) => (
            <ToggleChip
              key={inc.value}
              label={inc.label}
              active={form.householdIncomes.includes(inc.value)}
              onClick={() => toggleArrayValue('householdIncomes', inc.value)}
            />
          ))}
        </div>
      </div>}
    </div>
  );
}
