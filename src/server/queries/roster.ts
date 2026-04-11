import { db } from '@/lib/db';

export async function getRoster(leagueSlug: string, userId: string) {
  const league = await db.league.findUnique({ where: { slug: leagueSlug } });
  if (!league) return null;
  const slots = await db.rosterSlot.findMany({
    where: { leagueId: league.id, userId },
    include: { player: { include: { team: true } } },
    orderBy: { acquiredAt: 'asc' },
  });
  return { league, slots };
}
