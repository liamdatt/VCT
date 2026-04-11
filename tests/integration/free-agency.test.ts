/**
 * Integration test: Free agency — one pickup per day limit
 *
 * SKIPPED: See trade.test.ts for details on the 'use server' import limitation.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { newTestClient, resetTestDb, TEST_DB_URL } from './helpers';
import type { PrismaClient } from '@prisma/client';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

let db: PrismaClient;

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: newTestClient(),
}));

vi.mock('@/lib/publish', () => ({
  publishLeagueEvent: vi.fn(),
}));

describe('Free Agency: daily limit enforcement', () => {
  beforeAll(() => {
    db = newTestClient();
  });

  beforeEach(async () => {
    await db.$executeRawUnsafe('TRUNCATE "FreeAgencyAction" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "RosterSlot" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "Player" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "Team" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "Match" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "LeagueMembership" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "League" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "User" CASCADE');
  });

  it.skip('allows one pickup, blocks second same day', async () => {
    // -- Seed --
    const user = await db.user.create({ data: { discordId: 'u1', username: 'Alice' } });
    const league = await db.league.create({
      data: {
        slug: 'test-league',
        name: 'Test League',
        status: 'ACTIVE',
        startDate: new Date(),
        settingsJson: DEFAULT_LEAGUE_SETTINGS as unknown as object,
      },
    });
    await db.leagueMembership.create({ data: { userId: user.id, leagueId: league.id } });
    const team = await db.team.create({
      data: { leagueId: league.id, vlrTeamId: 't1', name: 'Team 1', shortCode: 'T1' },
    });
    const ownedPlayer = await db.player.create({
      data: { leagueId: league.id, vlrPlayerId: 'p1', teamId: team.id, handle: 'Owned' },
    });
    const freePlayer1 = await db.player.create({
      data: { leagueId: league.id, vlrPlayerId: 'p2', teamId: team.id, handle: 'Free1' },
    });
    const freePlayer2 = await db.player.create({
      data: { leagueId: league.id, vlrPlayerId: 'p3', teamId: team.id, handle: 'Free2' },
    });
    await db.rosterSlot.create({
      data: { userId: user.id, leagueId: league.id, playerId: ownedPlayer.id, acquiredVia: 'DRAFT', isCaptain: false },
    });

    // -- Act --
    const { auth } = await import('@/lib/auth');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: user.id, discordId: 'u1', role: 'USER' },
    });
    const { dropAndPickup } = await import('@/lib/actions/free-agency');

    // First pickup: should pass
    await dropAndPickup({
      leagueSlug: 'test-league',
      droppedPlayerId: ownedPlayer.id,
      pickedUpPlayerId: freePlayer1.id,
    });

    // Second pickup same day: should throw
    await expect(
      dropAndPickup({
        leagueSlug: 'test-league',
        droppedPlayerId: freePlayer1.id,
        pickedUpPlayerId: freePlayer2.id,
      }),
    ).rejects.toThrow('daily free agency limit reached');
  });
});
