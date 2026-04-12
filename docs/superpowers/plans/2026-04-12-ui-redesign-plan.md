# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the VCT Fantasy League from unstyled stubs into a polished, VCT-branded webapp with persistent navigation, match-first dashboard, and full interactive pages.

**Architecture:** Frontend-only changes. All Server Actions and DB queries exist. New server queries are added where needed (upcoming matches, activity feed, player detail). The app shell wraps all league pages in a navbar + sidebar layout. A reusable drawer pattern (shadcn Dialog/Sheet) handles player and match detail views.

**Tech Stack:** Next.js 16 App Router, React Server Components, Server Actions, Tailwind CSS (v4, CSS-variable theming), shadcn/ui, existing Prisma queries.

**Reference spec:** `docs/superpowers/specs/2026-04-12-ui-redesign-design.md`

---

## File Structure

```
src/
├── app/
│   ├── globals.css                          (MODIFY — VCT dark theme vars)
│   ├── layout.tsx                           (MODIFY — metadata, dark class)
│   ├── page.tsx                             (existing — login splash)
│   ├── leagues/
│   │   ├── page.tsx                         (existing — league list)
│   │   └── [slug]/
│   │       ├── layout.tsx                   (CREATE — AppShell wrapper)
│   │       ├── page.tsx                     (MODIFY — enhanced dashboard)
│   │       ├── leaderboard/page.tsx         (MODIFY — expandable rows)
│   │       ├── roster/page.tsx              (MODIFY — player cards + actions)
│   │       ├── rosters/[userId]/page.tsx    (MODIFY — read-only cards)
│   │       ├── players/page.tsx             (REPLACE stub)
│   │       ├── matches/page.tsx             (REPLACE stub)
│   │       ├── matches/[id]/page.tsx        (REPLACE stub)
│   │       ├── trades/page.tsx              (MODIFY — tabs + propose)
│   │       ├── draft/page.tsx               (existing — minor polish)
│   │       └── history/page.tsx             (REPLACE stub)
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx                       (CREATE)
│   │   ├── Sidebar.tsx                      (CREATE)
│   │   └── AppShell.tsx                     (CREATE)
│   ├── shared/
│   │   ├── PlayerDrawer.tsx                 (CREATE)
│   │   ├── MatchDrawer.tsx                  (CREATE)
│   │   ├── MatchCard.tsx                    (CREATE)
│   │   ├── PlayerCard.tsx                   (CREATE)
│   │   ├── PointsDelta.tsx                  (CREATE)
│   │   └── RankArrow.tsx                    (CREATE)
│   ├── dashboard/                           (existing, MODIFY)
│   │   ├── LiveMatchHero.tsx
│   │   ├── MyPlayersInMatch.tsx
│   │   ├── CompressedStandings.tsx
│   │   ├── DashboardLiveClient.tsx
│   │   ├── RecentResults.tsx                (CREATE)
│   │   ├── UpcomingMatches.tsx              (CREATE)
│   │   └── ActivityFeed.tsx                 (CREATE)
│   ├── roster/
│   │   ├── FreeAgencyModal.tsx              (CREATE)
│   │   └── TradeProposalFlow.tsx            (CREATE)
│   └── trade/
│       └── TradeRow.tsx                     (existing, MODIFY)
├── server/
│   └── queries/
│       ├── dashboard.ts                     (MODIFY — add upcoming, recent, feed)
│       ├── matches.ts                       (CREATE)
│       ├── players.ts                       (CREATE)
│       ├── history.ts                       (CREATE)
│       └── player-detail.ts                 (CREATE)
```

---

## Phase 1 — Theme + Root Layout

### Task 1: VCT Dark Theme

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update CSS variables for VCT dark theme**

Replace the `:root` and `.dark` blocks in `src/app/globals.css` with VCT-branded colors. Keep the `@import` lines and `@theme inline` block untouched. Replace only the `:root { ... }` and `.dark { ... }` blocks:

`:root` becomes the dark theme by default (no toggle needed):

```css
:root {
  --background: #0f1419;
  --foreground: #f5f7fa;
  --card: #1a1f2b;
  --card-foreground: #f5f7fa;
  --popover: #1a1f2b;
  --popover-foreground: #f5f7fa;
  --primary: #ff4655;
  --primary-foreground: #ffffff;
  --secondary: #232838;
  --secondary-foreground: #f5f7fa;
  --muted: #232838;
  --muted-foreground: #9aa3b2;
  --accent: #ff4655;
  --accent-foreground: #ffffff;
  --destructive: #ef4444;
  --border: #2a2f3a;
  --input: #2a2f3a;
  --ring: #ff4655;
  --chart-1: #ff4655;
  --chart-2: #4ade80;
  --chart-3: #fbbf24;
  --chart-4: #60a5fa;
  --chart-5: #a78bfa;
  --radius: 0.5rem;
  --sidebar: #141822;
  --sidebar-foreground: #f5f7fa;
  --sidebar-primary: #ff4655;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #1a1f2b;
  --sidebar-accent-foreground: #f5f7fa;
  --sidebar-border: #2a2f3a;
  --sidebar-ring: #ff4655;
}
```

Remove the `.dark { ... }` block entirely (dark is the only theme).

- [ ] **Step 2: Update root layout metadata and body classes**

