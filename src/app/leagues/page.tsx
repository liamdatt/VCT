import Link from 'next/link';
import { auth } from '@/lib/auth';
import { listLeaguesForUser } from '@/server/queries/leagues';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';

export default async function LeaguesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const leagues = await listLeaguesForUser(session.user.id);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <div>
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          Your Leagues
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Select a league to view standings, rosters, and live scoring.
        </p>
      </div>
      {leagues.length === 0 && (
        <p className="text-[13px] text-[var(--text-tertiary)]">
          You&apos;re not in any leagues yet.
        </p>
      )}
      <div className="space-y-3">
        {leagues.map((l) => (
          <Link key={l.id} href={`/leagues/${l.slug}`}>
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
    </main>
  );
}
