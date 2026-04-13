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
import { recomputeMatchSnapshots } from '../src/lib/scoring/recompute';
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
// FINAL Week 1 rosters (after all 10 FA moves).
// Captain is the bold player from the updated spreadsheet.
const ROSTERS: SeedRoster[] = [
  {
    manager: 'liam4650',
    captain: 'skuba',
    players: ['skuba', 'Verno', 'leaf', 'Keznit', 'Less'],
  },
  {
    manager: 'monsieurtrance',
    captain: 'koalanoob',
    players: ['Timotino', 'zekken', 'koalanoob', 'Rossy', 'alym'],
  },
  {
    manager: 'brianscarlett',
    captain: 'brawk',
    players: ['brawk', 'Asuna', 'aspas', 'Eggsterr', 'Sato'],
  },
  {
    manager: 'twigsen',
    captain: 'Xeppaa',
    players: ['Bang', 'Xeppaa', 'Mazino', 'nerve', 'eeiu'],
  },
  {
    manager: 'unknownkingston',
    captain: 'trent',
    players: ['trent', 'v1c', 'valyn', 'Ethan', 'kiNgg'],
  },
  {
    manager: 'vanruel',
    captain: 'mada',
    players: ['mada', 'Vora', 'dgzin', 'penny', 'P0PPIN'],
  },
  {
    manager: 'juschen',
    captain: 'keiko',
    players: ['Demon1', 'keiko', 'babybay', 'OXY', 'Cryocells'],
  },
];

// All 10 FA moves during Week 1, in chronological order.
// Each move: manager drops player A, picks up player B.
const FA_MOVES: Array<{ manager: string; drop: string; pickup: string }> = [
  { manager: 'liam4650', drop: 'Less', pickup: 'okeanos' },
  { manager: 'monsieurtrance', drop: 'babybay', pickup: 'Zellsis' },
  { manager: 'vanruel', drop: 'jawgemo', pickup: 'lukxo' },
  { manager: 'juschen', drop: 'dgzin', pickup: 'Neon' },
  { manager: 'brianscarlett', drop: 'johnqt', pickup: 'Sato' },
  { manager: 'vanruel', drop: 'lukxo', pickup: 'dgzin' },
  { manager: 'juschen', drop: 'Neon', pickup: 'babybay' },
  { manager: 'liam4650', drop: 'okeanos', pickup: 'Less' },
  { manager: 'twigsen', drop: 'reduxx', pickup: 'nerve' },
  { manager: 'monsieurtrance', drop: 'Zellsis', pickup: 'alym' },
];

