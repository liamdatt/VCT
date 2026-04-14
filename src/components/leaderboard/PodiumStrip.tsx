type PodiumEntry = {
  userId: string;
  rank: 1 | 2 | 3;
  username: string;
  total: number;
};

const ORDER: Array<{ rank: 1 | 2 | 3; height: string; order: string }> = [
  { rank: 2, height: 'h-[140px]', order: 'order-1' },
  { rank: 1, height: 'h-[160px]', order: 'order-2' },
  { rank: 3, height: 'h-[140px]', order: 'order-3' },
];

export function PodiumStrip({ entries }: { entries: PodiumEntry[] }) {
  const byRank = new Map(entries.map((e) => [e.rank, e]));
  return (
    <div className="grid grid-cols-3 gap-3">
      {ORDER.map(({ rank, height, order }) => {
        const entry = byRank.get(rank);
        if (!entry) return <div key={rank} className={order} />;
        return (
          <div
            key={rank}
            className={`relative flex ${height} flex-col items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] ${order}`}
          >
            {rank === 1 && (
              <div
                className="pointer-events-none absolute inset-0 rounded-lg"
                style={{
                  background:
                    'radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)',
                }}
              />
            )}
            <span className="font-display text-[72px] font-semibold leading-none tabular-nums text-[var(--text-primary)]">
              {entry.rank}
            </span>
            <span className="mt-2 text-[14px] font-medium text-[var(--text-primary)]">
              {entry.username}
            </span>
            <span className="mt-0.5 font-mono text-[16px] font-semibold tabular-nums text-[var(--text-secondary)]">
              {entry.total.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
