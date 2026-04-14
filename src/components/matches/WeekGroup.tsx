type Props = {
  title: string;
  children: React.ReactNode;
};

export function WeekGroup({ title, children }: Props) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="font-display text-[14px] font-medium text-[var(--text-secondary)]">
          {title}
        </span>
        <span className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
