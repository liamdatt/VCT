import * as React from 'react';

type CardPadding = 'compact' | 'comfortable' | 'hero';

const PADDING: Record<CardPadding, string> = {
  compact: 'p-4',
  comfortable: 'p-5',
  hero: 'p-6',
};

type CardProps = {
  padding?: CardPadding;
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Card({
  padding = 'comfortable',
  interactive,
  className = '',
  children,
}: CardProps) {
  const base =
    'rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-[background-color,border-color,filter] duration-150';
  const hover = interactive
    ? 'cursor-pointer hover:border-[var(--border-default)] hover:brightness-[1.08]'
    : '';
  return (
    <div className={`${base} ${PADDING[padding]} ${hover} ${className}`}>{children}</div>
  );
}

type CardHeaderProps = {
  label?: string;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

export function CardHeader({ label, action, className = '', children }: CardHeaderProps) {
  return (
    <div className={`mb-3 flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        {label && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
            {label}
          </span>
        )}
        {children}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
