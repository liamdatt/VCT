type Props = { value: number; showSuffix?: boolean };

export function PointsDelta({ value, showSuffix = true }: Props) {
  const rounded = Math.round(value * 10) / 10;
  const color =
    rounded > 0
      ? 'text-emerald-400'
      : rounded < 0
        ? 'text-rose-400'
        : 'text-[var(--text-tertiary)]';
  const prefix = rounded > 0 ? '+' : '';
  return (
    <span className={`inline-flex items-baseline gap-1 font-mono tabular-nums ${color}`}>
      <span className="text-[14px] font-semibold">
        {prefix}
        {rounded.toFixed(1)}
      </span>
      {showSuffix && (
        <span className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)]">
          pts
        </span>
      )}
    </span>
  );
}
