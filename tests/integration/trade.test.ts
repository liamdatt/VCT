/**
 * Integration test: Trade flow (propose + accept)
 *
 * SKIPPED: Server Actions with 'use server' directive cannot be directly imported
 * in vitest without a Next.js server runtime. The vi.mock approach for @/lib/auth
 * and @/lib/db is blocked by the 'use server' boundary — Node cannot parse the
 * directive outside of Next.js. To run these tests properly we would need either:
 *   1. A next/test helper (not yet stable in Next 16), or
 *   2. Extract the business logic into plain functions that the actions delegate to.
 *
 * The test body documents the exact scenario and assertions so it can be unskipped
 * once the import issue is resolved.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { newTestClient, resetTestDb, TEST_DB_URL } from './helpers';
import type { PrismaClient } from '@prisma/client';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

let db: PrismaClient;

// Mock auth to return deterministic sessions
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock db to use test client
vi.mock('@/lib/db', () => ({
  db: newTestClient(),
}));

// Mock publish to no-op
vi.mock('@/lib/publish', () => ({
  publishLeagueEvent: vi.fn(),
}));

describe('Trade: propose + accept', () => {
  beforeAll(() => {
    db = newTestClient();
  });

  beforeEach(async () => {
    // Truncate relevant tables in dependency order
    await db.$executeRawUnsafe('TRUNCATE "ScoringAdjustment" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "TradeBonusCooldown" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "TradeItem" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "Trade" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "RosterSlot" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "Player" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "Team" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "LeagueMembership" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "League" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "User" CASCADE');
  });

  it.skip('propose then accept swaps roster slots and creates bonus adjustments', async () => {
    // -- Seed --
    const user1 = await db.user.create({ data: { discordId: 'u1', username: 'Alice' } });
    const user2 = await db.user.create({ data: { discordId: 'u2', username: 'Bob' } });
    const league = await db.league.create({
      data: {
        slug: 'test-league',
        name: 'Test League',
        status: 'ACTIVE',
        startDate: new Date(),
        settingsJson: DEFAULT_LEAGUE_SETTINGS as unknown as object,
      },
    });
    await db.leagueMembership.createMany({
      data: [
        { userId: user1.id, leagueId: league.id },
        { userId: user2.id, leagueId: league.id },
      ],
    });
    const team = await db.team.create({
      data: { leagueId: league.id, vlrTeamId: 't1', name: 'Team 1', shortCode: 'T1' },
    });
    const player1 = await db.player.create({
      data: { leagueId: league.id, vlrPlayerId: 'p1', teamId: team.id, handle: 'PlayerA' },
    });
    const player2 = await db.player.create({
      data: { leagueId: league.id, vlrPlayerId: 'p2', teamId: team.id, handle: 'PlayerB' },
    });
    await db.rosterSlot.createMany({
      data: [
        { userId: user1.id, leagueId: league.id, playerId: player1.id, acquiredVia: 'DRAFT', isCaptain: false },
        { userId: user2.id, leagueId: league.id, playerId: player2.id, acquiredVia: 'DRAFT', isCaptain: false },
      ],
    });

    // -- Act: import and call proposeTrade as user1 --
    const { auth } = await import('@/lib/auth');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: user1.id, discordId: 'u1', role: 'USER' },
    });
    const { proposeTrade, resolveTrade } = await import('@/lib/actions/trade');
    const result = await proposeTrade({
      leagueSlug: 'test-league',
      receiverUserId: user2.id,
      offeredPlayerIds: [player1.id],
      requestedPlayerIds: [player2.id],
    });

    // -- Act: accept as user2 --
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: user2.id, discordId: 'u2', role: 'USER' },
    });
    await resolveTrade({ tradeId: result.tradeId, accept: true });

    // -- Assert: roster slots swapped --
    const slot1 = await db.rosterSlot.findUnique({
      where: { leagueId_playerId: { leagueId: league.id, playerId: player1.id } },
    });
    expect(slot1?.userId).toBe(user2.id);

    const slot2 = await db.rosterSlot.findUnique({
      where: { leagueId_playerId: { leagueId: league.id, playerId: player2.id } },
    });
    expect(slot2?.userId).toBe(user1.id);

    // -- Assert: bonus adjustments created --
    const adjustments = await db.scoringAdjustment.findMany({ where: { leagueId: league.id } });
    expect(adjustments.length).toBe(2);
    expect(adjustments.every((a) => a.delta === DEFAULT_LEAGUE_SETTINGS.tradeBonus)).toBe(true);
  });
});
