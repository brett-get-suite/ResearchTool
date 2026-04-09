export default function EmptyState({ icon, title, description, children, className = '' }) {
  return (
    <div className={`ds-empty-state ${className}`}>
      {icon && (
        <span className="material-symbols-outlined ds-empty-state__icon">{icon}</span>
      )}
      {title && <p className="ds-empty-state__title">{title}</p>}
      {description && <p className="ds-empty-state__desc">{description}</p>}
      {children && <div className="ds-empty-state__cta">{children}</div>}
    </div>
  );
}
