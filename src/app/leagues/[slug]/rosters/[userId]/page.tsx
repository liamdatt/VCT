import { getRoster } from '@/server/queries/roster';
import { Card } from '@/components/ui/card';
import { db } from '@/lib/db';

export default async function OtherRosterPage({
  params,
}: {
  params: Promise<{ slug: string; userId: string }>;
}) {
  const { slug, userId } = await params;
  const data = await getRoster(slug, userId);
  if (!data) return <p>League not found</p>;
  const user = await db.user.findUnique({ where: { id: userId } });

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-100">{user?.username}&apos;s Roster</h1>
      <div className="grid gap-3">
        {data.slots.map((s) => (
          <Card key={s.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {s.isCaptain && <span className="text-lg text-red-500">★</span>}
              <div>
                <div className="font-semibold text-slate-100">{s.player.handle}</div>
                <div className="text-xs text-slate-400">{s.player.team.name}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
