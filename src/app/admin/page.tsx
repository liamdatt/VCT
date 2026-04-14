import { db } from '@/lib/db';
import Link from 'next/link';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  const leagues = await db.league.findMany({ orderBy: { startDate: 'desc' } });
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          Commissioner
        </h1>
        <Link href="/admin/leagues/new">
          <Button variant="primary" size="md">+ New League</Button>
        </Link>
      </div>
      <div className="space-y-2">
        {leagues.map((l) => (
          <Link key={l.id} href={`/admin/leagues/${l.slug}`}>
            <Card interactive padding="comfortable">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-[20px] font-medium text-[var(--text-primary)]">
                    {l.name}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--text-tertiary)]">
                    Started {l.startDate.toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="neutral">{l.status.replace('_', ' ')}</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
