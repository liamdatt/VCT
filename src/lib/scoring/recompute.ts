import { db } from '@/lib/db';
import { computeGamePoints } from './rules';
import { DEFAULT_LEAGUE_SETTINGS, type LeagueSettings } from './types';

/**
 * Regenerate ScoringSnapshot rows for a match using the MatchRoster rows as
 * the authoritative source of truth for which manager owned which player
 * (and who was captain) for this specific match.
 *
 * This is the canonical way to (re)score a match after a commissioner edits
 * a past match's roster. Deletes all existing snapshots for the match's
 * games and recreates them from (MatchRoster × PlayerGameStat).
 */
export async function recomputeMatchSnapshots(matchId: string): Promise<void> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      league: true,
      games: { include: { stats: true } },
      matchRosters: true,
    },
  });
  if (!match) throw new Error(`match ${matchId} not found`);

  const settings =
    (match.league.settingsJson as unknown as LeagueSettings) ??
    DEFAULT_LEAGUE_SETTINGS;

  // Map playerId -> { userId, isCaptain }
  const rosterByPlayer = new Map(
    match.matchRosters.map((r) => [
      r.playerId,
      { userId: r.userId, isCaptain: r.isCaptain },
    ]),
  );

  // Delete existing snapshots for all games in this match.
  const gameIds = match.games.map((g) => g.id);
  if (gameIds.length > 0) {
    await db.scoringSnapshot.deleteMany({
      where: { leagueId: match.leagueId, gameId: { in: gameIds } },
    });
  }

  for (const game of match.games) {
    for (const stat of game.stats) {
      const ownership = rosterByPlayer.get(stat.playerId);
      if (!ownership) continue; // player wasn't on anyone's roster for this match

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

      const total = ownership.isCaptain
        ? breakdown.total * settings.captainMultiplier
        : breakdown.total;

      await db.scoringSnapshot.create({
        data: {
          leagueId: match.leagueId,
          userId: ownership.userId,
          playerId: stat.playerId,
          gameId: game.id,
          total,
          captainApplied: ownership.isCaptain,
          breakdownJson: breakdown as unknown as object,
        },
      });
    }
  }
}
