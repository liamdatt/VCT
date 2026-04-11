import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { TradeRow } from '@/components/trade/TradeRow';

export default async function TradesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;
  const league = await db.league.findUnique({ where: { slug } });
  if (!league) return <p>League not found</p>;

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

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-100">Trades</h1>
      <div className="space-y-2">
        {trades.map((t) => (
          <TradeRow
            key={t.id}
            tradeId={t.id}
            proposerName={t.proposer.username}
            receiverName={t.receiver.username}
            items={t.items.map((i) => ({
              handle: i.player.handle,
              direction: i.direction,
            }))}
            role={t.receiverId === session.user.id ? 'receiver' : 'proposer'}
            status={t.status}
          />
        ))}
        {trades.length === 0 && <p className="text-slate-400">No trades yet.</p>}
      </div>
    </main>
  );
}
