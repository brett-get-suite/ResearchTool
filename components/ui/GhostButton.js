export default function GhostButton({ children, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-on-surface-variant text-sm font-medium hover:bg-surface-variant/50 hover:text-on-surface transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
