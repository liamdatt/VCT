type Props = {
  name: string;
  shortCode: string;
  size?: number;
  className?: string;
};

// Team logos from vlr.gg aren't safe to hotlink. Render a stylized initials
// chip as the canonical team logo — consistent across the app, zero external
// deps. We can swap to real logos later by changing only this component.
export function TeamLogo({ name, shortCode, size = 24, className = '' }: Props) {
  const initial = (shortCode || name).slice(0, 3).toUpperCase();
  return (
    <span
      aria-label={name}
      title={name}
      className={`inline-flex items-center justify-center rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-elevated)] font-mono font-semibold text-[var(--text-secondary)] ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, Math.round(size * 0.4)),
        letterSpacing: '0.02em',
      }}
    >
      {initial}
    </span>
  );
}
