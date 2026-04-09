export default function GhostButton({ children, onClick, className = '', disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`ds-btn-ghost ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
