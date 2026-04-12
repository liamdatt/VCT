import { db } from '@/lib/db';
import type { MatchStatus } from '@prisma/client';

export async function getMatchesByStatus(leagueSlug: string, status: MatchStatus) {
  const league = await db.league.findUnique({ where: { slug: leagueSlug } });
  if (!league) return [];

  return db.match.findMany({
    where: { leagueId: league.id, status },
    include: {
      team1: true,
      team2: true,
      games: { orderBy: { mapNumber: 'asc' } },
    },
    orderBy: {
      scheduledAt: status === 'COMPLETED' ? 'desc' : 'asc',
    },
  });
}

export async function getMatchDetail(matchId: string) {
  return db.match.findUnique({
    where: { id: matchId },
    include: {
      team1: true,
      team2: true,
      games: {
        orderBy: { mapNumber: 'asc' },
        include: {
          stats: {
            include: { player: { include: { team: true } } },
          },
          snapshots: true,
        },
      },
    },
  });
}
