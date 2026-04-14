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

  const mapRow = (m: Awaited<ReturnType<typeof getMatchesByStatus>>[number]) => ({
    id: m.id,
    team1Name: m.team1.name,
    team1ShortCode: m.team1.shortCode,
    team2Name: m.team2.name,
    team2ShortCode: m.team2.shortCode,
    team1Wins: m.games.filter((g) => g.winnerTeamId === m.team1Id).length,
    team2Wins: m.games.filter((g) => g.winnerTeamId === m.team2Id).length,
    status: m.status,
    scheduledAt: m.scheduledAt.toISOString(),
    series: '',
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          Matches
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Every match in the event. Click any match for the full box score.
        </p>
      </div>
      <MatchesClient
        upcoming={upcoming.map(mapRow)}
        live={live.map(mapRow)}
        completed={completed.map(mapRow)}
      />
    </div>
  );
}
