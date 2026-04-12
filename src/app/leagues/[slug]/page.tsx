import { auth } from '@/lib/auth';
import { getDashboard, getUpcomingMatches, getRecentMatches } from '@/server/queries/dashboard';
import { getLeagueHistory } from '@/server/queries/history';
import { LiveMatchHero } from '@/components/dashboard/LiveMatchHero';
import { MyPlayersInMatch } from '@/components/dashboard/MyPlayersInMatch';
import { CompressedStandings } from '@/components/dashboard/CompressedStandings';
import { RecentResults } from '@/components/dashboard/RecentResults';
import { UpcomingMatches } from '@/components/dashboard/UpcomingMatches';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const [data, upcoming, recent, history] = await Promise.all([
    getDashboard(slug, session.user.id),
    getUpcomingMatches(slug, 5),
    getRecentMatches(slug, 3),
    getLeagueHistory(slug),
  ]);

  if (!data) return <p className="text-[--muted-foreground]">League not found</p>;

  let heroProps = null;
  let lines: {
    handle: string;
    teamShort: string;
    isCaptain: boolean;
    total: number;
  }[] = [];

  if (data.liveMatch) {
    const t1Wins = data.liveMatch.games.filter(
      (g) => g.winnerTeamId === data.liveMatch!.team1Id
    ).length;
    const t2Wins = data.liveMatch.games.filter(
      (g) => g.winnerTeamId === data.liveMatch!.team2Id
    ).length;
    const currentMap = data.liveMatch.games.at(-1)?.mapName ?? null;
    heroProps = {
      team1Name: data.liveMatch.team1.name,
      team2Name: data.liveMatch.team2.name,
      team1Wins: t1Wins,
      team2Wins: t2Wins,
      currentMap,
    };

    const captainIds = new Set(
      data.myRoster.filter((r) => r.isCaptain).map((r) => r.player.id)
    );
    const aggLines = new Map<
      string,
      { handle: string; teamShort: string; isCaptain: boolean; total: number }
    >();
    for (const g of data.liveMatch.games) {
      for (const stat of g.stats) {
        if (!data.myPlayerIds.has(stat.playerId)) continue;
        const existing = aggLines.get(stat.playerId) ?? {
          handle: stat.player.handle,
          teamShort: stat.player.team.shortCode,
          isCaptain: captainIds.has(stat.playerId),
          total: 0,
        };
        const pts =
          stat.kills * 2 +
          stat.assists * 1.5 -
          stat.deaths +
          stat.aces * 5 +
          (stat.won ? 10 : -5);
        existing.total += pts;
        aggLines.set(stat.playerId, existing);
      }
    }
    lines = [...aggLines.values()];
  }

  const meRow = data.leaderboard.find((r) => r.userId === session.user.id);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
      {/* Left column (60%) */}
      <div className="space-y-4">
        {heroProps ? (
          <LiveMatchHero {...heroProps} />
        ) : (
          <div className="rounded-lg border border-[--border] bg-[--card] p-6 text-center text-[--muted-foreground]">
            No live match right now.
          </div>
        )}
        <MyPlayersInMatch lines={lines} />
        <RecentResults matches={recent} />
      </div>

      {/* Right column (40%) */}
      <div className="space-y-4">
        <CompressedStandings
          rows={data.leaderboard.slice(0, 5)}
          meRank={meRow?.rank ?? null}
        />
        <UpcomingMatches matches={upcoming} />
        <ActivityFeed events={history} />
      </div>
    </div>
  );
}
