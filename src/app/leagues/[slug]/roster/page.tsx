import { auth } from '@/lib/auth';
import { getRoster } from '@/server/queries/roster';
import { getPlayerPool } from '@/server/queries/players';
import { db } from '@/lib/db';
import { startOfDayJamaica } from '@/lib/time';
import { isOlderThanDays } from '@/lib/time';
import type { LeagueSettings } from '@/lib/scoring/types';
import { RosterClient } from '@/components/roster/RosterClient';

export default async function MyRosterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const data = await getRoster(slug, session.user.id);
  if (!data) return <p className="text-[--muted-foreground]">League not found</p>;

  const playerPool = await getPlayerPool(slug);

  // Compute total points for each rostered player from the pool data
  const pointsMap = new Map(playerPool.map((p) => [p.id, p.totalPoints]));

  const slots = data.slots.map((s) => ({
    id: s.id,
    playerId: s.player.id,
    handle: s.player.handle,
    teamName: s.player.team.name,
    isCaptain: s.isCaptain,
    acquiredVia: s.acquiredVia,
    totalPoints: pointsMap.get(s.player.id) ?? 0,
  }));

  // Free agents
  const freeAgents = playerPool
    .filter((p) => p.ownerUsername === null)
    .map((p) => ({
      id: p.id,
      handle: p.handle,
      teamName: p.teamName,
      totalPoints: p.totalPoints,
    }));

  // Check FA cooldown (1 per day)
  const todayStart = startOfDayJamaica(new Date());
  const faCountToday = await db.freeAgencyAction.count({
    where: {
      leagueId: data.league.id,
      userId: session.user.id,
      happenedAt: { gte: todayStart },
    },
  });
  const cooldownReached = faCountToday >= 1;

  // Check captain cooldown
  const league = await db.league.findUnique({ where: { slug } });
  const settings = league?.settingsJson as unknown as LeagueSettings | undefined;
  const lastCaptainChange = await db.captainChange.findFirst({
    where: { leagueId: data.league.id, userId: session.user.id },
    orderBy: { changedAt: 'desc' },
  });
  const captainCooldownActive =
    !!lastCaptainChange &&
    !!settings &&
    !isOlderThanDays(lastCaptainChange.changedAt, settings.captainCooldownDays);

  // Other managers' rosters for trade flow
  const memberships = await db.leagueMembership.findMany({
    where: { leagueId: data.league.id, userId: { not: session.user.id } },
    include: {
      user: true,
    },
  });
  const otherSlots = await db.rosterSlot.findMany({
    where: {
      leagueId: data.league.id,
      userId: { not: session.user.id },
    },
    include: { player: { include: { team: true } } },
  });
  const slotsByUser = new Map<
    string,
    { id: string; handle: string; teamName: string }[]
  >();
  for (const s of otherSlots) {
    const arr = slotsByUser.get(s.userId) ?? [];
    arr.push({
      id: s.player.id,
      handle: s.player.handle,
      teamName: s.player.team.name,
    });
    slotsByUser.set(s.userId, arr);
  }
  const managers = memberships.map((m) => ({
    userId: m.userId,
    username: m.user.username,
    players: slotsByUser.get(m.userId) ?? [],
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[--foreground]">Your Roster</h1>
      <RosterClient
        leagueSlug={slug}
        slots={slots}
        freeAgents={freeAgents}
        managers={managers}
        cooldownReached={cooldownReached}
        captainCooldownActive={captainCooldownActive}
      />
    </div>
  );
}
