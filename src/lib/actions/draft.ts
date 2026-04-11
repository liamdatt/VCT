'use server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { publishLeagueEvent } from '@/lib/publish';

const TOTAL_ROUNDS = 5;

const StartInput = z.object({ leagueSlug: z.string() });

export async function startDraft(input: z.infer<typeof StartInput>) {
  const parsed = StartInput.parse(input);
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'COMMISSIONER') throw new Error('forbidden');

  const league = await db.league.findUnique({
    where: { slug: parsed.leagueSlug },
    include: { memberships: true },
  });
  if (!league) throw new Error('league not found');
  if (league.status !== 'DRAFT_PENDING') throw new Error('league not in draft-pending state');

  const userIds = league.memberships.map((m) => m.userId);
  // Fisher-Yates shuffle
  for (let i = userIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [userIds[i], userIds[j]] = [userIds[j], userIds[i]];
  }

  await db.$transaction(async (tx) => {
    await tx.draft.create({
      data: {
        leagueId: league.id,
        status: 'ACTIVE',
        pickOrderJson: userIds as unknown as object,
      },
    });
    await tx.league.update({ where: { id: league.id }, data: { status: 'DRAFTING' } });
  });

  await publishLeagueEvent(
    { type: 'draftPick', leagueId: league.id, payload: { event: 'started' } },
    { webhookUrl: league.discordWebhookUrl, discordMessage: '🏁 Draft started!' },
  );
}

const PickInput = z.object({ leagueSlug: z.string(), playerId: z.string() });

export async function makePick(input: z.infer<typeof PickInput>) {
  const parsed = PickInput.parse(input);
  const session = await auth();
  if (!session?.user?.id) throw new Error('unauthorized');

  const league = await db.league.findUnique({
    where: { slug: parsed.leagueSlug },
    include: { draft: true },
  });
  if (!league?.draft || league.draft.status !== 'ACTIVE') throw new Error('draft not active');
  const draft = league.draft;
  const order = draft.pickOrderJson as string[];

  // Snake: odd rounds forward, even rounds reversed.
  const round = draft.currentRound;
  const idxInRound = draft.currentPickIndex;
  const seat = round % 2 === 1 ? idxInRound : order.length - 1 - idxInRound;
  const currentUserId = order[seat];
  if (currentUserId !== session.user.id) throw new Error('not your turn');

  const owned = await db.rosterSlot.findUnique({
    where: { leagueId_playerId: { leagueId: league.id, playerId: parsed.playerId } },
  });
  if (owned) throw new Error('player already taken');

  const pickNumber = (round - 1) * order.length + idxInRound + 1;

  const nextIdx = idxInRound + 1;
  const nextRound = nextIdx >= order.length ? round + 1 : round;
  const nextPickIndex = nextIdx >= order.length ? 0 : nextIdx;
  const isComplete = nextRound > TOTAL_ROUNDS;

  const userId = session.user.id;
  await db.$transaction(async (tx) => {
    await tx.draftPick.create({
      data: {
        draftId: draft.id,
        round,
        pickNumber,
        userId,
        playerId: parsed.playerId,
      },
    });
    await tx.rosterSlot.create({
      data: {
        userId,
        leagueId: league.id,
        playerId: parsed.playerId,
        acquiredVia: 'DRAFT',
        isCaptain: false,
      },
    });
    await tx.draft.update({
      where: { id: draft.id },
      data: {
        currentRound: nextRound,
        currentPickIndex: nextPickIndex,
        status: isComplete ? 'COMPLETED' : 'ACTIVE',
        completedAt: isComplete ? new Date() : null,
      },
    });
    if (isComplete) {
      await tx.league.update({ where: { id: league.id }, data: { status: 'ACTIVE' } });
    }
  });

  await publishLeagueEvent(
    { type: 'draftPick', leagueId: league.id, payload: { round, pickNumber, userId, playerId: parsed.playerId } },
    { webhookUrl: league.discordWebhookUrl },
  );
}
