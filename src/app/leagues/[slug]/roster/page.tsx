import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getRoster } from '@/server/queries/roster';
import { getPlayerPool } from '@/server/queries/players';
import { CaptainBanner } from '@/components/roster/CaptainBanner';
import { RosterClient } from '@/components/roster/RosterClient';
import { isOlderThanDays, startOfDayJamaica } from '@/lib/time';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

export default async function RosterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const data = await getRoster(slug, session.user.id);
  if (!data) return null;
  const pool = await getPlayerPool(slug);
  const settings = (data.league.settingsJson as unknown as typeof DEFAULT_LEAGUE_SETTINGS) ?? DEFAULT_LEAGUE_SETTINGS;

  const lastChange = await db.captainChange.findFirst({
    where: { leagueId: data.league.id, userId: session.user.id },
    orderBy: { changedAt: 'desc' },
  });
  let cooldownDays: number | null = null;
  if (lastChange) {
    const ageMs = Date.now() - lastChange.changedAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const remaining = settings.captainCooldownDays - ageDays;
    if (remaining > 0) cooldownDays = Math.ceil(remaining);
    if (isOlderThanDays(lastChange.changedAt, settings.captainCooldownDays)) {
      cooldownDays = null;
    }
  }

  const byHandle = new Map(pool.map((p) => [p.handle.toLowerCase(), p]));
  const enriched = data.slots.map((s) => {
    const pp = byHandle.get(s.player.handle.toLowerCase());
    return {
      id: s.id,
      playerId: s.player.id,
      handle: s.player.handle,
      teamName: s.player.team.name,
      teamShortCode: s.player.team.shortCode,
      isCaptain: s.isCaptain,
      totalPoints: pp?.totalPoints ?? 0,
      kills: pp?.totalKills ?? 0,
      deaths: pp?.totalDeaths ?? 0,
      assists: pp?.totalAssists ?? 0,
      mapsPlayed: pp?.mapsPlayed ?? 0,
    };
  });

  const captain = enriched.find((p) => p.isCaptain) ?? null;
  const others = enriched.filter((p) => !p.isCaptain);

  // FA cooldown (1 per day)
  const todayStart = startOfDayJamaica(new Date());
  const faCountToday = await db.freeAgencyAction.count({
    where: {
      leagueId: data.league.id,
      userId: session.user.id,
      happenedAt: { gte: todayStart },
    },
  });
  const cooldownReached = faCountToday >= 1;

  const memberships = await db.leagueMembership.findMany({
    where: { leagueId: data.league.id, userId: { not: session.user.id } },
    include: { user: true },
  });
  const otherSlots = await db.rosterSlot.findMany({
    where: { leagueId: data.league.id, userId: { not: session.user.id } },
    include: { player: { include: { team: true } } },
  });
  const slotsByUser = new Map<string, { id: string; handle: string; teamName: string }[]>();
  for (const s of otherSlots) {
    const arr = slotsByUser.get(s.userId) ?? [];
    arr.push({ id: s.player.id, handle: s.player.handle, teamName: s.player.team.name });
    slotsByUser.set(s.userId, arr);
  }
  const managers = memberships.map((m) => ({
    userId: m.userId,
    username: m.user.username,
    players: slotsByUser.get(m.userId) ?? [],
  }));

  const freeAgents = pool
    .filter((p) => !p.ownerUserId)
    .map((p) => ({
      id: p.id,
      handle: p.handle,
      teamName: p.teamName,
      totalPoints: p.totalPoints,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          Your Roster
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Your 5-player squad. Captain gets a 1.5× multiplier on points earned.
        </p>
      </div>
      {captain && (
        <CaptainBanner
          handle={captain.handle}
          teamName={captain.teamName}
          teamShortCode={captain.teamShortCode}
          totalPoints={captain.totalPoints}
        />
      )}
      <RosterClient
        leagueSlug={slug}
        otherPlayers={others}
        freeAgents={freeAgents}
        managers={managers}
        cooldownReached={cooldownReached}
        captainCooldownDays={cooldownDays}
      />
    </div>
  );
}
