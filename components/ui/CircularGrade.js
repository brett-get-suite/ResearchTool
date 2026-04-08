const GRADE_COLORS = {
  'A+': 'var(--secondary)',
  'A': 'var(--secondary)',
  'A-': 'var(--secondary)',
  'B+': 'var(--primary)',
  'B': 'var(--primary)',
  'B-': 'var(--primary)',
  'C+': 'var(--tertiary)',
  'C': 'var(--tertiary)',
  'C-': 'var(--tertiary)',
  'D': 'var(--error)',
  'F': 'var(--error)',
};

export default function CircularGrade({ grade, score, size = 160, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.min(Math.max(score || 0, 0), 100);
  const offset = circumference - (normalizedScore / 100) * circumference;
  const color = GRADE_COLORS[grade] || 'var(--on-surface-variant)';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        role="img"
        aria-label={`Grade: ${grade}, Score: ${normalizedScore}%`}
      >
        <title>{`Grade ${grade} — ${normalizedScore}%`}</title>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-container-high)"
          strokeWidth={strokeWidth}
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="text-3xl font-bold text-on-surface">{grade}</span>
        <span className="text-label-sm text-on-surface-variant">Grade</span>
      </div>
    </div>
  );
}