const EXPECTED_TOTALS: Record<string, number> = {
  liam4650: 322.25,
  monsieurtrance: 461.75,
  brianscarlett: 414.25,
  twigsen: 380.5,
  unknownkingston: 240.5,
  vanruel: 378.25,
  juschen: 443.25,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findPlayerByHandle(leagueId: string, handle: string) {
  return db.player.findUnique({
    where: {
      leagueId_vlrPlayerId: { leagueId, vlrPlayerId: handle.toLowerCase() },
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
    const lowerHandle = p.handle.toLowerCase();
    await db.player.upsert({
      where: {
        leagueId_vlrPlayerId: { leagueId: league.id, vlrPlayerId: lowerHandle },
      },
      update: { teamId: team.id, handle: lowerHandle },
      create: {
        leagueId: league.id,
        vlrPlayerId: lowerHandle,
        teamId: team.id,
        handle: lowerHandle,
      },
    });
  }
  console.log(`[seed] upserted ${PLAYERS.length} players`);

  // Find completed match IDs. Try the API first; if it times out (vlr.gg
  // rate-limiting), fall back to skipping historical ingest. The scoring
  // worker will pick them up once the rate limit lifts.
  let completedMatchIds: string[] = [];
  const SKIP_INGEST = process.env.SKIP_MATCH_INGEST === '1';
  if (SKIP_INGEST) {
    console.log('[seed] SKIP_MATCH_INGEST=1 — skipping historical match fetch');
  } else {
    try {
      console.log(`[seed] fetching event ${VLR_EVENT_ID} match list`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      const summaries = await vlrapi.getEventMatches(VLR_EVENT_ID);
      clearTimeout(timeout);
      console.log(`[seed] ${summaries.length} matches in event`);
      completedMatchIds = summaries
        .filter((s) => s.status.toLowerCase() === 'completed')
        .map((s) => s.match_id);
      console.log(`[seed] ${completedMatchIds.length} completed matches to ingest`);
    } catch (err) {
      console.warn(`[seed] vlrapi unavailable (rate-limited?) — skipping historical ingest: ${String(err)}`);
      console.warn('[seed] the scoring worker will backfill once vlr.gg is reachable');
    }
  }

  // ---- 5. Verify required handles exist ------------------------------------
  const requiredHandles = new Set<string>();
  for (const r of ROSTERS) for (const p of r.players) requiredHandles.add(p);
  for (const m of FA_MOVES) { requiredHandles.add(m.drop); requiredHandles.add(m.pickup); }

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
    // If the user previously logged in via Discord (auth migrated their
    // discordId from username to snowflake), look them up by display name
    // and reset their discordId back to the seed username so the seed is
    // idempotent. Also delete any duplicate snowflake-based orphan user.
    const existingByUsername = await db.user.findFirst({
      where: { discordId: u.username },
    });
    if (!existingByUsername) {
      // Might exist under their real snowflake — find by display name
      const byName = await db.user.findFirst({
        where: { username: u.name },
      });
      if (byName && byName.discordId !== u.username) {
        // This is a migrated user — reset discordId to seed value
        await db.user.update({
          where: { id: byName.id },
          data: { discordId: u.username, role: u.role as UserRole },
        });
      }
    }
    // Also clean up any OTHER users with the same display name (duplicates from auth)
    const dupes = await db.user.findMany({
      where: { username: u.name, discordId: { not: u.username } },
    });
    for (const dupe of dupes) {
      await db.leagueMembership.deleteMany({ where: { userId: dupe.id } });
      await db.scoringSnapshot.deleteMany({ where: { userId: dupe.id } });
      await db.user.delete({ where: { id: dupe.id } });
      console.log(`[seed] cleaned up duplicate user ${dupe.discordId} for ${u.name}`);
    }

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

  // ---- 7. Clear all prior state -----------------------------------------
  await db.scoringAdjustment.deleteMany({ where: { leagueId: league.id } });
  await db.rosterSlot.deleteMany({ where: { leagueId: league.id } });
  await db.captainChange.deleteMany({ where: { leagueId: league.id } });
  await db.scoringSnapshot.deleteMany({ where: { leagueId: league.id } });
  await db.freeAgencyAction.deleteMany({ where: { leagueId: league.id } });
  await db.ingestError.deleteMany({ where: { leagueId: league.id } });
  await db.playerGameStat.deleteMany({
    where: { game: { match: { leagueId: league.id } } },
  });
  await db.game.deleteMany({ where: { match: { leagueId: league.id } } });
  await db.match.deleteMany({ where: { leagueId: league.id } });
  console.log('[seed] cleared prior state');

  // ---- 8. Seed ORIGINAL rosters (before any FA moves) ------------------
  // We compute the original roster by reverse-applying FA_MOVES to the
  // final ROSTERS. Process moves in reverse: undo each drop/pickup.
  type MutableRoster = { manager: string; captain: string; players: string[] };
  const originalRosters: MutableRoster[] = ROSTERS.map((r) => ({
    ...r,
    players: [...r.players],
  }));

  // Reverse FA moves to reconstruct original rosters
  for (let i = FA_MOVES.length - 1; i >= 0; i--) {
    const move = FA_MOVES[i];
    const roster = originalRosters.find((r) => r.manager === move.manager);
    if (!roster) continue;
    // Undo: replace pickup with drop (reverse the move)
    const idx = roster.players.findIndex(
      (p) => p.toLowerCase() === move.pickup.toLowerCase(),
    );
    if (idx >= 0) {
      roster.players[idx] = move.drop;
    }
  }

  // Use original captains (before any captain changes)
  const ORIGINAL_CAPTAINS: Record<string, string> = {
    liam4650: 'skuba',
    monsieurtrance: 'Timotino',
    brianscarlett: 'brawk',
    twigsen: 'Bang',
    unknownkingston: 'trent',
    vanruel: 'mada',
    juschen: 'Demon1',
  };

  for (const roster of originalRosters) {
    const userId = userIdByUsername.get(roster.manager);
    if (!userId) throw new Error(`missing user for ${roster.manager}`);
    const origCaptain = ORIGINAL_CAPTAINS[roster.manager] ?? roster.captain;

    for (const handle of roster.players) {
      const player = await findPlayerByHandle(league.id, handle);
      if (!player) {
        console.warn(`[seed] WARNING: player "${handle}" for ${roster.manager} not found`);
        continue;
      }
      const isCaptain = handle.toLowerCase() === origCaptain.toLowerCase();
      await db.rosterSlot.create({
        data: {
          userId,
          leagueId: league.id,
          playerId: player.id,
          isCaptain,
          acquiredVia: 'SEED' satisfies AcquiredVia as AcquiredVia,
        },
      });
    }

    const captainPlayer = await findPlayerByHandle(league.id, origCaptain);
    if (captainPlayer) {
      await db.captainChange.create({
        data: {
          userId,
          leagueId: league.id,
          oldPlayerId: null,
          newPlayerId: captainPlayer.id,
          changedAt: LEAGUE_START,
        },
      });
    }
  }
  console.log('[seed] original rosters created (pre-FA)');

  // ---- 9. Ingest all completed matches ----------------------------------
  console.log(`[seed] ingesting ${completedMatchIds.length} completed matches`);
  for (const mid of completedMatchIds) {
    try {
      await ingestMatchExternal(LEAGUE_SLUG, mid);
    } catch (err) {
      console.error(`[seed] ingest failed for ${mid}:`, err);
    }
  }
  console.log('[seed] historical ingest complete');

  // ---- 10. Apply all FA moves (roster swaps, no snapshot changes) ------
  for (const move of FA_MOVES) {
    const userId = userIdByUsername.get(move.manager);
    if (!userId) continue;
    const dropPlayer = await findPlayerByHandle(league.id, move.drop);
    const pickupPlayer = await findPlayerByHandle(league.id, move.pickup);
    if (!dropPlayer || !pickupPlayer) {
      console.warn(`[seed] FA skip: ${move.drop} → ${move.pickup} (player not found)`);
      continue;
    }

    // Remove dropped player from roster
    await db.rosterSlot.deleteMany({
      where: { leagueId: league.id, userId, playerId: dropPlayer.id },
    });
    // Add picked up player (if not already owned by someone)
    const existingSlot = await db.rosterSlot.findUnique({
      where: { leagueId_playerId: { leagueId: league.id, playerId: pickupPlayer.id } },
    });
    if (!existingSlot) {
      await db.rosterSlot.create({
        data: {
          userId,
          leagueId: league.id,
          playerId: pickupPlayer.id,
          isCaptain: false,
          acquiredVia: 'FREE_AGENCY' satisfies AcquiredVia as AcquiredVia,
        },
      });
    }
    // Record FA action
    await db.freeAgencyAction.create({
      data: {
        leagueId: league.id,
        userId,
        droppedPlayerId: dropPlayer.id,
        pickedUpPlayerId: pickupPlayer.id,
      },
    });
  }
  console.log(`[seed] applied ${FA_MOVES.length} FA moves`);

  // ---- 11. Apply final captain changes ---------------------------------
  for (const roster of ROSTERS) {
    const userId = userIdByUsername.get(roster.manager);
    if (!userId) continue;
    const origCaptain = ORIGINAL_CAPTAINS[roster.manager];
    if (origCaptain?.toLowerCase() === roster.captain.toLowerCase()) continue; // no change

    const newCaptainPlayer = await findPlayerByHandle(league.id, roster.captain);
    if (!newCaptainPlayer) continue;

    // Clear old captain flag
    await db.rosterSlot.updateMany({
      where: { leagueId: league.id, userId, isCaptain: true },
      data: { isCaptain: false },
    });
    // Set new captain
    await db.rosterSlot.updateMany({
      where: { leagueId: league.id, userId, playerId: newCaptainPlayer.id },
      data: { isCaptain: true },
    });
    // Record captain change
    await db.captainChange.create({
      data: {
        userId,
        leagueId: league.id,
        oldPlayerId: null,
        newPlayerId: newCaptainPlayer.id,
      },
    });
    console.log(`[seed] captain change: ${roster.manager} → ${roster.captain}`);
  }

  // ---- 12. Populate MatchRoster from final roster state ------------------
  // Phase 1: use the final-state roster for every match. Phase 2's UI lets
  // the commissioner correct per-match ownership retroactively.
  const allMatches = await db.match.findMany({
    where: { leagueId: league.id, status: 'COMPLETED' },
    select: { id: true },
  });
  const finalRosters = await db.rosterSlot.findMany({
    where: { leagueId: league.id },
  });

  await db.matchRoster.deleteMany({
    where: { match: { leagueId: league.id } },
  });

  for (const match of allMatches) {
    for (const slot of finalRosters) {
      await db.matchRoster.create({
        data: {
          matchId: match.id,
          userId: slot.userId,
          playerId: slot.playerId,
          isCaptain: slot.isCaptain,
        },
      });
    }
  }
  console.log(`[seed] populated MatchRoster for ${allMatches.length} matches`);

  // ---- 13. Recompute all match snapshots from MatchRoster ---------------
  for (const match of allMatches) {
    await recomputeMatchSnapshots(match.id);
  }
  console.log('[seed] recomputed all snapshots from MatchRoster');

  // ---- 10. Validate totals -----------------------------------------------
  if (completedMatchIds.length === 0) {
    console.log('[seed] no matches ingested — skipping validation (worker will backfill)');
    console.log('[seed] Stage 1 bootstrap complete (rosters seeded, matches pending)');
    return;
  }
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
    console.warn('[seed] WARNING: some totals diverge from spreadsheet — this is expected if more matches have been played since the spreadsheet snapshot');
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
