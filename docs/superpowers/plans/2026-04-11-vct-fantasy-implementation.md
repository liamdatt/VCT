# VCT Fantasy League Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hosted Next.js fantasy-league web app that automates the group's VCT Americas Stage 1 league and is reusable for future VCT events, replacing the manual spreadsheet workflow.

**Architecture:** Three-container Docker stack on a Raspberry Pi under Coolify. A single long-running Next.js Node process hosts the web tier, an in-process scoring worker, and an SSE endpoint. Postgres stores everything. A self-hosted vlrggapi (Python/FastAPI) container provides match data. In-process `EventEmitter` fans out live updates to SSE clients; a single Discord webhook posts a league feed.

**Tech Stack:** Next.js 15 (App Router, RSC, Server Actions), TypeScript, Tailwind, shadcn/ui, Prisma + Postgres 16, NextAuth (Discord provider), Zod, Vitest, Docker + docker-compose, Coolify for deployment. Target arch ARM64 (Raspberry Pi).

**Reference spec:** `docs/superpowers/specs/2026-04-11-vct-fantasy-design.md`

---

## File Structure (Locked In Before Coding)

```
vctfantasy/
├── docker-compose.yml              # local dev: postgres, vlrapi
├── docker-compose.prod.yml         # prod: web + postgres + vlrapi + backup sidecar
├── Dockerfile.web                  # Next.js multi-stage ARM64 build
├── Dockerfile.vlrapi               # wraps upstream axsddlr/vlrggapi
├── .env.example                    # documented env vars
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── prisma/
│   ├── schema.prisma               # full data model
│   └── migrations/
├── src/
│   ├── app/                        # Next.js App Router routes
│   │   ├── layout.tsx
│   │   ├── page.tsx                # marketing splash
│   │   ├── leagues/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/
│   │   │       ├── page.tsx        # match-first dashboard
│   │   │       ├── leaderboard/page.tsx
│   │   │       ├── roster/page.tsx
│   │   │       ├── rosters/[userId]/page.tsx
│   │   │       ├── players/page.tsx
│   │   │       ├── matches/page.tsx
│   │   │       ├── matches/[id]/page.tsx
│   │   │       ├── trades/page.tsx
│   │   │       ├── draft/page.tsx
│   │   │       └── history/page.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx
│   │   │   └── leagues/
│   │   │       ├── new/page.tsx
│   │   │       └── [slug]/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       └── stream/route.ts     # SSE endpoint
│   ├── components/
│   │   ├── ui/                     # shadcn generated
│   │   ├── dashboard/              # dashboard-specific
│   │   ├── roster/
│   │   ├── trade/
│   │   ├── draft/
│   │   └── match/
│   ├── lib/
│   │   ├── db.ts                   # Prisma singleton
│   │   ├── auth.ts                 # NextAuth config
│   │   ├── discord-webhook.ts      # outbound webhook helper
│   │   ├── events.ts               # in-process EventEmitter
│   │   ├── publish.ts              # publishLeagueEvent() helper
│   │   ├── time.ts                 # Jamaica TZ day-boundary helpers
│   │   ├── rate-limit.ts           # in-memory token bucket
│   │   ├── scoring/
│   │   │   ├── rules.ts            # pure scoring engine
│   │   │   ├── aggregate.ts        # captain-aware totals
│   │   │   └── types.ts
│   │   ├── vlrapi/
│   │   │   ├── client.ts           # typed wrapper + retry
│   │   │   └── types.ts
│   │   ├── worker/
│   │   │   ├── scoring-worker.ts   # tick loop
│   │   │   └── bootstrap.ts        # start-once guard
│   │   └── actions/                # Server Actions
│   │       ├── trade.ts
│   │       ├── free-agency.ts
│   │       ├── captain.ts
│   │       ├── draft.ts
│   │       └── admin.ts
│   ├── server/
│   │   └── queries/                # read-side helpers used by RSC
│   │       ├── leaderboard.ts
│   │       ├── roster.ts
│   │       └── matches.ts
│   └── middleware.ts               # auth gate
├── scripts/
│   ├── seed-stage1.ts              # one-time bootstrap
│   └── pg-backup.sh                # nightly pg_dump sidecar
├── tests/
│   ├── unit/
│   │   └── scoring/
│   │       ├── rules.test.ts
│   │       └── aggregate.test.ts
│   ├── integration/
│   │   ├── trade.test.ts
│   │   ├── free-agency.test.ts
│   │   ├── captain.test.ts
│   │   ├── draft.test.ts
│   │   └── scoring-worker.test.ts
│   └── fixtures/
│       └── vlr-match-samples.json
└── docs/
    └── superpowers/
        ├── specs/
        └── plans/
```

**Decomposition rationale:** `lib/scoring/*` is pure and has zero DB dependency — trivially unit-testable. `lib/actions/*` are the Server Actions (thin wrappers: validate → transaction → publish). `lib/vlrapi/*` is isolated so we can mock it in tests. The scoring worker imports `lib/scoring/*`, `lib/vlrapi/*`, and `lib/db.ts` — no UI code. Server queries live in `src/server/queries/*` so RSCs import from a read-only surface.

---

## Phase 0 — Repo Scaffolding & Local Dev

### Task 0.1: Initialize Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.gitignore`

- [ ] **Step 1: Scaffold Next.js**

Run in project root:

```bash
npx create-next-app@latest . --typescript --app --tailwind --eslint --src-dir --turbopack --import-alias "@/*" --no-install
```

When prompted about the non-empty directory, choose to continue (the existing files are the spec docs and `.gitignore`).

- [ ] **Step 2: Install deps**

```bash
npm install
```

- [ ] **Step 3: Verify dev server boots**

```bash
npm run dev
```

Expected: server starts on `http://localhost:3000`, default page renders. Kill with Ctrl-C.

- [ ] **Step 4: Extend .gitignore**

Append these lines to `.gitignore` (keep existing entries):

```
.env
.env.local
.env.*.local
.superpowers/
coverage/
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold next.js 15 with app router + tailwind"
```

---

### Task 0.2: Install project dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
npm install prisma @prisma/client next-auth@beta zod date-fns date-fns-tz
```

- [ ] **Step 2: Install dev deps**

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom tsx dotenv @types/node
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install core deps (prisma, next-auth, zod, vitest)"
```

---

### Task 0.3: Configure Vitest

**Files:**
- Create: `vitest.config.ts`, `tests/setup.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 2: Create `tests/setup.ts`**

```ts
import { beforeAll } from 'vitest';

beforeAll(() => {
  process.env.TZ = 'America/Jamaica';
});
```

- [ ] **Step 3: Add test scripts to `package.json`**

Add inside `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 4: Verify Vitest boots**

```bash
npm test
```

Expected: "No test files found" — this is correct, we haven't written any yet.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/setup.ts package.json
git commit -m "chore: configure vitest with jamaica tz"
```

---

### Task 0.4: Docker-compose for local dev (Postgres + vlrapi)

**Files:**
- Create: `docker-compose.yml`, `Dockerfile.vlrapi`, `.env.example`

- [ ] **Step 1: Create `Dockerfile.vlrapi`**

```dockerfile
# Wraps axsddlr/vlrggapi for self-hosted use. Builds from upstream source.
FROM python:3.11-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 https://github.com/axsddlr/vlrggapi.git .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=build /app /app
COPY --from=build /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=build /usr/local/bin /usr/local/bin
ENV PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: vct
      POSTGRES_PASSWORD: vct_dev_pw
      POSTGRES_DB: vctfantasy
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vct -d vctfantasy"]
      interval: 5s
      timeout: 5s
      retries: 10

  vlrapi:
    build:
      context: .
      dockerfile: Dockerfile.vlrapi
    restart: unless-stopped
    ports:
      - "8000:8000"

volumes:
  db_data:
```

- [ ] **Step 3: Create `.env.example`**

```
DATABASE_URL="postgresql://vct:vct_dev_pw@localhost:5432/vctfantasy?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-openssl-rand-base64-32"
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""
DISCORD_WEBHOOK_URL=""
VLRAPI_BASE_URL="http://localhost:8000"
APP_TIMEZONE="America/Jamaica"
```

- [ ] **Step 4: Copy to real `.env`**

```bash
cp .env.example .env
```

Then run `openssl rand -base64 32` and paste into `NEXTAUTH_SECRET`. Leave Discord values blank for now.

- [ ] **Step 5: Boot the stack**

```bash
docker compose up -d db
docker compose ps
```

Expected: `db` service `healthy`. (Skip building vlrapi here — it'll take a while; do it in Phase 6 when we actually need it.)

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml Dockerfile.vlrapi .env.example
git commit -m "chore: docker-compose for local postgres + vlrapi stub"
```

---

### Task 0.5: Install shadcn/ui

**Files:**
- Create: `components.json`, `src/components/ui/*` (via CLI)

- [ ] **Step 1: Init shadcn**

```bash
npx shadcn@latest init -d
```

Accept defaults; for "Which color would you like to use?" pick `Slate`.

- [ ] **Step 2: Add the components we'll need**

```bash
npx shadcn@latest add button card badge table avatar dropdown-menu dialog toast input label select tabs
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: install shadcn/ui with slate theme"
```

---

## Phase 1 — Prisma Schema & DB Setup

### Task 1.1: Write the full Prisma schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

- [ ] **Step 1: Initialize Prisma (generates `prisma/schema.prisma` stub)**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Replace `prisma/schema.prisma` with the full schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  USER
  COMMISSIONER
}

enum LeagueStatus {
  DRAFT_PENDING
  DRAFTING
  ACTIVE
  COMPLETED
}

enum AcquiredVia {
  DRAFT
  TRADE
  FREE_AGENCY
  SEED
}

enum MatchStatus {
  UPCOMING
  LIVE
  COMPLETED
}

enum MatchFormat {
  BO1
  BO3
  BO5
}

enum TradeStatus {
  PROPOSED
  ACCEPTED
  REJECTED
  CANCELLED
  REVERSED
}

enum TradeDirection {
  PROPOSER_TO_RECEIVER
  RECEIVER_TO_PROPOSER
}

enum DraftStatus {
  PENDING
  ACTIVE
  COMPLETED
}

model User {
  id         String   @id @default(cuid())
  discordId  String   @unique
  username   String
  avatarUrl  String?
  role       UserRole @default(USER)
  createdAt  DateTime @default(now())

  memberships   LeagueMembership[]
  rosterSlots   RosterSlot[]
  captainChanges CaptainChange[]
  tradesProposed Trade[] @relation("TradesProposed")
  tradesReceived Trade[] @relation("TradesReceived")
  freeAgency    FreeAgencyAction[]
  draftPicks    DraftPick[]
  adjustments   ScoringAdjustment[] @relation("AdjustmentTarget")
  adjustmentsBy ScoringAdjustment[] @relation("AdjustmentAuthor")
}

model League {
  id                 String       @id @default(cuid())
  slug               String       @unique
  name               String
  vlrEventId         String?
  status             LeagueStatus @default(DRAFT_PENDING)
  startDate          DateTime
  endDate            DateTime?
  timezone           String       @default("America/Jamaica")
  discordWebhookUrl  String?
  settingsJson       Json
  createdAt          DateTime     @default(now())

  memberships   LeagueMembership[]
  teams         Team[]
  players       Player[]
  rosterSlots   RosterSlot[]
  captainChanges CaptainChange[]
  draft         Draft?
  matches       Match[]
  trades        Trade[]
  freeAgency    FreeAgencyAction[]
  tradeBonusCooldowns TradeBonusCooldown[]
  snapshots     ScoringSnapshot[]
  adjustments   ScoringAdjustment[]
  ingestErrors  IngestError[]
}

model LeagueMembership {
  id            String  @id @default(cuid())
  userId        String
  leagueId      String
  rosterLocked  Boolean @default(false)
  finalRank     Int?
  finalPoints   Float?

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  league League @relation(fields: [leagueId], references: [id], onDelete: Cascade)

  @@unique([userId, leagueId])
}

model Team {
  id         String @id @default(cuid())
  leagueId   String
  vlrTeamId  String
  name       String
  shortCode  String
  logoUrl    String?

  league  League   @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  players Player[]
  matchesAsTeam1 Match[] @relation("MatchTeam1")
  matchesAsTeam2 Match[] @relation("MatchTeam2")
  gameWins  Game[] @relation("GameWinner")

  @@unique([leagueId, vlrTeamId])
}

model Player {
  id          String @id @default(cuid())
  leagueId    String
  vlrPlayerId String
  teamId      String
  handle      String
  country     String?
  role        String?

  league      League  @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  team        Team    @relation(fields: [teamId], references: [id], onDelete: Cascade)
  rosterSlots RosterSlot[]
  stats       PlayerGameStat[]
  draftPicks  DraftPick[]
  freeAgencyDrops   FreeAgencyAction[] @relation("FADropped")
  freeAgencyPickups FreeAgencyAction[] @relation("FAPickedUp")
  tradeItems  TradeItem[]
  cooldowns   TradeBonusCooldown[]
  snapshots   ScoringSnapshot[]
  captainChangeOld CaptainChange[] @relation("CaptainOld")
  captainChangeNew CaptainChange[] @relation("CaptainNew")

  @@unique([leagueId, vlrPlayerId])
}

model RosterSlot {
  id           String      @id @default(cuid())
  userId       String
  leagueId     String
  playerId     String
  isCaptain    Boolean     @default(false)
  acquiredAt   DateTime    @default(now())
  acquiredVia  AcquiredVia

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  league League @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  player Player @relation(fields: [playerId], references: [id], onDelete: Cascade)

  @@unique([leagueId, playerId])
  @@index([userId, leagueId])
}

model CaptainChange {
  id           String   @id @default(cuid())
  userId       String
  leagueId     String
  oldPlayerId  String?
  newPlayerId  String
  changedAt    DateTime @default(now())

  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  league     League  @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  oldPlayer  Player? @relation("CaptainOld", fields: [oldPlayerId], references: [id])
  newPlayer  Player  @relation("CaptainNew", fields: [newPlayerId], references: [id])

  @@index([userId, leagueId, changedAt])
}

model Draft {
  id              String      @id @default(cuid())
  leagueId        String      @unique
  status          DraftStatus @default(PENDING)
  currentRound    Int         @default(1)
  currentPickIndex Int        @default(0)
  pickOrderJson   Json
  createdAt       DateTime    @default(now())
  completedAt     DateTime?

  league League      @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  picks  DraftPick[]
}

model DraftPick {
  id         String   @id @default(cuid())
  draftId    String
  round      Int
  pickNumber Int
  userId     String
  playerId   String
  pickedAt   DateTime @default(now())

  draft  Draft  @relation(fields: [draftId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id])
  player Player @relation(fields: [playerId], references: [id])

  @@unique([draftId, pickNumber])
}

