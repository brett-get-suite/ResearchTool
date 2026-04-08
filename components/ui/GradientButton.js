import Link from 'next/link';

export default function GradientButton({ children, onClick, href, className = '', disabled = false }) {
  const classes = `inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-on-primary text-sm font-semibold transition-transform active:scale-95 ${
    disabled ? 'opacity-50 pointer-events-none' : ''
  } ${className}`;

  if (href) {
    return <Link href={href} className={classes}>{children}</Link>;
  }
  return <button onClick={onClick} className={classes} disabled={disabled}>{children}</button>;
}
