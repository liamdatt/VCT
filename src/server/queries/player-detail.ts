import { db } from '@/lib/db';

export async function getPlayerDetail(playerId: string) {
  return db.player.findUnique({
    where: { id: playerId },
    include: {
      team: true,
      rosterSlots: {
        include: { user: true },
      },
      stats: {
        include: {
          game: {
            include: {
              match: {
                include: { team1: true, team2: true },
              },
            },
          },
        },
        orderBy: { game: { completedAt: 'desc' } },
      },
      snapshots: {
        include: { game: true },
      },
    },
  });
}
