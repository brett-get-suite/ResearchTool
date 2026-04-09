'use client';

// ─── Step Groups ─────────────────────────────────────────────────────────────

export const STEP_GROUPS = [
  {
    label: 'Strategy',
    icon: 'target',
    steps: [
      { num: 1, label: 'Strategy' },
      { num: 2, label: 'Campaign Type' },
      { num: 3, label: 'Structure' },
    ],
  },
  {
    label: 'Keywords',
    icon: 'key',
    steps: [
      { num: 4, label: 'Keywords' },
      { num: 5, label: 'Match Types' },
    ],
  },
  {
    label: 'Creative',
    icon: 'edit_note',
    steps: [
      { num: 6, label: 'Negatives' },
      { num: 7, label: 'Ad Copy' },
      { num: 8, label: 'Landing Page' },
      { num: 9, label: 'Assets' },
    ],
  },
  {
    label: 'Targeting',
    icon: 'my_location',
    steps: [
      { num: 10, label: 'Location & Language' },
      { num: 11, label: 'Demographics' },
      { num: 12, label: 'Schedule' },
    ],
  },
  {
    label: 'Launch',
    icon: 'rocket_launch',
    steps: [
      { num: 13, label: 'Budget & Bidding' },
      { num: 14, label: 'Review & Launch' },
    ],
  },
];

export const TOTAL_STEPS = 14;

// ─── WizardNav ───────────────────────────────────────────────────────────────

export default function WizardNav({ currentStep, onStepClick }) {
  return (
    <div className="flex items-start gap-1 mb-8 overflow-x-auto pb-2">
      {STEP_GROUPS.map((group, gi) => {
        const groupStart = group.steps[0].num;
        const groupEnd = group.steps[group.steps.length - 1].num;
        const isGroupActive = currentStep >= groupStart && currentStep <= groupEnd;
        const isGroupDone = currentStep > groupEnd;

        return (
          <div key={group.label} className="contents">
            <div className="flex flex-col items-center min-w-0">
              {/* Group header */}
              <div className="flex items-center gap-1.5 mb-2">
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    isGroupDone
                      ? 'text-secondary'
                      : isGroupActive
                      ? 'text-primary'
                      : 'text-on-surface-variant/40'
                  }`}
                >
                  {isGroupDone ? 'check_circle' : group.icon}
                </span>
                <span
                  className={`text-[0.625rem] font-semibold uppercase tracking-wider whitespace-nowrap ${
                    isGroupDone
                      ? 'text-secondary'
                      : isGroupActive
                      ? 'text-primary'
                      : 'text-on-surface-variant/40'
                  }`}
                >
                  {group.label}
                </span>
              </div>

              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {group.steps.map((step) => {
                  const isDone = currentStep > step.num;
                  const isCurrent = currentStep === step.num;
                  const canClick = onStepClick && step.num < currentStep;

                  return (
                    <button
                      key={step.num}
                      type="button"
                      onClick={() => canClick && onStepClick(step.num)}
                      disabled={!canClick}
                      title={`Step ${step.num}: ${step.label}`}
                      className={`
                        relative flex items-center justify-center rounded-full transition-all
                        ${isCurrent
                          ? 'w-7 h-7 bg-primary/15 ring-1 ring-primary/30 text-primary text-[11px] font-bold'
                          : isDone
                          ? 'w-5 h-5 bg-secondary/20 text-secondary cursor-pointer hover:bg-secondary/30'
                          : 'w-5 h-5 bg-surface-container-high text-on-surface-variant/40'
                        }
                        ${canClick ? 'cursor-pointer' : 'cursor-default'}
                      `}
                    >
                      {isDone ? (
                        <span className="material-symbols-outlined text-[12px]">check</span>
                      ) : (
                        <span className="text-[10px] font-semibold">{step.num}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Connector between groups */}
            {gi < STEP_GROUPS.length - 1 && (
              <div className="flex items-center self-center mt-3 px-1">
                <div
                  className={`w-6 h-px ${
                    currentStep > groupEnd ? 'bg-secondary/40' : 'bg-outline-variant/20'
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── WizardFooter ────────────────────────────────────────────────────────────

export function WizardFooter({
  currentStep,
  onBack,
  onNext,
  onCancel,
  nextLabel,
  nextDisabled,
  showCancel = true,
}) {
  return (
    <div className="flex items-center justify-between mt-10 pt-6">
      <div>
        {currentStep > 1 ? (
          <button type="button" onClick={onBack} className="pill-btn-secondary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back
          </button>
        ) : showCancel ? (
          <button type="button" onClick={onCancel} className="pill-btn-secondary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">close</span>
            Cancel
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="pill-btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {nextLabel || 'Next'}
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </button>
    </div>
  );
}