model Match {
  id           String      @id @default(cuid())
  leagueId     String
  vlrMatchId   String
  team1Id      String
  team2Id      String
  scheduledAt  DateTime
  status       MatchStatus @default(UPCOMING)
  format       MatchFormat @default(BO3)
  finalScore   String?

  league League @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  team1  Team   @relation("MatchTeam1", fields: [team1Id], references: [id])
  team2  Team   @relation("MatchTeam2", fields: [team2Id], references: [id])
  games  Game[]

  @@unique([leagueId, vlrMatchId])
  @@index([leagueId, status, scheduledAt])
}

model Game {
  id            String    @id @default(cuid())
  matchId       String
  mapNumber     Int
  mapName       String
  team1Score    Int
  team2Score    Int
  winnerTeamId  String?
  completedAt   DateTime?

  match         Match    @relation(fields: [matchId], references: [id], onDelete: Cascade)
  winnerTeam    Team?    @relation("GameWinner", fields: [winnerTeamId], references: [id])
  stats         PlayerGameStat[]
  snapshots     ScoringSnapshot[]

  @@unique([matchId, mapNumber])
}

model PlayerGameStat {
  id        String  @id @default(cuid())
  gameId    String
  playerId  String
  kills     Int
  deaths    Int
  assists   Int
  aces      Int     @default(0)
  won       Boolean

  game   Game   @relation(fields: [gameId], references: [id], onDelete: Cascade)
  player Player @relation(fields: [playerId], references: [id], onDelete: Cascade)

  @@unique([gameId, playerId])
}

model Trade {
  id          String      @id @default(cuid())
  leagueId    String
  proposerId  String
  receiverId  String
  status      TradeStatus @default(PROPOSED)
  createdAt   DateTime    @default(now())
  resolvedAt  DateTime?

  league    League      @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  proposer  User        @relation("TradesProposed", fields: [proposerId], references: [id])
  receiver  User        @relation("TradesReceived", fields: [receiverId], references: [id])
  items     TradeItem[]

  @@index([leagueId, status])
}

model TradeItem {
  id         String         @id @default(cuid())
  tradeId    String
  playerId   String
  direction  TradeDirection

  trade  Trade  @relation(fields: [tradeId], references: [id], onDelete: Cascade)
  player Player @relation(fields: [playerId], references: [id])
}

model TradeBonusCooldown {
  id         String   @id @default(cuid())
  leagueId   String
  playerId   String
  expiresAt  DateTime

  league League @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  player Player @relation(fields: [playerId], references: [id], onDelete: Cascade)

  @@unique([leagueId, playerId])
}

model FreeAgencyAction {
  id                String   @id @default(cuid())
  leagueId          String
  userId            String
  droppedPlayerId   String
  pickedUpPlayerId  String
  happenedAt        DateTime @default(now())

  league          League @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  user            User   @relation(fields: [userId], references: [id])
  droppedPlayer   Player @relation("FADropped", fields: [droppedPlayerId], references: [id])
  pickedUpPlayer  Player @relation("FAPickedUp", fields: [pickedUpPlayerId], references: [id])

  @@index([leagueId, userId, happenedAt])
}

model ScoringSnapshot {
  id             String   @id @default(cuid())
  leagueId       String
  userId         String
  playerId       String
  gameId         String
  total          Float
  captainApplied Boolean  @default(false)
  breakdownJson  Json
  computedAt     DateTime @default(now())

  league League @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  player Player @relation(fields: [playerId], references: [id])
  game   Game   @relation(fields: [gameId], references: [id], onDelete: Cascade)

  @@unique([leagueId, userId, playerId, gameId])
  @@index([leagueId, userId])
}

model ScoringAdjustment {
  id            String   @id @default(cuid())
  leagueId      String
  userId        String
  delta         Float
  reason        String
  createdByUserId String
  createdAt     DateTime @default(now())

  league      League @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  user        User   @relation("AdjustmentTarget", fields: [userId], references: [id])
  createdBy   User   @relation("AdjustmentAuthor", fields: [createdByUserId], references: [id])
}

model IngestError {
  id          String   @id @default(cuid())
  leagueId    String
  context     String
  message     String
  payloadJson Json?
  createdAt   DateTime @default(now())

  league League @relation(fields: [leagueId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 3: Create `src/lib/db.ts`**

```ts
import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

export const db =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalThis.__prisma = db;
```

- [ ] **Step 4: Run the first migration**

Make sure Docker postgres is up (`docker compose up -d db`), then:

```bash
npx prisma migrate dev --name init
```

Expected: migration created under `prisma/migrations/`, client generated, no errors.

- [ ] **Step 5: Sanity-check client**

```bash
npx prisma studio
```

Expected: Studio opens in browser at `http://localhost:5555` and shows empty tables. Kill with Ctrl-C.

- [ ] **Step 6: Commit**

```bash
git add prisma src/lib/db.ts
git commit -m "feat(db): prisma schema + initial migration"
```

---

## Phase 2 — Auth (Discord OAuth via NextAuth)

### Task 2.1: NextAuth Discord provider

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`

- [ ] **Step 1: Create `src/lib/auth.ts`**

```ts
import NextAuth, { type DefaultSession } from 'next-auth';
import Discord from 'next-auth/providers/discord';
import { db } from './db';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      discordId: string;
      role: 'USER' | 'COMMISSIONER';
    } & DefaultSession['user'];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'discord' || !account.providerAccountId) return false;
      const dbUser = await db.user.upsert({
        where: { discordId: account.providerAccountId },
        update: {
          username: user.name ?? 'unknown',
          avatarUrl: user.image ?? null,
        },
        create: {
          discordId: account.providerAccountId,
          username: user.name ?? 'unknown',
          avatarUrl: user.image ?? null,
        },
      });
      (user as { dbId?: string }).dbId = dbUser.id;
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.providerAccountId) {
        const dbUser = await db.user.findUnique({
          where: { discordId: account.providerAccountId },
        });
        if (dbUser) {
          token.dbId = dbUser.id;
          token.discordId = dbUser.discordId;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.dbId) {
        session.user.id = token.dbId as string;
        session.user.discordId = token.discordId as string;
        session.user.role = (token.role as 'USER' | 'COMMISSIONER') ?? 'USER';
      }
      return session;
    },
  },
});
```

- [ ] **Step 2: Create `src/app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

- [ ] **Step 3: Create `src/middleware.ts`**

```ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/api/auth'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (!req.auth) {
    const url = new URL('/', req.nextUrl.origin);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith('/admin') && req.auth.user.role !== 'COMMISSIONER') {
    return NextResponse.redirect(new URL('/leagues', req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next|favicon.ico|api/stream).*)'],
};
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth src/middleware.ts
git commit -m "feat(auth): discord oauth via nextauth with role-aware middleware"
```

---

### Task 2.2: Login splash page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace `src/app/page.tsx`**

```tsx
import { signIn } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 p-8 text-slate-100">
      <h1 className="text-5xl font-bold tracking-tight">VCT Fantasy</h1>
      <p className="text-slate-400">Private league — sign in with Discord to continue.</p>
      <form
        action={async () => {
          'use server';
          await signIn('discord', { redirectTo: '/leagues' });
        }}
      >
        <Button type="submit" size="lg" className="bg-[#5865F2] hover:bg-[#4752c4]">
          Sign in with Discord
        </Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Manual smoke test (skip if you don't have Discord app yet)**

If you've created a Discord application and filled in `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET`:

```bash
npm run dev
```

Visit `http://localhost:3000`, click Sign in, verify you land at `/leagues` (will 404 — that's fine, we haven't built it). Verify a `User` row appears in Prisma Studio.

If you haven't created the Discord app yet, see `docs/superpowers/specs/2026-04-11-vct-fantasy-design.md` — skip this step, we'll verify once secrets are filled in.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(auth): discord sign-in splash page"
```

---

## Phase 3 — Rules Engine (Pure, TDD)

### Task 3.1: Scoring types

**Files:**
- Create: `src/lib/scoring/types.ts`

- [ ] **Step 1: Create `src/lib/scoring/types.ts`**

```ts
export type LeagueSettings = {
  killPts: number;        // 2
  deathPts: number;       // -1
  assistPts: number;      // 1.5
  acePts: number;         // 5
  winPts: number;         // 10
  lossPts: number;        // -5
  captainMultiplier: number; // 1.5
  captainCooldownDays: number; // 7
  freeAgencyCooldownDays: number; // 1
  tradeBonus: number;     // 5
  tradeBonusCooldownDays: number; // 3
};

export const DEFAULT_LEAGUE_SETTINGS: LeagueSettings = {
  killPts: 2,
  deathPts: -1,
  assistPts: 1.5,
  acePts: 5,
  winPts: 10,
  lossPts: -5,
  captainMultiplier: 1.5,
  captainCooldownDays: 7,
  freeAgencyCooldownDays: 1,
  tradeBonus: 5,
  tradeBonusCooldownDays: 3,
};

export type PlayerGameLine = {
  kills: number;
  deaths: number;
  assists: number;
  aces: number;
  won: boolean;
};

export type ScoringBreakdown = {
  killsPts: number;
  deathsPts: number;
  assistsPts: number;
  acesPts: number;
  winBonus: number;
  base: number;
  total: number;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/scoring/types.ts
git commit -m "feat(scoring): types + default league settings"
```

---

### Task 3.2: Rules engine (TDD)

**Files:**
- Create: `tests/unit/scoring/rules.test.ts`
- Create: `src/lib/scoring/rules.ts`

- [ ] **Step 1: Write the failing test file**

Create `tests/unit/scoring/rules.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeGamePoints } from '@/lib/scoring/rules';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

const S = DEFAULT_LEAGUE_SETTINGS;

