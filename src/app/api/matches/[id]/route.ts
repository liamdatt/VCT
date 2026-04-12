import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getMatchDetail } from '@/server/queries/matches';
import { computeGamePoints } from '@/lib/scoring/rules';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse('unauthorized', { status: 401 });
  }

  const { id } = await params;
  const match = await getMatchDetail(id);
  if (!match) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // Gather all player IDs from the match to look up roster slots
  const allPlayerIds = new Set<string>();
  for (const game of match.games) {
    for (const stat of game.stats) {
      allPlayerIds.add(stat.playerId);
    }
  }

  // Fetch roster slots for these players in this league
  const rosterSlots = await db.rosterSlot.findMany({
    where: {
      leagueId: match.leagueId,
      playerId: { in: [...allPlayerIds] },
    },
    include: { user: true },
  });

  const rosterMap = new Map(
    rosterSlots.map((rs) => [
      rs.playerId,
      { ownerUsername: rs.user.username, isCaptain: rs.isCaptain },
    ]),
  );

  const maps = match.games.map((game) => {
    const players = game.stats.map((stat) => {
      const breakdown = computeGamePoints(
        {
          kills: stat.kills,
          deaths: stat.deaths,
          assists: stat.assists,
          aces: stat.aces,
          won: stat.won,
        },
        DEFAULT_LEAGUE_SETTINGS,
      );

      const roster = rosterMap.get(stat.playerId);

      return {
        name: stat.player.handle,
        team: stat.player.team.name,
        kills: stat.kills,
        deaths: stat.deaths,
        assists: stat.assists,
        acs: 0,
        rating: 0,
        fantasyPts: breakdown.total,
        ownerUsername: roster?.ownerUsername ?? null,
        isCaptain: roster?.isCaptain ?? false,
        won: stat.won,
      };
    });

    return {
      mapName: game.mapName,
      team1Score: game.team1Score,
      team2Score: game.team2Score,
      players,
    };
  });

  // Compute series score from finalScore or from game wins
  const [team1Score, team2Score] = match.finalScore
    ? match.finalScore.split('-').map((s) => s.trim())
    : [
        String(match.games.filter((g) => g.winnerTeamId === match.team1Id).length),
        String(match.games.filter((g) => g.winnerTeamId === match.team2Id).length),
      ];

  return NextResponse.json({
    team1Name: match.team1.name,
    team2Name: match.team2.name,
    team1Score,
    team2Score,
    status: match.status,
    maps,
  });
}
