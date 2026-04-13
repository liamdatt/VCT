import { db } from '@/lib/db';
import { computeGamePoints } from '@/lib/scoring/rules';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';
import type { LeagueSettings } from '@/lib/scoring/types';

export default async function AuditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const league = await db.league.findUnique({
    where: { slug },
    include: {
      memberships: { include: { user: true } },
    },
  });
  if (!league) return <p className="p-6 text-[--foreground]">League not found.</p>;

  const settings: LeagueSettings = (league.settingsJson as LeagueSettings) ?? DEFAULT_LEAGUE_SETTINGS;

  const matches = await db.match.findMany({
    where: { leagueId: league.id, status: 'COMPLETED' },
    include: {
      team1: true,
      team2: true,
      games: {
        orderBy: { mapNumber: 'asc' },
        include: {
          stats: { include: { player: { include: { team: true } } } },
          snapshots: true,
        },
      },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  const rosterSlots = await db.rosterSlot.findMany({
    where: { leagueId: league.id },
    include: { user: true, player: true },
  });

  const allSnapshots = await db.scoringSnapshot.findMany({
    where: { leagueId: league.id },
    include: { player: true, game: true },
  });

  const managers = league.memberships;

  // Build lookup maps
  const playerOwnerMap = new Map<string, { userId: string; username: string; isCaptain: boolean }>();
  for (const slot of rosterSlots) {
    playerOwnerMap.set(slot.playerId, {
      userId: slot.userId,
      username: slot.user.username,
      isCaptain: slot.isCaptain,
    });
  }

  const snapshotKey = (userId: string, playerId: string, gameId: string) =>
    `${userId}:${playerId}:${gameId}`;
  const snapshotMap = new Map<string, typeof allSnapshots[number]>();
  for (const snap of allSnapshots) {
    snapshotMap.set(snapshotKey(snap.userId, snap.playerId, snap.gameId), snap);
  }

  // Manager totals across all matches
  const managerTotals = new Map<string, number>();
  const managerSnapshotTotals = new Map<string, number>();

  // Pre-compute all match data
  type ManagerMatchData = {
    userId: string;
    username: string;
    captainHandle: string | null;
    players: {
      handle: string;
      playerId: string;
      maps: {
        mapNumber: number;
        mapName: string;
        kills: number;
        deaths: number;
        assists: number;
        aces: number;
        won: boolean;
        computedPts: number;
        isCaptain: boolean;
        captainMultiplied: number;
        snapshotTotal: number | null;
        snapshotExists: boolean;
        discrepancy: boolean;
      }[];
      matchTotal: number;
    }[];
    matchTotal: number;
  };

  const matchDataList: {
    match: typeof matches[number];
    managerData: ManagerMatchData[];
    managersWithNoPlayers: string[];
  }[] = [];

  for (const match of matches) {
    // Collect all player IDs in this match
    const matchPlayerIds = new Set<string>();
    for (const game of match.games) {
      for (const stat of game.stats) {
        matchPlayerIds.add(stat.playerId);
      }
    }

    // Group by manager
    const managerPlayers = new Map<string, Set<string>>();
    const managerNames = new Map<string, string>();
    const managerCaptains = new Map<string, string | null>();

    for (const playerId of matchPlayerIds) {
      const owner = playerOwnerMap.get(playerId);
      if (owner) {
        if (!managerPlayers.has(owner.userId)) {
          managerPlayers.set(owner.userId, new Set());
          managerNames.set(owner.userId, owner.username);
          // Find captain for this manager
          const captainSlot = rosterSlots.find(
            (s) => s.userId === owner.userId && s.leagueId === league.id && s.isCaptain,
          );
          managerCaptains.set(owner.userId, captainSlot?.player?.handle ?? null);
        }
        managerPlayers.get(owner.userId)!.add(playerId);
      }
    }

    const managerData: ManagerMatchData[] = [];

    for (const [userId, playerIds] of managerPlayers) {
      const captainHandle = managerCaptains.get(userId) ?? null;
      const captainSlot = rosterSlots.find(
        (s) => s.userId === userId && s.leagueId === league.id && s.isCaptain,
      );
      const captainPlayerId = captainSlot?.playerId ?? null;

      const players: ManagerMatchData['players'] = [];

      for (const playerId of playerIds) {
        // Find player handle
        const playerInfo = rosterSlots.find((s) => s.playerId === playerId);
        const handle = playerInfo?.player?.handle ?? playerId;

        const maps: ManagerMatchData['players'][number]['maps'] = [];

        for (const game of match.games) {
          const stat = game.stats.find((s) => s.playerId === playerId);
          if (!stat) continue;

          const breakdown = computeGamePoints(
            {
              kills: stat.kills,
              deaths: stat.deaths,
              assists: stat.assists,
              aces: stat.aces,
              won: stat.won,
            },
            settings,
          );

          const isCaptain = playerId === captainPlayerId;
          const captainMultiplied = isCaptain
            ? breakdown.total * settings.captainMultiplier
            : breakdown.total;

          const key = snapshotKey(userId, playerId, game.id);
          const snapshot = snapshotMap.get(key);
          const snapshotTotal = snapshot?.total ?? null;
          const snapshotExists = !!snapshot;
          const discrepancy =
            snapshotExists && Math.abs(snapshotTotal! - captainMultiplied) > 0.01;

          maps.push({
            mapNumber: game.mapNumber,
            mapName: game.mapName,
            kills: stat.kills,
            deaths: stat.deaths,
            assists: stat.assists,
            aces: stat.aces,
            won: stat.won,
            computedPts: breakdown.total,
            isCaptain,
            captainMultiplied,
            snapshotTotal,
            snapshotExists,
            discrepancy,
          });
        }

        const matchTotal = maps.reduce((sum, m) => sum + m.captainMultiplied, 0);
        players.push({ handle, playerId, maps, matchTotal });
      }

      const mTotal = players.reduce((sum, p) => sum + p.matchTotal, 0);
      managerTotals.set(userId, (managerTotals.get(userId) ?? 0) + mTotal);

      // Also tally snapshot totals for this manager/match
      for (const game of match.games) {
        for (const playerId of playerIds) {
          const key = snapshotKey(userId, playerId, game.id);
          const snap = snapshotMap.get(key);
          if (snap) {
            managerSnapshotTotals.set(
              userId,
              (managerSnapshotTotals.get(userId) ?? 0) + snap.total,
            );
          }
        }
      }

      managerData.push({
        userId,
        username: managerNames.get(userId) ?? userId,
        captainHandle: captainHandle,
        players,
        matchTotal: mTotal,
      });
    }

    const managersWithNoPlayers = managers
      .filter((m) => !managerPlayers.has(m.userId))
      .map((m) => m.user.username);

    matchDataList.push({ match, managerData, managersWithNoPlayers });
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[--foreground]">
          Audit Trail &mdash; {league.name}
        </h1>
        <a
          href={`/admin/leagues/${slug}`}
          className="text-sm text-[--muted-foreground] hover:text-[--foreground] underline"
        >
          &larr; Back to Admin
        </a>
      </div>

      {/* Summary section */}
      <div className="rounded border border-[--border] bg-[--card] p-4">
        <h2 className="mb-3 text-lg font-semibold text-[--foreground]">Manager Totals Summary</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[--border] text-left text-[--muted-foreground]">
              <th className="pb-2">Manager</th>
              <th className="pb-2 font-mono">Computed Total</th>
              <th className="pb-2 font-mono">Snapshot Total</th>
              <th className="pb-2 font-mono">Difference</th>
            </tr>
          </thead>
          <tbody>
            {managers.map((m) => {
              const computed = managerTotals.get(m.userId) ?? 0;
              const snapshot = managerSnapshotTotals.get(m.userId) ?? 0;
              const diff = computed - snapshot;
              const hasDiff = Math.abs(diff) > 0.01;
              return (
                <tr key={m.userId} className="border-b border-[--border]/50">
                  <td className="py-1.5 text-[--foreground]">{m.user.username}</td>
                  <td className="py-1.5 font-mono text-[--foreground]">{computed.toFixed(1)}</td>
                  <td className="py-1.5 font-mono text-[--foreground]">{snapshot.toFixed(1)}</td>
                  <td
                    className={`py-1.5 font-mono ${hasDiff ? 'font-bold text-[--primary]' : 'text-[--chart-2]'}`}
                  >
                    {diff > 0 ? '+' : ''}
                    {diff.toFixed(1)}
                    {hasDiff && ' !!!'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Per-match breakdown */}
      {matchDataList.map(({ match, managerData, managersWithNoPlayers }) => (
        <div key={match.id} className="rounded border border-[--border] bg-[--card] p-4 space-y-4">
          {/* Match header */}
          <div className="border-b border-[--border] pb-2">
            <h2 className="text-base font-semibold text-[--foreground]">
              {match.team1.name} {match.finalScore ?? '?'} {match.team2.name}{' '}
              <span className="text-xs text-[--muted-foreground]">({match.vlrMatchId})</span>
            </h2>
            <div className="mt-1 flex gap-3 text-xs text-[--muted-foreground]">
              {match.games.map((g) => (
                <span key={g.id}>
                  Map {g.mapNumber}: {g.mapName} ({g.team1Score}-{g.team2Score})
                </span>
              ))}
            </div>
          </div>

          {/* Per-map stat tables */}
          {match.games.map((game) => (
            <div key={game.id}>
              <h3 className="mb-1 text-sm font-medium text-[--muted-foreground]">
                Map {game.mapNumber}: {game.mapName} ({game.team1Score}-{game.team2Score})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[--border] text-left text-[--muted-foreground]">
                      <th className="pb-1 pr-2">Player</th>
                      <th className="pb-1 pr-2">Team</th>
                      <th className="pb-1 pr-2 font-mono">K</th>
                      <th className="pb-1 pr-2 font-mono">D</th>
                      <th className="pb-1 pr-2 font-mono">A</th>
                      <th className="pb-1 pr-2 font-mono">Aces</th>
                      <th className="pb-1 pr-2">W/L</th>
                      <th className="pb-1 pr-2">Owner</th>
                      <th className="pb-1 pr-2">Cpt?</th>
                      <th className="pb-1 pr-2 font-mono">Pts</th>
                      <th className="pb-1 pr-2 font-mono">w/ Cpt</th>
                      <th className="pb-1 pr-2 font-mono">Snapshot</th>
                      <th className="pb-1 pr-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {game.stats.map((stat) => {
                      const owner = playerOwnerMap.get(stat.playerId);
                      const breakdown = computeGamePoints(
                        {
                          kills: stat.kills,
                          deaths: stat.deaths,
                          assists: stat.assists,
                          aces: stat.aces,
                          won: stat.won,
                        },
                        settings,
                      );

                      const isCaptain = owner
                        ? rosterSlots.some(
                            (s) =>
                              s.userId === owner.userId &&
                              s.playerId === stat.playerId &&
                              s.isCaptain,
                          )
                        : false;
                      const withCaptain = isCaptain
                        ? breakdown.total * settings.captainMultiplier
                        : breakdown.total;

                      // Check snapshot for this player across all managers
                      const snapshots = game.snapshots.filter(
                        (s) => s.playerId === stat.playerId,
                      );
                      const primarySnap = owner
                        ? snapshots.find((s) => s.userId === owner.userId)
                        : snapshots[0] ?? null;

                      const snapshotVal = primarySnap?.total ?? null;
                      const hasSnapshot = !!primarySnap;
                      const discrepancy =
                        hasSnapshot && Math.abs(snapshotVal! - withCaptain) > 0.01;

                      let statusText = '';
                      let statusClass = '';
                      if (!owner) {
                        statusText = hasSnapshot ? 'FA (has snap)' : 'Free Agent';
                        statusClass = 'text-[--muted-foreground]';
                      } else if (!hasSnapshot) {
                        statusText = 'MISSING SNAPSHOT';
                        statusClass = 'font-bold text-[--primary]';
                      } else if (discrepancy) {
                        statusText = `MISMATCH (${snapshotVal!.toFixed(1)})`;
                        statusClass = 'font-bold text-[--primary]';
                      } else {
                        statusText = 'OK';
                        statusClass = 'text-[--chart-2]';
                      }

                      return (
                        <tr key={stat.id} className="border-b border-[--border]/30">
                          <td className="py-1 pr-2 text-[--foreground]">
                            {stat.player.handle}
                          </td>
                          <td className="py-1 pr-2 text-[--muted-foreground]">
                            {stat.player.team.shortCode}
                          </td>
                          <td className="py-1 pr-2 font-mono text-[--foreground]">
                            {stat.kills}
                          </td>
                          <td className="py-1 pr-2 font-mono text-[--foreground]">
                            {stat.deaths}
                          </td>
                          <td className="py-1 pr-2 font-mono text-[--foreground]">
                            {stat.assists}
                          </td>
                          <td className="py-1 pr-2 font-mono text-[--foreground]">
                            {stat.aces}
                          </td>
                          <td className="py-1 pr-2 text-[--foreground]">
                            {stat.won ? (
                              <span className="text-[--chart-2]">WIN</span>
                            ) : (
                              <span className="text-[--primary]">LOSS</span>
                            )}
                          </td>
                          <td className="py-1 pr-2 text-[--foreground]">
                            {owner?.username ?? (
                              <span className="text-[--muted-foreground]">Free Agent</span>
                            )}
                          </td>
                          <td className="py-1 pr-2 text-center">
                            {isCaptain && <span className="text-yellow-400">★</span>}
                          </td>
                          <td className="py-1 pr-2 font-mono text-[--foreground]">
                            {breakdown.total.toFixed(1)}
                          </td>
                          <td className="py-1 pr-2 font-mono text-[--foreground]">
                            {isCaptain ? withCaptain.toFixed(1) : '-'}
                          </td>
                          <td className="py-1 pr-2 font-mono text-[--foreground]">
                            {snapshotVal !== null ? snapshotVal.toFixed(1) : '-'}
                          </td>
                          <td className={`py-1 pr-2 ${statusClass}`}>{statusText}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Per-manager summary */}
          <div className="border-t border-[--border] pt-3">
            <h3 className="mb-2 text-sm font-semibold text-[--foreground]">
              Per-Manager Breakdown
            </h3>
            {managerData.length === 0 && (
              <p className="text-xs text-[--muted-foreground]">
                No managers had players in this match.
              </p>
            )}
            {managerData.map((md) => (
              <div key={md.userId} className="mb-3">
                <div className="text-sm text-[--foreground]">
                  <span className="font-medium">{md.username}</span>
                  {md.captainHandle && (
                    <span className="ml-2 text-xs text-yellow-400">
                      Captain: {md.captainHandle}★
                    </span>
                  )}
                  <span className="ml-2 font-mono text-xs text-[--muted-foreground]">
                    Match total: {md.matchTotal.toFixed(1)}
                  </span>
                </div>
                <div className="ml-4 mt-1 space-y-0.5">
                  {md.players.map((p) => (
                    <div key={p.playerId} className="text-xs text-[--foreground]">
                      <span className="font-medium">{p.handle}</span>
                      {p.maps.map((m) => (
                        <span key={m.mapNumber} className="ml-2 font-mono text-[--muted-foreground]">
                          Map{m.mapNumber}: K:{m.kills} D:{m.deaths} A:{m.assists}{' '}
                          {m.won ? (
                            <span className="text-[--chart-2]">W</span>
                          ) : (
                            <span className="text-[--primary]">L</span>
                          )}{' '}
                          ={' '}
                          <span className="text-[--foreground]">
                            {m.captainMultiplied.toFixed(1)}
                            {m.isCaptain && '★'}
                          </span>
                          {!m.snapshotExists && (
                            <span className="ml-1 font-bold text-[--primary]">MISSING SNAPSHOT</span>
                          )}
                          {m.discrepancy && (
                            <span className="ml-1 font-bold text-[--primary]">
                              MISMATCH(snap={m.snapshotTotal!.toFixed(1)})
                            </span>
                          )}
                        </span>
                      ))}
                      <span className="ml-2 font-mono text-[--muted-foreground]">
                        = {p.matchTotal.toFixed(1)} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {managersWithNoPlayers.length > 0 && (
              <div className="mt-2 text-xs text-[--muted-foreground]">
                Managers with no players in this match: {managersWithNoPlayers.join(', ')}
              </div>
            )}
          </div>
        </div>
      ))}

      {matches.length === 0 && (
        <p className="text-[--muted-foreground]">No completed matches found for this league.</p>
      )}
    </main>
  );
}
