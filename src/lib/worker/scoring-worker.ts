import { db } from '@/lib/db';
import { vlrapi } from '@/lib/vlrapi/client';
import { computeGamePoints } from '@/lib/scoring/rules';
import type { LeagueSettings } from '@/lib/scoring/types';
import { publishLeagueEvent } from '@/lib/publish';
import { toInt, acesFromRounds } from '@/lib/vlrapi/parse';
import type { VlrMatchDetailSegment } from '@/lib/vlrapi/types';
import type { MatchStatus } from '@prisma/client';

const POLL_INTERVAL_MS = 60_000;
const STALE_THRESHOLD_MS = 10 * 60_000;

type LeagueMini = {
  id: string;
  slug: string;
  vlrEventId: string | null;
  settingsJson: unknown;
  discordWebhookUrl: string | null;
};

let running = false;
let stopFlag = false;
const lastSuccessByLeague = new Map<string, number>();

function mapDetailStatus(s: string): MatchStatus {
  const lower = s.toLowerCase();
  if (lower === 'final' || lower === 'completed') return 'COMPLETED';
  if (lower === 'live') return 'LIVE';
  return 'UPCOMING';
}

function mapSummaryStatus(s: string): MatchStatus {
  const lower = s.toLowerCase();
  if (lower === 'completed') return 'COMPLETED';
  if (lower === 'live') return 'LIVE';
  return 'UPCOMING';
}

export async function tick(): Promise<void> {
  const leagues = await db.league.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      slug: true,
      vlrEventId: true,
      settingsJson: true,
      discordWebhookUrl: true,
    },
  });

  for (const league of leagues) {
    try {
      await processLeague(league);
      lastSuccessByLeague.set(league.id, Date.now());
    } catch (err) {
      console.error(`[worker] league ${league.slug} failed:`, err);
      try {
        await db.ingestError.create({
          data: {
            leagueId: league.id,
            context: 'tick',
            message: err instanceof Error ? err.message : String(err),
          },
        });
      } catch (logErr) {
        console.error('[worker] failed to log ingest error', logErr);
      }
      const last = lastSuccessByLeague.get(league.id) ?? 0;
      if (Date.now() - last > STALE_THRESHOLD_MS) {
        await publishLeagueEvent(
          {
            type: 'scoreUpdate',
            leagueId: league.id,
            payload: { stalled: true },
          },
          {
            discordMessage: `Scoring worker stalled for ${league.slug}`,
            webhookUrl: league.discordWebhookUrl,
          },
        );
      }
    }
  }
}

