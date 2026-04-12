import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { TradesClient } from '@/components/trades/TradesClient';

export default async function TradesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const league = await db.league.findUnique({ where: { slug } });
  if (!league) return <p className="text-[--muted-foreground]">League not found</p>;

  const trades = await db.trade.findMany({
    where: {
      leagueId: league.id,
      OR: [{ proposerId: session.user.id }, { receiverId: session.user.id }],
    },
    include: {
      proposer: true,
      receiver: true,
      items: { include: { player: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const serialize = (t: (typeof trades)[number]) => ({
    id: t.id,
    proposerName: t.proposer.username,
    receiverName: t.receiver.username,
    items: t.items.map((i) => ({
      handle: i.player.handle,
      direction: i.direction as 'PROPOSER_TO_RECEIVER' | 'RECEIVER_TO_PROPOSER',
    })),
    role: (t.receiverId === session.user.id ? 'receiver' : 'proposer') as
      | 'proposer'
      | 'receiver',
    status: t.status,
    createdAt: t.createdAt.toISOString(),
  });

  const inbox = trades
    .filter((t) => t.status === 'PROPOSED')
    .map(serialize);
  const history = trades
    .filter((t) => t.status !== 'PROPOSED')
    .map(serialize);

  // My players for trade proposal
  const mySlots = await db.rosterSlot.findMany({
    where: { leagueId: league.id, userId: session.user.id },
    include: { player: true },
  });
  const myPlayers = mySlots.map((s) => ({
    id: s.player.id,
    handle: s.player.handle,
  }));

  // Other managers for trade proposal
  const memberships = await db.leagueMembership.findMany({
    where: { leagueId: league.id, userId: { not: session.user.id } },
    include: { user: true },
  });
  const otherSlots = await db.rosterSlot.findMany({
    where: { leagueId: league.id, userId: { not: session.user.id } },
    include: { player: { include: { team: true } } },
  });
  const slotsByUser = new Map<
    string,
    { id: string; handle: string; teamName: string }[]
  >();
  for (const s of otherSlots) {
    const arr = slotsByUser.get(s.userId) ?? [];
    arr.push({
      id: s.player.id,
      handle: s.player.handle,
      teamName: s.player.team.name,
    });
    slotsByUser.set(s.userId, arr);
  }
  const managers = memberships.map((m) => ({
    userId: m.userId,
    username: m.user.username,
    players: slotsByUser.get(m.userId) ?? [],
  }));

  return (
    <div className="space-y-4">
      <TradesClient
        inbox={inbox}
        history={history}
        leagueSlug={slug}
        managers={managers}
        myPlayers={myPlayers}
      />
    </div>
  );
}
