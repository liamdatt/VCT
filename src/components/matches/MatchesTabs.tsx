'use client';
export type Tab = 'upcoming' | 'live' | 'completed';

type Props = {
  active: Tab;
  onChange: (t: Tab) => void;
  liveCount: number;
};

const LABELS: Record<Tab, string> = {
  upcoming: 'Upcoming',
  live: 'Live',
  completed: 'Completed',
};

export function MatchesTabs({ active, onChange, liveCount }: Props) {
  return (
    <div className="relative flex border-b border-[var(--border-subtle)]">
      {(['upcoming', 'live', 'completed'] as const).map((t) => {
        const isActive = t === active;
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`relative flex h-9 items-center gap-2 px-4 text-[13px] font-medium transition-colors ${
              isActive
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {LABELS[t]}
            {t === 'live' && liveCount > 0 && (
              <span className="inline-flex h-4 items-center rounded-full bg-[var(--accent-primary)]/20 px-1.5 text-[10px] font-semibold text-[var(--accent-primary)]">
                {liveCount}
              </span>
            )}
            {isActive && (
              <span className="absolute right-3 bottom-0 left-3 h-0.5 rounded-t bg-[var(--accent-primary)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
