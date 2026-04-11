'use server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import type { Session } from 'next-auth';
import { publishLeagueEvent } from '@/lib/publish';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';
import { ingestMatchExternal } from '@/lib/worker/scoring-worker';

function assertCommissioner(session: Session | null): asserts session is Session {
  if (!session?.user?.id || session.user.role !== 'COMMISSIONER') throw new Error('forbidden');
}

const AdjustInput = z.object({
  leagueSlug: z.string(),
  userId: z.string(),
  delta: z.number(),
  reason: z.string().min(3),
});

export async function adjustPoints(input: z.infer<typeof AdjustInput>) {
  const parsed = AdjustInput.parse(input);
  const session = await auth();
  assertCommissioner(session);
  const league = await db.league.findUnique({ where: { slug: parsed.leagueSlug } });
  if (!league) throw new Error('league not found');

  await db.scoringAdjustment.create({
    data: {
      leagueId: league.id,
      userId: parsed.userId,
      delta: parsed.delta,
      reason: parsed.reason,
      createdByUserId: session.user.id,
    },
  });
  await publishLeagueEvent(
    { type: 'scoreUpdate', leagueId: league.id, userIds: [parsed.userId], payload: { adjustment: parsed.delta } },
    {
      webhookUrl: league.discordWebhookUrl,
      discordMessage: `⚖️ Commissioner adjustment: ${parsed.delta > 0 ? '+' : ''}${parsed.delta} — ${parsed.reason}`,
    },
  );
}

const ReverseTradeInput = z.object({ tradeId: z.string() });

export async function reverseTrade(input: z.infer<typeof ReverseTradeInput>) {
  const parsed = ReverseTradeInput.parse(input);
  const session = await auth();
  assertCommissioner(session);

  const trade = await db.trade.findUnique({
    where: { id: parsed.tradeId },
    include: { items: true, league: true },
  });
  if (!trade || trade.status !== 'ACCEPTED') throw new Error('trade not reversible');

  await db.$transaction(async (tx) => {
    for (const item of trade.items) {
      const origOwner = item.direction === 'PROPOSER_TO_RECEIVER' ? trade.proposerId : trade.receiverId;
      await tx.rosterSlot.update({
        where: { leagueId_playerId: { leagueId: trade.leagueId, playerId: item.playerId } },
        data: { userId: origOwner, isCaptain: false },
      });
    }
    await tx.trade.update({ where: { id: trade.id }, data: { status: 'REVERSED' } });
  });
  await publishLeagueEvent(
    { type: 'tradeRejected', leagueId: trade.leagueId, payload: { tradeId: trade.id, reversed: true } },
    { webhookUrl: trade.league.discordWebhookUrl, discordMessage: `↩️ Commissioner reversed trade` },
  );
}

const RefetchInput = z.object({ leagueSlug: z.string(), matchId: z.string() });

export async function refetchMatch(input: z.infer<typeof RefetchInput>) {
  const parsed = RefetchInput.parse(input);
  const session = await auth();
  assertCommissioner(session);
  const match = await db.match.findUnique({ where: { id: parsed.matchId } });
  if (!match) throw new Error('match not found');
  await ingestMatchExternal(parsed.leagueSlug, match.vlrMatchId);
}

// --- Task 14.2: league creation ---

const CreateLeagueInput = z.object({
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  name: z.string().min(3),
  vlrEventId: z.string().min(1),
  startDate: z.string(), // ISO
  discordWebhookUrl: z.string().url().optional().nullable(),
});

export async function createLeague(input: z.infer<typeof CreateLeagueInput>) {
  const parsed = CreateLeagueInput.parse(input);
  const session = await auth();
  assertCommissioner(session);

  const league = await db.league.create({
    data: {
      slug: parsed.slug,
      name: parsed.name,
      vlrEventId: parsed.vlrEventId,
      startDate: new Date(parsed.startDate),
      settingsJson: DEFAULT_LEAGUE_SETTINGS as unknown as object,
      discordWebhookUrl: parsed.discordWebhookUrl ?? null,
      status: 'DRAFT_PENDING',
    },
  });

  // Import teams + players from vlrggapi.
  // NOTE: vlrggapi has no per-event roster endpoint. The plan's original createLeague
  // called getEventDetails to seed teams/players, but that function is now a no-op.
  // For v1, league creation just creates the League row — teams/players will be
  // populated as matches are ingested by the scoring worker, or via the seed script
  // for Stage 1 specifically.
  //
  // TODO: when upstream gains an event details endpoint, restore the import here.

  return { leagueId: league.id, slug: league.slug };
}
