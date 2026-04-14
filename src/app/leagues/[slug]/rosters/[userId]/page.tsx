import { db } from '@/lib/db';
import { getRoster } from '@/server/queries/roster';
import { getPlayerPool } from '@/server/queries/players';
import { CaptainBanner } from '@/components/roster/CaptainBanner';
import { PlayerPortraitCard } from '@/components/roster/PlayerPortraitCard';

export default async function OtherRosterPage({
  params,
}: {
  params: Promise<{ slug: string; userId: string }>;
}) {
  const { slug, userId } = await params;
  const data = await getRoster(slug, userId);
  if (!data) return <p>League not found</p>;
  const pool = await getPlayerPool(slug);
  const user = await db.user.findUnique({ where: { id: userId } });

  const byHandle = new Map(pool.map((p) => [p.handle.toLowerCase(), p]));
  const enriched = data.slots.map((s) => {
    const pp = byHandle.get(s.player.handle.toLowerCase());
    return {
      id: s.id,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          {user?.username ?? 'Manager'}&apos;s Roster
        </h1>
      </div>
      {captain && (
        <CaptainBanner
          handle={captain.handle}
          teamName={captain.teamName}
          teamShortCode={captain.teamShortCode}
          totalPoints={captain.totalPoints}
        />
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {others.map((p) => (
          <PlayerPortraitCard
            key={p.id}
            handle={p.handle}
            teamName={p.teamName}
            teamShortCode={p.teamShortCode}
            totalPoints={p.totalPoints}
            kills={p.kills}
            deaths={p.deaths}
            assists={p.assists}
            mapsPlayed={p.mapsPlayed}
            captainCooldownDays={null}
            readOnly
          />
        ))}
      </div>
    </div>
  );
}
