export function PointsDelta({ value }: { value: number }) {
  const color =
    value > 0
      ? 'text-[--chart-2]'
      : value < 0
        ? 'text-[--primary]'
        : 'text-[--muted-foreground]';
  const prefix = value > 0 ? '+' : '';
  return (
    <span className={`font-mono text-sm font-semibold ${color}`}>
      {prefix}
      {value.toFixed(1)}
    </span>
  );
}
