import { db } from '@/lib/db';
import { aggregateUserTotal, type SnapshotInput, type CaptainHistoryEntry } from '@/lib/scoring/aggregate';
import type { LeagueSettings } from '@/lib/scoring/types';

export type LeaderboardRow = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  total: number;
  rank: number;
};

export async function getLeaderboard(leagueSlug: string): Promise<LeaderboardRow[]> {
  const league = await db.league.findUnique({
    where: { slug: leagueSlug },
    include: {
      memberships: { include: { user: true } },
      captainChanges: true,
    },
  });
  if (!league) return [];

  const settings = league.settingsJson as unknown as LeagueSettings;

  const snapshots = await db.scoringSnapshot.findMany({
    where: { leagueId: league.id },
    include: { game: true },
  });
  const adjustments = await db.scoringAdjustment.findMany({
    where: { leagueId: league.id },
  });

  const rows: Omit<LeaderboardRow, 'rank'>[] = league.memberships.map((m) => {
    const userSnaps = snapshots.filter((s) => s.userId === m.userId);
    const snapInputs: SnapshotInput[] = userSnaps.map((s) => ({
      playerId: s.playerId,
      gameCompletedAt: s.game.completedAt ?? new Date(0),
      total: s.total,
    }));
    const userHistory: CaptainHistoryEntry[] = league.captainChanges
      .filter((c) => c.userId === m.userId)
      .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime())
      .map((c) => ({ newPlayerId: c.newPlayerId, changedAt: c.changedAt }));

    const base = aggregateUserTotal(snapInputs, userHistory, settings);
    const adj = adjustments.filter((a) => a.userId === m.userId).reduce((acc, a) => acc + a.delta, 0);

    return {
      userId: m.userId,
      username: m.user.username,
      avatarUrl: m.user.avatarUrl,
      total: Math.round((base + adj) * 10) / 10,
    };
  });

  rows.sort((a, b) => b.total - a.total);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
