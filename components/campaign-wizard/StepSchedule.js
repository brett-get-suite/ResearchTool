'use client';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h) {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

export default function StepSchedule({ form, onChange }) {
  const schedule = form.daypartSchedule || {};

  function toggleHour(day, hour) {
    const key = day;
    const current = schedule[key] || [];
    const updated = current.includes(hour)
      ? current.filter((h) => h !== hour)
      : [...current, hour].sort((a, b) => a - b);
    onChange('daypartSchedule', { ...schedule, [key]: updated });
  }

  function isActive(day, hour) {
    return (schedule[day] || []).includes(hour);
  }

  function selectAllDay(day) {
    onChange('daypartSchedule', { ...schedule, [day]: [...HOURS] });
  }

  function clearDay(day) {
    const next = { ...schedule };
    delete next[day];
    onChange('daypartSchedule', next);
  }

  function selectBusinessHours() {
    const businessSchedule = {};
    DAYS.slice(0, 5).forEach((day) => {
      businessSchedule[day] = Array.from({ length: 10 }, (_, i) => i + 8); // 8am - 5pm
    });
    onChange('daypartSchedule', businessSchedule);
  }

  function selectAllHours() {
    const allSchedule = {};
    DAYS.forEach((day) => {
      allSchedule[day] = [...HOURS];
    });
    onChange('daypartSchedule', allSchedule);
  }

  function clearAll() {
    onChange('daypartSchedule', {});
  }

  const hasSchedule = Object.values(schedule).some((hours) => hours?.length > 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-headline-sm text-on-surface mb-1">Schedule & Dayparting</h2>
        <p className="text-sm text-on-surface-variant">
          Set campaign dates and optionally control when your ads run during the day.
        </p>
      </div>

      {/* Flight dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="field-label">Start Date</label>
          <input
            type="date"
            className="field-input text-sm"
            value={form.startDate}
            onChange={(e) => onChange('startDate', e.target.value)}
          />
          <p className="text-xs text-on-surface-variant/60 mt-1">Leave empty to start immediately</p>
        </div>
        <div>
          <label className="field-label">End Date</label>
          <input
            type="date"
            className="field-input text-sm"
            value={form.endDate}
            onChange={(e) => onChange('endDate', e.target.value)}
          />
          <p className="text-xs text-on-surface-variant/60 mt-1">Leave empty to run indefinitely</p>
        </div>
      </div>

      {/* Dayparting */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="field-label !mb-0">Dayparting Schedule</label>
          <div className="flex gap-2">
            <button type="button" onClick={selectBusinessHours} className="text-[0.625rem] text-primary font-semibold hover:text-primary/80">
              Business Hours
            </button>
            <span className="text-on-surface-variant/20">|</span>
            <button type="button" onClick={selectAllHours} className="text-[0.625rem] text-primary font-semibold hover:text-primary/80">
              All Hours
            </button>
            <span className="text-on-surface-variant/20">|</span>
            <button type="button" onClick={clearAll} className="text-[0.625rem] text-on-surface-variant font-semibold hover:text-error">
              Clear
            </button>
          </div>
        </div>

        {!hasSchedule && (
          <p className="text-xs text-on-surface-variant/60 mb-3">
            No schedule set — ads will run 24/7. Click cells below or use a preset.
          </p>
        )}

        {/* Heatmap grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Hour labels */}
            <div className="flex items-center mb-1">
              <div className="w-20 shrink-0" />
              {HOURS.map((h) => (
                <div key={h} className="flex-1 text-center">
                  <span className="text-[0.5rem] text-on-surface-variant/40">
                    {h % 3 === 0 ? formatHour(h) : ''}
                  </span>
                </div>
              ))}
            </div>

            {/* Day rows */}
            {DAYS.map((day) => {
              const dayHours = schedule[day] || [];
              return (
                <div key={day} className="flex items-center mb-0.5">
                  <div className="w-20 shrink-0 flex items-center justify-between pr-2">
                    <span className="text-[0.625rem] text-on-surface-variant font-medium">
                      {day.slice(0, 3)}
                    </span>
                    <button
                      type="button"
                      onClick={() => dayHours.length === 24 ? clearDay(day) : selectAllDay(day)}
                      className="text-[0.5rem] text-primary/60 hover:text-primary"
                    >
                      {dayHours.length === 24 ? 'clear' : 'all'}
                    </button>
                  </div>
                  {HOURS.map((h) => {
                    const active = isActive(day, h);
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => toggleHour(day, h)}
                        className={`flex-1 h-5 transition-colors ${
                          active
                            ? 'bg-primary/40 hover:bg-primary/60'
                            : 'bg-surface-container-high hover:bg-surface-bright'
                        } ${h === 0 ? 'rounded-l' : ''} ${h === 23 ? 'rounded-r' : ''}`}
                        title={`${day} ${formatHour(h)}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-tertiary/10 rounded-lg p-3 flex gap-2.5">
        <span className="material-symbols-outlined text-tertiary text-[18px] shrink-0 mt-0.5">lightbulb</span>
        <p className="text-xs text-on-surface-variant">
          Dayparting lets you focus budget on peak hours. For service businesses, weekday mornings (8am–12pm)
          typically see the highest conversion rates. Review your account's hourly data in Agent Controls
          for data-driven scheduling.
        </p>
      </div>
    </div>
  );
}
