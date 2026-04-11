// Jamaica is UTC-5 year-round (no DST). Hardcoded rather than relying on Intl
// so behavior is deterministic in tests regardless of the host TZ.
const JAMAICA_OFFSET_MINUTES = -5 * 60;

export function startOfDayJamaica(instant: Date): Date {
  const utcMs = instant.getTime();
  const localMs = utcMs + JAMAICA_OFFSET_MINUTES * 60 * 1000;
  const localDay = Math.floor(localMs / (24 * 60 * 60 * 1000));
  const startOfDayLocalMs = localDay * 24 * 60 * 60 * 1000;
  const startOfDayUtcMs = startOfDayLocalMs - JAMAICA_OFFSET_MINUTES * 60 * 1000;
  return new Date(startOfDayUtcMs);
}

export function addDays(instant: Date, days: number): Date {
  return new Date(instant.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isOlderThanDays(past: Date, days: number, now: Date = new Date()): boolean {
  const diffMs = now.getTime() - past.getTime();
  return diffMs > days * 24 * 60 * 60 * 1000;
}
