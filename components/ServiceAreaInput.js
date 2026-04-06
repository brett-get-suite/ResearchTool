'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export default function ServiceAreaInput({ value, onChange }) {
  // value: string[] (chip labels), onChange: (string[]) => void
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [nearby, setNearby] = useState([]);
  const [showAllNearby, setShowAllNearby] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch { setSuggestions([]); }
  }, []);

  const fetchNearby = useCallback(async (lat, lng) => {
    if (!lat || !lng) return;
    try {
      const res = await fetch(`/api/places/nearby?lat=${lat}&lng=${lng}&radius=30`);
      const data = await res.json();
      setNearby(Array.isArray(data) ? data : []);
    } catch { setNearby([]); }
  }, []);

  const handleInputChange = (e) => {
    const v = e.target.value;
    setInput(v);
    setHighlightIndex(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 300);
  };

  const addChip = (label) => {
    if (!label.trim() || value.includes(label)) return;
    onChange([...value, label]);
  };

  const removeChip = (label) => {
    onChange(value.filter(v => v !== label));
  };

  const selectSuggestion = (suggestion) => {
    addChip(suggestion.label);
    setInput('');
    setSuggestions([]);
    setHighlightIndex(-1);
    setShowAllNearby(false);
    if (suggestion.lat && suggestion.lng) {
      fetchNearby(suggestion.lat, suggestion.lng);
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && suggestions[highlightIndex]) {
        selectSuggestion(suggestions[highlightIndex]);
      } else if (input.trim()) {
        addChip(input.trim());
        setInput('');
        setSuggestions([]);
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setHighlightIndex(-1);
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const visibleNearby = showAllNearby ? nearby : nearby.slice(0, 4);
  const hiddenCount = nearby.length - 4;

  return (
    <div className="space-y-2">
      {/* Chips + input */}
      <div className="field-input flex flex-wrap gap-1.5 min-h-[42px] cursor-text" onClick={() => inputRef.current?.focus()}>
        {value.map(chip => (
          <span key={chip} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-label font-semibold px-2.5 py-1 rounded-full">
            {chip}
            <button type="button" onClick={() => removeChip(chip)} className="hover:text-red-600 transition-colors">
              <span className="material-symbols-outlined text-[12px]">close</span>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? 'Type a city or zip code…' : ''}
          className="flex-1 min-w-32 bg-transparent outline-none text-sm text-on-surface placeholder:text-outline"
        />
      </div>

      {/* Autocomplete dropdown */}
      {suggestions.length > 0 && (
        <div className="border border-outline-variant/30 rounded-xl bg-surface-lowest shadow-modal overflow-hidden z-50">
          {suggestions.map((s, i) => (
            <button
              key={s.placeId || s.label}
              type="button"
              onClick={() => selectSuggestion(s)}
              className={`w-full text-left px-4 py-2.5 text-sm font-label transition-colors ${i === highlightIndex ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-low'}`}
            >
              <span className="material-symbols-outlined text-[14px] mr-2 text-secondary align-middle">location_on</span>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Nearby suggestions */}
      {nearby.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-label font-bold text-secondary uppercase tracking-widest">Nearby:</span>
          {visibleNearby.map(n => (
            <button
              key={n.label}
              type="button"
              onClick={() => { addChip(n.label); }}
              disabled={value.includes(n.label)}
              className="text-xs font-label px-2.5 py-1 rounded-full border border-outline-variant/30 text-secondary hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + {n.label}
            </button>
          ))}
          {!showAllNearby && hiddenCount > 0 && (
            <button type="button" onClick={() => setShowAllNearby(true)} className="text-xs font-label text-primary hover:underline">
              + {hiddenCount} more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
