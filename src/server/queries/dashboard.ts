import { db } from '@/lib/db';
import { getLeaderboard } from './leaderboard';

export async function getDashboard(leagueSlug: string, userId: string) {
  const league = await db.league.findUnique({ where: { slug: leagueSlug } });
  if (!league) return null;

  const leaderboard = await getLeaderboard(leagueSlug);

  const liveMatch = await db.match.findFirst({
    where: { leagueId: league.id, status: 'LIVE' },
    include: {
      team1: true,
      team2: true,
      games: {
        orderBy: { mapNumber: 'asc' },
        include: { stats: { include: { player: { include: { team: true } } } } },
      },
    },
  });

  const myRoster = await db.rosterSlot.findMany({
    where: { leagueId: league.id, userId },
    include: { player: true },
  });
  const myPlayerIds = new Set(myRoster.map((r) => r.player.id));

  return { league, leaderboard, liveMatch, myPlayerIds, myRoster };
}
