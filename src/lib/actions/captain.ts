'use server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { publishLeagueEvent } from '@/lib/publish';
import { isOlderThanDays } from '@/lib/time';
import type { LeagueSettings } from '@/lib/scoring/types';

const Input = z.object({ leagueSlug: z.string(), newCaptainPlayerId: z.string() });

export async function changeCaptain(input: z.infer<typeof Input>) {
  const parsed = Input.parse(input);
  const session = await auth();
  if (!session?.user?.id) throw new Error('unauthorized');

  const league = await db.league.findUnique({ where: { slug: parsed.leagueSlug } });
  if (!league) throw new Error('league not found');
  const settings = league.settingsJson as unknown as LeagueSettings;

  const newSlot = await db.rosterSlot.findUnique({
    where: { leagueId_playerId: { leagueId: league.id, playerId: parsed.newCaptainPlayerId } },
  });
  if (!newSlot || newSlot.userId !== session.user.id) throw new Error('not your player');

  // Cooldown: most recent change must be older than N days
  const lastChange = await db.captainChange.findFirst({
    where: { leagueId: league.id, userId: session.user.id },
    orderBy: { changedAt: 'desc' },
  });
  if (lastChange && !isOlderThanDays(lastChange.changedAt, settings.captainCooldownDays)) {
    throw new Error('captain cooldown not elapsed');
  }

  const oldCaptain = await db.rosterSlot.findFirst({
    where: { leagueId: league.id, userId: session.user.id, isCaptain: true },
  });

  const userId = session.user.id;
  await db.$transaction(async (tx) => {
    if (oldCaptain) {
      await tx.rosterSlot.update({ where: { id: oldCaptain.id }, data: { isCaptain: false } });
    }
    await tx.rosterSlot.update({ where: { id: newSlot.id }, data: { isCaptain: true } });
    await tx.captainChange.create({
      data: {
        userId,
        leagueId: league.id,
        oldPlayerId: oldCaptain?.playerId ?? null,
        newPlayerId: parsed.newCaptainPlayerId,
      },
    });
  });

  await publishLeagueEvent(
    { type: 'captainChange', leagueId: league.id, userIds: [userId], payload: { newCaptainPlayerId: parsed.newCaptainPlayerId } },
    { webhookUrl: league.discordWebhookUrl },
  );
}
