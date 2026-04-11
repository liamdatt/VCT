/**
 * Integration test: Draft start + first pick + snake advancement
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

describe('Draft: start + first pick', () => {
  beforeAll(() => {
    db = newTestClient();
  });

  beforeEach(async () => {
    await db.$executeRawUnsafe('TRUNCATE "DraftPick" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "Draft" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "RosterSlot" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "Player" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "Team" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "LeagueMembership" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "League" CASCADE');
    await db.$executeRawUnsafe('TRUNCATE "User" CASCADE');
  });

  it.skip('starts draft and advances after first pick', async () => {
    // -- Seed --
    const user1 = await db.user.create({ data: { discordId: 'u1', username: 'Alice', role: 'COMMISSIONER' } });
    const user2 = await db.user.create({ data: { discordId: 'u2', username: 'Bob' } });
    const league = await db.league.create({
      data: {
        slug: 'test-league',
        name: 'Test League',
        status: 'DRAFT_PENDING',
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
    // Create 12 players
    const players = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        db.player.create({
          data: { leagueId: league.id, vlrPlayerId: `p${i}`, teamId: team.id, handle: `Player${i}` },
        }),
      ),
    );

    // -- Act: start draft as commissioner --
    const { auth } = await import('@/lib/auth');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: user1.id, discordId: 'u1', role: 'COMMISSIONER' },
    });
    const { startDraft, makePick } = await import('@/lib/actions/draft');
    await startDraft({ leagueSlug: 'test-league' });

    // Verify draft was created
    const draft = await db.draft.findFirst({ where: { leagueId: league.id } });
    expect(draft).toBeTruthy();
    expect(draft?.status).toBe('ACTIVE');
    expect(draft?.currentRound).toBe(1);
    expect(draft?.currentPickIndex).toBe(0);

    // Determine who picks first from the randomized order
    const order = draft!.pickOrderJson as string[];
    const firstPicker = order[0];

    // Mock auth for the first picker
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: {
        id: firstPicker,
        discordId: firstPicker === user1.id ? 'u1' : 'u2',
        role: firstPicker === user1.id ? 'COMMISSIONER' : 'USER',
      },
    });

    // Make first pick
    await makePick({ leagueSlug: 'test-league', playerId: players[0].id });

    // -- Assert: draft advanced --
    const updatedDraft = await db.draft.findFirst({ where: { leagueId: league.id } });
    expect(updatedDraft?.currentPickIndex).toBe(1);
    expect(updatedDraft?.currentRound).toBe(1);

    // Verify roster slot created
    const slot = await db.rosterSlot.findUnique({
      where: { leagueId_playerId: { leagueId: league.id, playerId: players[0].id } },
    });
    expect(slot?.userId).toBe(firstPicker);
    expect(slot?.acquiredVia).toBe('DRAFT');

    // Verify draft pick recorded
    const picks = await db.draftPick.findMany({ where: { draftId: draft!.id } });
    expect(picks.length).toBe(1);
    expect(picks[0].pickNumber).toBe(1);
  });
});
