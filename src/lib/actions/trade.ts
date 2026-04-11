'use server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { publishLeagueEvent } from '@/lib/publish';
import { addDays } from '@/lib/time';
import type { LeagueSettings } from '@/lib/scoring/types';

const ProposeTradeInput = z.object({
  leagueSlug: z.string(),
  receiverUserId: z.string(),
  offeredPlayerIds: z.array(z.string()).min(1),
  requestedPlayerIds: z.array(z.string()).min(1),
});

export async function proposeTrade(input: z.infer<typeof ProposeTradeInput>) {
  const parsed = ProposeTradeInput.parse(input);
  const session = await auth();
  if (!session?.user?.id) throw new Error('unauthorized');

  const league = await db.league.findUnique({ where: { slug: parsed.leagueSlug } });
  if (!league || league.status !== 'ACTIVE') throw new Error('league not active');

  // Ownership check
  const offered = await db.rosterSlot.findMany({
    where: {
      leagueId: league.id,
      playerId: { in: parsed.offeredPlayerIds },
      userId: session.user.id,
    },
  });
  if (offered.length !== parsed.offeredPlayerIds.length)
    throw new Error('you do not own all offered players');
  const requested = await db.rosterSlot.findMany({
    where: {
      leagueId: league.id,
      playerId: { in: parsed.requestedPlayerIds },
      userId: parsed.receiverUserId,
    },
  });
  if (requested.length !== parsed.requestedPlayerIds.length)
    throw new Error('receiver does not own all requested players');

  const trade = await db.trade.create({
    data: {
      leagueId: league.id,
      proposerId: session.user.id,
      receiverId: parsed.receiverUserId,
      status: 'PROPOSED',
      items: {
        create: [
          ...parsed.offeredPlayerIds.map((pid) => ({
            playerId: pid,
            direction: 'PROPOSER_TO_RECEIVER' as const,
          })),
          ...parsed.requestedPlayerIds.map((pid) => ({
            playerId: pid,
            direction: 'RECEIVER_TO_PROPOSER' as const,
          })),
        ],
      },
    },
    include: { proposer: true, receiver: true, items: { include: { player: true } } },
  });

  await publishLeagueEvent(
    {
      type: 'tradeProposed',
      leagueId: league.id,
      userIds: [session.user.id, parsed.receiverUserId],
      payload: { tradeId: trade.id },
    },
    {
      discordMessage: `🔄 ${trade.proposer.username} → ${trade.receiver.username}: ${trade.items
        .filter((i) => i.direction === 'PROPOSER_TO_RECEIVER')
        .map((i) => i.player.handle)
        .join(', ')} for ${trade.items
        .filter((i) => i.direction === 'RECEIVER_TO_PROPOSER')
        .map((i) => i.player.handle)
        .join(', ')} — pending`,
      webhookUrl: league.discordWebhookUrl,
    },
  );
  return { tradeId: trade.id };
}

const ResolveTradeInput = z.object({ tradeId: z.string(), accept: z.boolean() });

export async function resolveTrade(input: z.infer<typeof ResolveTradeInput>) {
  const parsed = ResolveTradeInput.parse(input);
  const session = await auth();
  if (!session?.user?.id) throw new Error('unauthorized');

  const trade = await db.trade.findUnique({
    where: { id: parsed.tradeId },
    include: {
      league: true,
      items: { include: { player: true } },
      proposer: true,
      receiver: true,
    },
  });
  if (!trade) throw new Error('trade not found');
  if (trade.receiverId !== session.user.id) throw new Error('not your trade');
  if (trade.status !== 'PROPOSED') throw new Error('trade already resolved');

  if (!parsed.accept) {
    await db.trade.update({
      where: { id: trade.id },
      data: { status: 'REJECTED', resolvedAt: new Date() },
    });
    await publishLeagueEvent(
      { type: 'tradeRejected', leagueId: trade.leagueId, payload: { tradeId: trade.id } },
      {
        discordMessage: `❌ ${trade.receiver.username} rejected trade from ${trade.proposer.username}`,
        webhookUrl: trade.league.discordWebhookUrl,
      },
    );
    return;
  }

  // Accept — transaction
  const settings = trade.league.settingsJson as unknown as LeagueSettings;
  await db.$transaction(async (tx) => {
    // Re-validate ownership at commit time
    for (const item of trade.items) {
      const ownerId =
        item.direction === 'PROPOSER_TO_RECEIVER' ? trade.proposerId : trade.receiverId;
      const slot = await tx.rosterSlot.findUnique({
        where: { leagueId_playerId: { leagueId: trade.leagueId, playerId: item.playerId } },
      });
      if (!slot || slot.userId !== ownerId)
        throw new Error(`ownership changed for ${item.player.handle}`);
    }
    // Move rosterSlot rows and clear captain flags
    for (const item of trade.items) {
      const newOwner =
        item.direction === 'PROPOSER_TO_RECEIVER' ? trade.receiverId : trade.proposerId;
      await tx.rosterSlot.update({
        where: { leagueId_playerId: { leagueId: trade.leagueId, playerId: item.playerId } },
        data: {
          userId: newOwner,
          isCaptain: false,
          acquiredVia: 'TRADE',
          acquiredAt: new Date(),
        },
      });
      // Trade bonus cooldown
      const existing = await tx.tradeBonusCooldown.findUnique({
        where: { leagueId_playerId: { leagueId: trade.leagueId, playerId: item.playerId } },
      });
      if (!existing || existing.expiresAt < new Date()) {
        await tx.tradeBonusCooldown.upsert({
          where: { leagueId_playerId: { leagueId: trade.leagueId, playerId: item.playerId } },
          update: { expiresAt: addDays(new Date(), settings.tradeBonusCooldownDays) },
          create: {
            leagueId: trade.leagueId,
            playerId: item.playerId,
            expiresAt: addDays(new Date(), settings.tradeBonusCooldownDays),
          },
        });
        // +5 adjustment for the receiving manager of each player
        await tx.scoringAdjustment.create({
          data: {
            leagueId: trade.leagueId,
            userId: newOwner,
            delta: settings.tradeBonus,
            reason: `Trade bonus for acquiring ${item.player.handle}`,
            createdByUserId: trade.receiverId,
          },
        });
      }
    }
    await tx.trade.update({
      where: { id: trade.id },
      data: { status: 'ACCEPTED', resolvedAt: new Date() },
    });
  });

  await publishLeagueEvent(
    { type: 'tradeAccepted', leagueId: trade.leagueId, payload: { tradeId: trade.id } },
    {
      discordMessage: `✅ Trade accepted — ${trade.items.map((i) => i.player.handle).join(' ↔ ')}`,
      webhookUrl: trade.league.discordWebhookUrl,
    },
  );
}
