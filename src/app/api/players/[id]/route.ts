import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPlayerDetail } from '@/server/queries/player-detail';
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
  const player = await getPlayerDetail(id);
  if (!player) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const ownerSlot = player.rosterSlots[0] ?? null;
  const ownerUsername = ownerSlot?.user?.username ?? null;

  const games = player.stats.map((stat) => {
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

    return {
      mapName: stat.game.match
        ? `${stat.game.match.team1.name} vs ${stat.game.match.team2.name}`
        : 'Unknown',
      kills: stat.kills,
      deaths: stat.deaths,
      assists: stat.assists,
      fantasyPts: breakdown.total,
      date: stat.game.completedAt
        ? new Date(stat.game.completedAt).toLocaleDateString()
        : '',
      won: stat.won,
    };
  });

  const totalPoints = games.reduce((sum, g) => sum + g.fantasyPts, 0);

  return NextResponse.json({
    handle: player.handle,
    teamName: player.team.name,
    ownerUsername,
    totalPoints,
    games,
  });
}