describe('computeGamePoints', () => {
  it('awards 2 points per kill', () => {
    const r = computeGamePoints({ kills: 10, deaths: 0, assists: 0, aces: 0, won: false }, S);
    expect(r.killsPts).toBe(20);
  });

  it('subtracts 1 point per death', () => {
    const r = computeGamePoints({ kills: 0, deaths: 7, assists: 0, aces: 0, won: false }, S);
    expect(r.deathsPts).toBe(-7);
  });

  it('awards 1.5 points per assist', () => {
    const r = computeGamePoints({ kills: 0, deaths: 0, assists: 6, aces: 0, won: false }, S);
    expect(r.assistsPts).toBe(9);
  });

  it('awards 5 points per ace', () => {
    const r = computeGamePoints({ kills: 0, deaths: 0, assists: 0, aces: 2, won: false }, S);
    expect(r.acesPts).toBe(10);
  });

  it('awards +10 for a win', () => {
    const r = computeGamePoints({ kills: 0, deaths: 0, assists: 0, aces: 0, won: true }, S);
    expect(r.winBonus).toBe(10);
  });

  it('subtracts 5 for a loss', () => {
    const r = computeGamePoints({ kills: 0, deaths: 0, assists: 0, aces: 0, won: false }, S);
    expect(r.winBonus).toBe(-5);
  });

  it('computes base + winBonus = total', () => {
    const r = computeGamePoints({ kills: 24, deaths: 12, assists: 5, aces: 1, won: true }, S);
    // kills: 48, deaths: -12, assists: 7.5, aces: 5, base: 48.5, win: +10
    expect(r.killsPts).toBe(48);
    expect(r.deathsPts).toBe(-12);
    expect(r.assistsPts).toBe(7.5);
    expect(r.acesPts).toBe(5);
    expect(r.base).toBe(48.5);
    expect(r.winBonus).toBe(10);
    expect(r.total).toBe(58.5);
  });

  it('handles all zeros (loss)', () => {
    const r = computeGamePoints({ kills: 0, deaths: 0, assists: 0, aces: 0, won: false }, S);
    expect(r.base).toBe(0);
    expect(r.total).toBe(-5);
  });

  it('handles all zeros (win)', () => {
    const r = computeGamePoints({ kills: 0, deaths: 0, assists: 0, aces: 0, won: true }, S);
    expect(r.total).toBe(10);
  });

  it('respects custom settings (double kill points)', () => {
    const custom = { ...S, killPts: 4 };
    const r = computeGamePoints({ kills: 5, deaths: 0, assists: 0, aces: 0, won: false }, custom);
    expect(r.killsPts).toBe(20);
  });

  it('rejects negative stats', () => {
    expect(() =>
      computeGamePoints({ kills: -1, deaths: 0, assists: 0, aces: 0, won: false }, S),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- tests/unit/scoring/rules.test.ts
```

Expected: all fail with "Failed to resolve import '@/lib/scoring/rules'".

- [ ] **Step 3: Implement `src/lib/scoring/rules.ts`**

```ts
import type { LeagueSettings, PlayerGameLine, ScoringBreakdown } from './types';

export function computeGamePoints(
  line: PlayerGameLine,
  settings: LeagueSettings,
): ScoringBreakdown {
  if (line.kills < 0 || line.deaths < 0 || line.assists < 0 || line.aces < 0) {
    throw new Error(`invalid stat line: ${JSON.stringify(line)}`);
  }
  const killsPts = line.kills * settings.killPts;
  const deathsPts = line.deaths * settings.deathPts;
  const assistsPts = line.assists * settings.assistPts;
  const acesPts = line.aces * settings.acePts;
  const base = killsPts + deathsPts + assistsPts + acesPts;
  const winBonus = line.won ? settings.winPts : settings.lossPts;
  const total = base + winBonus;
  return { killsPts, deathsPts, assistsPts, acesPts, winBonus, base, total };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- tests/unit/scoring/rules.test.ts
```

Expected: all 11 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/scoring/rules.test.ts src/lib/scoring/rules.ts
git commit -m "feat(scoring): pure rules engine with unit tests"
```

---

### Task 3.3: Aggregation with captain multiplier (TDD)

**Files:**
- Create: `tests/unit/scoring/aggregate.test.ts`
- Create: `src/lib/scoring/aggregate.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { aggregateUserTotal, type SnapshotInput } from '@/lib/scoring/aggregate';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

const S = DEFAULT_LEAGUE_SETTINGS;
const t = (iso: string) => new Date(iso);

describe('aggregateUserTotal', () => {
  it('sums plain snapshots with no captain', () => {
    const snaps: SnapshotInput[] = [
      { playerId: 'p1', gameCompletedAt: t('2026-04-10T20:00:00Z'), total: 10 },
      { playerId: 'p2', gameCompletedAt: t('2026-04-10T21:00:00Z'), total: 15 },
    ];
    const result = aggregateUserTotal(snaps, [], S);
    expect(result).toBe(25);
  });

  it('applies 1.5x to captain contributions only', () => {
    const snaps: SnapshotInput[] = [
      { playerId: 'p1', gameCompletedAt: t('2026-04-10T20:00:00Z'), total: 20 }, // captain
      { playerId: 'p2', gameCompletedAt: t('2026-04-10T21:00:00Z'), total: 10 },
    ];
    const captainHistory = [
      { newPlayerId: 'p1', changedAt: t('2026-04-09T00:00:00Z') },
    ];
    // p1 is captain for the whole window → 20 * 1.5 = 30
    // p2 = 10
    // total = 40
    expect(aggregateUserTotal(snaps, captainHistory, S)).toBe(40);
  });

  it('handles captain swap mid-event (only games after swap get multiplier for new captain)', () => {
    const snaps: SnapshotInput[] = [
      { playerId: 'p1', gameCompletedAt: t('2026-04-10T20:00:00Z'), total: 20 }, // p1 captain
      { playerId: 'p1', gameCompletedAt: t('2026-04-12T20:00:00Z'), total: 20 }, // p2 now captain
      { playerId: 'p2', gameCompletedAt: t('2026-04-12T21:00:00Z'), total: 10 }, // p2 captain → x1.5
    ];
    const captainHistory = [
      { newPlayerId: 'p1', changedAt: t('2026-04-09T00:00:00Z') },
      { newPlayerId: 'p2', changedAt: t('2026-04-11T12:00:00Z') },
    ];
    // First p1 game (Apr 10) — p1 is captain → 20 * 1.5 = 30
    // Second p1 game (Apr 12) — p2 is captain now, p1 not → 20
    // p2 game (Apr 12) — p2 captain → 10 * 1.5 = 15
    // total = 30 + 20 + 15 = 65
    expect(aggregateUserTotal(snaps, captainHistory, S)).toBe(65);
  });

  it('no captain history → no multiplier', () => {
    const snaps: SnapshotInput[] = [
      { playerId: 'p1', gameCompletedAt: t('2026-04-10T20:00:00Z'), total: 100 },
    ];
    expect(aggregateUserTotal(snaps, [], S)).toBe(100);
  });

  it('returns 0 for no snapshots', () => {
    expect(aggregateUserTotal([], [], S)).toBe(0);
  });
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npm test -- tests/unit/scoring/aggregate.test.ts
```

Expected: fails (module not found).

- [ ] **Step 3: Implement `src/lib/scoring/aggregate.ts`**

```ts
import type { LeagueSettings } from './types';

export type SnapshotInput = {
  playerId: string;
  gameCompletedAt: Date;
  total: number;
};

export type CaptainHistoryEntry = {
  newPlayerId: string;
  changedAt: Date;
};

/**
 * Resolves which player (if any) was captain at a given instant, given a
 * chronologically-sorted list of captain-change events.
 */
function captainAt(history: CaptainHistoryEntry[], at: Date): string | null {
  let current: string | null = null;
  for (const entry of history) {
    if (entry.changedAt.getTime() <= at.getTime()) current = entry.newPlayerId;
    else break;
  }
  return current;
}

export function aggregateUserTotal(
  snapshots: SnapshotInput[],
  captainHistory: CaptainHistoryEntry[],
  settings: LeagueSettings,
): number {
  const sorted = [...captainHistory].sort(
    (a, b) => a.changedAt.getTime() - b.changedAt.getTime(),
  );
  let total = 0;
  for (const snap of snapshots) {
    const captain = captainAt(sorted, snap.gameCompletedAt);
    const multiplier = captain === snap.playerId ? settings.captainMultiplier : 1;
    total += snap.total * multiplier;
  }
  return total;
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npm test -- tests/unit/scoring/aggregate.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/scoring/aggregate.test.ts src/lib/scoring/aggregate.ts
git commit -m "feat(scoring): captain-aware aggregation with unit tests"
```

---

## Phase 4 — Jamaica Timezone Helpers

### Task 4.1: Day-boundary helpers (TDD)

**Files:**
- Create: `tests/unit/time.test.ts`, `src/lib/time.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { startOfDayJamaica, addDays, isOlderThanDays } from '@/lib/time';

describe('startOfDayJamaica', () => {
  it('returns midnight Jamaica time for a given instant', () => {
    // Jamaica is UTC-5 year-round (no DST).
    // 2026-04-11 14:00 UTC = 2026-04-11 09:00 Jamaica.
    // Start of day Jamaica = 2026-04-11 05:00 UTC.
    const result = startOfDayJamaica(new Date('2026-04-11T14:00:00Z'));
    expect(result.toISOString()).toBe('2026-04-11T05:00:00.000Z');
  });

  it('handles an instant already at Jamaica midnight', () => {
    const result = startOfDayJamaica(new Date('2026-04-11T05:00:00Z'));
    expect(result.toISOString()).toBe('2026-04-11T05:00:00.000Z');
  });

  it('rolls back to previous day when UTC is between 00:00 and 05:00', () => {
    // 2026-04-11 02:00 UTC = 2026-04-10 21:00 Jamaica.
    // Start of day = 2026-04-10 05:00 UTC.
    const result = startOfDayJamaica(new Date('2026-04-11T02:00:00Z'));
    expect(result.toISOString()).toBe('2026-04-10T05:00:00.000Z');
  });
});

describe('isOlderThanDays', () => {
  it('true when past is more than N days before now', () => {
    const now = new Date('2026-04-20T00:00:00Z');
    const past = new Date('2026-04-12T00:00:00Z');
    expect(isOlderThanDays(past, 7, now)).toBe(true);
  });

  it('false when past is exactly N days before now', () => {
    const now = new Date('2026-04-19T00:00:00Z');
    const past = new Date('2026-04-12T00:00:00Z');
    expect(isOlderThanDays(past, 7, now)).toBe(false);
  });

  it('false when past is less than N days ago', () => {
    const now = new Date('2026-04-18T00:00:00Z');
    const past = new Date('2026-04-12T00:00:00Z');
    expect(isOlderThanDays(past, 7, now)).toBe(false);
  });
});

describe('addDays', () => {
  it('adds N days to an instant', () => {
    expect(addDays(new Date('2026-04-11T00:00:00Z'), 3).toISOString()).toBe(
      '2026-04-14T00:00:00.000Z',
    );
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npm test -- tests/unit/time.test.ts
```

- [ ] **Step 3: Implement `src/lib/time.ts`**

```ts
// Jamaica is UTC-5 year-round (no DST). Hardcoded rather than relying on Intl
// so behavior is deterministic in tests regardless of the host TZ.
const JAMAICA_OFFSET_MINUTES = -5 * 60;

export function startOfDayJamaica(instant: Date): Date {
  const utcMs = instant.getTime();
  const localMs = utcMs + JAMAICA_OFFSET_MINUTES * 60 * 1000;
  const localDay = Math.floor(localMs / (24 * 60 * 60 * 1000));
  const startOfDayLocalMs = localDay * 24 * 60 * 60 * 1000;
  const startOfDayUtcMs = startOfDayLocalMs - JAMAICA_OFFSET_MINUTES * 60 * 1000;
  return new Date(startOfDayUtcMs);
}

export function addDays(instant: Date, days: number): Date {
  return new Date(instant.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isOlderThanDays(past: Date, days: number, now: Date = new Date()): boolean {
  const diffMs = now.getTime() - past.getTime();
  return diffMs > days * 24 * 60 * 60 * 1000;
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npm test -- tests/unit/time.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/time.test.ts src/lib/time.ts
git commit -m "feat(time): jamaica day-boundary + cooldown helpers"
```

---

## Phase 5 — vlrggapi Client

### Task 5.1: Typed vlrggapi client

**Files:**
- Create: `src/lib/vlrapi/types.ts`, `src/lib/vlrapi/client.ts`

> **Note:** The exact vlrggapi response shapes need to be verified against the live instance. This task creates a *minimal* typed wrapper; we'll refine field names in Phase 6 when we wire the seed script to the real API.

- [ ] **Step 1: Create `src/lib/vlrapi/types.ts`**

```ts
// Minimal subset of vlrggapi response shapes we consume.
// Full shapes are documented at https://github.com/axsddlr/vlrggapi
// If the upstream changes, only these types need updating.

export type VlrEventTeam = {
  id: string;
  name: string;
  shortCode: string;
  logoUrl?: string;
};

export type VlrEventPlayer = {
  id: string;
  handle: string;
  teamId: string;
  country?: string;
  role?: string;
};

export type VlrEventDetails = {
  eventId: string;
  teams: VlrEventTeam[];
  players: VlrEventPlayer[];
};

export type VlrMatchSummary = {
  matchId: string;
  team1Id: string;
  team2Id: string;
  scheduledAt: string; // ISO
  status: 'upcoming' | 'live' | 'completed';
  format: 'bo1' | 'bo3' | 'bo5';
  finalScore?: string;
};

export type VlrGameLine = {
  playerId: string;
  kills: number;
  deaths: number;
  assists: number;
  aces: number;
};

export type VlrGame = {
  mapNumber: number;
  mapName: string;
  team1Score: number;
  team2Score: number;
  winnerTeamId: string | null;
  completedAt: string | null;
  playerLines: VlrGameLine[];
};

export type VlrMatchDetails = {
  matchId: string;
  team1Id: string;
  team2Id: string;
  scheduledAt: string;
  status: 'upcoming' | 'live' | 'completed';
  format: 'bo1' | 'bo3' | 'bo5';
  finalScore?: string;
  games: VlrGame[];
};
```

- [ ] **Step 2: Create `src/lib/vlrapi/client.ts`**

```ts
import type { VlrEventDetails, VlrMatchDetails, VlrMatchSummary } from './types';

const BASE = process.env.VLRAPI_BASE_URL ?? 'http://localhost:8000';

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const delays = [2000, 4000, 8000];
  let lastErr: unknown;
  for (let attempt = 0; attempt < delays.length + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === delays.length) break;
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  throw new Error(`vlrapi ${label} failed after retries: ${String(lastErr)}`);
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return (await res.json()) as T;
}

export const vlrapi = {
  getEventDetails: (eventId: string) =>
    withRetry(
      () => get<VlrEventDetails>(`/events/${encodeURIComponent(eventId)}`),
      `getEventDetails(${eventId})`,
    ),
  getEventMatches: (eventId: string) =>
    withRetry(
      () => get<VlrMatchSummary[]>(`/events/${encodeURIComponent(eventId)}/matches`),
      `getEventMatches(${eventId})`,
    ),
  getMatch: (matchId: string) =>
    withRetry(
      () => get<VlrMatchDetails>(`/matches/${encodeURIComponent(matchId)}`),
      `getMatch(${matchId})`,
    ),
};

export type VlrApi = typeof vlrapi;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/vlrapi
git commit -m "feat(vlrapi): typed client with retry/backoff"
```

> **Important:** Before the seed script runs, **verify the actual vlrggapi endpoints and response shapes** against the running container (`curl http://localhost:8000/docs`). Update `src/lib/vlrapi/types.ts` and the `path` strings in `client.ts` to match. The current shapes are assumed.

---

## Phase 6 — Stage 1 Bootstrap Seed Script

### Task 6.1: Build vlrapi container

- [ ] **Step 1: Build vlrapi**

```bash
docker compose build vlrapi
docker compose up -d vlrapi
```

- [ ] **Step 2: Verify it's alive**

```bash
curl -sS http://localhost:8000/docs | head -5
```

Expected: HTML (FastAPI's `/docs` page).

- [ ] **Step 3: Explore available endpoints**

Open `http://localhost:8000/docs` in a browser. Note the actual event and match endpoints. **Update `src/lib/vlrapi/types.ts` and `src/lib/vlrapi/client.ts`** to match real field names. Commit those fixes separately.

```bash
git add src/lib/vlrapi
git commit -m "fix(vlrapi): align types with real vlrggapi responses"
```

---

### Task 6.2: Write the seed script

**Files:**
- Create: `scripts/seed-stage1.ts`

- [ ] **Step 1: Add seed script**

```ts
// scripts/seed-stage1.ts
// One-time bootstrap for VCT Americas 2026 Stage 1.
// Run inside the web container: `tsx scripts/seed-stage1.ts`
//
// IDEMPOTENT: safe to re-run.
// ABORTS if recomputed manager totals diverge from spreadsheet baselines.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { vlrapi } from '../src/lib/vlrapi/client';
import { computeGamePoints } from '../src/lib/scoring/rules';
import { aggregateUserTotal, type SnapshotInput, type CaptainHistoryEntry } from '../src/lib/scoring/aggregate';
import { DEFAULT_LEAGUE_SETTINGS } from '../src/lib/scoring/types';

const db = new PrismaClient();

// ============================================================================
// HARDCODED CONFIG — Liam must fill in before running.
// ============================================================================

const LEAGUE = {
  slug: 'vct-americas-2026-stage-1',
  name: 'VCT Americas 2026 — Stage 1',
  vlrEventId: 'REPLACE_WITH_VLR_EVENT_ID',
  startDate: new Date('2026-04-10T00:00:00-05:00'),
};

// Discord IDs for the 7 managers. Fill in real IDs before running.
const MANAGERS: Array<{
  discordId: string;
  username: string;
  role: 'USER' | 'COMMISSIONER';
}> = [
  { discordId: 'REPLACE_LIAM_DISCORD_ID', username: 'Liam', role: 'COMMISSIONER' },
  { discordId: 'REPLACE_JAHNAI_DISCORD_ID', username: 'Jahnai', role: 'USER' },
  { discordId: 'REPLACE_BRIAN_DISCORD_ID', username: 'Brian', role: 'USER' },
  { discordId: 'REPLACE_MICHAEL_DISCORD_ID', username: 'Michael', role: 'USER' },
  { discordId: 'REPLACE_JUSTIN_B_DISCORD_ID', username: 'Justin B', role: 'USER' },
  { discordId: 'REPLACE_JOSHUA_DISCORD_ID', username: 'Joshua', role: 'USER' },
  { discordId: 'REPLACE_JUSTIN_C_DISCORD_ID', username: 'Justin C', role: 'USER' },
];

// Rosters keyed by manager username. Each value is an array of 5 entries.
// Captain is the first entry marked with `captain: true`.
// Player handles must match exactly what vlrggapi returns (case-sensitive).
const ROSTERS: Record<string, Array<{ handle: string; captain?: boolean }>> = {
  Liam: [
    { handle: 'REPLACE_P1', captain: true },
    { handle: 'REPLACE_P2' },
    { handle: 'REPLACE_P3' },
    { handle: 'REPLACE_P4' },
    { handle: 'REPLACE_P5' },
  ],
  // ... repeat for all 7 managers
};

// Validation targets from the spreadsheet (2026-04-11 mid-stage snapshot).
const EXPECTED_TOTALS: Record<string, number> = {
  Liam: 228.5,
  Jahnai: 156.0,
  Brian: 147.0,
  Michael: 131.0,
  'Justin B': 107.5,
  Joshua: 35.5,
  'Justin C': 0,
};

const TOLERANCE = 0.5;

// ============================================================================
// Seed logic
// ============================================================================

async function main() {
  console.log('▶ seeding VCT Americas 2026 Stage 1…');

  // Validation: every manager has exactly 5 players, exactly 1 captain.
  for (const [name, roster] of Object.entries(ROSTERS)) {
    if (roster.length !== 5) throw new Error(`${name} has ${roster.length} players, expected 5`);
    const captains = roster.filter((r) => r.captain).length;
    if (captains !== 1) throw new Error(`${name} has ${captains} captains, expected 1`);
  }

  // 1. Upsert League
  const league = await db.league.upsert({
    where: { slug: LEAGUE.slug },
    update: {},
    create: {
      slug: LEAGUE.slug,
      name: LEAGUE.name,
      vlrEventId: LEAGUE.vlrEventId,
      status: 'ACTIVE',
      startDate: LEAGUE.startDate,
      timezone: 'America/Jamaica',
      settingsJson: DEFAULT_LEAGUE_SETTINGS as unknown as object,
      discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL ?? null,
    },
  });
  console.log(`  league: ${league.id}`);

  // 2. Import teams + players from vlrapi
  const eventDetails = await vlrapi.getEventDetails(LEAGUE.vlrEventId);
  for (const team of eventDetails.teams) {
    await db.team.upsert({
      where: { leagueId_vlrTeamId: { leagueId: league.id, vlrTeamId: team.id } },
      update: { name: team.name, shortCode: team.shortCode, logoUrl: team.logoUrl ?? null },
      create: {
        leagueId: league.id,
        vlrTeamId: team.id,
        name: team.name,
        shortCode: team.shortCode,
        logoUrl: team.logoUrl ?? null,
      },
    });
  }
  const teamsByVlrId = await db.team.findMany({ where: { leagueId: league.id } });
  const teamMap = new Map(teamsByVlrId.map((t) => [t.vlrTeamId, t.id]));

  for (const p of eventDetails.players) {
    const teamId = teamMap.get(p.teamId);
    if (!teamId) throw new Error(`team ${p.teamId} not found for player ${p.handle}`);
    await db.player.upsert({
      where: { leagueId_vlrPlayerId: { leagueId: league.id, vlrPlayerId: p.id } },
      update: { handle: p.handle, teamId, country: p.country ?? null, role: p.role ?? null },
      create: {
        leagueId: league.id,
        vlrPlayerId: p.id,
        teamId,
        handle: p.handle,
        country: p.country ?? null,
        role: p.role ?? null,
      },
    });
  }
  console.log(`  players: ${eventDetails.players.length}`);

  // 3. Upsert Users
  const userByName = new Map<string, string>();
  for (const m of MANAGERS) {
    const u = await db.user.upsert({
      where: { discordId: m.discordId },
      update: { username: m.username, role: m.role },
      create: { discordId: m.discordId, username: m.username, role: m.role },
    });
    userByName.set(m.username, u.id);
    await db.leagueMembership.upsert({
      where: { userId_leagueId: { userId: u.id, leagueId: league.id } },
      update: {},
      create: { userId: u.id, leagueId: league.id },
    });
  }

  // 4. Insert RosterSlots
  const playersByHandle = await db.player.findMany({ where: { leagueId: league.id } });
  const playerByHandle = new Map(playersByHandle.map((p) => [p.handle, p.id]));

  for (const [managerName, roster] of Object.entries(ROSTERS)) {
    const userId = userByName.get(managerName);
    if (!userId) throw new Error(`unknown manager: ${managerName}`);
    for (const entry of roster) {
      const playerId = playerByHandle.get(entry.handle);
      if (!playerId) throw new Error(`player not found in vlrapi: ${entry.handle}`);
      await db.rosterSlot.upsert({
        where: { leagueId_playerId: { leagueId: league.id, playerId } },
        update: { userId, isCaptain: entry.captain ?? false },
        create: {
          userId,
          leagueId: league.id,
          playerId,
          isCaptain: entry.captain ?? false,
          acquiredVia: 'SEED',
        },
      });
      if (entry.captain) {
        await db.captainChange.create({
          data: {
            userId,
            leagueId: league.id,
            oldPlayerId: null,
            newPlayerId: playerId,
            changedAt: LEAGUE.startDate,
          },
        });
      }
    }
  }
  console.log('  rosters seeded');

  // 5. Fetch the 2 played matches and compute snapshots
  const matches = await vlrapi.getEventMatches(LEAGUE.vlrEventId);
  const completed = matches.filter((m) => m.status === 'completed');
  console.log(`  fetching ${completed.length} completed matches…`);

  for (const summary of completed) {
    const detail = await vlrapi.getMatch(summary.matchId);
    const team1 = teamMap.get(detail.team1Id);
    const team2 = teamMap.get(detail.team2Id);
    if (!team1 || !team2) continue;

    const match = await db.match.upsert({
      where: { leagueId_vlrMatchId: { leagueId: league.id, vlrMatchId: detail.matchId } },
      update: { status: 'COMPLETED', finalScore: detail.finalScore ?? null },
      create: {
        leagueId: league.id,
        vlrMatchId: detail.matchId,
        team1Id: team1,
        team2Id: team2,
        scheduledAt: new Date(detail.scheduledAt),
        status: 'COMPLETED',
        format: detail.format.toUpperCase() as 'BO1' | 'BO3' | 'BO5',
        finalScore: detail.finalScore ?? null,
      },
    });

    for (const g of detail.games) {
      const winnerTeamId = g.winnerTeamId ? (teamMap.get(g.winnerTeamId) ?? null) : null;
      const game = await db.game.upsert({
        where: { matchId_mapNumber: { matchId: match.id, mapNumber: g.mapNumber } },
        update: {
          team1Score: g.team1Score,
          team2Score: g.team2Score,
          winnerTeamId,
          completedAt: g.completedAt ? new Date(g.completedAt) : null,
        },
        create: {
          matchId: match.id,
          mapNumber: g.mapNumber,
          mapName: g.mapName,
          team1Score: g.team1Score,
          team2Score: g.team2Score,
          winnerTeamId,
          completedAt: g.completedAt ? new Date(g.completedAt) : null,
        },
      });

      for (const line of g.playerLines) {
        const player = await db.player.findUnique({
          where: { leagueId_vlrPlayerId: { leagueId: league.id, vlrPlayerId: line.playerId } },
        });
        if (!player) continue;
        const won = player.teamId === winnerTeamId;
        await db.playerGameStat.upsert({
          where: { gameId_playerId: { gameId: game.id, playerId: player.id } },
          update: {
            kills: line.kills,
            deaths: line.deaths,
            assists: line.assists,
            aces: line.aces,
            won,
          },
          create: {
            gameId: game.id,
            playerId: player.id,
            kills: line.kills,
            deaths: line.deaths,
            assists: line.assists,
            aces: line.aces,
            won,
          },
        });

        // Run rules engine, upsert snapshot if this player is on a roster
        const slot = await db.rosterSlot.findUnique({
          where: { leagueId_playerId: { leagueId: league.id, playerId: player.id } },
        });
        if (!slot) continue;
        const breakdown = computeGamePoints(
          { kills: line.kills, deaths: line.deaths, assists: line.assists, aces: line.aces, won },
          DEFAULT_LEAGUE_SETTINGS,
        );
        await db.scoringSnapshot.upsert({
          where: {
            leagueId_userId_playerId_gameId: {
              leagueId: league.id,
              userId: slot.userId,
              playerId: player.id,
              gameId: game.id,
            },
          },
          update: { total: breakdown.total, breakdownJson: breakdown as unknown as object },
          create: {
            leagueId: league.id,
            userId: slot.userId,
            playerId: player.id,
            gameId: game.id,
            total: breakdown.total,
            breakdownJson: breakdown as unknown as object,
          },
        });
      }
    }
  }

  // 6. Historical free agency action
  const liamId = userByName.get('Liam')!;
  const lessId = playerByHandle.get('Less');
  const okeanosId = playerByHandle.get('okeanos');
  if (lessId && okeanosId) {
    const existing = await db.freeAgencyAction.findFirst({
      where: { userId: liamId, leagueId: league.id, droppedPlayerId: lessId, pickedUpPlayerId: okeanosId },
    });
    if (!existing) {
      await db.freeAgencyAction.create({
        data: {
          leagueId: league.id,
          userId: liamId,
          droppedPlayerId: lessId,
          pickedUpPlayerId: okeanosId,
          happenedAt: new Date('2026-04-10T20:00:00-05:00'),
        },
      });
    }
  }

  // 7. Validate totals against spreadsheet
  console.log('\n▶ validating against spreadsheet totals…');
  for (const [managerName, expected] of Object.entries(EXPECTED_TOTALS)) {
    const userId = userByName.get(managerName);
    if (!userId) throw new Error(`manager not found: ${managerName}`);

    const snapshots = await db.scoringSnapshot.findMany({
      where: { leagueId: league.id, userId },
      include: { game: true },
    });
    const snapInputs: SnapshotInput[] = snapshots.map((s) => ({
      playerId: s.playerId,
      gameCompletedAt: s.game.completedAt ?? new Date(0),
      total: s.total,
    }));
    const captainHist = await db.captainChange.findMany({
      where: { leagueId: league.id, userId },
      orderBy: { changedAt: 'asc' },
    });
    const history: CaptainHistoryEntry[] = captainHist.map((c) => ({
      newPlayerId: c.newPlayerId,
      changedAt: c.changedAt,
    }));
    const computed = aggregateUserTotal(snapInputs, history, DEFAULT_LEAGUE_SETTINGS);
    const diff = Math.abs(computed - expected);
    const ok = diff <= TOLERANCE;
    console.log(`  ${ok ? '✓' : '✗'} ${managerName}: computed=${computed.toFixed(1)} expected=${expected} (Δ${diff.toFixed(1)})`);
    if (!ok) throw new Error(`${managerName} total mismatch`);
  }

  console.log('\n✓ seed complete and validated');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
```

- [ ] **Step 2: Add `seed:stage1` script to `package.json`**

Inside `"scripts"`:

```json
"seed:stage1": "tsx scripts/seed-stage1.ts"
```

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-stage1.ts package.json
git commit -m "feat(seed): stage 1 bootstrap script (hardcoded rosters pending)"
```

> **Execution note:** Before running `npm run seed:stage1`:
> 1. Fill in every `REPLACE_*` placeholder with real Discord IDs and player handles.
> 2. Confirm the vlrggapi endpoints work and the type shapes match reality.
> 3. Run it. If it aborts on validation, diff `computed` vs `expected` — the rules engine or the roster encoding is wrong.

---

## Phase 7 — Read Queries & Route Shell

### Task 7.1: League list page

**Files:**
- Create: `src/app/leagues/page.tsx`, `src/server/queries/leagues.ts`

- [ ] **Step 1: Create `src/server/queries/leagues.ts`**

```ts
import { db } from '@/lib/db';

export async function listLeaguesForUser(userId: string) {
  return db.league.findMany({
    where: { memberships: { some: { userId } } },
    orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    select: { id: true, slug: true, name: true, status: true, startDate: true, endDate: true },
  });
}
```

- [ ] **Step 2: Create `src/app/leagues/page.tsx`**

```tsx
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { listLeaguesForUser } from '@/server/queries/leagues';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function LeaguesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const leagues = await listLeaguesForUser(session.user.id);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-100">Your Leagues</h1>
      {leagues.length === 0 && <p className="text-slate-400">You&apos;re not in any leagues yet.</p>}
      {leagues.map((l) => (
        <Link key={l.id} href={`/leagues/${l.slug}`}>
          <Card className="cursor-pointer p-4 transition-colors hover:border-slate-600">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-100">{l.name}</div>
                <div className="text-sm text-slate-400">
                  Started {l.startDate.toLocaleDateString()}
                </div>
              </div>
              <Badge>{l.status}</Badge>
            </div>
          </Card>
        </Link>
      ))}
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/leagues src/server/queries/leagues.ts
git commit -m "feat(ui): league list page"
```

---

### Task 7.2: Leaderboard query + page

**Files:**
- Create: `src/server/queries/leaderboard.ts`, `src/app/leagues/[slug]/leaderboard/page.tsx`

- [ ] **Step 1: Create `src/server/queries/leaderboard.ts`**

```ts
import { db } from '@/lib/db';
import { aggregateUserTotal, type SnapshotInput, type CaptainHistoryEntry } from '@/lib/scoring/aggregate';
import type { LeagueSettings } from '@/lib/scoring/types';

export type LeaderboardRow = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  total: number;
  rank: number;
};

export async function getLeaderboard(leagueSlug: string): Promise<LeaderboardRow[]> {
  const league = await db.league.findUnique({
    where: { slug: leagueSlug },
    include: {
      memberships: { include: { user: true } },
      captainChanges: true,
    },
  });
  if (!league) return [];

  const settings = league.settingsJson as unknown as LeagueSettings;

  const snapshots = await db.scoringSnapshot.findMany({
    where: { leagueId: league.id },
    include: { game: true },
  });
  const adjustments = await db.scoringAdjustment.findMany({
    where: { leagueId: league.id },
  });

  const rows: Omit<LeaderboardRow, 'rank'>[] = league.memberships.map((m) => {
    const userSnaps = snapshots.filter((s) => s.userId === m.userId);
    const snapInputs: SnapshotInput[] = userSnaps.map((s) => ({
      playerId: s.playerId,
      gameCompletedAt: s.game.completedAt ?? new Date(0),
      total: s.total,
    }));
    const userHistory: CaptainHistoryEntry[] = league.captainChanges
      .filter((c) => c.userId === m.userId)
      .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime())
      .map((c) => ({ newPlayerId: c.newPlayerId, changedAt: c.changedAt }));

    const base = aggregateUserTotal(snapInputs, userHistory, settings);
    const adj = adjustments.filter((a) => a.userId === m.userId).reduce((acc, a) => acc + a.delta, 0);

    return {
      userId: m.userId,
      username: m.user.username,
      avatarUrl: m.user.avatarUrl,
      total: Math.round((base + adj) * 10) / 10,
    };
  });

  rows.sort((a, b) => b.total - a.total);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
```

- [ ] **Step 2: Create `src/app/leagues/[slug]/leaderboard/page.tsx`**

```tsx
import { getLeaderboard } from '@/server/queries/leaderboard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function LeaderboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await getLeaderboard(slug);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-100">Leaderboard</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead className="text-right">Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.userId}>
              <TableCell>{r.rank}</TableCell>
              <TableCell>{r.username}</TableCell>
              <TableCell className="text-right font-mono">{r.total.toFixed(1)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/server/queries/leaderboard.ts src/app/leagues/[slug]/leaderboard
git commit -m "feat(ui): leaderboard page with captain-aware totals"
```

---

### Task 7.3: Roster query + page

**Files:**
- Create: `src/server/queries/roster.ts`, `src/app/leagues/[slug]/roster/page.tsx`, `src/app/leagues/[slug]/rosters/[userId]/page.tsx`

- [ ] **Step 1: Create `src/server/queries/roster.ts`**

```ts
import { db } from '@/lib/db';

export async function getRoster(leagueSlug: string, userId: string) {
  const league = await db.league.findUnique({ where: { slug: leagueSlug } });
  if (!league) return null;
  const slots = await db.rosterSlot.findMany({
    where: { leagueId: league.id, userId },
    include: { player: { include: { team: true } } },
    orderBy: { acquiredAt: 'asc' },
  });
  return { league, slots };
}
```

- [ ] **Step 2: Create `src/app/leagues/[slug]/roster/page.tsx`**

```tsx
import { auth } from '@/lib/auth';
import { getRoster } from '@/server/queries/roster';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function MyRosterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;
  const data = await getRoster(slug, session.user.id);
  if (!data) return <p>League not found</p>;

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-100">Your Roster</h1>
      <div className="grid gap-3">
        {data.slots.map((s) => (
          <Card key={s.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {s.isCaptain && <span className="text-lg text-red-500">★</span>}
              <div>
                <div className="font-semibold text-slate-100">{s.player.handle}</div>
                <div className="text-xs text-slate-400">{s.player.team.name}</div>
              </div>
            </div>
            <Badge variant="outline">{s.acquiredVia}</Badge>
          </Card>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create `src/app/leagues/[slug]/rosters/[userId]/page.tsx`**

Same as MyRoster but reads `params.userId` and renders read-only:

```tsx
import { getRoster } from '@/server/queries/roster';
import { Card } from '@/components/ui/card';
import { db } from '@/lib/db';

export default async function OtherRosterPage({
  params,
}: {
  params: Promise<{ slug: string; userId: string }>;
}) {
  const { slug, userId } = await params;
  const data = await getRoster(slug, userId);
  if (!data) return <p>League not found</p>;
  const user = await db.user.findUnique({ where: { id: userId } });

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-100">{user?.username}&apos;s Roster</h1>
      <div className="grid gap-3">
        {data.slots.map((s) => (
          <Card key={s.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {s.isCaptain && <span className="text-lg text-red-500">★</span>}
              <div>
                <div className="font-semibold text-slate-100">{s.player.handle}</div>
                <div className="text-xs text-slate-400">{s.player.team.name}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/server/queries/roster.ts src/app/leagues/[slug]/roster src/app/leagues/[slug]/rosters
git commit -m "feat(ui): own and read-only roster pages"
```

---

### Task 7.4: Match-first dashboard page

**Files:**
- Create: `src/app/leagues/[slug]/page.tsx`, `src/server/queries/dashboard.ts`, `src/components/dashboard/LiveMatchHero.tsx`, `src/components/dashboard/MyPlayersInMatch.tsx`, `src/components/dashboard/CompressedStandings.tsx`

- [ ] **Step 1: Create `src/server/queries/dashboard.ts`**

```ts
import { db } from '@/lib/db';
import { getLeaderboard } from './leaderboard';

export async function getDashboard(leagueSlug: string, userId: string) {
  const league = await db.league.findUnique({ where: { slug: leagueSlug } });
  if (!league) return null;

  const leaderboard = await getLeaderboard(leagueSlug);

  const liveMatch = await db.match.findFirst({
    where: { leagueId: league.id, status: 'LIVE' },
    include: {
      team1: true,
      team2: true,
      games: {
        orderBy: { mapNumber: 'asc' },
        include: { stats: { include: { player: { include: { team: true } } } } },
      },
    },
  });

  const myRoster = await db.rosterSlot.findMany({
    where: { leagueId: league.id, userId },
    include: { player: true },
  });
  const myPlayerIds = new Set(myRoster.map((r) => r.player.id));

  return { league, leaderboard, liveMatch, myPlayerIds, myRoster };
}
```

- [ ] **Step 2: Create `src/components/dashboard/LiveMatchHero.tsx`**

```tsx
type Props = {
  team1Name: string;
  team2Name: string;
  team1Wins: number;
  team2Wins: number;
  currentMap: string | null;
};

export function LiveMatchHero({ team1Name, team2Name, team1Wins, team2Wins, currentMap }: Props) {
  return (
    <div className="rounded-lg bg-gradient-to-br from-[#ff4655] to-[#7a1620] p-6 text-white shadow-lg">
      <div className="text-xs uppercase opacity-85">● LIVE NOW</div>
      <div className="mt-1 text-2xl font-bold">
        {team1Name} {team1Wins} — {team2Wins} {team2Name}
      </div>
      {currentMap && <div className="mt-1 text-sm opacity-85">{currentMap}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/dashboard/MyPlayersInMatch.tsx`**

```tsx
import { Card } from '@/components/ui/card';

type Line = { handle: string; teamShort: string; isCaptain: boolean; total: number };

export function MyPlayersInMatch({ lines }: { lines: Line[] }) {
  if (lines.length === 0) return null;
  return (
    <Card className="p-4">
      <div className="mb-2 text-xs uppercase text-slate-400">Your Players in this Match</div>
      <div className="space-y-1 text-sm">
        {lines.map((l) => (
          <div key={l.handle} className="flex items-center justify-between">
            <span className="text-slate-100">
              {l.isCaptain && <span className="mr-1 text-red-500">★</span>}
              {l.handle} · {l.teamShort}
            </span>
            <span className={l.total >= 0 ? 'font-mono text-green-400' : 'font-mono text-slate-400'}>
              {l.total >= 0 ? '+' : ''}
              {l.total.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Create `src/components/dashboard/CompressedStandings.tsx`**

```tsx
type Row = { rank: number; username: string; total: number };
export function CompressedStandings({ rows, meRank }: { rows: Row[]; meRank: number | null }) {
  return (
    <div className="rounded-lg border border-slate-800 p-3 text-xs text-slate-400">
      <div className="mb-1 flex justify-between">
        <span className="uppercase">Standings</span>
        {meRank && <span>You: #{meRank}</span>}
      </div>
      <div className="text-slate-200">
        {rows.map((r) => `${r.username} ${r.total.toFixed(1)}`).join(' · ')}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/app/leagues/[slug]/page.tsx`**

```tsx
import { auth } from '@/lib/auth';
import { getDashboard } from '@/server/queries/dashboard';
import { LiveMatchHero } from '@/components/dashboard/LiveMatchHero';
import { MyPlayersInMatch } from '@/components/dashboard/MyPlayersInMatch';
import { CompressedStandings } from '@/components/dashboard/CompressedStandings';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const data = await getDashboard(slug, session.user.id);
  if (!data) return <p>League not found</p>;

  let heroProps = null;
  let lines: {
    handle: string;
    teamShort: string;
    isCaptain: boolean;
    total: number;
  }[] = [];

  if (data.liveMatch) {
    const t1Wins = data.liveMatch.games.filter((g) => g.winnerTeamId === data.liveMatch!.team1Id).length;
    const t2Wins = data.liveMatch.games.filter((g) => g.winnerTeamId === data.liveMatch!.team2Id).length;
    const currentMap = data.liveMatch.games.at(-1)?.mapName ?? null;
    heroProps = {
      team1Name: data.liveMatch.team1.name,
      team2Name: data.liveMatch.team2.name,
      team1Wins: t1Wins,
      team2Wins: t2Wins,
      currentMap,
    };

    const captainIds = new Set(data.myRoster.filter((r) => r.isCaptain).map((r) => r.player.id));
    const aggLines = new Map<string, { handle: string; teamShort: string; isCaptain: boolean; total: number }>();
    for (const g of data.liveMatch.games) {
      for (const stat of g.stats) {
        if (!data.myPlayerIds.has(stat.playerId)) continue;
        const existing = aggLines.get(stat.playerId) ?? {
          handle: stat.player.handle,
          teamShort: stat.player.team.shortCode,
          isCaptain: captainIds.has(stat.playerId),
          total: 0,
        };
        const pts =
          stat.kills * 2 + stat.assists * 1.5 - stat.deaths + stat.aces * 5 + (stat.won ? 10 : -5);
        existing.total += pts;
        aggLines.set(stat.playerId, existing);
      }
    }
    lines = [...aggLines.values()];
  }

  const meRow = data.leaderboard.find((r) => r.userId === session.user.id);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      {heroProps ? (
        <LiveMatchHero {...heroProps} />
      ) : (
        <div className="rounded-lg border border-slate-800 p-6 text-center text-slate-400">
          No live match right now.
        </div>
      )}
      <MyPlayersInMatch lines={lines} />
      <CompressedStandings rows={data.leaderboard.slice(0, 5)} meRank={meRow?.rank ?? null} />
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/server/queries/dashboard.ts src/components/dashboard src/app/leagues/[slug]/page.tsx
git commit -m "feat(ui): match-first dashboard page"
```

---

### Task 7.5: Stub remaining routes (players, matches, trades, draft, history, admin)

To unblock navigation, add simple stub pages for the remaining routes. Each shows a `Coming soon` placeholder so we can flesh them out in later phases.

**Files:**
- Create: `src/app/leagues/[slug]/players/page.tsx`
- Create: `src/app/leagues/[slug]/matches/page.tsx`
- Create: `src/app/leagues/[slug]/matches/[id]/page.tsx`
- Create: `src/app/leagues/[slug]/trades/page.tsx`
- Create: `src/app/leagues/[slug]/draft/page.tsx`
- Create: `src/app/leagues/[slug]/history/page.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/leagues/new/page.tsx`
- Create: `src/app/admin/leagues/[slug]/page.tsx`

- [ ] **Step 1: Create each stub with identical structure**

For each route file, use this template (customize the title):

```tsx
export default function Stub() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-bold text-slate-100">Coming soon</h1>
      <p className="text-slate-400">This page will be built in a later phase.</p>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app
git commit -m "feat(ui): stub pages for remaining routes"
```

---

## Phase 8 — In-Process Events & SSE

### Task 8.1: Event bus

**Files:**
- Create: `src/lib/events.ts`, `src/lib/publish.ts`

- [ ] **Step 1: Create `src/lib/events.ts`**

```ts
import { EventEmitter } from 'node:events';

export type LeagueEventType =
  | 'scoreUpdate'
  | 'tradeProposed'
  | 'tradeAccepted'
  | 'tradeRejected'
  | 'freeAgency'
  | 'captainChange'
  | 'draftPick';

export type LeagueEvent = {
  type: LeagueEventType;
  leagueId: string;
  userIds?: string[]; // optional targeting
  payload: unknown;
};

declare global {
  var __leagueBus: EventEmitter | undefined;
}

export const leagueBus: EventEmitter =
  globalThis.__leagueBus ?? (globalThis.__leagueBus = new EventEmitter());
leagueBus.setMaxListeners(200);
```

- [ ] **Step 2: Create `src/lib/publish.ts`**

```ts
import { leagueBus, type LeagueEvent } from './events';
import { postDiscord } from './discord-webhook';

export async function publishLeagueEvent(
  event: LeagueEvent,
  opts: { discordMessage?: string; webhookUrl?: string | null } = {},
) {
  leagueBus.emit('event', event);
  if (opts.discordMessage && opts.webhookUrl) {
    try {
      await postDiscord(opts.webhookUrl, opts.discordMessage);
    } catch (err) {
      console.error('[publish] discord post failed', err);
    }
  }
}
```

- [ ] **Step 3: Create `src/lib/discord-webhook.ts`**

```ts
export async function postDiscord(webhookUrl: string, content: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`discord webhook ${res.status}`);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/events.ts src/lib/publish.ts src/lib/discord-webhook.ts
git commit -m "feat(events): in-process event bus + discord webhook helper"
```

---

### Task 8.2: SSE route handler

**Files:**
- Create: `src/app/api/stream/route.ts`

- [ ] **Step 1: Create the SSE route**

```ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { leagueBus, type LeagueEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse('unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const leagueSlug = searchParams.get('league');
  if (!leagueSlug) return new NextResponse('missing league', { status: 400 });

  const league = await db.league.findUnique({
    where: { slug: leagueSlug },
    include: { memberships: { where: { userId: session.user.id } } },
  });
  if (!league || league.memberships.length === 0) {
    return new NextResponse('forbidden', { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      send({ type: 'hello', leagueId: league.id });

      const onEvent = (ev: LeagueEvent) => {
        if (ev.leagueId !== league.id) return;
        if (ev.userIds && !ev.userIds.includes(session.user.id)) return;
        send(ev);
      };
      leagueBus.on('event', onEvent);

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 20_000);

      const abort = () => {
        clearInterval(heartbeat);
        leagueBus.off('event', onEvent);
        try { controller.close(); } catch {}
      };
      req.signal.addEventListener('abort', abort);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/stream/route.ts
git commit -m "feat(sse): auth-gated league event stream"
```

---

### Task 8.3: Client-side SSE hook

**Files:**
- Create: `src/components/useLeagueStream.ts`

- [ ] **Step 1: Create the hook**

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useLeagueStream(slug: string) {
  const router = useRouter();
  useEffect(() => {
    const es = new EventSource(`/api/stream?league=${encodeURIComponent(slug)}`);
    es.onmessage = (msg) => {
      try {
        const ev = JSON.parse(msg.data);
        if (ev.type === 'hello') return;
        // For v1, any event triggers a full RSC revalidation of the current page.
        router.refresh();
      } catch {}
    };
    es.onerror = () => {
      // EventSource auto-reconnects; just log.
      console.warn('[stream] error, reconnecting');
    };
    return () => es.close();
  }, [slug, router]);
}
```

- [ ] **Step 2: Wire it into the dashboard**

Create `src/components/dashboard/DashboardLiveClient.tsx`:

```tsx
'use client';
import { useLeagueStream } from '@/components/useLeagueStream';

export function DashboardLiveClient({ slug }: { slug: string }) {
  useLeagueStream(slug);
  return null;
}
```

And modify `src/app/leagues/[slug]/page.tsx` — add at the top of the imports:

```tsx
import { DashboardLiveClient } from '@/components/dashboard/DashboardLiveClient';
```

And inside the `<main>` block, add as the first child:

```tsx
<DashboardLiveClient slug={slug} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/useLeagueStream.ts src/components/dashboard/DashboardLiveClient.tsx src/app/leagues/[slug]/page.tsx
git commit -m "feat(sse): client hook + dashboard auto-refresh on events"
```

---

## Phase 9 — Scoring Worker

### Task 9.1: Worker core (idempotent match ingest)

**Files:**
- Create: `src/lib/worker/scoring-worker.ts`, `src/lib/worker/bootstrap.ts`

- [ ] **Step 1: Create `src/lib/worker/scoring-worker.ts`**

```ts
import { db } from '@/lib/db';
import { vlrapi } from '@/lib/vlrapi/client';
import { computeGamePoints } from '@/lib/scoring/rules';
import type { LeagueSettings } from '@/lib/scoring/types';
import { publishLeagueEvent } from '@/lib/publish';

const POLL_INTERVAL_MS = 60_000;
const LIVE_WINDOW_HOURS = 4;
const STALE_THRESHOLD_MS = 10 * 60_000;

type LeagueWithSettings = {
  id: string;
  slug: string;
  settingsJson: unknown;
  discordWebhookUrl: string | null;
};

let running = false;
let stopFlag = false;
let lastSuccessByLeague: Map<string, number> = new Map();

export async function tick(): Promise<void> {
  const leagues = await db.league.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, slug: true, settingsJson: true, discordWebhookUrl: true },
  });
  for (const league of leagues) {
    try {
      await processLeague(league);
      lastSuccessByLeague.set(league.id, Date.now());
    } catch (err) {
      console.error(`[worker] league ${league.slug} failed:`, err);
      await db.ingestError.create({
        data: {
          leagueId: league.id,
          context: 'tick',
          message: String(err instanceof Error ? err.message : err),
        },
      });
      const last = lastSuccessByLeague.get(league.id) ?? 0;
      if (Date.now() - last > STALE_THRESHOLD_MS && league.discordWebhookUrl) {
        await publishLeagueEvent(
          { type: 'scoreUpdate', leagueId: league.id, payload: { stalled: true } },
          {
            discordMessage: `⚠️ Scoring worker stalled for ${league.slug} — last success ${Math.round((Date.now() - last) / 60000)} min ago`,
            webhookUrl: league.discordWebhookUrl,
          },
        );
      }
    }
  }
}

async function processLeague(league: LeagueWithSettings): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - LIVE_WINDOW_HOURS * 3600_000);
  const windowEnd = new Date(now.getTime() + LIVE_WINDOW_HOURS * 3600_000);

  const candidates = await db.match.findMany({
    where: {
      leagueId: league.id,
      status: { in: ['UPCOMING', 'LIVE'] },
      scheduledAt: { gte: windowStart, lte: windowEnd },
    },
  });

  for (const match of candidates) {
    const detail = await vlrapi.getMatch(match.vlrMatchId);
    await ingestMatch(league, match.id, detail);
  }
}

async function ingestMatch(
  league: LeagueWithSettings,
  matchId: string,
  detail: Awaited<ReturnType<typeof vlrapi.getMatch>>,
): Promise<void> {
  const settings = league.settingsJson as unknown as LeagueSettings;

  // Map vlr team ids to local team ids
  const localTeams = await db.team.findMany({ where: { leagueId: league.id } });
  const teamByVlr = new Map(localTeams.map((t) => [t.vlrTeamId, t.id]));

  // Update match status
  await db.match.update({
    where: { id: matchId },
    data: {
      status: detail.status === 'completed' ? 'COMPLETED' : detail.status === 'live' ? 'LIVE' : 'UPCOMING',
      finalScore: detail.finalScore ?? null,
    },
  });

  for (const g of detail.games) {
    if (!g.completedAt) continue; // map still in progress → skip
    const winnerTeamId = g.winnerTeamId ? (teamByVlr.get(g.winnerTeamId) ?? null) : null;

    const existing = await db.game.findUnique({
      where: { matchId_mapNumber: { matchId, mapNumber: g.mapNumber } },
    });
    if (existing && existing.completedAt) continue; // already ingested

    const game = await db.game.upsert({
      where: { matchId_mapNumber: { matchId, mapNumber: g.mapNumber } },
      update: {
        team1Score: g.team1Score,
        team2Score: g.team2Score,
        winnerTeamId,
        completedAt: new Date(g.completedAt),
      },
      create: {
        matchId,
        mapNumber: g.mapNumber,
        mapName: g.mapName,
        team1Score: g.team1Score,
        team2Score: g.team2Score,
        winnerTeamId,
        completedAt: new Date(g.completedAt),
      },
    });

    const affectedUserIds = new Set<string>();
    for (const line of g.playerLines) {
      const player = await db.player.findUnique({
        where: { leagueId_vlrPlayerId: { leagueId: league.id, vlrPlayerId: line.playerId } },
      });
      if (!player) continue;
      const won = player.teamId === winnerTeamId;
      await db.playerGameStat.upsert({
        where: { gameId_playerId: { gameId: game.id, playerId: player.id } },
        update: { kills: line.kills, deaths: line.deaths, assists: line.assists, aces: line.aces, won },
        create: {
          gameId: game.id,
          playerId: player.id,
          kills: line.kills,
          deaths: line.deaths,
          assists: line.assists,
          aces: line.aces,
          won,
        },
      });
      const slot = await db.rosterSlot.findUnique({
        where: { leagueId_playerId: { leagueId: league.id, playerId: player.id } },
      });
      if (!slot) continue;
      const breakdown = computeGamePoints(
        { kills: line.kills, deaths: line.deaths, assists: line.assists, aces: line.aces, won },
        settings,
      );
      await db.scoringSnapshot.upsert({
        where: {
          leagueId_userId_playerId_gameId: {
            leagueId: league.id,
            userId: slot.userId,
            playerId: player.id,
            gameId: game.id,
          },
        },
        update: { total: breakdown.total, breakdownJson: breakdown as unknown as object },
        create: {
          leagueId: league.id,
          userId: slot.userId,
          playerId: player.id,
          gameId: game.id,
          total: breakdown.total,
          breakdownJson: breakdown as unknown as object,
        },
      });
      affectedUserIds.add(slot.userId);
    }

    await publishLeagueEvent(
      {
        type: 'scoreUpdate',
        leagueId: league.id,
        userIds: [...affectedUserIds],
        payload: { gameId: game.id, mapNumber: g.mapNumber, mapName: g.mapName },
      },
      {
        discordMessage: `🗺️ ${g.mapName} finished — ${g.team1Score}-${g.team2Score}`,
        webhookUrl: league.discordWebhookUrl,
      },
    );
  }
}

export function startWorker(): void {
  if (running) return;
  running = true;
  stopFlag = false;
  (async () => {
    while (!stopFlag) {
      try {
        await tick();
      } catch (err) {
        console.error('[worker] tick error', err);
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    running = false;
  })();
  console.log('[worker] scoring worker started');
}

export function stopWorker(): void {
  stopFlag = true;
}
```

- [ ] **Step 2: Create `src/lib/worker/bootstrap.ts`**

```ts
import { startWorker } from './scoring-worker';

declare global {
  var __workerStarted: boolean | undefined;
}

export function bootstrapWorker() {
  if (globalThis.__workerStarted) return;
  globalThis.__workerStarted = true;
  if (process.env.NODE_ENV !== 'test') {
    startWorker();
  }
}
```

- [ ] **Step 3: Start the worker at app boot**

Modify `src/app/layout.tsx` — add at the very top (before the imports):

```tsx
import { bootstrapWorker } from '@/lib/worker/bootstrap';
bootstrapWorker();
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/worker src/app/layout.tsx
git commit -m "feat(worker): in-process scoring worker with idempotent ingest"
```

---

## Phase 10 — Trade Flow

### Task 10.1: Trade Server Actions

**Files:**
- Create: `src/lib/actions/trade.ts`

- [ ] **Step 1: Create trade actions**

```ts
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
    where: { leagueId: league.id, playerId: { in: parsed.offeredPlayerIds }, userId: session.user.id },
  });
  if (offered.length !== parsed.offeredPlayerIds.length) throw new Error('you do not own all offered players');
  const requested = await db.rosterSlot.findMany({
    where: { leagueId: league.id, playerId: { in: parsed.requestedPlayerIds }, userId: parsed.receiverUserId },
  });
  if (requested.length !== parsed.requestedPlayerIds.length) throw new Error('receiver does not own all requested players');

  const trade = await db.trade.create({
    data: {
      leagueId: league.id,
      proposerId: session.user.id,
      receiverId: parsed.receiverUserId,
      status: 'PROPOSED',
      items: {
        create: [
          ...parsed.offeredPlayerIds.map((pid) => ({ playerId: pid, direction: 'PROPOSER_TO_RECEIVER' as const })),
          ...parsed.requestedPlayerIds.map((pid) => ({ playerId: pid, direction: 'RECEIVER_TO_PROPOSER' as const })),
        ],
      },
    },
    include: { proposer: true, receiver: true, items: { include: { player: true } } },
  });

  await publishLeagueEvent(
    { type: 'tradeProposed', leagueId: league.id, userIds: [session.user.id, parsed.receiverUserId], payload: { tradeId: trade.id } },
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
    include: { league: true, items: { include: { player: true } }, proposer: true, receiver: true },
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
      const ownerId = item.direction === 'PROPOSER_TO_RECEIVER' ? trade.proposerId : trade.receiverId;
      const slot = await tx.rosterSlot.findUnique({
        where: { leagueId_playerId: { leagueId: trade.leagueId, playerId: item.playerId } },
      });
      if (!slot || slot.userId !== ownerId) throw new Error(`ownership changed for ${item.player.handle}`);
    }
    // Move rosterSlot rows and clear captain flags
    for (const item of trade.items) {
      const newOwner = item.direction === 'PROPOSER_TO_RECEIVER' ? trade.receiverId : trade.proposerId;
      await tx.rosterSlot.update({
        where: { leagueId_playerId: { leagueId: trade.leagueId, playerId: item.playerId } },
        data: { userId: newOwner, isCaptain: false, acquiredVia: 'TRADE', acquiredAt: new Date() },
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/trade.ts
git commit -m "feat(trade): propose + accept/reject server actions"
```

---

### Task 10.2: Trade inbox UI

**Files:**
- Modify: `src/app/leagues/[slug]/trades/page.tsx`
- Create: `src/components/trade/TradeRow.tsx`

- [ ] **Step 1: Create `src/components/trade/TradeRow.tsx`**

```tsx
'use client';
import { Button } from '@/components/ui/button';
import { resolveTrade } from '@/lib/actions/trade';

type Item = { handle: string; direction: 'PROPOSER_TO_RECEIVER' | 'RECEIVER_TO_PROPOSER' };
type Props = {
  tradeId: string;
  proposerName: string;
  receiverName: string;
  items: Item[];
  role: 'proposer' | 'receiver';
  status: string;
};

export function TradeRow({ tradeId, proposerName, receiverName, items, role, status }: Props) {
  const offered = items.filter((i) => i.direction === 'PROPOSER_TO_RECEIVER').map((i) => i.handle).join(', ');
  const requested = items.filter((i) => i.direction === 'RECEIVER_TO_PROPOSER').map((i) => i.handle).join(', ');
  return (
    <div className="flex items-center justify-between rounded border border-slate-800 p-3">
      <div className="text-sm text-slate-200">
        <div>
          <strong>{proposerName}</strong> → <strong>{receiverName}</strong>
        </div>
        <div className="text-slate-400">
          {offered} for {requested}
        </div>
      </div>
      {role === 'receiver' && status === 'PROPOSED' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => resolveTrade({ tradeId, accept: true })}>
            Accept
          </Button>
          <Button size="sm" variant="outline" onClick={() => resolveTrade({ tradeId, accept: false })}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/app/leagues/[slug]/trades/page.tsx`**

```tsx
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { TradeRow } from '@/components/trade/TradeRow';

export default async function TradesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;
  const league = await db.league.findUnique({ where: { slug } });
  if (!league) return <p>League not found</p>;

  const trades = await db.trade.findMany({
    where: {
      leagueId: league.id,
      OR: [{ proposerId: session.user.id }, { receiverId: session.user.id }],
    },
    include: {
      proposer: true,
      receiver: true,
      items: { include: { player: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-100">Trades</h1>
      <div className="space-y-2">
        {trades.map((t) => (
          <TradeRow
            key={t.id}
            tradeId={t.id}
            proposerName={t.proposer.username}
            receiverName={t.receiver.username}
            items={t.items.map((i) => ({ handle: i.player.handle, direction: i.direction }))}
            role={t.receiverId === session.user.id ? 'receiver' : 'proposer'}
            status={t.status}
          />
        ))}
        {trades.length === 0 && <p className="text-slate-400">No trades yet.</p>}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/leagues/[slug]/trades src/components/trade
git commit -m "feat(trade): inbox UI with accept/reject"
```

---

## Phase 11 — Free Agency

### Task 11.1: Free agency Server Action

**Files:**
- Create: `src/lib/actions/free-agency.ts`

- [ ] **Step 1: Create the action**

```ts
'use server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { publishLeagueEvent } from '@/lib/publish';
import { startOfDayJamaica } from '@/lib/time';

const Input = z.object({
  leagueSlug: z.string(),
  droppedPlayerId: z.string(),
  pickedUpPlayerId: z.string(),
});

export async function dropAndPickup(input: z.infer<typeof Input>) {
  const parsed = Input.parse(input);
  const session = await auth();
  if (!session?.user?.id) throw new Error('unauthorized');

  const league = await db.league.findUnique({ where: { slug: parsed.leagueSlug } });
  if (!league || league.status !== 'ACTIVE') throw new Error('league not active');

  // Ownership of dropped player
  const droppedSlot = await db.rosterSlot.findUnique({
    where: { leagueId_playerId: { leagueId: league.id, playerId: parsed.droppedPlayerId } },
  });
  if (!droppedSlot || droppedSlot.userId !== session.user.id) throw new Error('not your player');

  // Target must be unowned
  const targetSlot = await db.rosterSlot.findUnique({
    where: { leagueId_playerId: { leagueId: league.id, playerId: parsed.pickedUpPlayerId } },
  });
  if (targetSlot) throw new Error('player already owned');

  // Mid-series check: dropped player's team must not have any LIVE match
  const droppedPlayer = await db.player.findUnique({ where: { id: parsed.droppedPlayerId } });
  if (!droppedPlayer) throw new Error('player missing');
  const liveForTeam = await db.match.findFirst({
    where: {
      leagueId: league.id,
      status: 'LIVE',
      OR: [{ team1Id: droppedPlayer.teamId }, { team2Id: droppedPlayer.teamId }],
    },
  });
  if (liveForTeam) throw new Error('cannot drop a player mid-series');

  // One pickup per manager per day (Jamaica TZ)
  const todayStart = startOfDayJamaica(new Date());
  const existingToday = await db.freeAgencyAction.count({
    where: { leagueId: league.id, userId: session.user.id, happenedAt: { gte: todayStart } },
  });
  if (existingToday >= 1) throw new Error('daily free agency limit reached');

  await db.$transaction(async (tx) => {
    await tx.rosterSlot.delete({
      where: { leagueId_playerId: { leagueId: league.id, playerId: parsed.droppedPlayerId } },
    });
    await tx.rosterSlot.create({
      data: {
        userId: session.user.id,
        leagueId: league.id,
        playerId: parsed.pickedUpPlayerId,
        acquiredVia: 'FREE_AGENCY',
        isCaptain: false,
      },
    });
    await tx.freeAgencyAction.create({
      data: {
        leagueId: league.id,
        userId: session.user.id,
        droppedPlayerId: parsed.droppedPlayerId,
        pickedUpPlayerId: parsed.pickedUpPlayerId,
      },
    });
  });

  await publishLeagueEvent(
    { type: 'freeAgency', leagueId: league.id, userIds: [session.user.id], payload: { dropped: parsed.droppedPlayerId, pickedUp: parsed.pickedUpPlayerId } },
    {
      discordMessage: `🔁 ${session.user.name ?? 'Manager'} dropped a player for a free agent`,
      webhookUrl: league.discordWebhookUrl,
    },
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/free-agency.ts
git commit -m "feat(fa): drop-and-pickup action with cooldown + mid-series check"
```

---

## Phase 12 — Captain Change

### Task 12.1: Captain Server Action

**Files:**
- Create: `src/lib/actions/captain.ts`

- [ ] **Step 1: Create the action**

```ts
'use server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { publishLeagueEvent } from '@/lib/publish';
import { isOlderThanDays } from '@/lib/time';
import type { LeagueSettings } from '@/lib/scoring/types';

const Input = z.object({ leagueSlug: z.string(), newCaptainPlayerId: z.string() });

export async function changeCaptain(input: z.infer<typeof Input>) {
  const parsed = Input.parse(input);
  const session = await auth();
  if (!session?.user?.id) throw new Error('unauthorized');

  const league = await db.league.findUnique({ where: { slug: parsed.leagueSlug } });
  if (!league) throw new Error('league not found');
  const settings = league.settingsJson as unknown as LeagueSettings;

  const newSlot = await db.rosterSlot.findUnique({
    where: { leagueId_playerId: { leagueId: league.id, playerId: parsed.newCaptainPlayerId } },
  });
  if (!newSlot || newSlot.userId !== session.user.id) throw new Error('not your player');

  // Cooldown: most recent change must be older than N days
  const lastChange = await db.captainChange.findFirst({
    where: { leagueId: league.id, userId: session.user.id },
    orderBy: { changedAt: 'desc' },
  });
  if (lastChange && !isOlderThanDays(lastChange.changedAt, settings.captainCooldownDays)) {
    throw new Error('captain cooldown not elapsed');
  }

  const oldCaptain = await db.rosterSlot.findFirst({
    where: { leagueId: league.id, userId: session.user.id, isCaptain: true },
  });

  await db.$transaction(async (tx) => {
    if (oldCaptain) {
      await tx.rosterSlot.update({ where: { id: oldCaptain.id }, data: { isCaptain: false } });
    }
    await tx.rosterSlot.update({ where: { id: newSlot.id }, data: { isCaptain: true } });
    await tx.captainChange.create({
      data: {
        userId: session.user.id,
        leagueId: league.id,
        oldPlayerId: oldCaptain?.playerId ?? null,
        newPlayerId: parsed.newCaptainPlayerId,
      },
    });
  });

  await publishLeagueEvent(
    { type: 'captainChange', leagueId: league.id, userIds: [session.user.id], payload: { newCaptainPlayerId: parsed.newCaptainPlayerId } },
    { webhookUrl: league.discordWebhookUrl },
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/captain.ts
git commit -m "feat(captain): change-captain action with 7-day cooldown"
```

---

## Phase 13 — Draft Tool

### Task 13.1: Draft actions

**Files:**
- Create: `src/lib/actions/draft.ts`

- [ ] **Step 1: Create draft actions**

```ts
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

  await db.$transaction(async (tx) => {
    await tx.draftPick.create({
      data: {
        draftId: draft.id,
        round,
        pickNumber,
        userId: session.user.id,
        playerId: parsed.playerId,
      },
    });
    await tx.rosterSlot.create({
      data: {
        userId: session.user.id,
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
    { type: 'draftPick', leagueId: league.id, payload: { round, pickNumber, userId: session.user.id, playerId: parsed.playerId } },
    { webhookUrl: league.discordWebhookUrl },
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/draft.ts
git commit -m "feat(draft): start + snake-pick server actions"
```

---

### Task 13.2: Draft room page

**Files:**
- Modify: `src/app/leagues/[slug]/draft/page.tsx`

- [ ] **Step 1: Replace stub**

```tsx
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { makePick } from '@/lib/actions/draft';
import { Button } from '@/components/ui/button';

export default async function DraftRoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const league = await db.league.findUnique({
    where: { slug },
    include: { draft: { include: { picks: { include: { player: true, user: true } } } }, players: { include: { team: true } } },
  });
  if (!league?.draft) return <p>No draft yet</p>;

  const order = league.draft.pickOrderJson as string[];
  const round = league.draft.currentRound;
  const idx = league.draft.currentPickIndex;
  const seat = round % 2 === 1 ? idx : order.length - 1 - idx;
  const currentUserId = order[seat];
  const isMyTurn = currentUserId === session.user.id;

  const takenIds = new Set(league.draft.picks.map((p) => p.playerId));
  const available = league.players.filter((p) => !takenIds.has(p.id));

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-100">Draft Room</h1>
      <div className="rounded border border-slate-800 p-3 text-sm">
        Round {round} · Pick {idx + 1} — {isMyTurn ? <strong className="text-green-400">You&apos;re on the clock</strong> : 'Waiting…'}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {available.map((p) => (
          <form key={p.id} action={async () => { 'use server'; await makePick({ leagueSlug: slug, playerId: p.id }); }}>
            <Button
              type="submit"
              disabled={!isMyTurn}
              className="w-full justify-start text-left"
              variant="outline"
            >
              <div>
                <div className="font-semibold">{p.handle}</div>
                <div className="text-xs text-slate-400">{p.team.shortCode}</div>
              </div>
            </Button>
          </form>
        ))}
      </div>
      <div>
        <h2 className="mb-2 text-lg font-semibold text-slate-100">Pick Log</h2>
        <ol className="space-y-1 text-sm text-slate-300">
          {league.draft.picks.map((p) => (
            <li key={p.id}>
              R{p.round}.{p.pickNumber} — {p.user.username} → {p.player.handle}
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/leagues/[slug]/draft
git commit -m "feat(draft): draft room page with live snake turn display"
```

---

## Phase 14 — Admin Console

### Task 14.1: Admin home + point adjustment

**Files:**
- Modify: `src/app/admin/page.tsx`, `src/app/admin/leagues/[slug]/page.tsx`
- Create: `src/lib/actions/admin.ts`

- [ ] **Step 1: Create `src/lib/actions/admin.ts`**

```ts
'use server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { publishLeagueEvent } from '@/lib/publish';
import { vlrapi } from '@/lib/vlrapi/client';

function assertCommissioner(session: Awaited<ReturnType<typeof auth>>) {
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
      createdByUserId: session!.user.id,
    },
  });
  await publishLeagueEvent(
    { type: 'scoreUpdate', leagueId: league.id, userIds: [parsed.userId], payload: { adjustment: parsed.delta } },
    { webhookUrl: league.discordWebhookUrl, discordMessage: `⚖️ Commissioner adjustment: ${parsed.delta > 0 ? '+' : ''}${parsed.delta} — ${parsed.reason}` },
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
  const detail = await vlrapi.getMatch(match.vlrMatchId);
  // Reuse worker ingest path by importing
  const { ingestMatchExternal } = await import('@/lib/worker/scoring-worker');
  await ingestMatchExternal(parsed.leagueSlug, match.id, detail);
}
```

> **Note:** `ingestMatchExternal` isn't yet exported from the worker. Add it as a simple re-export in Step 2.

- [ ] **Step 2: Export ingest helper from worker**

Append to `src/lib/worker/scoring-worker.ts`:

```ts
export async function ingestMatchExternal(leagueSlug: string, matchId: string, detail: Awaited<ReturnType<typeof vlrapi.getMatch>>) {
  const league = await db.league.findUnique({
    where: { slug: leagueSlug },
    select: { id: true, slug: true, settingsJson: true, discordWebhookUrl: true },
  });
  if (!league) throw new Error('league not found');
  await ingestMatch(league, matchId, detail);
}
```

- [ ] **Step 3: Replace `src/app/admin/page.tsx`**

```tsx
import { db } from '@/lib/db';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default async function AdminHomePage() {
  const leagues = await db.league.findMany({ orderBy: { startDate: 'desc' } });
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-100">Commissioner Console</h1>
      {leagues.map((l) => (
        <Link key={l.id} href={`/admin/leagues/${l.slug}`}>
          <Card className="p-4">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-100">{l.name}</span>
              <span className="text-sm text-slate-400">{l.status}</span>
            </div>
          </Card>
        </Link>
      ))}
    </main>
  );
}
```

- [ ] **Step 4: Replace `src/app/admin/leagues/[slug]/page.tsx`**

```tsx
import { db } from '@/lib/db';
import { adjustPoints } from '@/lib/actions/admin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default async function AdminLeaguePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const league = await db.league.findUnique({
    where: { slug },
    include: { memberships: { include: { user: true } } },
  });
  if (!league) return <p>Not found</p>;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-100">{league.name}</h1>
      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-100">Adjust Points</h2>
        <form
          action={async (fd: FormData) => {
            'use server';
            await adjustPoints({
              leagueSlug: slug,
              userId: String(fd.get('userId')),
              delta: Number(fd.get('delta')),
              reason: String(fd.get('reason')),
            });
          }}
          className="space-y-3"
        >
          <div>
            <Label>Manager</Label>
            <select name="userId" className="w-full rounded border bg-slate-900 p-2 text-slate-100">
              {league.memberships.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.username}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Delta (can be negative)</Label>
            <Input name="delta" type="number" step="0.1" required />
          </div>
          <div>
            <Label>Reason</Label>
            <Input name="reason" required />
          </div>
          <Button type="submit">Apply Adjustment</Button>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/admin.ts src/lib/worker/scoring-worker.ts src/app/admin
git commit -m "feat(admin): point adjustment, trade reversal, match refetch"
```

---

### Task 14.2: League creation wizard

**Files:**
- Modify: `src/app/admin/leagues/new/page.tsx`
- Extend: `src/lib/actions/admin.ts`

- [ ] **Step 1: Add `createLeague` to `src/lib/actions/admin.ts`**

```ts
const CreateLeagueInput = z.object({
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  name: z.string().min(3),
  vlrEventId: z.string().min(1),
  startDate: z.string(), // ISO
  discordWebhookUrl: z.string().url().optional().nullable(),
});

import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

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

  // Import teams + players
  const details = await vlrapi.getEventDetails(parsed.vlrEventId);
  for (const t of details.teams) {
    await db.team.create({
      data: {
        leagueId: league.id,
        vlrTeamId: t.id,
        name: t.name,
        shortCode: t.shortCode,
        logoUrl: t.logoUrl ?? null,
      },
    });
  }
  const teamMap = new Map(
    (await db.team.findMany({ where: { leagueId: league.id } })).map((t) => [t.vlrTeamId, t.id]),
  );
  for (const p of details.players) {
    const teamId = teamMap.get(p.teamId);
    if (!teamId) continue;
    await db.player.create({
      data: {
        leagueId: league.id,
        vlrPlayerId: p.id,
        teamId,
        handle: p.handle,
        country: p.country ?? null,
        role: p.role ?? null,
      },
    });
  }
  return { leagueId: league.id, slug: league.slug };
}
```

- [ ] **Step 2: Replace `src/app/admin/leagues/new/page.tsx`**

```tsx
import { createLeague } from '@/lib/actions/admin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { redirect } from 'next/navigation';

export default function NewLeaguePage() {
  async function action(fd: FormData) {
    'use server';
    const result = await createLeague({
      slug: String(fd.get('slug')),
      name: String(fd.get('name')),
      vlrEventId: String(fd.get('vlrEventId')),
      startDate: String(fd.get('startDate')),
      discordWebhookUrl: (fd.get('discordWebhookUrl') as string) || null,
    });
    redirect(`/admin/leagues/${result.slug}`);
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-100">New League</h1>
      <form action={action} className="space-y-3">
        <div><Label>Slug</Label><Input name="slug" required /></div>
        <div><Label>Name</Label><Input name="name" required /></div>
        <div><Label>vlr.gg Event ID</Label><Input name="vlrEventId" required /></div>
        <div><Label>Start Date (ISO)</Label><Input name="startDate" type="datetime-local" required /></div>
        <div><Label>Discord Webhook URL (optional)</Label><Input name="discordWebhookUrl" /></div>
        <Button type="submit">Create League</Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/admin.ts src/app/admin/leagues/new
git commit -m "feat(admin): league creation wizard with team/player import"
```

---

## Phase 15 — Integration Tests

### Task 15.1: Test DB setup

**Files:**
- Create: `docker-compose.test.yml`, `tests/integration/helpers.ts`

- [ ] **Step 1: Create `docker-compose.test.yml`**

```yaml
services:
  test-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: vct
      POSTGRES_PASSWORD: vct_test_pw
      POSTGRES_DB: vctfantasy_test
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vct -d vctfantasy_test"]
      interval: 3s
      timeout: 3s
      retries: 10
```

- [ ] **Step 2: Create `tests/integration/helpers.ts`**

```ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';

export const TEST_DB_URL =
  'postgresql://vct:vct_test_pw@localhost:5433/vctfantasy_test?schema=public';

export function newTestClient() {
  return new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
}

export function resetTestDb() {
  execSync(`DATABASE_URL="${TEST_DB_URL}" npx prisma migrate reset --force --skip-seed`, {
    stdio: 'inherit',
  });
}
```

- [ ] **Step 3: Add npm script**

In `package.json`:

```json
"test:int": "docker compose -f docker-compose.test.yml up -d && DATABASE_URL=postgresql://vct:vct_test_pw@localhost:5433/vctfantasy_test?schema=public vitest run tests/integration"
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.test.yml tests/integration/helpers.ts package.json
git commit -m "chore(test): integration test infra with isolated postgres"
```

---

### Task 15.2: Trade happy-path test

**Files:**
- Create: `tests/integration/trade.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { newTestClient, resetTestDb } from './helpers';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

// Mock auth to return a deterministic session.
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'U_LIAM', discordId: 'd-liam', role: 'USER' } })),
}));
vi.mock('@/lib/db', async () => {
  const { newTestClient } = await import('./helpers');
  return { db: newTestClient() };
});

import { proposeTrade, resolveTrade } from '@/lib/actions/trade';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

describe('trade flow', () => {
  beforeAll(() => resetTestDb());
  beforeEach(async () => {
    await db.$executeRawUnsafe('TRUNCATE "Trade","TradeItem","RosterSlot","ScoringAdjustment","LeagueMembership","Player","Team","League","User","TradeBonusCooldown" CASCADE');

    const liam = await db.user.create({ data: { id: 'U_LIAM', discordId: 'd-liam', username: 'Liam' } });
    const brian = await db.user.create({ data: { id: 'U_BRIAN', discordId: 'd-brian', username: 'Brian' } });
    const league = await db.league.create({
      data: {
        slug: 'test',
        name: 'Test',
        status: 'ACTIVE',
        startDate: new Date(),
        settingsJson: DEFAULT_LEAGUE_SETTINGS as unknown as object,
        memberships: { create: [{ userId: liam.id }, { userId: brian.id }] },
      },
    });
    const team = await db.team.create({
      data: { leagueId: league.id, vlrTeamId: 'T1', name: 'Test Team', shortCode: 'TT' },
    });
    const pA = await db.player.create({
      data: { leagueId: league.id, vlrPlayerId: 'pA', teamId: team.id, handle: 'playerA' },
    });
    const pB = await db.player.create({
      data: { leagueId: league.id, vlrPlayerId: 'pB', teamId: team.id, handle: 'playerB' },
    });
    await db.rosterSlot.create({
      data: { userId: liam.id, leagueId: league.id, playerId: pA.id, acquiredVia: 'DRAFT' },
    });
    await db.rosterSlot.create({
      data: { userId: brian.id, leagueId: league.id, playerId: pB.id, acquiredVia: 'DRAFT' },
    });
  });

  it('proposes and accepts a 1-for-1 trade, awarding bonuses', async () => {
    const pA = await db.player.findFirst({ where: { handle: 'playerA' } });
    const pB = await db.player.findFirst({ where: { handle: 'playerB' } });

    const { tradeId } = await proposeTrade({
      leagueSlug: 'test',
      receiverUserId: 'U_BRIAN',
      offeredPlayerIds: [pA!.id],
      requestedPlayerIds: [pB!.id],
    });

    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: { id: 'U_BRIAN', discordId: 'd-brian', role: 'USER' },
    });
    await resolveTrade({ tradeId, accept: true });

    const slotA = await db.rosterSlot.findUnique({
      where: { leagueId_playerId: { leagueId: (await db.league.findUnique({ where: { slug: 'test' } }))!.id, playerId: pA!.id } },
    });
    expect(slotA?.userId).toBe('U_BRIAN');
    const slotB = await db.rosterSlot.findUnique({
      where: { leagueId_playerId: { leagueId: (await db.league.findUnique({ where: { slug: 'test' } }))!.id, playerId: pB!.id } },
    });
    expect(slotB?.userId).toBe('U_LIAM');

    const adjustments = await db.scoringAdjustment.findMany();
    expect(adjustments.length).toBe(2);
    expect(adjustments.every((a) => a.delta === 5)).toBe(true);
  });

  it('rejects acceptance when a traded player is no longer owned', async () => {
    const pA = await db.player.findFirst({ where: { handle: 'playerA' } });
    const pB = await db.player.findFirst({ where: { handle: 'playerB' } });
    const { tradeId } = await proposeTrade({
      leagueSlug: 'test',
      receiverUserId: 'U_BRIAN',
      offeredPlayerIds: [pA!.id],
      requestedPlayerIds: [pB!.id],
    });
    // Simulate Liam losing playerA
    await db.rosterSlot.delete({
      where: { leagueId_playerId: { leagueId: (await db.league.findUnique({ where: { slug: 'test' } }))!.id, playerId: pA!.id } },
    });
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: { id: 'U_BRIAN', discordId: 'd-brian', role: 'USER' },
    });
    await expect(resolveTrade({ tradeId, accept: true })).rejects.toThrow(/ownership/i);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test:int -- tests/integration/trade.test.ts
```

Expected: both tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/trade.test.ts
git commit -m "test(trade): happy path + ownership-race integration tests"
```

---

### Task 15.3: Free agency cooldown test

**Files:**
- Create: `tests/integration/free-agency.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { newTestClient, resetTestDb } from './helpers';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'U_LIAM', discordId: 'd-liam', role: 'USER' } })),
}));
vi.mock('@/lib/db', async () => {
  const { newTestClient } = await import('./helpers');
  return { db: newTestClient() };
});

import { dropAndPickup } from '@/lib/actions/free-agency';
import { db } from '@/lib/db';

describe('free agency', () => {
  beforeAll(() => resetTestDb());
  beforeEach(async () => {
    await db.$executeRawUnsafe('TRUNCATE "RosterSlot","FreeAgencyAction","Match","Player","Team","LeagueMembership","League","User" CASCADE');
    await db.user.create({ data: { id: 'U_LIAM', discordId: 'd-liam', username: 'Liam' } });
    const league = await db.league.create({
      data: {
        slug: 'fa',
        name: 'FA',
        status: 'ACTIVE',
        startDate: new Date(),
        settingsJson: DEFAULT_LEAGUE_SETTINGS as unknown as object,
        memberships: { create: { userId: 'U_LIAM' } },
      },
    });
    const team = await db.team.create({ data: { leagueId: league.id, vlrTeamId: 'T', name: 'T', shortCode: 'T' } });
    const owned = await db.player.create({
      data: { leagueId: league.id, vlrPlayerId: 'o', teamId: team.id, handle: 'owned' },
    });
    await db.player.create({
      data: { leagueId: league.id, vlrPlayerId: 'f', teamId: team.id, handle: 'free' },
    });
    await db.player.create({
      data: { leagueId: league.id, vlrPlayerId: 'f2', teamId: team.id, handle: 'free2' },
    });
    await db.rosterSlot.create({
      data: { userId: 'U_LIAM', leagueId: league.id, playerId: owned.id, acquiredVia: 'DRAFT' },
    });
  });

  it('allows one pickup', async () => {
    const owned = await db.player.findFirst({ where: { handle: 'owned' } });
    const free = await db.player.findFirst({ where: { handle: 'free' } });
    await dropAndPickup({ leagueSlug: 'fa', droppedPlayerId: owned!.id, pickedUpPlayerId: free!.id });
    const slots = await db.rosterSlot.findMany({ where: { userId: 'U_LIAM' } });
    expect(slots.length).toBe(1);
    expect(slots[0].playerId).toBe(free!.id);
  });

  it('rejects a second pickup on the same day', async () => {
    const owned = await db.player.findFirst({ where: { handle: 'owned' } });
    const free = await db.player.findFirst({ where: { handle: 'free' } });
    const free2 = await db.player.findFirst({ where: { handle: 'free2' } });
    await dropAndPickup({ leagueSlug: 'fa', droppedPlayerId: owned!.id, pickedUpPlayerId: free!.id });
    await expect(
      dropAndPickup({ leagueSlug: 'fa', droppedPlayerId: free!.id, pickedUpPlayerId: free2!.id }),
    ).rejects.toThrow(/daily free agency/i);
  });
});
```

- [ ] **Step 2: Run**

```bash
npm run test:int -- tests/integration/free-agency.test.ts
```

Expected: 2 pass.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/free-agency.test.ts
git commit -m "test(fa): pickup + daily cooldown integration tests"
```

---

### Task 15.4: Captain cooldown test

**Files:**
- Create: `tests/integration/captain.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { newTestClient, resetTestDb } from './helpers';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'U_LIAM', discordId: 'd-liam', role: 'USER' } })),
}));
vi.mock('@/lib/db', async () => {
  const { newTestClient } = await import('./helpers');
  return { db: newTestClient() };
});

import { changeCaptain } from '@/lib/actions/captain';
import { db } from '@/lib/db';

describe('captain change', () => {
  beforeAll(() => resetTestDb());
  beforeEach(async () => {
    await db.$executeRawUnsafe('TRUNCATE "CaptainChange","RosterSlot","Player","Team","LeagueMembership","League","User" CASCADE');
    await db.user.create({ data: { id: 'U_LIAM', discordId: 'd-liam', username: 'Liam' } });
    const league = await db.league.create({
      data: {
        slug: 'cap',
        name: 'Cap',
        status: 'ACTIVE',
        startDate: new Date(),
        settingsJson: DEFAULT_LEAGUE_SETTINGS as unknown as object,
        memberships: { create: { userId: 'U_LIAM' } },
      },
    });
    const team = await db.team.create({ data: { leagueId: league.id, vlrTeamId: 'T', name: 'T', shortCode: 'T' } });
    const p1 = await db.player.create({
      data: { leagueId: league.id, vlrPlayerId: 'p1', teamId: team.id, handle: 'p1' },
    });
    const p2 = await db.player.create({
      data: { leagueId: league.id, vlrPlayerId: 'p2', teamId: team.id, handle: 'p2' },
    });
    await db.rosterSlot.create({
      data: { userId: 'U_LIAM', leagueId: league.id, playerId: p1.id, isCaptain: true, acquiredVia: 'DRAFT' },
    });
    await db.rosterSlot.create({
      data: { userId: 'U_LIAM', leagueId: league.id, playerId: p2.id, acquiredVia: 'DRAFT' },
    });
    await db.captainChange.create({
      data: { userId: 'U_LIAM', leagueId: league.id, newPlayerId: p1.id, changedAt: new Date(Date.now() - 8 * 86400_000) },
    });
  });

  it('allows change after 7 days', async () => {
    const p2 = await db.player.findFirst({ where: { handle: 'p2' } });
    await changeCaptain({ leagueSlug: 'cap', newCaptainPlayerId: p2!.id });
    const cap = await db.rosterSlot.findFirst({ where: { isCaptain: true } });
    expect(cap?.playerId).toBe(p2!.id);
  });

  it('rejects change inside cooldown', async () => {
    // Insert a recent change
    const p1 = await db.player.findFirst({ where: { handle: 'p1' } });
    await db.captainChange.create({
      data: { userId: 'U_LIAM', leagueId: (await db.league.findUnique({ where: { slug: 'cap' } }))!.id, newPlayerId: p1!.id },
    });
    const p2 = await db.player.findFirst({ where: { handle: 'p2' } });
    await expect(
      changeCaptain({ leagueSlug: 'cap', newCaptainPlayerId: p2!.id }),
    ).rejects.toThrow(/cooldown/i);
  });
});
```

- [ ] **Step 2: Run**

```bash
npm run test:int -- tests/integration/captain.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add tests/integration/captain.test.ts
git commit -m "test(captain): cooldown integration tests"
```

---

### Task 15.5: Draft pick advancement test

**Files:**
- Create: `tests/integration/draft.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { newTestClient, resetTestDb } from './helpers';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'U_A', discordId: 'a', role: 'COMMISSIONER' } })),
}));
vi.mock('@/lib/db', async () => {
  const { newTestClient } = await import('./helpers');
  return { db: newTestClient() };
});

import { startDraft, makePick } from '@/lib/actions/draft';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

describe('draft', () => {
  beforeAll(() => resetTestDb());
  beforeEach(async () => {
    await db.$executeRawUnsafe('TRUNCATE "DraftPick","Draft","RosterSlot","Player","Team","LeagueMembership","League","User" CASCADE');
    await db.user.create({ data: { id: 'U_A', discordId: 'a', username: 'A', role: 'COMMISSIONER' } });
    await db.user.create({ data: { id: 'U_B', discordId: 'b', username: 'B' } });
    const league = await db.league.create({
      data: {
        slug: 'dr',
        name: 'Dr',
        status: 'DRAFT_PENDING',
        startDate: new Date(),
        settingsJson: DEFAULT_LEAGUE_SETTINGS as unknown as object,
        memberships: { create: [{ userId: 'U_A' }, { userId: 'U_B' }] },
      },
    });
    const team = await db.team.create({ data: { leagueId: league.id, vlrTeamId: 'T', name: 'T', shortCode: 'T' } });
    for (let i = 0; i < 12; i++) {
      await db.player.create({
        data: { leagueId: league.id, vlrPlayerId: `p${i}`, teamId: team.id, handle: `p${i}` },
      });
    }
  });

  it('start → pick → snake advancement', async () => {
    await startDraft({ leagueSlug: 'dr' });
    const draft = await db.draft.findFirst();
    const order = draft!.pickOrderJson as string[];
    expect(order.length).toBe(2);

    // Pick as first user in order
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ user: { id: order[0], role: 'USER' } });
    const p0 = await db.player.findFirst({ where: { handle: 'p0' } });
    await makePick({ leagueSlug: 'dr', playerId: p0!.id });

    const draftAfter = await db.draft.findFirst();
    expect(draftAfter!.currentPickIndex).toBe(1);
    expect(draftAfter!.currentRound).toBe(1);
  });
});
```

- [ ] **Step 2: Run**

```bash
npm run test:int -- tests/integration/draft.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add tests/integration/draft.test.ts
git commit -m "test(draft): start + first-pick integration test"
```

---

## Phase 16 — Production Deployment

### Task 16.1: Production Dockerfile for the web app

**Files:**
- Create: `Dockerfile.web`, `.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**

```
node_modules
.next
.git
.env
.env.local
.superpowers
coverage
tests
docs
```

- [ ] **Step 2: Create `Dockerfile.web`**

```dockerfile
# Multi-stage ARM64-compatible build for Next.js + Prisma
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

- [ ] **Step 3: Enable standalone output in `next.config.ts`**

Replace `next.config.ts` with:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

- [ ] **Step 4: Commit**

```bash
git add Dockerfile.web .dockerignore next.config.ts
git commit -m "chore(deploy): production dockerfile + standalone output"
```

---

### Task 16.2: Production compose + backup sidecar

**Files:**
- Create: `docker-compose.prod.yml`, `scripts/pg-backup.sh`

- [ ] **Step 1: Create `scripts/pg-backup.sh`**

```bash
#!/bin/sh
set -eu
TS=$(date -u +%Y-%m-%dT%H-%M-%SZ)
OUT="/backups/vctfantasy-${TS}.sql.gz"
echo "[backup] dumping → $OUT"
pg_dump "$DATABASE_URL" | gzip > "$OUT"
# Keep only last 14 backups
ls -1t /backups/vctfantasy-*.sql.gz | tail -n +15 | xargs -r rm --
```

- [ ] **Step 2: Create `docker-compose.prod.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 10

  vlrapi:
    build:
      context: .
      dockerfile: Dockerfile.vlrapi
    restart: unless-stopped

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: ${DATABASE_URL}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      DISCORD_CLIENT_ID: ${DISCORD_CLIENT_ID}
      DISCORD_CLIENT_SECRET: ${DISCORD_CLIENT_SECRET}
      DISCORD_WEBHOOK_URL: ${DISCORD_WEBHOOK_URL}
      VLRAPI_BASE_URL: http://vlrapi:8000
      APP_TIMEZONE: America/Jamaica
    ports:
      - "3000:3000"

  backup:
    image: postgres:16-alpine
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: ${DATABASE_URL}
    volumes:
      - backups:/backups
      - ./scripts/pg-backup.sh:/usr/local/bin/pg-backup.sh:ro
    entrypoint: ["sh", "-c", "while true; do /usr/local/bin/pg-backup.sh; sleep 86400; done"]

volumes:
  db_data:
  backups:
```

- [ ] **Step 3: Make backup script executable**

```bash
chmod +x scripts/pg-backup.sh
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.prod.yml scripts/pg-backup.sh
git commit -m "chore(deploy): prod compose with backup sidecar"
```

---

## Self-Review Notes

**Spec coverage check:**
- Auth (Discord) → Phase 2 ✓
- Rules engine → Phase 3 ✓
- Jamaica TZ helpers → Phase 4 ✓
- vlrapi client → Phase 5 ✓
- Stage 1 bootstrap + validation → Phase 6 ✓
- Read-only leaderboard/roster/dashboard → Phase 7 ✓
- SSE + event bus → Phase 8 ✓
- Scoring worker → Phase 9 ✓
- Trade flow → Phase 10 ✓
- Free agency → Phase 11 ✓
- Captain change → Phase 12 ✓
- Draft tool → Phase 13 ✓
- Commissioner console (adjust, reverse, refetch, create league) → Phase 14 ✓
- Integration tests → Phase 15 ✓
- Production deployment → Phase 16 ✓
- Discord webhook feed → integrated via `publish.ts` used across flows ✓

**Known placeholder requiring user input before execution:**
- `scripts/seed-stage1.ts` has `REPLACE_*` placeholders for Discord IDs, vlrEventId, and rosters. These are real data, not plan failures. Liam fills them in before running. The script aborts on validation mismatch as its own safety net.

**Deferred / out of scope (matches spec):** per-round scoring, draft pick timer, mobile app, E2E browser tests, DM notifications, public leaderboard.

**Execution order:** phases are strictly sequential — each builds on the previous. A subagent running this plan can safely treat "next task" as "next task in the document".
