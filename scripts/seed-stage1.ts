/* eslint-disable no-console */
/**
 * One-time bootstrap for VCT Americas 2026 — Stage 1.
 *
 * Idempotent: re-running this script after a partial failure should not
 * create duplicates. Aborts with a non-zero exit code on validation mismatch.
 *
 * Sequence is load-bearing: Less is placed on Liam's roster BEFORE historical
 * matches are ingested, then dropped AFTER, so that ScoringSnapshot rows for
 * Less's games remain attributed to Liam in the DB.
 *
 * Run with:  npm run seed:stage1
 */
import 'dotenv/config';

import { db } from '../src/lib/db';
import { vlrapi } from '../src/lib/vlrapi/client';
import { ingestMatchExternal } from '../src/lib/worker/scoring-worker';
import { DEFAULT_LEAGUE_SETTINGS } from '../src/lib/scoring/types';
import { aggregateUserTotal } from '../src/lib/scoring/aggregate';
import type { AcquiredVia, UserRole } from '@prisma/client';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LEAGUE_SLUG = 'vct-americas-2026-stage-1';
const LEAGUE_NAME = 'VCT Americas 2026 — Stage 1';
const VLR_EVENT_ID = '2860';
const LEAGUE_TZ = 'America/Jamaica';

// Reasonable league start — well before any stage 1 match.
const LEAGUE_START = new Date('2026-01-01T00:00:00Z');

// FA drop timestamp: 2026-04-10 20:00 -05:00 = 2026-04-11T01:00:00Z
const FA_TIMESTAMP = new Date('2026-04-11T01:00:00Z');

const VALIDATION_TOLERANCE = 5.0;

type Role = 'USER' | 'COMMISSIONER';

type SeedUser = {
  username: string;
  name: string;
  role: Role;
};

const SEED_USERS: SeedUser[] = [
  { username: 'liam4650',        name: 'Liam',     role: 'COMMISSIONER' },
  { username: 'monsieurtrance',  name: 'Jahnai',   role: 'USER' },
  { username: 'brianscarlett',   name: 'Brian',    role: 'USER' },
  { username: 'twigsen',         name: 'Michael',  role: 'USER' },
  { username: 'unknownkingston', name: 'Justin B', role: 'USER' },
  { username: 'vanruel',         name: 'Joshua',   role: 'USER' },
  { username: 'juschen',         name: 'Justin C', role: 'USER' },
];

// Roster key is keyed by manager username for stability. First entry is
// the captain.
type SeedRoster = {
  manager: string; // username
  captain: string;
  players: string[]; // full 5-player list INCLUDING the captain
};

// NOTE: Liam's roster below is the POST-drop state. Less is added manually
// before ingest and removed after. okeanos is Liam's 5th slot in the end
// state.
const ROSTERS: SeedRoster[] = [
  {
    manager: 'liam4650',
    captain: 'skuba',
    players: ['skuba', 'Verno', 'leaf', 'Keznit', 'okeanos'],
  },
  {
    manager: 'monsieurtrance',
    captain: 'Timotino',
    players: ['Timotino', 'zekken', 'koalanoob', 'Rossy', 'babybay'],
  },
  {
    manager: 'brianscarlett',
    captain: 'brawk',
    players: ['brawk', 'Asuna', 'aspas', 'Eggsterr', 'johnqt'],
  },
  {
    manager: 'twigsen',
    captain: 'Bang',
    players: ['Bang', 'Xeppaa', 'Mazino', 'reduxx', 'eeiu'],
  },
  {
    manager: 'unknownkingston',
    captain: 'trent',
    players: ['trent', 'v1c', 'valyn', 'Ethan', 'kiNgg'],
  },
  {
    manager: 'vanruel',
    captain: 'mada',
    players: ['mada', 'Vora', 'jawgemo', 'penny', 'P0PPIN'],
  },
  {
    manager: 'juschen',
    captain: 'Demon1',
    players: ['Demon1', 'keiko', 'dgzin', 'OXY', 'Cryocells'],
  },
];

// The historical FA move: Liam dropped Less (KRÜ) and picked up okeanos (EG).
const FA_DROP_HANDLE = 'Less';
const FA_PICKUP_HANDLE = 'okeanos';
// Fallback team info for Less if KRÜ has not appeared in any ingested match.
const FA_DROP_TEAM_FALLBACK_NAME = 'KRÜ Esports';
const FA_DROP_TEAM_FALLBACK_TAG = 'KRÜ';

