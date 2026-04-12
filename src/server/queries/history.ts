import { db } from '@/lib/db';

type HistoryEvent = {
  id: string;
  type: 'trade' | 'free_agency' | 'captain_change';
  description: string;
  timestamp: Date;
  managers: string[];
};

export async function getLeagueHistory(leagueSlug: string): Promise<HistoryEvent[]> {
  const league = await db.league.findUnique({ where: { slug: leagueSlug } });
  if (!league) return [];

  const [trades, freeAgencyActions, captainChanges] = await Promise.all([
    db.trade.findMany({
      where: {
        leagueId: league.id,
        status: { in: ['ACCEPTED', 'REJECTED', 'REVERSED'] },
      },
      include: {
        proposer: true,
        receiver: true,
        items: { include: { player: true } },
      },
    }),
    db.freeAgencyAction.findMany({
      where: { leagueId: league.id },
      include: {
        user: true,
        droppedPlayer: true,
        pickedUpPlayer: true,
      },
    }),
    db.captainChange.findMany({
      where: { leagueId: league.id },
      include: {
        user: true,
        oldPlayer: true,
        newPlayer: true,
      },
    }),
  ]);

  const events: HistoryEvent[] = [];

  for (const t of trades) {
    const proposerPlayers = t.items
      .filter((i) => i.direction === 'PROPOSER_TO_RECEIVER')
      .map((i) => i.player.handle);
    const receiverPlayers = t.items
      .filter((i) => i.direction === 'RECEIVER_TO_PROPOSER')
      .map((i) => i.player.handle);

    const statusLabel = t.status.toLowerCase();
    const description = `Trade ${statusLabel}: ${t.proposer.username} sent ${proposerPlayers.join(', ') || 'nothing'} to ${t.receiver.username} for ${receiverPlayers.join(', ') || 'nothing'}`;

    events.push({
      id: t.id,
      type: 'trade',
      description,
      timestamp: t.resolvedAt ?? t.createdAt,
      managers: [t.proposer.username, t.receiver.username],
    });
  }

  for (const fa of freeAgencyActions) {
    events.push({
      id: fa.id,
      type: 'free_agency',
      description: `${fa.user.username} picked up ${fa.pickedUpPlayer.handle} and dropped ${fa.droppedPlayer.handle}`,
      timestamp: fa.happenedAt,
      managers: [fa.user.username],
    });
  }

  for (const cc of captainChanges) {
    const oldPart = cc.oldPlayer ? ` from ${cc.oldPlayer.handle}` : '';
    events.push({
      id: cc.id,
      type: 'captain_change',
      description: `${cc.user.username} changed captain to ${cc.newPlayer.handle}${oldPart}`,
      timestamp: cc.changedAt,
      managers: [cc.user.username],
    });
  }

  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return events;
}
