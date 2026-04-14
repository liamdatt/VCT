import Link from 'next/link';
import { db } from '@/lib/db';
import { computeGamePoints } from '@/lib/scoring/rules';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';
import type { LeagueSettings } from '@/lib/scoring/types';
import { MatchRosterEditor } from '@/components/admin/MatchRosterEditor';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { DataTable, THead, Th, TBody, Tr, Td } from '@/components/shared/DataTable';

export default async function AuditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const league = await db.league.findUnique({
    where: { slug },
    include: {
      memberships: { include: { user: true } },
    },
  });
  if (!league) return <p className="p-8 text-[var(--text-primary)]">League not found.</p>;

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

  const allLeaguePlayers = await db.player.findMany({
    where: { leagueId: league.id },
    include: { team: true },
    orderBy: [{ team: { shortCode: 'asc' } }, { handle: 'asc' }],
  });

  const editorPlayers = allLeaguePlayers.map((p) => ({
    id: p.id,
    handle: p.handle,
    teamName: p.team.shortCode,
  }));

  const matchRosters = await db.matchRoster.findMany({
    where: { match: { leagueId: league.id } },
    select: { matchId: true, userId: true, playerId: true, isCaptain: true },
  });

  const matchRosterByMatch = new Map<string, typeof matchRosters>();
  for (const mr of matchRosters) {
    if (!matchRosterByMatch.has(mr.matchId)) matchRosterByMatch.set(mr.matchId, []);
    matchRosterByMatch.get(mr.matchId)!.push(mr);
  }

  const managers = league.memberships;
  const editorManagers = managers.map((m) => ({
    userId: m.userId,
    username: m.user.username,
  }));

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
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
            Audit Trail
          </h1>
          <div className="mt-2 text-[12px] text-[var(--text-tertiary)]">{league.name}</div>
        </div>
        <Link
          href={`/admin/leagues/${slug}`}
          className="text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          ← Back to admin
        </Link>
      </div>

      {/* Summary section */}
      <Card padding="comfortable">
        <CardHeader label="Manager totals summary" />
        <DataTable>
          <THead>
            <tr>
              <Th>Manager</Th>
              <Th className="text-right">Computed</Th>
              <Th className="text-right">Snapshot</Th>
              <Th className="text-right">Diff</Th>
            </tr>
          </THead>
          <TBody>
            {managers.map((m) => {
              const computed = managerTotals.get(m.userId) ?? 0;
              const snapshot = managerSnapshotTotals.get(m.userId) ?? 0;
              const diff = computed - snapshot;
              const hasDiff = Math.abs(diff) > 0.01;
              return (
                <Tr key={m.userId} className={hasDiff ? 'bg-rose-500/[0.04]' : ''}>
                  <Td>{m.user.username}</Td>
                  <Td numeric className="text-right font-display tabular-nums">
                    {computed.toFixed(1)}
                  </Td>
                  <Td numeric className="text-right">
                    {snapshot.toFixed(1)}
                  </Td>
                  <Td
                    numeric
                    className={`text-right ${hasDiff ? 'font-semibold text-rose-400' : 'text-emerald-400'}`}
                  >
                    {diff > 0 ? '+' : ''}
                    {diff.toFixed(1)}
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </DataTable>
      </Card>

      {/* Per-match breakdown */}
      {matchDataList.map(({ match, managerData, managersWithNoPlayers }) => (
        <Card key={match.id} padding="comfortable" className="space-y-4">
          {/* Match header */}
          <div className="border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-[20px] font-medium text-[var(--text-primary)]">
                {match.team1.name}{' '}
                <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                  {match.finalScore ?? '?'}
                </span>{' '}
                {match.team2.name}
              </h2>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
                {match.vlrMatchId}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {match.games.map((g) => (
                <Badge key={g.id} variant="neutral">
                  Map {g.mapNumber} · {g.mapName} {g.team1Score}-{g.team2Score}
                </Badge>
              ))}
            </div>
          </div>

          {/* Per-map stat tables */}
          {match.games.map((game) => (
            <div key={game.id}>
              <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
                Map {game.mapNumber}: {game.mapName} ({game.team1Score}-{game.team2Score})
              </div>
              <div className="overflow-x-auto">
                <DataTable>
                  <THead>
                    <tr>
                      <Th>Player</Th>
                      <Th>Team</Th>
                      <Th className="text-right">K</Th>
                      <Th className="text-right">D</Th>
                      <Th className="text-right">A</Th>
                      <Th className="text-right">Aces</Th>
                      <Th>W/L</Th>
                      <Th>Owner</Th>
                      <Th>Cpt</Th>
                      <Th className="text-right">Pts</Th>
                      <Th className="text-right">w/Cpt</Th>
                      <Th className="text-right">Snap</Th>
                      <Th>Status</Th>
                    </tr>
                  </THead>
                  <TBody>
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

                      let statusNode: React.ReactNode = null;
                      let rowClass = '';
                      if (!owner) {
                        statusNode = (
                          <span className="text-[var(--text-tertiary)]">
                            {hasSnapshot ? 'FA (has snap)' : 'Free Agent'}
                          </span>
                        );
                      } else if (!hasSnapshot) {
                        statusNode = (
                          <span className="font-semibold text-rose-400">MISSING SNAPSHOT</span>
                        );
                        rowClass = 'bg-rose-500/[0.04]';
                      } else if (discrepancy) {
                        statusNode = (
                          <span className="font-semibold text-rose-400">
                            MISMATCH ({snapshotVal!.toFixed(1)})
                          </span>
                        );
                        rowClass = 'bg-rose-500/[0.04]';
                      } else {
                        statusNode = <span className="text-emerald-400">OK</span>;
                      }

                      return (
                        <Tr key={stat.id} className={rowClass}>
                          <Td>{stat.player.handle}</Td>
                          <Td className="text-[var(--text-tertiary)]">
                            {stat.player.team.shortCode}
                          </Td>
                          <Td numeric className="text-right">
                            {stat.kills}
                          </Td>
                          <Td numeric className="text-right">
                            {stat.deaths}
                          </Td>
                          <Td numeric className="text-right">
                            {stat.assists}
                          </Td>
                          <Td numeric className="text-right">
                            {stat.aces}
                          </Td>
                          <Td>
                            {stat.won ? (
                              <Badge variant="win">W</Badge>
                            ) : (
                              <Badge variant="loss">L</Badge>
                            )}
                          </Td>
                          <Td>
                            {owner?.username ? (
                              <Badge variant="neutral">{owner.username}</Badge>
                            ) : (
                              <span className="text-[var(--text-tertiary)]">Free Agent</span>
                            )}
                          </Td>
                          <Td>
                            {isCaptain && (
                              <span className="text-[var(--accent-primary)]">★</span>
                            )}
                          </Td>
                          <Td numeric className="text-right">
                            {breakdown.total.toFixed(1)}
                          </Td>
                          <Td numeric className="text-right">
                            {isCaptain ? withCaptain.toFixed(1) : '—'}
                          </Td>
                          <Td numeric className="text-right">
                            {snapshotVal !== null ? snapshotVal.toFixed(1) : '—'}
                          </Td>
                          <Td>{statusNode}</Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </DataTable>
              </div>
            </div>
          ))}

          {/* Per-manager summary */}
          <div className="border-t border-[var(--border-subtle)] pt-3">
            <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Per-manager breakdown
            </div>
            {managerData.length === 0 && (
              <p className="text-[12px] text-[var(--text-tertiary)]">
                No managers had players in this match.
              </p>
            )}
            {managerData.map((md) => (
              <div key={md.userId} className="mb-3">
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="font-medium text-[var(--text-primary)]">{md.username}</span>
                  {md.captainHandle && (
                    <span className="text-[12px] text-[var(--accent-primary)]">
                      ★ {md.captainHandle}
                    </span>
                  )}
                  <span className="ml-auto font-display font-semibold tabular-nums text-[var(--text-primary)]">
                    {md.matchTotal.toFixed(1)}
                  </span>
                </div>
                <div className="ml-4 mt-1 space-y-0.5">
                  {md.players.map((p) => (
                    <div key={p.playerId} className="text-[12px] text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--text-primary)]">{p.handle}</span>
                      {p.maps.map((m) => (
                        <span
                          key={m.mapNumber}
                          className="ml-2 font-mono text-[var(--text-tertiary)]"
                        >
                          M{m.mapNumber}: {m.kills}/{m.deaths}/{m.assists}{' '}
                          {m.won ? (
                            <span className="text-emerald-400">W</span>
                          ) : (
                            <span className="text-rose-400">L</span>
                          )}{' '}
                          ={' '}
                          <span className="tabular-nums text-[var(--text-primary)]">
                            {m.captainMultiplied.toFixed(1)}
                            {m.isCaptain && '★'}
                          </span>
                          {!m.snapshotExists && (
                            <span className="ml-1 font-semibold text-rose-400">
                              MISSING SNAPSHOT
                            </span>
                          )}
                          {m.discrepancy && (
                            <span className="ml-1 font-semibold text-rose-400">
                              MISMATCH (snap={m.snapshotTotal!.toFixed(1)})
                            </span>
                          )}
                        </span>
                      ))}
                      <span className="ml-2 font-mono tabular-nums text-[var(--text-tertiary)]">
                        = {p.matchTotal.toFixed(1)} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {managersWithNoPlayers.length > 0 && (
              <div className="mt-2 text-[12px] text-[var(--text-tertiary)]">
                Managers with no players in this match: {managersWithNoPlayers.join(', ')}
              </div>
            )}
          </div>

          {/* Interactive roster editor */}
          {(() => {
            const rows = matchRosterByMatch.get(match.id) ?? [];
            const byUser = new Map<string, { playerIds: string[]; captainPlayerId: string }>();
            for (const r of rows) {
              let entry = byUser.get(r.userId);
              if (!entry) {
                entry = { playerIds: [], captainPlayerId: '' };
                byUser.set(r.userId, entry);
              }
              entry.playerIds.push(r.playerId);
              if (r.isCaptain) entry.captainPlayerId = r.playerId;
            }
            const initialRosters = Array.from(byUser.entries()).map(([userId, v]) => ({
              userId,
              playerIds: v.playerIds,
              captainPlayerId: v.captainPlayerId,
            }));
            return (
              <MatchRosterEditor
                matchId={match.id}
                leagueSlug={slug}
                managers={editorManagers}
                initialRosters={initialRosters}
                allPlayers={editorPlayers}
              />
            );
          })()}
        </Card>
      ))}

      {matches.length === 0 && (
        <p className="text-[var(--text-tertiary)]">No completed matches found for this league.</p>
      )}
    </div>
  );
}
