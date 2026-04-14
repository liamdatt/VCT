import { getLeagueHistory } from '@/server/queries/history';
import { db } from '@/lib/db';
import { HistoryTimeline } from '@/components/history/HistoryTimeline';

export default async function HistoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const events = await getLeagueHistory(slug);
  const league = await db.league.findUnique({
    where: { slug },
    include: { memberships: { include: { user: true } } },
  });
  const managers = league?.memberships.map((m) => m.user.username).sort() ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          History
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Every trade, free-agency pickup, and captain change — in order.
        </p>
      </div>
      <HistoryTimeline
        events={events.map((e) => ({
          id: e.id,
          type: e.type,
          description: e.description,
          timestamp: e.timestamp.toISOString(),
          managers: e.managers,
        }))}
        managers={managers}
      />
    </div>
  );
}
