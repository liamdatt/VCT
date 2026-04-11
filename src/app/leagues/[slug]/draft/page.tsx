import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { makePick } from '@/lib/actions/draft';
import { Button } from '@/components/ui/button';

export default async function DraftRoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const league = await db.league.findUnique({
    where: { slug },
    include: {
      draft: { include: { picks: { include: { player: true, user: true } } } },
      players: { include: { team: true } },
    },
  });
  if (!league?.draft) return <p>No draft yet</p>;

  const order = league.draft.pickOrderJson as string[];
  const round = league.draft.currentRound;
  const idx = league.draft.currentPickIndex;
  const seat = round % 2 === 1 ? idx : order.length - 1 - idx;
  const currentUserId = order[seat];
  const isMyTurn = currentUserId === session.user.id;

  const takenIds = new Set(league.draft.picks.map((p) => p.playerId));
  const available = league.players.filter((p) => !takenIds.has(p.id));

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-100">Draft Room</h1>
      <div className="rounded border border-slate-800 p-3 text-sm">
        Round {round} · Pick {idx + 1} —{' '}
        {isMyTurn ? <strong className="text-green-400">You&apos;re on the clock</strong> : 'Waiting…'}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {available.map((p) => (
          <form
            key={p.id}
            action={async () => {
              'use server';
              await makePick({ leagueSlug: slug, playerId: p.id });
            }}
          >
            <Button
              type="submit"
              disabled={!isMyTurn}
              className="w-full justify-start text-left"
              variant="outline"
            >
              <div>
                <div className="font-semibold">{p.handle}</div>
                <div className="text-xs text-slate-400">{p.team.shortCode}</div>
              </div>
            </Button>
          </form>
        ))}
      </div>
      <div>
        <h2 className="mb-2 text-lg font-semibold text-slate-100">Pick Log</h2>
        <ol className="space-y-1 text-sm text-slate-300">
          {league.draft.picks.map((p) => (
            <li key={p.id}>
              R{p.round}.{p.pickNumber} — {p.user.username} → {p.player.handle}
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
