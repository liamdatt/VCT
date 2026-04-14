import Link from 'next/link';
import { db } from '@/lib/db';
import { adjustPoints } from '@/lib/actions/admin';
import { Card, CardHeader } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';

export default async function AdminLeaguePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const league = await db.league.findUnique({
    where: { slug },
    include: {
      memberships: { include: { user: true } },
      adjustments: { include: { user: true, createdBy: true }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!league) return <p>Not found.</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
            {league.name}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="neutral">{league.status.replace('_', ' ')}</Badge>
            <span className="text-[12px] text-[var(--text-tertiary)]">
              {league.memberships.length} managers
            </span>
          </div>
        </div>
        <Link href={`/admin/leagues/${slug}/audit`}>
          <Button variant="secondary">Audit trail →</Button>
        </Link>
      </div>

      <Card padding="comfortable">
        <CardHeader label="Point adjustments" />
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
          className="flex flex-col gap-2 md:flex-row md:items-end"
        >
          <div className="flex-1">
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Manager
            </label>
            <select
              name="userId"
              className="h-8 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-[13px] text-[var(--text-primary)]"
            >
              {league.memberships.map((m) => (
                <option key={m.userId} value={m.userId}>{m.user.username}</option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Delta
            </label>
            <input
              name="delta"
              type="number"
              step="0.1"
              required
              className="h-8 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-[13px] text-[var(--text-primary)]"
            />
          </div>
          <div className="flex-[2]">
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Reason
            </label>
            <input
              name="reason"
              required
              className="h-8 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-[13px] text-[var(--text-primary)]"
            />
          </div>
          <Button type="submit" variant="primary">Apply</Button>
        </form>
        {league.adjustments.length > 0 && (
          <ul className="mt-4 divide-y divide-[var(--border-subtle)]">
            {league.adjustments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-[12px]">
                <span className="text-[var(--text-primary)]">
                  <span className="font-medium">{a.user.username}</span>{' '}
                  <span className="text-[var(--text-tertiary)]">{a.reason}</span>
                </span>
                <span className={`font-mono tabular-nums ${a.delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {a.delta > 0 ? '+' : ''}{a.delta.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card padding="comfortable">
        <CardHeader label="Members" />
        <ul className="divide-y divide-[var(--border-subtle)]">
          {league.memberships.map((m) => (
            <li key={m.userId} className="flex items-center justify-between py-2 text-[13px]">
              <span className="text-[var(--text-primary)]">{m.user.username}</span>
              <span className="font-mono text-[11px] text-[var(--text-tertiary)]">{m.user.discordId}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