const EXPECTED_TOTALS: Record<string, number> = {
  liam4650: 228.5,
  monsieurtrance: 156.0,
  brianscarlett: 147.0,
  twigsen: 131.0,
  unknownkingston: 107.5,
  vanruel: 35.5,
  juschen: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findPlayerByHandle(leagueId: string, handle: string) {
  return db.player.findFirst({
    where: {
      leagueId,
      handle: { equals: handle, mode: 'insensitive' },
    },
  });
}

async function findTeamByNameOrTag(
  leagueId: string,
  name: string,
  tag?: string,
) {
  const byName = await db.team.findFirst({
    where: { leagueId, name: { equals: name, mode: 'insensitive' } },
  });
  if (byName) return byName;
  if (tag) {
    const byTag = await db.team.findFirst({
      where: { leagueId, shortCode: { equals: tag, mode: 'insensitive' } },
    });
    if (byTag) return byTag;
  }
  return null;
}

function approxEqual(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('[seed] Stage 1 bootstrap starting');

  // ---- 1. League upsert ---------------------------------------------------
  const league = await db.league.upsert({
    where: { slug: LEAGUE_SLUG },
    update: {
      name: LEAGUE_NAME,
      status: 'ACTIVE',
      vlrEventId: VLR_EVENT_ID,
      timezone: LEAGUE_TZ,
      settingsJson: DEFAULT_LEAGUE_SETTINGS as unknown as object,
      discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL ?? null,
    },
    create: {
      slug: LEAGUE_SLUG,
      name: LEAGUE_NAME,
      status: 'ACTIVE',
      vlrEventId: VLR_EVENT_ID,
      startDate: LEAGUE_START,
      timezone: LEAGUE_TZ,
      settingsJson: DEFAULT_LEAGUE_SETTINGS as unknown as object,
      discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL ?? null,
    },
  });
  console.log(`[seed] league ${league.slug} (${league.id})`);

  // ---- 2. Hardcoded teams + players (avoids scraping all 30 matches) ------
  // vlrapi scrapes vlr.gg live per request (~2min each when rate-limited).
  // Hardcoding the 12 Americas teams + all known players from the spreadsheet
  // is instant. The scoring worker will discover any new players as matches
  // are ingested going forward.

  const TEAMS: Array<{ name: string; tag: string }> = [
    { name: '100 Thieves', tag: '100T' },
    { name: 'Cloud9', tag: 'C9' },
    { name: 'ENVY', tag: 'ENVY' },
    { name: 'Evil Geniuses', tag: 'EG' },
    { name: 'FURIA', tag: 'FURIA' },
    { name: 'G2 Esports', tag: 'G2' },
    { name: 'KRÜ Esports', tag: 'KRÜ' },
    { name: 'LEVIATÁN', tag: 'LEV' },
    { name: 'LOUD', tag: 'LOUD' },
    { name: 'MIBR', tag: 'MIBR' },
    { name: 'NRG', tag: 'NRG' },
    { name: 'Sentinels', tag: 'SEN' },
  ];

  // Map spreadsheet shortcodes → real vlrapi team names
  const SHORT_TO_FULL: Record<string, string> = {
    '100T': '100 Thieves',
    'C9': 'Cloud9',
    'ENVY': 'ENVY',
    'EG': 'Evil Geniuses',
    'FURIA': 'FURIA',
    'G2': 'G2 Esports',
    'KRUE': 'KRÜ Esports',
    'KRU E': 'KRÜ Esports',
    'Leviatan': 'LEVIATÁN',
    'LOUD': 'LOUD',
    'MIBR': 'MIBR',
    'NRG': 'NRG',
    'SEN': 'Sentinels',
  };

  // All players from the spreadsheet's "All Players" column
  const PLAYERS: Array<{ handle: string; teamShort: string }> = [
    { handle: 'tex', teamShort: 'MIBR' },
    { handle: 'Saadhak', teamShort: 'KRUE' },
    { handle: 'Less', teamShort: 'KRUE' },
    { handle: 'mwzera', teamShort: 'KRUE' },
    { handle: 'zekken', teamShort: 'MIBR' },
    { handle: 'Mazino', teamShort: 'MIBR' },
    { handle: 'Verno', teamShort: 'MIBR' },
    { handle: 'aspas', teamShort: 'MIBR' },
    { handle: 'silentzz', teamShort: 'KRUE' },
    { handle: 'Dantedue5', teamShort: 'KRUE' },
    { handle: 'babybay', teamShort: 'G2' },
    { handle: 'trent', teamShort: 'G2' },
    { handle: 'valyn', teamShort: 'G2' },
    { handle: 'johnqt', teamShort: 'SEN' },
    { handle: 'leaf', teamShort: 'G2' },
    { handle: 'reduxx', teamShort: 'SEN' },
    { handle: 'jawgemo', teamShort: 'G2' },
    { handle: 'Victor', teamShort: 'SEN' },
    { handle: 'cortezia', teamShort: 'SEN' },
    { handle: 'JonahP', teamShort: 'SEN' },
    { handle: 'Bang', teamShort: '100T' },
    { handle: 'mada', teamShort: 'NRG' },
    { handle: 'brawk', teamShort: 'NRG' },
    { handle: 'Asuna', teamShort: '100T' },
    { handle: 'Cryocells', teamShort: '100T' },
    { handle: 'Vora', teamShort: '100T' },
    { handle: 'Timotino', teamShort: '100T' },
    { handle: 'v1c', teamShort: 'C9' },
    { handle: 'Xeppaa', teamShort: 'C9' },
    { handle: 'keiko', teamShort: 'NRG' },
    { handle: 'skuba', teamShort: 'NRG' },
    { handle: 'koalanoob', teamShort: 'FURIA' },
    { handle: 'artzin', teamShort: 'FURIA' },
    { handle: 'penny', teamShort: 'C9' },
    { handle: 'Zellsis', teamShort: 'C9' },
    { handle: 'nerve', teamShort: 'FURIA' },
    { handle: 'alym', teamShort: 'FURIA' },
    { handle: 'Ethan', teamShort: 'NRG' },
    { handle: 'eeiu', teamShort: 'FURIA' },
    { handle: 'dgzin', teamShort: 'EG' },
    { handle: 'Rossy', teamShort: 'ENVY' },
    { handle: 'kiNgg', teamShort: 'Leviatan' },
    { handle: 'Keznit', teamShort: 'ENVY' },
    { handle: 'okeanos', teamShort: 'EG' },
    { handle: 'supamen', teamShort: 'EG' },
    { handle: 'Sato', teamShort: 'Leviatan' },
    { handle: 'bao', teamShort: 'EG' },
    { handle: 'P0PPIN', teamShort: 'ENVY' },
    { handle: 'Eggsterr', teamShort: 'ENVY' },
    { handle: 'OXY', teamShort: 'C9' },
    { handle: 'C0M', teamShort: 'EG' },
    { handle: 'blowz', teamShort: 'Leviatan' },
    { handle: 'spike', teamShort: 'Leviatan' },
    { handle: 'Demon1', teamShort: 'ENVY' },
    { handle: 'Neon', teamShort: 'Leviatan' },
    { handle: 'Jerrwin', teamShort: 'SEN' },
    { handle: 'lukxo', teamShort: 'LOUD' },
    { handle: 'pANcada', teamShort: 'LOUD' },
    { handle: 'cauanzin', teamShort: 'LOUD' },
    { handle: 'Virtyy', teamShort: 'LOUD' },
    { handle: 'PxS', teamShort: 'Leviatan' },
    { handle: 'Darker', teamShort: 'LOUD' },
    { handle: 'Canezerra', teamShort: 'ENVY' },
    { handle: 'Basic', teamShort: 'FURIA' },
  ];

  // ---- 3. Upsert Team rows ------------------------------------------------
  for (const t of TEAMS) {
    await db.team.upsert({
      where: {
        leagueId_vlrTeamId: { leagueId: league.id, vlrTeamId: t.name },
      },
      update: { name: t.name, shortCode: t.tag },
      create: {
        leagueId: league.id,
        vlrTeamId: t.name,
        name: t.name,
        shortCode: t.tag,
      },
    });
  }
  console.log(`[seed] upserted ${TEAMS.length} teams`);

  // ---- 4. Upsert Player rows from hardcoded list -------------------------
  for (const p of PLAYERS) {
    const fullTeamName = SHORT_TO_FULL[p.teamShort] ?? p.teamShort;
    const team = await db.team.findUnique({
      where: {
        leagueId_vlrTeamId: { leagueId: league.id, vlrTeamId: fullTeamName },
      },
    });
    if (!team) {
      console.warn(`[seed] team not found for ${p.handle} (${fullTeamName}) — skipping`);
      continue;
    }
    await db.player.upsert({
      where: {
        leagueId_vlrPlayerId: { leagueId: league.id, vlrPlayerId: p.handle },
      },
      update: { teamId: team.id, handle: p.handle },
      create: {
        leagueId: league.id,
        vlrPlayerId: p.handle,
        teamId: team.id,
        handle: p.handle,
      },
    });
  }
  console.log(`[seed] upserted ${PLAYERS.length} players`);

  // Fetch event match list (fast — single API call) to find completed match IDs
  console.log(`[seed] fetching event ${VLR_EVENT_ID} match list`);
  const summaries = await vlrapi.getEventMatches(VLR_EVENT_ID);
  console.log(`[seed] ${summaries.length} matches in event`);
  const completedMatchIds = summaries
    .filter((s) => s.status.toLowerCase() === 'completed')
    .map((s) => s.match_id);
  console.log(`[seed] ${completedMatchIds.length} completed matches to ingest`);

  // ---- 5. Verify required handles exist ------------------------------------
  const requiredHandles = new Set<string>();
  for (const r of ROSTERS) for (const p of r.players) requiredHandles.add(p);
  requiredHandles.add(FA_DROP_HANDLE);
  requiredHandles.add(FA_PICKUP_HANDLE);

  const missingHandles: string[] = [];
  for (const handle of requiredHandles) {
    const found = await findPlayerByHandle(league.id, handle);
    if (!found) missingHandles.push(handle);
  }

  if (missingHandles.length > 0) {
    console.error(
      `[seed] FATAL: ${missingHandles.length} required handles missing from DB:`,
      missingHandles.join(', '),
    );
    throw new Error('Cannot seed rosters — missing players');
  }
  console.log(`[seed] all ${requiredHandles.size} required players verified`);

  // ---- 6. Upsert users + league memberships ------------------------------
  const userIdByUsername = new Map<string, string>();
  for (const u of SEED_USERS) {
    const dbUser = await db.user.upsert({
      where: { discordId: u.username },
      update: {
        username: u.name,
        role: u.role as UserRole,
      },
      create: {
        discordId: u.username,
        username: u.name,
        role: u.role as UserRole,
      },
    });
    userIdByUsername.set(u.username, dbUser.id);
    // LeagueMembership (check-before-create)
    const existingMembership = await db.leagueMembership.findUnique({
      where: { userId_leagueId: { userId: dbUser.id, leagueId: league.id } },
    });
    if (!existingMembership) {
      await db.leagueMembership.create({
        data: { userId: dbUser.id, leagueId: league.id },
      });
    }
  }
  console.log(`[seed] upserted ${SEED_USERS.length} users + memberships`);

  // ---- 7. Seed rosters (pre-ingest state: Liam has Less, NOT okeanos) ----
  // For idempotency, wipe existing roster slots for each manager in this
  // league at this league and re-seed. Safer: we only clear if the current
  // state does not exactly match target.
  //
  // Simpler and still idempotent: compute target slots and upsert via
  // leagueId+playerId; if an existing slot on a different user exists we
  // log a warning. We cannot simply delete all because we may be running
  // after a partial success — but deleting and recreating roster slots
  // inside the single-league bootstrap is safe (snapshots carry their own
  // userId column and are attributed at ingest time).

  // Clear all roster slots for the league for the seed managers. This is
  // safe because this script is the only owner of initial roster state.
  const seedUserIds = [...userIdByUsername.values()];
  await db.rosterSlot.deleteMany({
    where: { leagueId: league.id, userId: { in: seedUserIds } },
  });
  await db.captainChange.deleteMany({
    where: { leagueId: league.id, userId: { in: seedUserIds } },
  });

  // Pre-ingest Liam roster: swap okeanos → Less.
  const preIngestRosters = ROSTERS.map((r) => {
    if (r.manager !== 'liam4650') return r;
    const swapped = r.players.map((p) =>
      p === FA_PICKUP_HANDLE ? FA_DROP_HANDLE : p,
    );
    return { ...r, players: swapped };
  });

  for (const roster of preIngestRosters) {
    const userId = userIdByUsername.get(roster.manager);
    if (!userId) throw new Error(`missing user for ${roster.manager}`);

    let captainPlayerId: string | null = null;

    for (const handle of roster.players) {
      const player = await findPlayerByHandle(league.id, handle);
      if (!player) {
        console.warn(
          `[seed] WARNING: player "${handle}" for manager ${roster.manager} not found — skipping slot`,
        );
        continue;
      }
      const isCaptain = handle === roster.captain;
      await db.rosterSlot.create({
        data: {
          userId,
          leagueId: league.id,
          playerId: player.id,
          isCaptain,
          acquiredVia: 'SEED' satisfies AcquiredVia as AcquiredVia,
        },
      });
      if (isCaptain) captainPlayerId = player.id;
    }

    if (captainPlayerId) {
      await db.captainChange.create({
        data: {
          userId,
          leagueId: league.id,
          oldPlayerId: null,
          newPlayerId: captainPlayerId,
          changedAt: LEAGUE_START,
        },
      });
    } else {
      console.warn(
        `[seed] WARNING: no captain resolved for ${roster.manager} — skipping CaptainChange`,
      );
    }
  }
  console.log('[seed] pre-ingest rosters + captain changes created');

  // ---- 8. Ingest historical matches --------------------------------------
  console.log(`[seed] ingesting ${completedMatchIds.length} completed matches`);
  for (const mid of completedMatchIds) {
    try {
      await ingestMatchExternal(LEAGUE_SLUG, mid);
    } catch (err) {
      console.error(`[seed] ingest failed for ${mid}:`, err);
    }
  }
  console.log('[seed] historical ingest complete');

  // ---- 9. Execute the FA drop/pickup -------------------------------------
  const liamUserId = userIdByUsername.get('liam4650');
  if (!liamUserId) throw new Error('Liam user missing');

  const lessPlayer = await findPlayerByHandle(league.id, FA_DROP_HANDLE);
  const okeanosPlayer = await findPlayerByHandle(league.id, FA_PICKUP_HANDLE);

  if (!lessPlayer) {
    console.warn('[seed] cannot execute FA: Less player not found');
  } else if (!okeanosPlayer) {
    console.warn('[seed] cannot execute FA: okeanos player not found');
  } else {
    // Drop Less (remove from Liam's roster).
    await db.rosterSlot.deleteMany({
      where: {
        leagueId: league.id,
        userId: liamUserId,
        playerId: lessPlayer.id,
      },
    });

    // Add okeanos (create new roster slot) if not already present.
    const existingOk = await db.rosterSlot.findUnique({
      where: {
        leagueId_playerId: { leagueId: league.id, playerId: okeanosPlayer.id },
      },
    });
    if (!existingOk) {
      await db.rosterSlot.create({
        data: {
          userId: liamUserId,
          leagueId: league.id,
          playerId: okeanosPlayer.id,
          isCaptain: false,
          acquiredVia: 'FREE_AGENCY' satisfies AcquiredVia as AcquiredVia,
          acquiredAt: FA_TIMESTAMP,
        },
      });
    }

    // Record FreeAgencyAction if not already recorded.
    const existingFa = await db.freeAgencyAction.findFirst({
      where: {
        leagueId: league.id,
        userId: liamUserId,
        droppedPlayerId: lessPlayer.id,
        pickedUpPlayerId: okeanosPlayer.id,
      },
    });
    if (!existingFa) {
      await db.freeAgencyAction.create({
        data: {
          leagueId: league.id,
          userId: liamUserId,
          droppedPlayerId: lessPlayer.id,
          pickedUpPlayerId: okeanosPlayer.id,
          happenedAt: FA_TIMESTAMP,
        },
      });
    }
    console.log('[seed] FA drop/pickup executed (Less → okeanos)');
  }

  // ---- 10. Validate totals -----------------------------------------------
  console.log('[seed] validating manager totals');
  let anyFail = false;
  for (const u of SEED_USERS) {
    const userId = userIdByUsername.get(u.username);
    if (!userId) continue;

    const snaps = await db.scoringSnapshot.findMany({
      where: { leagueId: league.id, userId },
      include: { game: { select: { completedAt: true } } },
    });

    const snapInputs = snaps
      .filter((s) => s.game.completedAt !== null)
      .map((s) => ({
        playerId: s.playerId,
        gameCompletedAt: s.game.completedAt as Date,
        total: s.total,
      }));

    const captainHistory = await db.captainChange.findMany({
      where: { leagueId: league.id, userId },
      orderBy: { changedAt: 'asc' },
      select: { newPlayerId: true, changedAt: true },
    });

    const computed = aggregateUserTotal(
      snapInputs,
      captainHistory.map((c) => ({
        newPlayerId: c.newPlayerId,
        changedAt: c.changedAt,
      })),
      DEFAULT_LEAGUE_SETTINGS,
    );

    const expected = EXPECTED_TOTALS[u.username] ?? 0;
    const pass = approxEqual(computed, expected, VALIDATION_TOLERANCE);
    const marker = pass ? 'PASS' : 'FAIL';
    console.log(
      `[seed]   ${marker}  ${u.name.padEnd(10)}  computed=${computed.toFixed(2)}  expected=${expected.toFixed(2)}`,
    );
    if (!pass) anyFail = true;
  }

  if (anyFail) {
    throw new Error('Validation failed — at least one manager is outside tolerance');
  }

  console.log('[seed] Stage 1 bootstrap complete');
}

main()
  .catch((err) => {
    console.error('[seed] FATAL', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
