import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { makePick } from '@/lib/actions/draft';
import { OnTheClockBanner } from '@/components/draft/OnTheClockBanner';
import { DataTable, THead, Th, TBody, Tr, Td } from '@/components/shared/DataTable';
import { Button } from '@/components/shared/Button';
import { Card, CardHeader } from '@/components/shared/Card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default async function DraftPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const league = await db.league.findUnique({
    where: { slug },
    include: {
      draft: {
        include: {
          picks: { include: { player: { include: { team: true } }, user: true }, orderBy: { pickNumber: 'asc' } },
        },
      },
      memberships: { include: { user: true } },
      players: { include: { team: true } },
    },
  });
  if (!league?.draft) return <p>Draft not started.</p>;

  const order = league.draft.pickOrderJson as string[];
  const round = league.draft.currentRound;
  const idx = league.draft.currentPickIndex;
  const seat = round % 2 === 1 ? idx : order.length - 1 - idx;
  const currentUserId = order[seat];
  const currentUser = league.memberships.find((m) => m.userId === currentUserId)?.user;
  const isMyTurn = currentUserId === session.user.id;

  const takenIds = new Set(league.draft.picks.map((p) => p.playerId));
  const available = league.players.filter((p) => !takenIds.has(p.id));

  return (
    <div className="space-y-6">
      <OnTheClockBanner
        managerName={currentUser?.username ?? '—'}
        managerAvatarUrl={currentUser?.avatarUrl ?? null}
        round={round}
        pickNumber={idx + 1}
        isYou={isMyTurn}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card padding="compact">
          <CardHeader label="Available players" />
          <DataTable>
            <THead>
              <tr>
                <Th>Player</Th>
                <Th>Team</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </THead>
            <TBody>
              {available.map((p) => (
                <Tr key={p.id} hoverable>
                  <Td>
                    <span className="font-medium text-[var(--text-primary)]">{p.handle}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
                      {p.team.shortCode}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <form action={async () => { 'use server'; await makePick({ leagueSlug: slug, playerId: p.id }); }}>
                      <Button
                        type="submit"
                        size="sm"
                        variant={isMyTurn ? 'primary' : 'secondary'}
                        disabled={!isMyTurn}
                      >
                        Draft
                      </Button>
                    </form>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </DataTable>
        </Card>
        <div className="space-y-4">
          <Card padding="compact">
            <CardHeader label="Pick order" />
            <ol className="space-y-1">
              {order.map((uid, i) => {
                const u = league.memberships.find((m) => m.userId === uid)?.user;
                const isCurrent = uid === currentUserId;
                return (
                  <li
                    key={`${uid}-${i}`}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] ${
                      isCurrent ? 'bg-white/[0.04] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="w-6 font-mono text-[11px] tabular-nums text-[var(--text-tertiary)]">
                      {i + 1}
                    </span>
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={u?.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-[var(--bg-elevated)] text-[10px]">
                        {(u?.username ?? '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1">{u?.username ?? '—'}</span>
                  </li>
                );
              })}
            </ol>
          </Card>
          <Card padding="compact">
            <CardHeader label="Pick log" />
            <ol className="space-y-1 text-[12px]">
              {league.draft.picks.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">
                    <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                      R{p.round}.{p.pickNumber}
                    </span>{' '}
                    {p.user.username} → <span className="text-[var(--text-primary)]">{p.player.handle}</span>
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                    {p.player.team.shortCode}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
