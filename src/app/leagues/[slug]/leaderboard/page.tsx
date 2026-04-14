import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getLeaderboard } from '@/server/queries/leaderboard';
import { PodiumStrip } from '@/components/leaderboard/PodiumStrip';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const rows = await getLeaderboard(slug);

  const league = await db.league.findUnique({ where: { slug } });
  if (!league) return null;

  const slots = await db.rosterSlot.findMany({
    where: { leagueId: league.id },
    include: { player: { include: { team: true } } },
  });
  const snaps = await db.scoringSnapshot.findMany({
    where: { leagueId: league.id },
    include: { player: { include: { team: true } } },
  });

  const currentPlayerByUser = new Map<string, Set<string>>();
  const captainByUser = new Map<string, string>();
  for (const s of slots) {
    const ids = currentPlayerByUser.get(s.userId) ?? new Set();
    ids.add(s.playerId);
    currentPlayerByUser.set(s.userId, ids);
    if (s.isCaptain) captainByUser.set(s.userId, s.player.handle);
  }

  const enriched = rows.map((r) => {
    const userSnaps = snaps.filter((s) => s.userId === r.userId);
    const byPlayer = new Map<string, { player: typeof userSnaps[0]['player']; total: number }>();
    for (const s of userSnaps) {
      const prev = byPlayer.get(s.playerId);
      byPlayer.set(s.playerId, {
        player: s.player,
        total: (prev?.total ?? 0) + s.total,
      });
    }
    const contributions = [...byPlayer.values()].map((c) => {
      const onRoster = currentPlayerByUser.get(r.userId)?.has(c.player.id) ?? false;
      const slot = slots.find((x) => x.userId === r.userId && x.playerId === c.player.id);
      return {
        playerId: c.player.id,
        handle: c.player.handle,
        team: c.player.team.shortCode,
        total: c.total,
        isCaptain: slot?.isCaptain ?? false,
        onRoster,
      };
    });
    contributions.sort((a, b) => b.total - a.total);

    const wins = userSnaps.filter((s) => {
      const breakdown = s.breakdownJson as unknown as { winBonus?: number };
      return breakdown?.winBonus === DEFAULT_LEAGUE_SETTINGS.winPts;
    }).length;
    const losses = userSnaps.length - wins;

    return {
      userId: r.userId,
      rank: r.rank,
      username: r.username,
      total: r.total,
      captainHandle: captainByUser.get(r.userId) ?? null,
      wins,
      losses,
      contributions,
      isMe: r.userId === session?.user?.id,
    };
  });

  const podium = enriched.slice(0, 3).map((e, i) => ({
    userId: e.userId,
    rank: (i + 1) as 1 | 2 | 3,
    username: e.username,
    total: e.total,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          Leaderboard
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Click any row to reveal the per-player breakdown.
        </p>
      </div>
      {podium.length === 3 && <PodiumStrip entries={podium} />}
      <LeaderboardTable rows={enriched} />
    </div>
  );
}
