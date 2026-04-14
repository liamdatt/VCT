export function LivePulse() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="live-pulse-ring absolute inset-0 inline-flex rounded-full bg-[var(--accent-primary)]" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
    </span>
  );
}
