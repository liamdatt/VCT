import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { TradesClient } from '@/components/trades/TradesClient';

export default async function TradesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;
  const league = await db.league.findUnique({ where: { slug } });
  if (!league) return null;

  const trades = await db.trade.findMany({
    where: { leagueId: league.id },
    include: {
      proposer: true,
      receiver: true,
      items: { include: { player: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const inbox = trades.filter(
    (t) => t.receiverId === session.user.id && t.status === 'PROPOSED',
  );
  const history = trades.filter((t) => t.status !== 'PROPOSED');

  const rows = trades.map((t) => ({
    id: t.id,
    proposerName: t.proposer.username,
    receiverName: t.receiver.username,
    status: t.status,
    items: t.items.map((i) => ({ handle: i.player.handle, direction: i.direction })),
    isInbox: t.receiverId === session.user.id && t.status === 'PROPOSED',
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          Trades
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Propose, accept, and review manager-to-manager trades.
        </p>
      </div>
      <TradesClient
        inboxIds={inbox.map((t) => t.id)}
        historyIds={history.map((t) => t.id)}
        rows={rows}
        leagueSlug={slug}
      />
    </div>
  );
}
