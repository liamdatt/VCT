import { describe, it, expect } from 'vitest';
import { startOfDayJamaica, addDays, isOlderThanDays } from '@/lib/time';

describe('startOfDayJamaica', () => {
  it('returns midnight Jamaica time for a given instant', () => {
    // Jamaica is UTC-5 year-round (no DST).
    // 2026-04-11 14:00 UTC = 2026-04-11 09:00 Jamaica.
    // Start of day Jamaica = 2026-04-11 05:00 UTC.
    const result = startOfDayJamaica(new Date('2026-04-11T14:00:00Z'));
    expect(result.toISOString()).toBe('2026-04-11T05:00:00.000Z');
  });

  it('handles an instant already at Jamaica midnight', () => {
    const result = startOfDayJamaica(new Date('2026-04-11T05:00:00Z'));
    expect(result.toISOString()).toBe('2026-04-11T05:00:00.000Z');
  });

  it('rolls back to previous day when UTC is between 00:00 and 05:00', () => {
    // 2026-04-11 02:00 UTC = 2026-04-10 21:00 Jamaica.
    // Start of day = 2026-04-10 05:00 UTC.
    const result = startOfDayJamaica(new Date('2026-04-11T02:00:00Z'));
    expect(result.toISOString()).toBe('2026-04-10T05:00:00.000Z');
  });
});

describe('isOlderThanDays', () => {
  it('true when past is more than N days before now', () => {
    const now = new Date('2026-04-20T00:00:00Z');
    const past = new Date('2026-04-12T00:00:00Z');
    expect(isOlderThanDays(past, 7, now)).toBe(true);
  });

  it('false when past is exactly N days before now', () => {
    const now = new Date('2026-04-19T00:00:00Z');
    const past = new Date('2026-04-12T00:00:00Z');
    expect(isOlderThanDays(past, 7, now)).toBe(false);
  });

  it('false when past is less than N days ago', () => {
    const now = new Date('2026-04-18T00:00:00Z');
    const past = new Date('2026-04-12T00:00:00Z');
    expect(isOlderThanDays(past, 7, now)).toBe(false);
  });
});

describe('addDays', () => {
  it('adds N days to an instant', () => {
    expect(addDays(new Date('2026-04-11T00:00:00Z'), 3).toISOString()).toBe(
      '2026-04-14T00:00:00.000Z',
    );
  });
});
