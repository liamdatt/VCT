import type { LeagueSettings } from './types';

export type SnapshotInput = {
  playerId: string;
  gameCompletedAt: Date;
  total: number;
};

export type CaptainHistoryEntry = {
  newPlayerId: string;
  changedAt: Date;
};

function captainAt(history: CaptainHistoryEntry[], at: Date): string | null {
  let current: string | null = null;
  for (const entry of history) {
    if (entry.changedAt.getTime() <= at.getTime()) current = entry.newPlayerId;
    else break;
  }
  return current;
}

export function aggregateUserTotal(
  snapshots: SnapshotInput[],
  captainHistory: CaptainHistoryEntry[],
  settings: LeagueSettings,
): number {
  const sorted = [...captainHistory].sort(
    (a, b) => a.changedAt.getTime() - b.changedAt.getTime(),
  );
  let total = 0;
  for (const snap of snapshots) {
    const captain = captainAt(sorted, snap.gameCompletedAt);
    const multiplier = captain === snap.playerId ? settings.captainMultiplier : 1;
    total += snap.total * multiplier;
  }
  return total;
}
