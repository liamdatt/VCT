import { getRoster } from '@/server/queries/roster';
import { getPlayerPool } from '@/server/queries/players';
import { db } from '@/lib/db';
import { PlayerCard } from '@/components/shared/PlayerCard';

export default async function OtherRosterPage({
  params,
}: {
  params: Promise<{ slug: string; userId: string }>;
}) {
  const { slug, userId } = await params;
  const data = await getRoster(slug, userId);
  if (!data) return <p className="text-[--muted-foreground]">League not found</p>;

  const user = await db.user.findUnique({ where: { id: userId } });
  const playerPool = await getPlayerPool(slug);
  const pointsMap = new Map(playerPool.map((p) => [p.id, p.totalPoints]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[--foreground]">
        {user?.username}&apos;s Roster
      </h1>
      <div className="space-y-2">
        {data.slots.map((s) => (
          <PlayerCard
            key={s.id}
            handle={s.player.handle}
            teamName={s.player.team.name}
            totalPoints={pointsMap.get(s.player.id) ?? 0}
            isCaptain={s.isCaptain}
            acquiredVia={s.acquiredVia}
            readOnly
          />
        ))}
        {data.slots.length === 0 && (
          <p className="py-8 text-center text-sm text-[--muted-foreground]">
            No players on roster.
          </p>
        )}
      </div>
    </div>
  );
}
