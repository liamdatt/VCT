import { db } from '@/lib/db';

export async function getPlayerPool(leagueSlug: string) {
  const league = await db.league.findUnique({ where: { slug: leagueSlug } });
  if (!league) return [];

  const players = await db.player.findMany({
    where: { leagueId: league.id },
    include: {
      team: true,
      rosterSlots: {
        where: { leagueId: league.id },
        include: { user: true },
      },
      snapshots: {
        where: { leagueId: league.id },
        select: { total: true },
      },
      stats: {
        select: { kills: true, deaths: true, assists: true },
      },
    },
  });

  const result = players.map((p) => {
    const owner = p.rosterSlots[0] ?? null;
    const totalPoints = p.snapshots.reduce((sum, s) => sum + s.total, 0);
    const totalKills = p.stats.reduce((sum, s) => sum + s.kills, 0);
    const totalDeaths = p.stats.reduce((sum, s) => sum + s.deaths, 0);
    const totalAssists = p.stats.reduce((sum, s) => sum + s.assists, 0);
    const mapsPlayed = p.stats.length;

    return {
      id: p.id,
      handle: p.handle,
      teamName: p.team.name,
      teamShortCode: p.team.shortCode,
      ownerUsername: owner?.user.username ?? null,
      ownerUserId: owner?.userId ?? null,
      totalPoints: Math.round(totalPoints * 10) / 10,
      totalKills,
      totalDeaths,
      totalAssists,
      mapsPlayed,
    };
  });

  result.sort((a, b) => b.totalPoints - a.totalPoints);
  return result;
}
