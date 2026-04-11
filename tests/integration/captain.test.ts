/**
 * Integration test: Captain change cooldown
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

describe('Captain: cooldown enforcement', () => {
  beforeAll(() => {
    db = newTestClient();
  });

  beforeEach(async () => {
    await db.$executeRawUnsafe('TRUNCATE "CaptainChange" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "RosterSlot" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "Player" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "Team" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "LeagueMembership" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "League" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "User" CASCADE');
  });

  it.skip('allows change after cooldown, blocks inside cooldown', async () => {
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
    const captain = await db.player.create({
      data: { leagueId: league.id, vlrPlayerId: 'p1', teamId: team.id, handle: 'Captain' },
    });
    const other = await db.player.create({
      data: { leagueId: league.id, vlrPlayerId: 'p2', teamId: team.id, handle: 'Other' },
    });
    await db.rosterSlot.createMany({
      data: [
        { userId: user.id, leagueId: league.id, playerId: captain.id, acquiredVia: 'DRAFT', isCaptain: true },
        { userId: user.id, leagueId: league.id, playerId: other.id, acquiredVia: 'DRAFT', isCaptain: false },
      ],
    });

    // Old captain change from 8 days ago — should be past cooldown
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await db.captainChange.create({
      data: {
        userId: user.id,
        leagueId: league.id,
        oldPlayerId: null,
        newPlayerId: captain.id,
        changedAt: eightDaysAgo,
      },
    });

    // -- Act --
    const { auth } = await import('@/lib/auth');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: user.id, discordId: 'u1', role: 'USER' },
    });
    const { changeCaptain } = await import('@/lib/actions/captain');

    // First change: should succeed (cooldown elapsed)
    await changeCaptain({ leagueSlug: 'test-league', newCaptainPlayerId: other.id });

    // Verify new captain is set
    const newSlot = await db.rosterSlot.findUnique({
      where: { leagueId_playerId: { leagueId: league.id, playerId: other.id } },
    });
    expect(newSlot?.isCaptain).toBe(true);

    // Second change immediately: should fail (inside cooldown)
    await expect(
      changeCaptain({ leagueSlug: 'test-league', newCaptainPlayerId: captain.id }),
    ).rejects.toThrow('captain cooldown not elapsed');
  });
});
