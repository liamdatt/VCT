import { getMatchesByStatus } from '@/server/queries/matches';
import { MatchesClient } from '@/components/matches/MatchesClient';

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [upcoming, live, completed] = await Promise.all([
    getMatchesByStatus(slug, 'UPCOMING'),
    getMatchesByStatus(slug, 'LIVE'),
    getMatchesByStatus(slug, 'COMPLETED'),
  ]);

  // Serialize dates for client component
  const serialize = (matches: typeof upcoming) =>
    matches.map((m) => ({
      id: m.id,
      team1: { name: m.team1.name },
      team2: { name: m.team2.name },
      status: m.status as 'UPCOMING' | 'LIVE' | 'COMPLETED',
      scheduledAt: m.scheduledAt.toISOString(),
      finalScore: m.finalScore,
      games: m.games.map((g) => ({ mapNumber: g.mapNumber })),
    }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[--foreground]">Matches</h1>
      <MatchesClient
        upcoming={serialize(upcoming)}
        live={serialize(live)}
        completed={serialize(completed)}
      />
    </div>
  );
}
