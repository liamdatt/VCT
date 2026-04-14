type Tone = 'live' | 'win' | 'loss' | 'idle' | 'captain';

const COLOR: Record<Tone, string> = {
  live: 'bg-[var(--accent-primary)]',
  win: 'bg-[var(--status-win)]',
  loss: 'bg-[var(--status-loss)]',
  idle: 'bg-[var(--text-tertiary)]',
  captain: 'bg-[var(--accent-primary)]',
};

type Props = { tone?: Tone; pulse?: boolean; className?: string };

export function StatusDot({ tone = 'idle', pulse, className = '' }: Props) {
  return (
    <span className={`relative inline-flex h-1.5 w-1.5 ${className}`}>
      {pulse && (
        <span
          className={`live-pulse-ring absolute inset-0 inline-flex rounded-full ${COLOR[tone]}`}
        />
      )}
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${COLOR[tone]}`} />
    </span>
  );
}
