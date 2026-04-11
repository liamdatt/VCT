# VCT Fantasy League — Design Spec

**Date:** 2026-04-11
**Author:** Liam (with Claude)
**Status:** Draft — pending implementation plan

## Summary

A self-hosted Next.js web app that automates a private VCT (Valorant Champions Tour) fantasy league for 7 friends, replacing the current spreadsheet. The app imports teams, players, and match data from a self-hosted `vlrggapi` instance, computes fantasy points from a rules engine, and pushes live updates to connected browsers via Server-Sent Events. It handles the draft, trades, free agency, captain changes, and archives completed leagues.

The immediate goal is to bootstrap the already-running **VCT Americas 2026 Stage 1** league (started 2026-04-10, 2 matches already played) without losing state. The longer-term goal is to reuse the same app for future VCT events (Stage 2, Masters, Champions) by creating a new league per event.

## Goals

- **Automate scoring.** Replace manual spreadsheet point tracking with a rules engine that computes points from real match data.
- **Live updates.** Managers see their points update within ~1 minute of a map finishing.
- **Full self-service.** Managers propose trades, accept/reject trades, swap captains, and manage free agency without commissioner intervention.
- **Multi-event.** One user account spans multiple fantasy leagues (Stage 1, Masters London, etc.); completed leagues are archived and browsable.
- **Self-hosted.** Everything runs on Liam's Raspberry Pi via Coolify — no external paid services.
- **Bootstrap without data loss.** Import the current Stage 1 rosters and recompute the 2 already-played matches from scratch; the recomputed totals must match the spreadsheet within 0.5 points.

## Non-Goals (v1)

- Public/multi-tenant platform — invite-only, private, ~10 users total.
- Draft pick timer (managers pick on honor system).
- Mobile app (responsive web is fine).
- Chat, reactions, or other social features.
- E2E browser tests.
- Live per-round scoring (vlr.gg only publishes per-map stats after a map closes).

## Decisions (from brainstorm)

| Decision | Choice | Reason |
|---|---|---|
| League scope | Private, fully-isolated player pools per event, shared manager accounts | Each event re-imports teams/players from API; users persist. |
| Draft | Build a snake draft tool now (not needed for Stage 1 which is hand-seeded) | Ready for Masters London and future events. |
| Scoring fidelity | Map-level (updates when each map finishes) | vlr.gg's true update granularity; polling every 60s. |
| Auth | Discord OAuth via NextAuth | Everyone has Discord; thematically right. |
| Trade flow | Proposal + accept | Standard pattern; removes commissioner bottleneck. |
| Commissioner powers | Standard — override trades, adjust points, force edits, announcements, lock/unlock | Safety net without micromanagement. |
| Stage 1 bootstrap | Seed + recompute from API; validate against spreadsheet totals | Tests the rules engine end-to-end during seeding. |
| Realtime | Server-Sent Events (SSE) | One-way push; native; no extra infra. |
| Rules (captain week) | Rolling 7 days from last change | User choice. |
| Rules (free agency) | One pickup per manager per day | User choice. |
| Timezone | `America/Jamaica` (EST, no DST) | User's local. |
| Notifications | In-app + single Discord webhook feed | Discord is already the group's home. |
| Hosting | Coolify on Raspberry Pi, three Docker containers | Self-hosted, zero monthly cost. |

## Architecture

### Runtime Topology

Three Docker containers on the Pi, orchestrated by Coolify, communicating on the internal Docker network:

1. **`vctfantasy-web`** — Next.js 15 (App Router) Node process. Hosts the web tier, a background scoring worker, and the SSE endpoint. Single long-running process; no serverless.
2. **`vctfantasy-db`** — Postgres 16.
3. **`vctfantasy-vlrapi`** — Self-hosted `vlrggapi` (from axsddlr/vlrggapi), built from its Dockerfile for ARM64.

