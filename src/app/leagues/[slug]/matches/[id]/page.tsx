import { getMatchDetail } from '@/server/queries/matches';
import { db } from '@/lib/db';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { DataTable, THead, Th, TBody, Tr, Td } from '@/components/shared/DataTable';
import { Badge } from '@/components/shared/Badge';
import { computeGamePoints } from '@/lib/scoring/rules';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await getMatchDetail(id);
  if (!match) return <p>Match not found</p>;

  const rosterSlots = await db.rosterSlot.findMany({
    where: { leagueId: match.leagueId },
    include: { user: true },
  });
  const slotByPlayer = new Map(rosterSlots.map((s) => [s.playerId, s]));

  const t1Wins = match.games.filter((g) => g.winnerTeamId === match.team1Id).length;
  const t2Wins = match.games.filter((g) => g.winnerTeamId === match.team2Id).length;

  return (
    <div className="space-y-6">
      <div className="relative h-[200px] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between opacity-[0.15]">
          <div className="-ml-8"><TeamLogo name={match.team1.name} shortCode={match.team1.shortCode} size={200} /></div>
          <div className="-mr-8"><TeamLogo name={match.team2.name} shortCode={match.team2.shortCode} size={200} /></div>
        </div>
        <div className="relative flex h-full items-center justify-center gap-10">
          <div className="text-right">
            <div className="font-display text-[20px] text-[var(--text-primary)]">{match.team1.name}</div>
          </div>
          <div className="flex items-baseline gap-4">
            <span className={`font-display text-[80px] font-semibold leading-none tabular-nums ${t1Wins > t2Wins ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
              {t1Wins}
            </span>
            <span className="font-display text-[40px] text-[var(--text-tertiary)]">–</span>
            <span className={`font-display text-[80px] font-semibold leading-none tabular-nums ${t2Wins > t1Wins ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
              {t2Wins}
            </span>
          </div>
          <div>
            <div className="font-display text-[20px] text-[var(--text-primary)]">{match.team2.name}</div>
          </div>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <Badge variant="neutral">{match.status}</Badge>
        </div>
      </div>

      {match.games.map((g) => {
        const t1Won = g.winnerTeamId === match.team1Id;
        return (
          <div key={g.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-[24px] font-medium text-[var(--text-primary)]">{g.mapName}</h3>
              <span className="font-mono text-[18px] font-semibold tabular-nums text-[var(--text-secondary)]">
                {g.team1Score}–{g.team2Score}
              </span>
            </div>
            <DataTable>
              <THead>
                <tr>
                  <Th>Player</Th>
                  <Th>Team</Th>
                  <Th className="text-right">K</Th>
                  <Th className="text-right">D</Th>
                  <Th className="text-right">A</Th>
                  <Th className="text-right">Fantasy</Th>
                </tr>
              </THead>
              <TBody>
                {g.stats.map((s) => {
                  const slot = slotByPlayer.get(s.playerId);
                  const breakdown = computeGamePoints(
                    { kills: s.kills, deaths: s.deaths, assists: s.assists, aces: s.aces, won: s.won },
                    DEFAULT_LEAGUE_SETTINGS,
                  );
                  const rowBg = s.won && t1Won ? 'bg-emerald-500/[0.04]' : '';
                  return (
                    <Tr key={s.id} className={rowBg} hoverable={false}>
                      <Td>
                        <span className="flex items-center gap-1.5">
                          {slot?.isCaptain && <span className="text-[var(--accent-primary)]">★</span>}
                          <span className="font-medium text-[var(--text-primary)]">{s.player.handle}</span>
                          {slot && <Badge variant="neutral">{slot.user.username}</Badge>}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
                          {s.player.team.shortCode}
                        </span>
                      </Td>
                      <Td numeric className="text-right">{s.kills}</Td>
                      <Td numeric className="text-right">{s.deaths}</Td>
                      <Td numeric className="text-right">{s.assists}</Td>
                      <Td numeric className="text-right font-semibold">
                        {(slot?.isCaptain
                          ? breakdown.total * DEFAULT_LEAGUE_SETTINGS.captainMultiplier
                          : breakdown.total
                        ).toFixed(1)}
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </DataTable>
          </div>
        );
      })}
    </div>
  );
}
