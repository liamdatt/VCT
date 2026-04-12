import { getLeagueHistory } from '@/server/queries/history';
import { HistoryClient } from '@/components/history/HistoryClient';

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const events = await getLeagueHistory(slug);

  // Serialize for client
  const serialized = events.map((e) => ({
    id: e.id,
    type: e.type,
    description: e.description,
    timestamp: e.timestamp.toISOString(),
    managers: e.managers,
  }));

  const allManagers = [...new Set(events.flatMap((e) => e.managers))].sort();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[--foreground]">History</h1>
      <HistoryClient events={serialized} allManagers={allManagers} />
    </div>
  );
}
