'use server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { publishLeagueEvent } from '@/lib/publish';
import { startOfDayJamaica } from '@/lib/time';

const Input = z.object({
  leagueSlug: z.string(),
  droppedPlayerId: z.string(),
  pickedUpPlayerId: z.string(),
});

export async function dropAndPickup(input: z.infer<typeof Input>) {
  const parsed = Input.parse(input);
  const session = await auth();
  if (!session?.user?.id) throw new Error('unauthorized');

  const league = await db.league.findUnique({ where: { slug: parsed.leagueSlug } });
  if (!league || league.status !== 'ACTIVE') throw new Error('league not active');

  // Ownership of dropped player
  const droppedSlot = await db.rosterSlot.findUnique({
    where: { leagueId_playerId: { leagueId: league.id, playerId: parsed.droppedPlayerId } },
  });
  if (!droppedSlot || droppedSlot.userId !== session.user.id) throw new Error('not your player');

  // Target must be unowned
  const targetSlot = await db.rosterSlot.findUnique({
    where: { leagueId_playerId: { leagueId: league.id, playerId: parsed.pickedUpPlayerId } },
  });
  if (targetSlot) throw new Error('player already owned');

  // Mid-series check: dropped player's team must not have any LIVE match
  const droppedPlayer = await db.player.findUnique({ where: { id: parsed.droppedPlayerId } });
  if (!droppedPlayer) throw new Error('player missing');
  const liveForTeam = await db.match.findFirst({
    where: {
      leagueId: league.id,
      status: 'LIVE',
      OR: [{ team1Id: droppedPlayer.teamId }, { team2Id: droppedPlayer.teamId }],
    },
  });
  if (liveForTeam) throw new Error('cannot drop a player mid-series');

  // One pickup per manager per day (Jamaica TZ)
  const todayStart = startOfDayJamaica(new Date());
  const existingToday = await db.freeAgencyAction.count({
    where: { leagueId: league.id, userId: session.user.id, happenedAt: { gte: todayStart } },
  });
  if (existingToday >= 1) throw new Error('daily free agency limit reached');

  const userId = session.user.id;
  await db.$transaction(async (tx) => {
    await tx.rosterSlot.delete({
      where: { leagueId_playerId: { leagueId: league.id, playerId: parsed.droppedPlayerId } },
    });
    await tx.rosterSlot.create({
      data: {
        userId,
        leagueId: league.id,
        playerId: parsed.pickedUpPlayerId,
        acquiredVia: 'FREE_AGENCY',
        isCaptain: false,
      },
    });
    await tx.freeAgencyAction.create({
      data: {
        leagueId: league.id,
        userId,
        droppedPlayerId: parsed.droppedPlayerId,
        pickedUpPlayerId: parsed.pickedUpPlayerId,
      },
    });
  });

  await publishLeagueEvent(
    { type: 'freeAgency', leagueId: league.id, userIds: [userId], payload: { dropped: parsed.droppedPlayerId, pickedUp: parsed.pickedUpPlayerId } },
    {
      discordMessage: `🔁 ${session.user.name ?? 'Manager'} dropped a player for a free agent`,
      webhookUrl: league.discordWebhookUrl,
    },
  );
}
