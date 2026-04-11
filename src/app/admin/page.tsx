import { db } from '@/lib/db';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default async function AdminHomePage() {
  const leagues = await db.league.findMany({ orderBy: { startDate: 'desc' } });
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-100">Commissioner Console</h1>
      <Link href="/admin/leagues/new">
        <Card className="cursor-pointer p-4 transition-colors hover:border-slate-600">
          <span className="font-semibold text-slate-100">+ Create new league</span>
        </Card>
      </Link>
      {leagues.map((l) => (
        <Link key={l.id} href={`/admin/leagues/${l.slug}`}>
          <Card className="cursor-pointer p-4 transition-colors hover:border-slate-600">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-100">{l.name}</span>
              <span className="text-sm text-slate-400">{l.status}</span>
            </div>
          </Card>
        </Link>
      ))}
    </main>
  );
}
