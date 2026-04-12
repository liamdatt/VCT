import { auth } from '@/lib/auth';
import { getLeaderboard } from '@/server/queries/leaderboard';
import { db } from '@/lib/db';
import { LeaderboardClient } from '@/components/leaderboard/LeaderboardClient';

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const rows = await getLeaderboard(slug);

  // Get league for snapshot queries
  const league = await db.league.findUnique({ where: { slug } });
  if (!league) return <p className="text-[--muted-foreground]">League not found</p>;

  // Get per-user player breakdowns from snapshots + current rosters
  const snapshots = await db.scoringSnapshot.findMany({
    where: { leagueId: league.id },
    include: {
      player: { include: { team: true } },
    },
  });

  const currentRosters = await db.rosterSlot.findMany({
    where: { leagueId: league.id },
    select: { userId: true, playerId: true },
  });
  const rosterSet = new Set(
    currentRosters.map((r) => `${r.userId}:${r.playerId}`)
  );

  // Group snapshots by userId -> playerId -> total
  const userPlayerTotals = new Map<
    string,
    Map<string, { handle: string; teamShortCode: string; total: number }>
  >();
  for (const snap of snapshots) {
    let userMap = userPlayerTotals.get(snap.userId);
    if (!userMap) {
      userMap = new Map();
      userPlayerTotals.set(snap.userId, userMap);
    }
    const existing = userMap.get(snap.playerId);
    if (existing) {
      existing.total += snap.total;
    } else {
      userMap.set(snap.playerId, {
        handle: snap.player.handle,
        teamShortCode: snap.player.team.shortCode,
        total: snap.total,
      });
    }
  }

  const enrichedRows = rows.map((r) => {
    const playerMap = userPlayerTotals.get(r.userId);
    const players = playerMap
      ? [...playerMap.entries()]
          .map(([playerId, data]) => ({
            handle: data.handle,
            teamShortCode: data.teamShortCode,
            points: Math.round(data.total * 10) / 10,
            onRoster: rosterSet.has(`${r.userId}:${playerId}`),
          }))
          .sort((a, b) => b.points - a.points)
      : [];

    return { ...r, players };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[--foreground]">Leaderboard</h1>
      <LeaderboardClient rows={enrichedRows} currentUserId={session.user.id} />
    </div>
  );
}