External surfaces (public):
- Next.js web app (HTTP/HTTPS via Coolify's reverse proxy).
- Discord OAuth callback.
- Discord webhook (outbound only).

All match data flows `vlrggapi → scoring worker → Postgres → SSE → browser`. The public internet is never touched for match data.

### Inside the Next.js Process

Three concerns share one Node process:

**Web tier.** App Router pages, React Server Components for data-heavy views (leaderboard, rosters, player pool), Server Actions for mutations (propose trade, drop player, change captain), NextAuth with Discord provider for sessions.

**Scoring worker.** A background module started once at process boot, guarded by `globalThis.__scoringWorker` to survive Next.js hot reload in dev. The worker runs a 60-second tick loop during match windows; otherwise sleeps until 5 minutes before the next scheduled match. Each tick:

1. Loads matches for all `ACTIVE` leagues where `status IN (UPCOMING, LIVE)` and `scheduledAt` is within a 4-hour window of now.
2. Calls `vlrggapi.getMatch(vlrMatchId)` for each.
3. Diffs the response against the DB. For each newly-completed `Game`, inserts `Game` + `PlayerGameStat` rows, runs the rules engine, inserts `ScoringSnapshot` rows.
4. Emits a `scoreUpdate` event on the in-process `EventEmitter` with affected `userId`s.
5. Posts a one-line Discord webhook summary per new scoring event.

**Realtime tier.** `GET /api/stream` opens a `text/event-stream` response. It subscribes to the in-process `EventEmitter` and pushes updates to connected clients. Authenticated via NextAuth session; filters events by the user's league memberships.

With one container, in-process pub/sub is the right-sized tool. If we ever split into multiple replicas, swap the `EventEmitter` for Postgres `LISTEN/NOTIFY` — same interface, no business logic change.

## Data Model

### Persistent across leagues

- **`User`** — `id`, `discordId`, `username`, `avatarUrl`, `role` (`USER` | `COMMISSIONER`), `createdAt`.

### Per-league (fresh import each event)

- **`League`** — `id`, `slug`, `name`, `vlrEventId`, `status` (`DRAFT_PENDING` | `DRAFTING` | `ACTIVE` | `COMPLETED`), `startDate`, `endDate`, `timezone` (default `America/Jamaica`), `discordWebhookUrl`, `settingsJson`. Rule numbers live in `settingsJson` (kill=2, death=-1, assist=1.5, ace=5, win=10, loss=-5, captainMult=1.5, captainCooldownDays=7, freeAgencyCooldownDays=1, tradeBonus=5, tradeBonusCooldownDays=3) so future events can tweak scoring without migrations.
- **`LeagueMembership`** — `userId`, `leagueId`, `rosterLocked`, `finalRank`, `finalPoints`.
- **`Team`** — `id`, `leagueId`, `vlrTeamId`, `name`, `shortCode`, `logoUrl`. League-scoped (the MIBR row in Stage 1 differs from MIBR in Masters).
- **`Player`** — `id`, `leagueId`, `vlrPlayerId`, `teamId`, `handle`, `country`, `role`. League-scoped.

### Roster state

- **`RosterSlot`** — `userId`, `leagueId`, `playerId`, `isCaptain`, `acquiredAt`, `acquiredVia` (`DRAFT` | `TRADE` | `FREE_AGENCY`). 5 rows per manager per league. Unique constraint on `(leagueId, playerId)`.
- **`CaptainChange`** — `userId`, `leagueId`, `oldPlayerId`, `newPlayerId`, `changedAt`. Used for rolling 7-day cooldown.

### Draft

- **`Draft`** — `leagueId`, `type` (`SNAKE`), `currentRound`, `currentPickIndex`, `pickOrderJson`, `status`.
- **`DraftPick`** — `draftId`, `round`, `pickNumber`, `userId`, `playerId`, `pickedAt`.

### Match data (from vlrggapi)

- **`Match`** — `leagueId`, `vlrMatchId`, `team1Id`, `team2Id`, `scheduledAt`, `status` (`UPCOMING` | `LIVE` | `COMPLETED`), `format` (`BO3` | `BO5`), `finalScore`.
- **`Game`** — `matchId`, `mapNumber`, `mapName`, `team1Score`, `team2Score`, `winnerTeamId`, `completedAt`.
- **`PlayerGameStat`** — `gameId`, `playerId`, `kills`, `deaths`, `assists`, `aces`, `won` (bool). One row per player per map.

### Transactions (immutable log)

- **`Trade`** — `leagueId`, `proposerId`, `receiverId`, `status` (`PROPOSED` | `ACCEPTED` | `REJECTED` | `CANCELLED`), `createdAt`, `resolvedAt`.
- **`TradeItem`** — `tradeId`, `playerId`, `direction` (`PROPOSER_TO_RECEIVER` | `RECEIVER_TO_PROPOSER`).
- **`TradeBonusCooldown`** — `leagueId`, `playerId`, `expiresAt`. A row exists while the +5 bonus is locked out for that player.
- **`FreeAgencyAction`** — `leagueId`, `userId`, `droppedPlayerId`, `pickedUpPlayerId`, `happenedAt`.

### Derived / cached

- **`ScoringSnapshot`** — `leagueId`, `userId`, `playerId`, `gameId`, `breakdownJson` (full audit trail: kills, deaths, assists, aces, base, winBonus, captainMult, total), `total`. Written by the scoring engine; idempotent; the leaderboard queries this.
- **`ScoringAdjustment`** — `leagueId`, `userId`, `delta`, `reason`, `createdByUserId`, `createdAt`. Commissioner overrides. Summed with `ScoringSnapshot` for final totals. Never edit computed rows; always add an adjustment.
- **`IngestError`** — log of scoring-engine or API failures for commissioner visibility.

## Scoring Engine

A pure TypeScript module `lib/scoring/rules.ts` with no DB dependencies. Takes `(PlayerGameStat, LeagueSettings, context)`, returns `ScoringBreakdown`.

### Per-map formula

```
base = kills*2 + assists*1.5 - deaths*1 + aces*5
winBonus = won ? 10 : -5
total (pre-captain) = base + winBonus
breakdown = { kills, deaths, assists, aces, win, base, winBonus, total }
```

### Captain multiplier

Applied at aggregation, not per map. When computing a manager's event total, sum all their player-game rows and multiply the captain's point contribution by 1.5 **only for games played while that player was captain** (resolved via `RosterSlot` + `CaptainChange` history). Captain swaps mid-event correctly apply the multiplier only to the correct games.

### Stacked same-team wins

Automatic. Each player independently gets their +10 win bonus from their own `PlayerGameStat.won` row. If two of a manager's players are on the same winning team, they each independently get +10, stacking to +20. No special code.

### Idempotency

The engine is idempotent: re-running against the same `PlayerGameStat` produces the same `ScoringSnapshot`. Re-fetching a completed match does nothing new. This is what lets the commissioner safely click "re-fetch match N".

### Audit

Every `ScoringSnapshot` row carries the full `breakdownJson`. A manager can click any point value in the UI and see exactly why.

## Key User Flows

All five flows are Server Actions with Zod validation, DB transactions, and a post-commit helper `publishLeagueEvent({ type, payload, leagueId })` that (a) emits to the in-process `EventEmitter` for SSE and (b) queues a Discord webhook post. Discord failures are logged but do not fail the user action.

**Draft (snake, async-live).** Commissioner starts the draft. App randomizes pick order, creates `Draft` with `status=ACTIVE`. Each manager sees a draft room: full player pool, their roster, "On the clock" banner. Only the current-turn manager has a working Draft button. On pick: validate (right user, player unowned, draft active), insert `DraftPick` + `RosterSlot`, advance `currentPickIndex` with snake reversal at round boundaries. After 35 picks (5 × 7), `status=COMPLETED`, league flips to `ACTIVE`. No pick timer in v1.

**Trade proposal.** Manager A selects player(s) to send + target manager + player(s) to request. Server validates ownership + league active. Inserts `Trade` + `TradeItem` with `status=PROPOSED`. Discord post.

**Trade accept/reject.** Manager B clicks accept. Server re-validates ownership (a player in the trade may have been dropped since the proposal). In one transaction: move `RosterSlot` rows, write `TradeBonusCooldown` rows for each player that doesn't already have an active cooldown, update `Trade.status`, log to transaction history. SSE + Discord. If any traded player was a captain, the captaincy is cleared and the receiving manager is nudged to pick a new captain.

**Free agency.** Manager drops a player → modal shows free player pool → picks replacement → confirms. Server validates:
- Dropped player's team is not currently mid-series (any `Match.status=LIVE` for that team).
- Manager hasn't already used their 1 pickup today (checked via `FreeAgencyAction` rows where `happenedAt >= startOfToday(America/Jamaica)`).
- Replacement is unowned.

Transaction: delete old `RosterSlot`, insert new one, insert `FreeAgencyAction` row. SSE + Discord. Commissioner can override the mid-series check.

**Captain change.** Manager clicks the star on one of their 5 players. Server checks `CaptainChange` history for the most recent change — must be older than 7 days (rolling). If OK: clear old captain flag, set new one, insert `CaptainChange`. SSE.

## Realtime Flow

1. User opens a league page. RSC renders initial state from the DB.
2. A client component opens `EventSource('/api/stream?leagueId=X')`.
3. Server validates the NextAuth session and league membership, registers a listener on the in-process `EventEmitter` for `scoreUpdate` / `trade` / `fa` / `captain` events filtered by `leagueId`.
4. When the scoring worker (or a Server Action) emits an event, the SSE handler pushes it down the stream.
5. Client receives the event, invalidates the affected React Query cache keys (or triggers a server action re-fetch), UI updates.

## UI / Pages

Next.js App Router, Tailwind, shadcn/ui, dark mode default.

```
/                              marketing splash; if logged in → /leagues
/api/auth/[...nextauth]        Discord OAuth
/api/stream                    SSE endpoint (auth-gated)

/leagues                       list of all leagues user is in (active + archived)
/leagues/[slug]                match-first dashboard (live match hero, your players in it, compressed standings)
/leagues/[slug]/leaderboard    full standings + point breakdowns
/leagues/[slug]/roster         your own roster (captain, drop, propose trade, cooldown states)
/leagues/[slug]/rosters/[user] another manager's roster (read-only)
/leagues/[slug]/players        searchable player pool
/leagues/[slug]/matches        match schedule + live tickers
/leagues/[slug]/matches/[id]   single match detail with live map-by-map scoring
/leagues/[slug]/trades         incoming / outgoing
/leagues/[slug]/draft          draft room (only visible during DRAFTING status)
/leagues/[slug]/history        transaction log

/admin                         commissioner console (role-gated)
/admin/leagues/new             create league wizard
/admin/leagues/[slug]          event controls (re-fetch, adjust, reverse trade, members)
```

**Dashboard layout decision:** match-first. Live match is the hero card (linear-gradient VCT red, current map/score). Below it, "Your Players in this Match" with live deltas. Below that, a single compressed line of standings. Full leaderboard is one click away.

## Stage 1 Bootstrap (One-Time Seed)

`scripts/seed-stage1.ts`, run once inside the web container:

1. Create the `League` row for VCT Americas 2026 Stage 1.
2. Call vlrggapi to import 12 Americas teams + all players as league-scoped `Team`/`Player` rows.
3. Upsert the 7 `User` rows by Discord ID; commissioner flag on Liam.
4. Insert `LeagueMembership` + `RosterSlot` rows from a hardcoded map mirroring the spreadsheet. **The spreadsheet's column layout made automated parsing ambiguous — Liam will hand-encode the exact 7 rosters (5 players each, with captain stars) into the seed script before running it.** The script aborts if any manager has ≠5 players or ≠1 captain.
5. Re-fetch the 2 already-played matches from vlrggapi, write `Match`/`Game`/`PlayerGameStat`, run rules engine, write `ScoringSnapshot` rows.
6. **Validation:** compare computed manager totals to the spreadsheet targets. If any diverge by more than 0.5 pts, abort and log the diff. This is the rules engine's end-to-end acceptance test. Spreadsheet targets:
   - Liam 228.5, Jahnai 156.0, Brian 147.0, Michael 131.0, Justin B 107.5, Joshua 35.5, Justin C 0.
7. Insert the historical `FreeAgencyAction` row for "Liam drops Less for Okeanos".

Script is idempotent — safe to re-run if any step fails.

> **Note:** The spreadsheet's roster structure is ambiguous in a few cells (trailing names under each manager column without clear delimiters). Liam must confirm the exact 5-player rosters in a hardcoded map inside the seed script before execution.

## Error Handling

**vlrggapi failures.** Every call wrapped in retry-with-backoff (3 tries, 2s/4s/8s). Persistent failures update a `lastSuccessfulPoll` timestamp per league. If no successful poll in 10 minutes during a known live window: Discord alert (`@commissioner scoring worker stalled`), dashboard shows yellow degraded-scoring banner.

**Rules engine failures.** Engine is pure + typed; should not throw in prod. If it does, log the offending row, skip it, write to `IngestError`, flag the match for commissioner re-fetch.

**User-action failures.** Zod validation returns field-level form errors. DB transactions roll back cleanly. Unique-constraint races (two managers clicking "pick up same free agent" in the same millisecond) — one wins, the other sees "Player no longer available".

## Security

- NextAuth session cookie gates every Server Action and the SSE endpoint.
- SSE handler filters events by league membership — you can only receive events for leagues you're in.
- Admin routes + commissioner-only actions check `session.user.role === 'COMMISSIONER'` server-side.
- Discord webhook URL in env only; webhook posts server-side only.
- `vlrggapi` container is on the internal Docker network, not exposed publicly.
- Simple in-memory rate limiter per user on mutating Server Actions to prevent spam.

## Testing

- **Unit (vitest):** rules engine — every rule, captain multiplier, stacked wins, edge cases. ~20 tests.
- **Integration (vitest + test Postgres via docker-compose):** each Server Action end-to-end. Covers trade happy-path, trade races, free agency cooldown, captain cooldown, draft pick advancement.
- **Bootstrap test:** the seed script validates itself against the spreadsheet totals.
- **No E2E in v1.** Manual QA for UI. Playwright later if needed.
- **Pre-commit:** typecheck + lint + unit tests.
- **CI:** integration tests via GitHub Actions or Coolify build hook.

## Deployment

- Three Dockerfiles in repo: `Dockerfile.web` (Next.js multi-stage, ARM64), `Dockerfile.vlrapi` (from upstream or pinned fork), Postgres uses the official image.
- `docker-compose.yml` for local dev; Coolify imports the same compose file for prod.
- Prisma migrations run via `prisma migrate deploy` in the web container's startup script (idempotent).
- Env vars managed in Coolify UI: `DATABASE_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `DISCORD_WEBHOOK_URL`, `VLRAPI_BASE_URL` (internal: `http://vlrapi:8000`), `APP_TIMEZONE=America/Jamaica`.
- Nightly `pg_dump` sidecar to a mounted volume; optional rsync off-Pi.

## Out of Scope (Explicitly Deferred)

- Draft pick timers and autopick.
- Per-round live scoring.
- DM notifications (only webhook feed in v1).
- Weekly captain-change reminder bot.
- Public leaderboard pages (everything is auth-gated).
- Mobile app.
- Multiple simultaneous active leagues with cross-league standings.
