import { describe, it, expect } from 'vitest';
import { aggregateUserTotal, type SnapshotInput } from '@/lib/scoring/aggregate';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

const S = DEFAULT_LEAGUE_SETTINGS;
const t = (iso: string) => new Date(iso);

describe('aggregateUserTotal', () => {
  it('sums plain snapshots with no captain', () => {
    const snaps: SnapshotInput[] = [
      { playerId: 'p1', gameCompletedAt: t('2026-04-10T20:00:00Z'), total: 10 },
      { playerId: 'p2', gameCompletedAt: t('2026-04-10T21:00:00Z'), total: 15 },
    ];
    const result = aggregateUserTotal(snaps, [], S);
    expect(result).toBe(25);
  });

  it('applies 1.5x to captain contributions only', () => {
    const snaps: SnapshotInput[] = [
      { playerId: 'p1', gameCompletedAt: t('2026-04-10T20:00:00Z'), total: 20 },
      { playerId: 'p2', gameCompletedAt: t('2026-04-10T21:00:00Z'), total: 10 },
    ];
    const captainHistory = [
      { newPlayerId: 'p1', changedAt: t('2026-04-09T00:00:00Z') },
    ];
    expect(aggregateUserTotal(snaps, captainHistory, S)).toBe(40);
  });

  it('handles captain swap mid-event (only games after swap get multiplier for new captain)', () => {
    const snaps: SnapshotInput[] = [
      { playerId: 'p1', gameCompletedAt: t('2026-04-10T20:00:00Z'), total: 20 },
      { playerId: 'p1', gameCompletedAt: t('2026-04-12T20:00:00Z'), total: 20 },
      { playerId: 'p2', gameCompletedAt: t('2026-04-12T21:00:00Z'), total: 10 },
    ];
    const captainHistory = [
      { newPlayerId: 'p1', changedAt: t('2026-04-09T00:00:00Z') },
      { newPlayerId: 'p2', changedAt: t('2026-04-11T12:00:00Z') },
    ];
    expect(aggregateUserTotal(snaps, captainHistory, S)).toBe(65);
  });

  it('no captain history → no multiplier', () => {
    const snaps: SnapshotInput[] = [
      { playerId: 'p1', gameCompletedAt: t('2026-04-10T20:00:00Z'), total: 100 },
    ];
    expect(aggregateUserTotal(snaps, [], S)).toBe(100);
  });

  it('returns 0 for no snapshots', () => {
    expect(aggregateUserTotal([], [], S)).toBe(0);
  });
});