async function processLeague(league: LeagueMini): Promise<void> {
  if (!league.vlrEventId) return;
  const summaries = await vlrapi.getEventMatches(league.vlrEventId);
  const relevant = summaries.filter((s) => {
    const st = mapSummaryStatus(s.status);
    return st === 'LIVE' || st === 'COMPLETED';
  });

  for (const summary of relevant) {
    try {
      const detail = await vlrapi.getMatch(summary.match_id);
      await ingestMatch(league, detail);
    } catch (err) {
      console.error(
        `[worker] ingest failed for match ${summary.match_id}:`,
        err,
      );
      await db.ingestError.create({
        data: {
          leagueId: league.id,
          context: `processLeague(match=${summary.match_id})`,
          message: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }
}

export async function ingestMatch(
  league: LeagueMini,
  detail: VlrMatchDetailSegment,
): Promise<void> {
  const settings = league.settingsJson as unknown as LeagueSettings;
  const [teamA, teamB] = detail.teams;
  if (!teamA || !teamB) return;

  // Look up teams by name (we treat name as vlrTeamId per types.ts convention).
  const dbTeam1 = await db.team.findUnique({
    where: {
      leagueId_vlrTeamId: { leagueId: league.id, vlrTeamId: teamA.name },
    },
  });
  const dbTeam2 = await db.team.findUnique({
    where: {
      leagueId_vlrTeamId: { leagueId: league.id, vlrTeamId: teamB.name },
    },
  });
  if (!dbTeam1 || !dbTeam2) {
    await db.ingestError.create({
      data: {
        leagueId: league.id,
        context: `ingestMatch(${detail.match_id})`,
        message: `team not in league: ${teamA.name} or ${teamB.name}`,
      },
    });
    return;
  }

  const matchStatus = mapDetailStatus(detail.status);
  const finalScore = `${teamA.score}-${teamB.score}`;
  const format: 'BO1' | 'BO3' | 'BO5' =
    detail.maps.length >= 4 ? 'BO5' : detail.maps.length >= 2 ? 'BO3' : 'BO1';

  const match = await db.match.upsert({
    where: {
      leagueId_vlrMatchId: {
        leagueId: league.id,
        vlrMatchId: detail.match_id,
      },
    },
    update: {
      status: matchStatus,
      finalScore,
    },
    create: {
      leagueId: league.id,
      vlrMatchId: detail.match_id,
      team1Id: dbTeam1.id,
      team2Id: dbTeam2.id,
      // vlrapi does not return a reliable ISO timestamp; use "now" as a
      // best-effort stamp for newly-discovered matches. The seed script
      // (or a future scheduler) should set the real scheduledAt.
      scheduledAt: new Date(),
      status: matchStatus,
      format,
      finalScore,
    },
  });

  for (let i = 0; i < detail.maps.length; i++) {
    const map = detail.maps[i];
    const mapNumber = i + 1;

    const mapScore1 = toInt(map.score?.team1);
    const mapScore2 = toInt(map.score?.team2);
    const durationPresent = !!map.duration && map.duration.trim() !== '';
    const isMapCompleted =
      durationPresent && (mapScore1 > 0 || mapScore2 > 0);
    if (!isMapCompleted) continue;

    // Skip if we already ingested this completed map.
    const existing = await db.game.findUnique({
      where: { matchId_mapNumber: { matchId: match.id, mapNumber } },
    });
    if (existing && existing.completedAt) continue;

    const winnerTeamId =
      mapScore1 > mapScore2
        ? dbTeam1.id
        : mapScore2 > mapScore1
          ? dbTeam2.id
          : null;

    const game = await db.game.upsert({
      where: { matchId_mapNumber: { matchId: match.id, mapNumber } },
      update: {
        team1Score: mapScore1,
        team2Score: mapScore2,
        winnerTeamId,
        completedAt: new Date(),
      },
      create: {
        matchId: match.id,
        mapNumber,
        mapName: map.map_name,
        team1Score: mapScore1,
        team2Score: mapScore2,
        winnerTeamId,
        completedAt: new Date(),
      },
    });

    // acesFromRounds currently returns empty; worker will default to 0.
    // See parse.ts for the reasoning and the manual-adjustment fallback.
    const aceMap = acesFromRounds(map);
    const affectedUserIds = new Set<string>();

    for (const teamKey of ['team1', 'team2'] as const) {
      const teamName = teamKey === 'team1' ? teamA.name : teamB.name;
      const dbTeam = teamKey === 'team1' ? dbTeam1 : dbTeam2;
      const lines = map.players?.[teamKey] ?? [];

      for (const line of lines) {
        const handle = line.name;
        if (!handle) continue;

        const player = await db.player.findUnique({
          where: {
            leagueId_vlrPlayerId: {
              leagueId: league.id,
              vlrPlayerId: handle,
            },
          },
        });
        if (!player) {
          await db.ingestError.create({
            data: {
              leagueId: league.id,
              context: `ingestMatch(${detail.match_id}) map ${mapNumber}`,
              message: `player ${handle} (team ${teamName}) not in league — skipping`,
            },
          });
          continue;
        }

        const kills = toInt(line.kills);
        const deaths = toInt(line.deaths);
        const assists = toInt(line.assists);
        const aces = aceMap.get(handle) ?? 0;
        const won = winnerTeamId === dbTeam.id;

        await db.playerGameStat.upsert({
          where: {
            gameId_playerId: { gameId: game.id, playerId: player.id },
          },
          update: { kills, deaths, assists, aces, won },
          create: {
            gameId: game.id,
            playerId: player.id,
            kills,
            deaths,
            assists,
            aces,
            won,
          },
        });

        const slot = await db.rosterSlot.findUnique({
          where: {
            leagueId_playerId: {
              leagueId: league.id,
              playerId: player.id,
            },
          },
        });
        if (!slot) continue;

        const breakdown = computeGamePoints(
          { kills, deaths, assists, aces, won },
          settings,
        );
        await db.scoringSnapshot.upsert({
          where: {
            leagueId_userId_playerId_gameId: {
              leagueId: league.id,
              userId: slot.userId,
              playerId: player.id,
              gameId: game.id,
            },
          },
          update: {
            total: breakdown.total,
            breakdownJson: breakdown as unknown as object,
          },
          create: {
            leagueId: league.id,
            userId: slot.userId,
            playerId: player.id,
            gameId: game.id,
            total: breakdown.total,
            breakdownJson: breakdown as unknown as object,
          },
        });
        affectedUserIds.add(slot.userId);
      }
    }

    await publishLeagueEvent(
      {
        type: 'scoreUpdate',
        leagueId: league.id,
        userIds: [...affectedUserIds],
        payload: {
          gameId: game.id,
          matchId: match.id,
          mapNumber,
          mapName: map.map_name,
        },
      },
      {
        discordMessage: `${map.map_name} — ${teamA.name} ${mapScore1}-${mapScore2} ${teamB.name}`,
        webhookUrl: league.discordWebhookUrl,
      },
    );
  }
}

/**
 * External hook: re-ingest a single match by vlr match id. Useful for
 * commissioner "re-score" commands and tests. Looks the league up by slug
 * and delegates to `ingestMatch`.
 */
export async function ingestMatchExternal(
  leagueSlug: string,
  vlrMatchId: string,
): Promise<void> {
  const league = await db.league.findUnique({
    where: { slug: leagueSlug },
    select: {
      id: true,
      slug: true,
      vlrEventId: true,
      settingsJson: true,
      discordWebhookUrl: true,
    },
  });
  if (!league) throw new Error(`league not found: ${leagueSlug}`);
  const detail = await vlrapi.getMatch(vlrMatchId);
  await ingestMatch(league, detail);
}

export function startWorker(): void {
  if (running) return;
  running = true;
  stopFlag = false;
  void (async () => {
    console.log('[worker] scoring worker started');
    while (!stopFlag) {
      try {
        await tick();
      } catch (err) {
        console.error('[worker] tick error', err);
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    running = false;
    console.log('[worker] scoring worker stopped');
  })();
}

export function stopWorker(): void {
  stopFlag = true;
}
