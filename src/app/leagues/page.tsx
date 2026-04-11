import Link from 'next/link';
import { auth } from '@/lib/auth';
import { listLeaguesForUser } from '@/server/queries/leagues';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function LeaguesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const leagues = await listLeaguesForUser(session.user.id);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-100">Your Leagues</h1>
      {leagues.length === 0 && <p className="text-slate-400">You&apos;re not in any leagues yet.</p>}
      {leagues.map((l) => (
        <Link key={l.id} href={`/leagues/${l.slug}`}>
          <Card className="cursor-pointer p-4 transition-colors hover:border-slate-600">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-100">{l.name}</div>
                <div className="text-sm text-slate-400">
                  Started {l.startDate.toLocaleDateString()}
                </div>
              </div>
              <Badge>{l.status}</Badge>
            </div>
          </Card>
        </Link>
      ))}
    </main>
  );
}