Modify `src/app/layout.tsx`:
- Change `title` to `"VCT Fantasy"`
- Change `description` to `"Private VCT Valorant Champions Tour fantasy league"`
- Add `className="bg-[#0f1419]"` to the `<body>` tag

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat(ui): VCT dark theme with red accent variables"
```

---

## Phase 2 — App Shell (Navbar + Sidebar)

### Task 2: Navbar component

**Files:**
- Create: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: Create the Navbar**

```tsx
import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type Props = {
  leagueName: string;
  leagueStatus: string;
  leagueSlug: string;
  isCommissioner: boolean;
};

export async function Navbar({ leagueName, leagueStatus, leagueSlug, isCommissioner }: Props) {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-[--border] bg-[#0a0e14]/95 px-4 backdrop-blur-sm">
      <Link href="/leagues" className="flex items-center gap-2">
        <span className="text-lg font-bold tracking-tight text-white">
          VCT<span className="text-[--primary]"> Fantasy</span>
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <span className="hidden text-sm font-medium text-[--foreground] sm:inline">{leagueName}</span>
        <Badge variant="outline" className="border-[--primary] text-[--primary] text-xs">
          {leagueStatus}
        </Badge>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? ''} />
              <AvatarFallback className="bg-[--secondary] text-xs">
                {session.user.name?.charAt(0).toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href="/leagues">Switch League</Link>
          </DropdownMenuItem>
          {isCommissioner && (
            <DropdownMenuItem asChild>
              <Link href={`/admin/leagues/${leagueSlug}`}>Admin</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <form action={async () => { 'use server'; await signOut({ redirectTo: '/' }); }}>
              <button type="submit" className="w-full text-left">Sign Out</button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "feat(ui): VCT-branded navbar component"
```

---

### Task 3: Sidebar component

**Files:**
- Create: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create the Sidebar**

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '', label: 'Dashboard', icon: '⌂' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { href: '/roster', label: 'My Roster', icon: '👥' },
  { href: '/players', label: 'Players', icon: '🔍' },
  { href: '/matches', label: 'Matches', icon: '📅' },
  { href: '/trades', label: 'Trades', icon: '⇄' },
  { href: '/history', label: 'History', icon: '⏱' },
] as const;

type Props = {
  leagueSlug: string;
  isCommissioner: boolean;
  pendingTradesCount: number;
  hasLiveMatch: boolean;
};

export function Sidebar({ leagueSlug, isCommissioner, pendingTradesCount, hasLiveMatch }: Props) {
  const pathname = usePathname();
  const base = `/leagues/${leagueSlug}`;

  return (
    <aside className="fixed left-0 top-14 hidden h-[calc(100vh-3.5rem)] w-60 border-r border-[--border] bg-[--sidebar] lg:block">
      <nav className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const fullHref = `${base}${item.href}`;
          const isActive = item.href === ''
            ? pathname === base
            : pathname.startsWith(fullHref);

          return (
            <Link
              key={item.label}
              href={fullHref}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[--primary]/10 text-[--primary]'
                  : 'text-[--muted-foreground] hover:bg-[--sidebar-accent] hover:text-[--foreground]'
              }`}
            >
              <span className="w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
              {item.label === 'Trades' && pendingTradesCount > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[--primary] text-[10px] font-bold text-white">
                  {pendingTradesCount}
                </span>
              )}
              {item.label === 'Dashboard' && hasLiveMatch && (
                <span className="ml-auto h-2 w-2 rounded-full bg-[--chart-2] animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>
      {isCommissioner && (
        <div className="absolute bottom-0 w-full border-t border-[--border] p-3">
          <Link
            href={`/admin/leagues/${leagueSlug}`}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[--muted-foreground] hover:bg-[--sidebar-accent] hover:text-[--foreground]"
          >
            <span className="w-5 text-center">⚙</span>
            <span>Admin</span>
          </Link>
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(ui): sidebar navigation with active state + badges"
```

---

### Task 4: AppShell layout + league layout.tsx

**Files:**
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/app/leagues/[slug]/layout.tsx`

- [ ] **Step 1: Create AppShell wrapper**

```tsx
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

type Props = {
  children: React.ReactNode;
  leagueName: string;
  leagueStatus: string;
  leagueSlug: string;
  isCommissioner: boolean;
  pendingTradesCount: number;
  hasLiveMatch: boolean;
};

export function AppShell({
  children,
  leagueName,
  leagueStatus,
  leagueSlug,
  isCommissioner,
  pendingTradesCount,
  hasLiveMatch,
}: Props) {
  return (
    <>
      {/* @ts-expect-error Async Server Component */}
      <Navbar
        leagueName={leagueName}
        leagueStatus={leagueStatus}
        leagueSlug={leagueSlug}
        isCommissioner={isCommissioner}
      />
      <Sidebar
        leagueSlug={leagueSlug}
        isCommissioner={isCommissioner}
        pendingTradesCount={pendingTradesCount}
        hasLiveMatch={hasLiveMatch}
      />
      <main className="pt-14 lg:pl-60">
        <div className="mx-auto max-w-5xl p-6">{children}</div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Create the league-scoped layout**

Create `src/app/leagues/[slug]/layout.tsx`:

```tsx
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardLiveClient } from '@/components/dashboard/DashboardLiveClient';

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const league = await db.league.findUnique({
    where: { slug },
    include: {
      matches: { where: { status: 'LIVE' }, select: { id: true }, take: 1 },
    },
  });
  if (!league) return <p>League not found</p>;

  const pendingTrades = await db.trade.count({
    where: {
      leagueId: league.id,
      receiverId: session.user.id,
      status: 'PROPOSED',
    },
  });

  return (
    <AppShell
      leagueName={league.name}
      leagueStatus={league.status}
      leagueSlug={slug}
      isCommissioner={session.user.role === 'COMMISSIONER'}
      pendingTradesCount={pendingTrades}
      hasLiveMatch={league.matches.length > 0}
    >
      <DashboardLiveClient slug={slug} />
      {children}
    </AppShell>
  );
}
```

- [ ] **Step 3: Remove `<DashboardLiveClient>` from dashboard page**

Edit `src/app/leagues/[slug]/page.tsx` — remove the `<DashboardLiveClient slug={slug} />` line and its import (now in layout).

- [ ] **Step 4: Remove `<main>` wrappers from all league child pages**

Every page under `[slug]/` currently wraps content in `<main className="mx-auto max-w-2xl ...">`. Since the layout now provides `<main>` via AppShell, each page should just return its content directly (a `<div>` or fragment), not a `<main>`. Update:
- `src/app/leagues/[slug]/page.tsx` — replace `<main className="mx-auto max-w-2xl space-y-4 p-6">` with `<div className="space-y-4">`
- `src/app/leagues/[slug]/leaderboard/page.tsx` — same
- `src/app/leagues/[slug]/roster/page.tsx` — same
- `src/app/leagues/[slug]/rosters/[userId]/page.tsx` — same
- `src/app/leagues/[slug]/trades/page.tsx` — same
- `src/app/leagues/[slug]/draft/page.tsx` — same
- All stub pages (`players`, `matches`, `matches/[id]`, `history`) — same

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/layout src/app/leagues/[slug]
git commit -m "feat(ui): app shell with navbar + sidebar for all league pages"
```

---

## Phase 3 — New Server Queries

### Task 5: Matches, players, history, player-detail queries

**Files:**
- Create: `src/server/queries/matches.ts`
- Create: `src/server/queries/players.ts`
- Create: `src/server/queries/history.ts`
- Create: `src/server/queries/player-detail.ts`
- Modify: `src/server/queries/dashboard.ts`

- [ ] **Step 1: Create matches query**

```ts
// src/server/queries/matches.ts
import { db } from '@/lib/db';

export async function getMatchesByStatus(leagueSlug: string, status: 'UPCOMING' | 'LIVE' | 'COMPLETED') {
  const league = await db.league.findUnique({ where: { slug: leagueSlug } });
  if (!league) return [];
  return db.match.findMany({
    where: { leagueId: league.id, status },
    include: { team1: true, team2: true, games: { orderBy: { mapNumber: 'asc' } } },
    orderBy: { scheduledAt: status === 'COMPLETED' ? 'desc' : 'asc' },
  });
}

export async function getMatchDetail(matchId: string) {
  return db.match.findUnique({
    where: { id: matchId },
    include: {
      team1: true,
      team2: true,
      games: {
        orderBy: { mapNumber: 'asc' },
        include: {
          stats: { include: { player: { include: { team: true } } } },
          snapshots: true,
        },
      },
    },
  });
}
```

- [ ] **Step 2: Create players query**

```ts
// src/server/queries/players.ts
import { db } from '@/lib/db';

export type PlayerPoolRow = {
  id: string;
  handle: string;
  teamName: string;
  teamShortCode: string;
  ownerUsername: string | null;
  ownerUserId: string | null;
  totalPoints: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  mapsPlayed: number;
};

export async function getPlayerPool(leagueSlug: string): Promise<PlayerPoolRow[]> {
  const league = await db.league.findUnique({ where: { slug: leagueSlug } });
  if (!league) return [];

  const players = await db.player.findMany({
    where: { leagueId: league.id },
    include: {
      team: true,
      rosterSlots: { include: { user: true } },
      stats: true,
      snapshots: true,
    },
  });

  return players.map((p) => {
    const slot = p.rosterSlots[0] ?? null;
    const totalPoints = p.snapshots.reduce((sum, s) => sum + s.total, 0);
    const totalKills = p.stats.reduce((sum, s) => sum + s.kills, 0);
    const totalDeaths = p.stats.reduce((sum, s) => sum + s.deaths, 0);
    const totalAssists = p.stats.reduce((sum, s) => sum + s.assists, 0);
    return {
      id: p.id,
      handle: p.handle,
      teamName: p.team.name,
      teamShortCode: p.team.shortCode,
      ownerUsername: slot?.user.username ?? null,
      ownerUserId: slot?.userId ?? null,
      totalPoints: Math.round(totalPoints * 10) / 10,
      totalKills,
      totalDeaths,
      totalAssists,
      mapsPlayed: p.stats.length,
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);
}
```

- [ ] **Step 3: Create history query**

```ts
// src/server/queries/history.ts
import { db } from '@/lib/db';

export type HistoryEvent = {
  id: string;
  type: 'trade' | 'free_agency' | 'captain_change';
  description: string;
  timestamp: Date;
  managers: string[];
};

export async function getLeagueHistory(leagueSlug: string): Promise<HistoryEvent[]> {
  const league = await db.league.findUnique({ where: { slug: leagueSlug } });
  if (!league) return [];

  const [trades, faActions, captainChanges] = await Promise.all([
    db.trade.findMany({
      where: { leagueId: league.id, status: { in: ['ACCEPTED', 'REJECTED', 'REVERSED'] } },
      include: { proposer: true, receiver: true, items: { include: { player: true } } },
      orderBy: { resolvedAt: 'desc' },
    }),
    db.freeAgencyAction.findMany({
      where: { leagueId: league.id },
      include: { user: true, droppedPlayer: true, pickedUpPlayer: true },
      orderBy: { happenedAt: 'desc' },
    }),
    db.captainChange.findMany({
      where: { leagueId: league.id },
      include: { user: true, newPlayer: true, oldPlayer: true },
      orderBy: { changedAt: 'desc' },
    }),
  ]);

  const events: HistoryEvent[] = [];

  for (const t of trades) {
    const offered = t.items.filter((i) => i.direction === 'PROPOSER_TO_RECEIVER').map((i) => i.player.handle);
    const requested = t.items.filter((i) => i.direction === 'RECEIVER_TO_PROPOSER').map((i) => i.player.handle);
    events.push({
      id: `trade-${t.id}`,
      type: 'trade',
      description: `${t.proposer.username} traded ${offered.join(', ')} to ${t.receiver.username} for ${requested.join(', ')} (${t.status.toLowerCase()})`,
      timestamp: t.resolvedAt ?? t.createdAt,
      managers: [t.proposer.username, t.receiver.username],
    });
  }

  for (const fa of faActions) {
    events.push({
      id: `fa-${fa.id}`,
      type: 'free_agency',
      description: `${fa.user.username} dropped ${fa.droppedPlayer.handle} for ${fa.pickedUpPlayer.handle}`,
      timestamp: fa.happenedAt,
      managers: [fa.user.username],
    });
  }

  for (const cc of captainChanges) {
    events.push({
      id: `cc-${cc.id}`,
      type: 'captain_change',
      description: `${cc.user.username} set ${cc.newPlayer.handle} as captain${cc.oldPlayer ? ` (was ${cc.oldPlayer.handle})` : ''}`,
      timestamp: cc.changedAt,
      managers: [cc.user.username],
    });
  }

  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return events;
}
```

- [ ] **Step 4: Create player-detail query**

```ts
// src/server/queries/player-detail.ts
import { db } from '@/lib/db';

export async function getPlayerDetail(playerId: string) {
  const player = await db.player.findUnique({
    where: { id: playerId },
    include: {
      team: true,
      rosterSlots: { include: { user: true } },
      stats: {
        include: {
          game: {
            include: { match: { include: { team1: true, team2: true } } },
          },
        },
        orderBy: { game: { completedAt: 'desc' } },
      },
      snapshots: {
        include: { game: true },
        orderBy: { game: { completedAt: 'desc' } },
      },
    },
  });
  return player;
}
```

- [ ] **Step 5: Extend dashboard query with upcoming, recent, and feed data**

Add to `src/server/queries/dashboard.ts` — append these new exports (keep existing `getDashboard`):

```ts
export async function getUpcomingMatches(leagueSlug: string, limit: number = 5) {
  const league = await db.league.findUnique({ where: { slug: leagueSlug } });
  if (!league) return [];
  return db.match.findMany({
    where: { leagueId: league.id, status: 'UPCOMING' },
    include: { team1: true, team2: true },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
  });
}

export async function getRecentMatches(leagueSlug: string, limit: number = 3) {
  const league = await db.league.findUnique({ where: { slug: leagueSlug } });
  if (!league) return [];
  return db.match.findMany({
    where: { leagueId: league.id, status: 'COMPLETED' },
    include: { team1: true, team2: true },
    orderBy: { scheduledAt: 'desc' },
    take: limit,
  });
}
```

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/server/queries
git commit -m "feat(queries): matches, players, history, player-detail queries"
```

---

## Phase 4 — Shared Components

### Task 6: PointsDelta, RankArrow, MatchCard, PlayerCard

**Files:**
- Create: `src/components/shared/PointsDelta.tsx`
- Create: `src/components/shared/RankArrow.tsx`
- Create: `src/components/shared/MatchCard.tsx`
- Create: `src/components/shared/PlayerCard.tsx`

- [ ] **Step 1: Create PointsDelta**

```tsx
// src/components/shared/PointsDelta.tsx
export function PointsDelta({ value }: { value: number }) {
  const color = value > 0 ? 'text-[--chart-2]' : value < 0 ? 'text-[--primary]' : 'text-[--muted-foreground]';
  const prefix = value > 0 ? '+' : '';
  return <span className={`font-mono text-sm font-semibold ${color}`}>{prefix}{value.toFixed(1)}</span>;
}
```

- [ ] **Step 2: Create RankArrow**

```tsx
// src/components/shared/RankArrow.tsx
export function RankArrow({ change }: { change: number }) {
  if (change > 0) return <span className="text-[--chart-2] text-xs">▲{change}</span>;
  if (change < 0) return <span className="text-[--primary] text-xs">▼{Math.abs(change)}</span>;
  return <span className="text-[--muted-foreground] text-xs">—</span>;
}
```

- [ ] **Step 3: Create MatchCard**

```tsx
// src/components/shared/MatchCard.tsx
import { Badge } from '@/components/ui/badge';

type Props = {
  team1Name: string;
  team2Name: string;
  team1Score?: string;
  team2Score?: string;
  status: string;
  date?: string;
  time?: string;
  series?: string;
  fantasyDelta?: number;
  myPlayerHandles?: string[];
  onClick?: () => void;
};

export function MatchCard({
  team1Name, team2Name, team1Score, team2Score,
  status, date, time, series, fantasyDelta, myPlayerHandles, onClick,
}: Props) {
  const isCompleted = status === 'COMPLETED';
  const isLive = status === 'LIVE';

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border border-[--border] bg-[--card] p-4 transition-colors hover:border-[--primary]/30 ${
        isLive ? 'border-l-2 border-l-[--primary]' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-[--foreground]">
            {team1Name}
          </div>
          {isCompleted || isLive ? (
            <span className="font-mono text-lg font-bold text-[--foreground]">
              {team1Score} — {team2Score}
            </span>
          ) : (
            <span className="text-sm text-[--muted-foreground]">vs</span>
          )}
          <div className="text-sm font-semibold text-[--foreground]">
            {team2Name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLive && <Badge className="bg-[--primary] text-white animate-pulse text-xs">LIVE</Badge>}
          {fantasyDelta !== undefined && fantasyDelta !== 0 && (
            <span className={`font-mono text-sm font-bold ${fantasyDelta > 0 ? 'text-[--chart-2]' : 'text-[--primary]'}`}>
              {fantasyDelta > 0 ? '+' : ''}{fantasyDelta.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-[--muted-foreground]">
        {series && <span>{series}</span>}
        {time && <span>{time}</span>}
      </div>
      {myPlayerHandles && myPlayerHandles.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {myPlayerHandles.map((h) => (
            <Badge key={h} variant="outline" className="text-[10px] border-[--primary]/30 text-[--primary]">
              {h}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create PlayerCard**

```tsx
// src/components/shared/PlayerCard.tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Props = {
  handle: string;
  teamName: string;
  totalPoints: number;
  isCaptain: boolean;
  acquiredVia: string;
  onDrop?: () => void;
  onTrade?: () => void;
  onCaptainToggle?: () => void;
  captainCooldownActive?: boolean;
  readOnly?: boolean;
};

export function PlayerCard({
  handle, teamName, totalPoints, isCaptain, acquiredVia,
  onDrop, onTrade, onCaptainToggle, captainCooldownActive, readOnly,
}: Props) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[--border] bg-[--card] p-4 transition-colors hover:border-[--primary]/20">
      <div className="flex items-center gap-3">
        <button
          onClick={onCaptainToggle}
          disabled={readOnly || captainCooldownActive}
          className={`text-xl transition-colors ${
            isCaptain ? 'text-[--primary]' : 'text-[--muted-foreground] hover:text-[--primary]/50'
          } ${captainCooldownActive ? 'opacity-30 cursor-not-allowed' : ''}`}
          title={
            isCaptain ? 'Captain (1.5x)' :
            captainCooldownActive ? 'Captain cooldown active' :
            'Make captain'
          }
        >
          ★
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[--foreground]">{handle}</span>
            {isCaptain && (
              <Badge className="bg-[--primary]/20 text-[--primary] text-[10px]">1.5x</Badge>
            )}
          </div>
          <div className="text-xs text-[--muted-foreground]">{teamName}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-lg font-bold font-mono text-[--foreground]">{totalPoints.toFixed(1)}</div>
          <div className="text-[10px] text-[--muted-foreground] uppercase">{acquiredVia}</div>
        </div>
        {!readOnly && (
          <div className="flex flex-col gap-1">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onDrop}>Drop</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onTrade}>Trade</Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/shared
git commit -m "feat(ui): shared components — PointsDelta, RankArrow, MatchCard, PlayerCard"
```

---

### Task 7: PlayerDrawer and MatchDrawer

**Files:**
- Create: `src/components/shared/PlayerDrawer.tsx`
- Create: `src/components/shared/MatchDrawer.tsx`

- [ ] **Step 1: Install shadcn sheet component**

```bash
npx shadcn@latest add sheet
```

- [ ] **Step 2: Create PlayerDrawer**

```tsx
// src/components/shared/PlayerDrawer.tsx
'use client';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type PlayerData = {
  handle: string;
  teamName: string;
  ownerUsername: string | null;
  totalPoints: number;
  games: Array<{
    mapName: string;
    kills: number;
    deaths: number;
    assists: number;
    fantasyPts: number;
    date: string;
    won: boolean;
  }>;
};

type Props = {
  playerId: string | null;
  open: boolean;
  onClose: () => void;
};

export function PlayerDrawer({ playerId, open, onClose }: Props) {
  const [data, setData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!playerId || !open) { setData(null); return; }
    setLoading(true);
    fetch(`/api/players/${playerId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [playerId, open]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[480px] bg-[--card] border-[--border] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-[--muted-foreground]">Loading...</div>
        ) : data ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-[--foreground]">{data.handle}</SheetTitle>
              <div className="flex items-center gap-2 text-sm text-[--muted-foreground]">
                <span>{data.teamName}</span>
                <Badge variant="outline" className={data.ownerUsername ? '' : 'border-[--chart-2] text-[--chart-2]'}>
                  {data.ownerUsername ?? 'Free Agent'}
                </Badge>
              </div>
            </SheetHeader>
            <div className="mt-4">
              <div className="text-3xl font-bold font-mono text-[--foreground]">{data.totalPoints.toFixed(1)}</div>
              <div className="text-xs text-[--muted-foreground] uppercase">Total Fantasy Points</div>
            </div>
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-[--foreground] mb-2">Game Log</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Map</TableHead>
                    <TableHead>K</TableHead>
                    <TableHead>D</TableHead>
                    <TableHead>A</TableHead>
                    <TableHead className="text-right">Pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.games.map((g, i) => (
                    <TableRow key={i} className={g.won ? 'bg-[--chart-2]/5' : ''}>
                      <TableCell className="text-xs">{g.mapName}</TableCell>
                      <TableCell>{g.kills}</TableCell>
                      <TableCell>{g.deaths}</TableCell>
                      <TableCell>{g.assists}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {g.fantasyPts.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="text-[--muted-foreground]">Player not found</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 3: Create MatchDrawer**

```tsx
// src/components/shared/MatchDrawer.tsx
'use client';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type MapData = {
  mapName: string;
  team1Score: number;
  team2Score: number;
  players: Array<{
    name: string;
    team: string;
    kills: number;
    deaths: number;
    assists: number;
    acs: number;
    rating: number;
    fantasyPts: number;
    ownerUsername: string | null;
    isCaptain: boolean;
    won: boolean;
  }>;
};

type MatchData = {
  team1Name: string;
  team2Name: string;
  team1Score: string;
  team2Score: string;
  status: string;
  maps: MapData[];
};

type Props = {
  matchId: string | null;
  open: boolean;
  onClose: () => void;
};

export function MatchDrawer({ matchId, open, onClose }: Props) {
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!matchId || !open) { setData(null); return; }
    setLoading(true);
    fetch(`/api/matches/${matchId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [matchId, open]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[520px] bg-[--card] border-[--border] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-[--muted-foreground]">Loading...</div>
        ) : data ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-[--foreground]">
                {data.team1Name} {data.team1Score} — {data.team2Score} {data.team2Name}
              </SheetTitle>
              <Badge variant="outline" className="w-fit">{data.status}</Badge>
            </SheetHeader>
            {data.maps.map((map, mi) => (
              <div key={mi} className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[--foreground]">{map.mapName}</h3>
                  <span className="font-mono text-sm text-[--muted-foreground]">{map.team1Score}-{map.team2Score}</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>K</TableHead>
                      <TableHead>D</TableHead>
                      <TableHead>A</TableHead>
                      <TableHead>ACS</TableHead>
                      <TableHead className="text-right">Pts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {map.players.map((p, pi) => (
                      <TableRow key={pi} className={p.won ? 'bg-[--chart-2]/5' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {p.isCaptain && <span className="text-[--primary] text-xs">★</span>}
                            <span className={p.ownerUsername ? 'font-semibold text-[--foreground]' : 'text-[--muted-foreground]'}>
                              {p.name}
                            </span>
                            {p.ownerUsername && (
                              <Badge variant="outline" className="text-[9px] ml-1">{p.ownerUsername}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{p.kills}</TableCell>
                        <TableCell>{p.deaths}</TableCell>
                        <TableCell>{p.assists}</TableCell>
                        <TableCell>{p.acs}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{p.fantasyPts.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </>
        ) : (
          <div className="text-[--muted-foreground]">Match not found</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Create API routes for drawer data**

Create `src/app/api/players/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPlayerDetail } from '@/server/queries/player-detail';
import { computeGamePoints } from '@/lib/scoring/rules';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';
import { toInt } from '@/lib/vlrapi/parse';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const player = await getPlayerDetail(id);
  if (!player) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const slot = player.rosterSlots[0];
  const totalPoints = player.snapshots.reduce((sum, s) => sum + s.total, 0);

  const games = player.stats.map((s) => {
    const breakdown = computeGamePoints(
      { kills: s.kills, deaths: s.deaths, assists: s.assists, aces: s.aces, won: s.won },
      DEFAULT_LEAGUE_SETTINGS,
    );
    return {
      mapName: s.game.mapName,
      kills: s.kills,
      deaths: s.deaths,
      assists: s.assists,
      fantasyPts: breakdown.total,
      date: s.game.completedAt?.toISOString() ?? '',
      won: s.won,
    };
  });

  return NextResponse.json({
    handle: player.handle,
    teamName: player.team.name,
    ownerUsername: slot?.user.username ?? null,
    totalPoints: Math.round(totalPoints * 10) / 10,
    games,
  });
}
```

Create `src/app/api/matches/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMatchDetail } from '@/server/queries/matches';
import { computeGamePoints } from '@/lib/scoring/rules';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';
import { db } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const match = await getMatchDetail(id);
  if (!match) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const rosterSlots = await db.rosterSlot.findMany({
    where: { leagueId: match.leagueId },
    include: { user: true },
  });
  const slotByPlayerId = new Map(rosterSlots.map((s) => [s.playerId, s]));

  const maps = match.games.map((g) => ({
    mapName: g.mapName,
    team1Score: g.team1Score,
    team2Score: g.team2Score,
    players: g.stats.map((s) => {
      const slot = slotByPlayerId.get(s.playerId);
      const breakdown = computeGamePoints(
        { kills: s.kills, deaths: s.deaths, assists: s.assists, aces: s.aces, won: s.won },
        DEFAULT_LEAGUE_SETTINGS,
      );
      return {
        name: s.player.handle,
        team: s.player.team.shortCode,
        kills: s.kills,
        deaths: s.deaths,
        assists: s.assists,
        acs: 0,
        rating: 0,
        fantasyPts: breakdown.total,
        ownerUsername: slot?.user.username ?? null,
        isCaptain: slot?.isCaptain ?? false,
        won: s.won,
      };
    }),
  }));

  return NextResponse.json({
    team1Name: match.team1.name,
    team2Name: match.team2.name,
    team1Score: match.games.filter((g) => g.winnerTeamId === match.team1Id).length.toString(),
    team2Score: match.games.filter((g) => g.winnerTeamId === match.team2Id).length.toString(),
    status: match.status,
    maps,
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/PlayerDrawer.tsx src/components/shared/MatchDrawer.tsx src/app/api/players src/app/api/matches
git commit -m "feat(ui): player + match detail drawers with API routes"
```

---

## Phase 5 — Page Implementations

### Task 8: Enhanced Dashboard

**Files:**
- Create: `src/components/dashboard/RecentResults.tsx`
- Create: `src/components/dashboard/UpcomingMatches.tsx`
- Create: `src/components/dashboard/ActivityFeed.tsx`
- Modify: `src/app/leagues/[slug]/page.tsx`
- Modify: `src/server/queries/dashboard.ts`

- [ ] **Step 1: Create RecentResults, UpcomingMatches, ActivityFeed components**

These are server components that receive data as props. Create each one following the spec:

`RecentResults.tsx` — renders last 3 completed matches as MatchCards.
`UpcomingMatches.tsx` — renders next 5 upcoming matches with rostered-player highlights.
`ActivityFeed.tsx` — renders last 10 history events as a chronological list with icons.

Each should accept typed props from the dashboard query and render using the shared components + basic Tailwind.

- [ ] **Step 2: Rewrite dashboard page with 2-column layout**

Replace the current dashboard page content with the 2-column layout from the spec. Left column: LiveMatchHero (or "next match" placeholder), MyPlayersInMatch, RecentResults. Right column: LeaderboardMini (reuse CompressedStandings enhanced), UpcomingMatches, ActivityFeed.

Use `grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6` for the 2-column layout.

- [ ] **Step 3: Extend getDashboard to include upcoming + recent + feed data**

Add `upcomingMatches`, `recentMatches`, and call `getLeagueHistory` for the activity feed in the dashboard query.

- [ ] **Step 4: Verify + commit**

```bash
npx tsc --noEmit && npm run build
git add src/components/dashboard src/app/leagues/[slug]/page.tsx src/server/queries/dashboard.ts
git commit -m "feat(ui): enhanced 2-column dashboard with recent results + upcoming + feed"
```

---

### Task 9: Matches page (replace stub)

**Files:**
- Modify: `src/app/leagues/[slug]/matches/page.tsx`

- [ ] **Step 1: Build tabbed matches page**

Replace the stub with a page that:
1. Fetches matches by status using `getMatchesByStatus` (3 calls: UPCOMING, LIVE, COMPLETED)
2. Renders 3 tabs using shadcn Tabs component
3. Each tab shows match cards grouped by `series` field (week)
4. Completed matches show fantasy delta via ScoringSnapshot lookup
5. Each card is clickable — wraps the whole page in a client component with MatchDrawer state

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit && npm run build
git add src/app/leagues/[slug]/matches
git commit -m "feat(ui): matches page with upcoming/live/completed tabs"
```

---

### Task 10: Roster page (replace)

**Files:**
- Modify: `src/app/leagues/[slug]/roster/page.tsx`
- Create: `src/components/roster/FreeAgencyModal.tsx`
- Create: `src/components/roster/TradeProposalFlow.tsx`

- [ ] **Step 1: Build interactive roster page**

Replace the current roster page with one that renders 5 PlayerCards. Each card wires up:
- Captain toggle → calls `changeCaptain` server action
- Drop → opens FreeAgencyModal (client component with `dropAndPickup` action)
- Trade → opens TradeProposalFlow (multi-step client component with `proposeTrade` action)

The page needs to be a hybrid: server component for data loading, wrapping a client component for interactivity.

Pattern: server component loads roster + player pool + cooldown state → passes as props to a `RosterClient` client component that manages modal state.

- [ ] **Step 2: Build FreeAgencyModal**

A dialog that shows the player being dropped, a searchable/filterable list of free agents, and a confirm button. Calls `dropAndPickup` on confirm. Shows daily cooldown status.

- [ ] **Step 3: Build TradeProposalFlow**

A multi-step dialog: select your player → select target manager → select their player → review + confirm. Calls `proposeTrade` on submit.

- [ ] **Step 4: Verify + commit**

```bash
npx tsc --noEmit && npm run build
git add src/app/leagues/[slug]/roster src/components/roster
git commit -m "feat(ui): interactive roster page with FA modal + trade flow"
```

---

### Task 11: Players page (replace stub)

**Files:**
- Modify: `src/app/leagues/[slug]/players/page.tsx`

- [ ] **Step 1: Build filterable player pool**

Replace stub with a page that:
1. Calls `getPlayerPool(slug)` to get all 64 players
2. Renders a client component with search bar, team filter dropdown, ownership filter (All/Free/Owned)
3. Sortable table columns: Player, Team, Owner, Total Pts, K/D/A, Maps
4. Click any player → opens PlayerDrawer
5. Free agents highlighted with green "Free Agent" badge

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit && npm run build
git add src/app/leagues/[slug]/players
git commit -m "feat(ui): players page with filters, sorting, and player drawer"
```

---

### Task 12: Enhanced leaderboard

**Files:**
- Modify: `src/app/leagues/[slug]/leaderboard/page.tsx`

- [ ] **Step 1: Build expandable leaderboard**

Replace the current simple table with:
1. Styled table with VCT red left border on your row
2. Click any row → inline expand showing their 5 players with individual point contributions
3. "Ex-roster" section showing dropped players and their historical contributions
4. RankArrow column (static for now — rank change tracking deferred)

This needs to be a client component wrapper around the server-fetched data. The expand state is client-side.

- [ ] **Step 2: Extend leaderboard query**

Add per-user player breakdown data to the leaderboard query: for each manager, include their roster slots + snapshot totals per player. Also include historical snapshots for players no longer on the roster (ex-roster contributions).

- [ ] **Step 3: Verify + commit**

```bash
npx tsc --noEmit && npm run build
git add src/app/leagues/[slug]/leaderboard src/server/queries/leaderboard.ts
git commit -m "feat(ui): expandable leaderboard with per-player breakdowns"
```

---

### Task 13: Trades page enhanced

**Files:**
- Modify: `src/app/leagues/[slug]/trades/page.tsx`
- Modify: `src/components/trade/TradeRow.tsx`

- [ ] **Step 1: Add tabs (Inbox | History) and "Propose Trade" button**

Replace the current trades page with a tabbed layout:
- Inbox tab: pending proposals (existing TradeRow with accept/reject)
- History tab: all resolved trades (accepted, rejected, reversed)
- "Propose Trade" button at top that opens the TradeProposalFlow dialog

- [ ] **Step 2: Enhance TradeRow with bonus cooldown warnings**

Add cooldown info to each trade row: "Trade bonus eligible" or "Bonus cooldown until [date]" per player.

- [ ] **Step 3: Verify + commit**

```bash
npx tsc --noEmit && npm run build
git add src/app/leagues/[slug]/trades src/components/trade
git commit -m "feat(ui): trades page with inbox/history tabs + propose button"
```

---

### Task 14: History page (replace stub)

**Files:**
- Modify: `src/app/leagues/[slug]/history/page.tsx`

- [ ] **Step 1: Build transaction log**

Replace stub with a page that:
1. Calls `getLeagueHistory(slug)` to get all events
2. Renders a chronological feed with icons per type (trade: ⇄, FA: 🔁, captain: ★)
3. Filter dropdowns: by event type, by manager
4. Each entry: icon, description, relative timestamp

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit && npm run build
git add src/app/leagues/[slug]/history
git commit -m "feat(ui): history page with filterable transaction log"
```

---

### Task 15: Final polish + match detail page

**Files:**
- Modify: `src/app/leagues/[slug]/matches/[id]/page.tsx`
- Modify: `src/app/leagues/[slug]/rosters/[userId]/page.tsx`

- [ ] **Step 1: Match detail page (redirect to matches with drawer)**

Replace the stub. Since we use drawers for match detail, this page can either redirect to `/matches?open=[id]` or render a standalone full-page view of the match stats. Implement as a standalone page using the same data as the drawer but laid out full-width.

- [ ] **Step 2: Update other manager's roster page**

Replace the read-only roster stub with PlayerCard components in read-only mode. Add a "Propose Trade" button that links to the trades page.

- [ ] **Step 3: Full build verification**

```bash
npx tsc --noEmit
npm run build
npm test
```

All must pass. 23 unit tests should still pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/leagues
git commit -m "feat(ui): match detail page + other manager roster + final polish"
```

---

## Self-Review

**Spec coverage:**
- VCT dark theme → Task 1 ✓
- Navbar + Sidebar → Tasks 2, 3, 4 ✓
- Dashboard 2-column → Task 8 ✓
- Matches page (tabs) → Task 9 ✓
- Match detail drawer → Task 7 ✓
- Roster page (cards + actions) → Task 10 ✓
- Player drawer → Task 7 ✓
- Leaderboard enhanced → Task 12 ✓
- Players page → Task 11 ✓
- Trades enhanced → Task 13 ✓
- History page → Task 14 ✓
- Draft room polish → deferred (existing implementation works, cosmetic updates are low priority)
- Mobile hamburger → included in Sidebar (hidden lg:block + hamburger trigger to add)

**Known gaps:** Mobile hamburger trigger button needs to be added to the Navbar for < lg screens. Draft room polish is deferred. These are minor and can be follow-up tasks.
