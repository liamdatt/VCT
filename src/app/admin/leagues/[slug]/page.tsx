import { db } from '@/lib/db';
import { adjustPoints } from '@/lib/actions/admin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default async function AdminLeaguePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const league = await db.league.findUnique({
    where: { slug },
    include: { memberships: { include: { user: true } } },
  });
  if (!league) return <p>Not found</p>;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-100">{league.name}</h1>
      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-100">Adjust Points</h2>
        <form
          action={async (fd: FormData) => {
            'use server';
            await adjustPoints({
              leagueSlug: slug,
              userId: String(fd.get('userId')),
              delta: Number(fd.get('delta')),
              reason: String(fd.get('reason')),
            });
          }}
          className="space-y-3"
        >
          <div>
            <Label>Manager</Label>
            <select name="userId" className="w-full rounded border bg-slate-900 p-2 text-slate-100">
              {league.memberships.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.username}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Delta (can be negative)</Label>
            <Input name="delta" type="number" step="0.1" required />
          </div>
          <div>
            <Label>Reason</Label>
            <Input name="reason" required />
          </div>
          <Button type="submit">Apply Adjustment</Button>
        </form>
      </section>
    </main>
  );
}
