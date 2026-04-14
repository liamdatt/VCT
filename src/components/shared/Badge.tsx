import * as React from 'react';

type BadgeVariant = 'neutral' | 'live' | 'win' | 'loss' | 'captain' | 'outline';

const VARIANT: Record<BadgeVariant, string> = {
  neutral: 'bg-white/5 text-[var(--text-secondary)]',
  live: 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]',
  win: 'bg-emerald-500/10 text-emerald-400',
  loss: 'bg-rose-500/10 text-rose-400',
  captain: 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]',
  outline: 'border border-[var(--border-default)] text-[var(--text-secondary)]',
};

type BadgeProps = {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
};

export function Badge({ variant = 'neutral', className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex h-5 items-center rounded-sm px-1.5 text-[10px] font-medium uppercase tracking-wider ${VARIANT[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
