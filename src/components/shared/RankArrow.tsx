export function RankArrow({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-emerald-400">
        ▲<span className="tabular-nums">{change}</span>
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-rose-400">
        ▼<span className="tabular-nums">{Math.abs(change)}</span>
      </span>
    );
  }
  return <span className="font-mono text-[10px] text-[var(--text-tertiary)]">—</span>;
}
