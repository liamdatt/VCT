'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import type { Session } from 'next-auth';
import { recomputeMatchSnapshots } from '@/lib/scoring/recompute';

function assertCommissioner(session: Session | null): asserts session is Session {
  if (!session?.user?.id || session.user.role !== 'COMMISSIONER') {
    throw new Error('forbidden');
  }
}

const RosterEntry = z.object({
  userId: z.string().min(1),
  playerIds: z.array(z.string().min(1)).length(5),
  captainPlayerId: z.string().min(1),
});

const Input = z.object({
  matchId: z.string().min(1),
  leagueSlug: z.string().min(1),
  rosters: z.array(RosterEntry),
});

export async function updateMatchRoster(input: z.infer<typeof Input>) {
  const parsed = Input.parse(input);
  const session = await auth();
  assertCommissioner(session);

  const league = await db.league.findUnique({
    where: { slug: parsed.leagueSlug },
    select: { id: true },
  });
  if (!league) throw new Error('league not found');

  const match = await db.match.findUnique({
    where: { id: parsed.matchId },
    select: { id: true, leagueId: true },
  });
  if (!match) throw new Error('match not found');
  if (match.leagueId !== league.id) throw new Error('match does not belong to league');

  // Validate rosters
  const seenPlayers = new Set<string>();
  for (const roster of parsed.rosters) {
    // Exactly 5 unique players
    const uniq = new Set(roster.playerIds);
    if (uniq.size !== 5) {
      throw new Error(`manager ${roster.userId} has duplicate players in their roster`);
    }
    // Captain must be in playerIds
    if (!uniq.has(roster.captainPlayerId)) {
      throw new Error(`manager ${roster.userId} captain is not in their roster`);
    }
    // No player overlap across managers in this match
    for (const pid of roster.playerIds) {
      if (seenPlayers.has(pid)) {
        throw new Error(`player ${pid} is assigned to more than one manager`);
      }
      seenPlayers.add(pid);
    }
  }

  // Validate all players exist in the league
  const allPlayerIds = Array.from(seenPlayers);
  const leaguePlayers = await db.player.findMany({
    where: { leagueId: league.id, id: { in: allPlayerIds } },
    select: { id: true },
  });
  if (leaguePlayers.length !== allPlayerIds.length) {
    throw new Error('one or more players are not in this league');
  }

  // Validate all manager userIds are actually league members
  const managerIds = parsed.rosters.map((r) => r.userId);
  const memberships = await db.leagueMembership.findMany({
    where: { leagueId: league.id, userId: { in: managerIds } },
    select: { userId: true },
  });
  if (memberships.length !== new Set(managerIds).size) {
    throw new Error('one or more users are not members of this league');
  }

  await db.$transaction(async (tx) => {
    await tx.matchRoster.deleteMany({ where: { matchId: parsed.matchId } });
    await tx.matchRoster.createMany({
      data: parsed.rosters.flatMap((roster) =>
        roster.playerIds.map((playerId) => ({
          matchId: parsed.matchId,
          userId: roster.userId,
          playerId,
          isCaptain: playerId === roster.captainPlayerId,
        })),
      ),
    });
  });

  await recomputeMatchSnapshots(parsed.matchId);

  return { success: true as const };
}
