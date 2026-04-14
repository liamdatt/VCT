type Props = { children: React.ReactNode; className?: string };

export function SectionLabel({ children, className = '' }: Props) {
  return (
    <span
      className={`text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] ${className}`}
    >
      {children}
    </span>
  );
}
