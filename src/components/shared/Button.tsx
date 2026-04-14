'use client';
import * as React from 'react';

type Variant = 'primary' | 'secondary' | 'destructive' | 'hero' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-white text-zinc-950 hover:bg-white/90 disabled:bg-white/50',
  secondary:
    'bg-white/5 text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-white/10',
  destructive:
    'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20',
  hero:
    'bg-[var(--accent-primary)] text-white hover:bg-[#e03e4d]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5',
};

const SIZE: Record<Size, string> = {
  sm: 'h-7 px-3 text-[12px]',
  md: 'h-8 px-4 text-[13px]',
  lg: 'h-10 px-5 text-[14px]',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', icon, className = '', children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-50';
    return (
      <button
        ref={ref}
        className={`${base} ${VARIANT[variant]} ${SIZE[size]} ${className}`}
        {...props}
      >
        {icon && <span className="-ml-0.5 inline-flex h-3.5 w-3.5 items-center">{icon}</span>}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
