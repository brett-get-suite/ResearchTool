export default function GlassCard({ children, className = '' }) {
  return (
    <div className={`glass rounded-xl p-6 ${className}`}>
      {children}
    </div>
  );
}
