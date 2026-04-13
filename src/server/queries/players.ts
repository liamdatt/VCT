import { db } from '@/lib/db';
import { computeGamePoints } from '@/lib/scoring/rules';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

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
      stats: {
        include: { game: true },
      },
    },
  });

  const settings = (league.settingsJson as unknown as typeof DEFAULT_LEAGUE_SETTINGS) ?? DEFAULT_LEAGUE_SETTINGS;

  const result = players.map((p) => {
    const owner = p.rosterSlots[0] ?? null;
    let totalPoints = 0;
    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;

    for (const s of p.stats) {
      totalKills += s.kills;
      totalDeaths += s.deaths;
      totalAssists += s.assists;
      const breakdown = computeGamePoints(
        { kills: s.kills, deaths: s.deaths, assists: s.assists, aces: s.aces, won: s.won },
        settings,
      );
      totalPoints += breakdown.total;
    }

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
      mapsPlayed: p.stats.length,
    };
  });

  result.sort((a, b) => b.totalPoints - a.totalPoints);
  return result;
}
