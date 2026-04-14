import { auth } from '@/lib/auth';
import {
  getDashboard,
  getUpcomingMatches,
  getRecentMatches,
} from '@/server/queries/dashboard';
import { getLeagueHistory } from '@/server/queries/history';
import { LiveMatchHero } from '@/components/dashboard/LiveMatchHero';
import { NextMatchCard } from '@/components/dashboard/NextMatchCard';
import { YourLineup } from '@/components/dashboard/YourLineup';
import { StandingsStrip } from '@/components/dashboard/StandingsStrip';
import { UpcomingMatches } from '@/components/dashboard/UpcomingMatches';
import { RecentResults } from '@/components/dashboard/RecentResults';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { computeGamePoints } from '@/lib/scoring/rules';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const data = await getDashboard(slug, session.user.id);
  if (!data) return <p>League not found</p>;

  const upcoming = await getUpcomingMatches(slug, 5);
  const recent = await getRecentMatches(slug, 3);
  const history = await getLeagueHistory(slug);

  let heroBlock: React.ReactNode;
  let lineup: Parameters<typeof YourLineup>[0]['lines'] = [];

  if (data.liveMatch) {
    const t1Wins = data.liveMatch.games.filter((g) => g.winnerTeamId === data.liveMatch!.team1Id).length;
    const t2Wins = data.liveMatch.games.filter((g) => g.winnerTeamId === data.liveMatch!.team2Id).length;
    const currentMap = data.liveMatch.games.at(-1)?.mapName ?? null;
    const currentGame = data.liveMatch.games.at(-1);
    const currentMapScore = currentGame
      ? { t1: currentGame.team1Score, t2: currentGame.team2Score }
      : undefined;

    heroBlock = (
      <LiveMatchHero
        team1Name={data.liveMatch.team1.name}
        team1ShortCode={data.liveMatch.team1.shortCode}
        team2Name={data.liveMatch.team2.name}
        team2ShortCode={data.liveMatch.team2.shortCode}
        team1Wins={t1Wins}
        team2Wins={t2Wins}
        currentMap={currentMap}
        currentMapScore={currentMapScore}
      />
    );

    const captainIds = new Set(
      data.myRoster.filter((r) => r.isCaptain).map((r) => r.player.id),
    );
    const agg = new Map<
      string,
      { handle: string; teamShort: string; isCaptain: boolean; kills: number; deaths: number; assists: number; total: number }
    >();
    for (const g of data.liveMatch.games) {
      for (const stat of g.stats) {
        if (!data.myPlayerIds.has(stat.playerId)) continue;
        const existing = agg.get(stat.playerId) ?? {
          handle: stat.player.handle,
          teamShort: stat.player.team.shortCode,
          isCaptain: captainIds.has(stat.playerId),
          kills: 0,
          deaths: 0,
          assists: 0,
          total: 0,
        };
        const breakdown = computeGamePoints(
          { kills: stat.kills, deaths: stat.deaths, assists: stat.assists, aces: stat.aces, won: stat.won },
          DEFAULT_LEAGUE_SETTINGS,
        );
        existing.kills += stat.kills;
        existing.deaths += stat.deaths;
        existing.assists += stat.assists;
        existing.total += existing.isCaptain
          ? breakdown.total * DEFAULT_LEAGUE_SETTINGS.captainMultiplier
          : breakdown.total;
        agg.set(stat.playerId, existing);
      }
    }
    lineup = [...agg.values()];
  } else if (upcoming.length > 0) {
    const next = upcoming[0];
    heroBlock = (
      <NextMatchCard
        team1Name={next.team1.name}
        team1ShortCode={next.team1.shortCode}
        team2Name={next.team2.name}
        team2ShortCode={next.team2.shortCode}
        scheduledAt={next.scheduledAt}
      />
    );
  } else {
    heroBlock = (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-10 text-center text-[13px] text-[var(--text-tertiary)]">
        No matches scheduled.
      </div>
    );
  }

  const meRow = data.leaderboard.find((r) => r.userId === session.user.id);
  const standingsRows = data.leaderboard.slice(0, 7).map((r) => ({
    userId: r.userId,
    rank: r.rank,
    username: r.username,
    total: r.total,
    isMe: r.userId === session.user.id,
  }));

  const upcomingRows = upcoming.map((m) => ({
    id: m.id,
    team1Name: m.team1.name,
    team1ShortCode: m.team1.shortCode,
    team2Name: m.team2.name,
    team2ShortCode: m.team2.shortCode,
    scheduledAt: m.scheduledAt,
    myPlayers: [] as string[],
  }));

  const recentRows = recent.map((m) => ({
    id: m.id,
    team1Name: m.team1.name,
    team1ShortCode: m.team1.shortCode,
    team2Name: m.team2.name,
    team2ShortCode: m.team2.shortCode,
    team1Wins: m.games.filter((g) => g.winnerTeamId === m.team1Id).length,
    team2Wins: m.games.filter((g) => g.winnerTeamId === m.team2Id).length,
    completedAt: m.scheduledAt,
    fantasyDelta: 0,
  }));

  const recentEvents = history.slice(0, 8).map((e) => ({
    id: e.id,
    type: e.type,
    description: e.description,
    timestamp: e.timestamp,
  }));

  return (
    <div className="space-y-6">
      {heroBlock}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.618fr_1fr]">
        <div className="space-y-6">
          {data.liveMatch && <YourLineup lines={lineup} />}
          <RecentResults matches={recentRows} />
        </div>
        <div className="space-y-6">
          <StandingsStrip rows={standingsRows} leagueSlug={slug} />
          <UpcomingMatches matches={upcomingRows} />
          <ActivityFeed events={recentEvents} />
        </div>
      </div>
      {meRow && (
        <div className="text-center text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
          You are ranked #{meRow.rank} · {meRow.total.toFixed(1)} pts
        </div>
      )}
    </div>
  );
}
