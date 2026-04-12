# VCT Fantasy — UI Redesign Spec

**Date:** 2026-04-12
**Author:** Liam (with Claude)
**Status:** Draft — pending implementation plan

## Summary

Complete UI overhaul of the VCT Fantasy League app. Replaces the current unstyled pages and 9 stubs with a polished, VCT-branded interface featuring persistent navigation, match-first dashboard, full player/match/trade/history pages, and a player detail drawer. All Server Actions and data queries already exist — this is a frontend-only effort wiring existing backend to proper UI.

## Design Direction

**VCT/Valorant-inspired dark theme.** Black backgrounds, VCT red (#ff4655) accents, sharp aggressive typography. Matches the official VCT broadcast overlay aesthetic.

## Theme Tokens

Applied globally via Tailwind config / CSS variables:

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#0f1419` | Page background |
| `--surface` | `#1a1f2b` | Card backgrounds |
| `--border` | `#2a2f3a` | Card/table borders |
| `--text-primary` | `#f5f7fa` | Headings, body text |
| `--text-secondary` | `#9aa3b2` | Labels, muted text |
| `--accent` | `#ff4655` | VCT red — CTAs, highlights, live indicators |
| `--accent-hover` | `#e03e4d` | Button hover states |
| `--success` | `#4ade80` | Positive points, free agent badges |
| `--warning` | `#fbbf24` | Cooldown warnings |

## Global Shell — Layout + Navigation

### Top Navbar (fixed, 56px)

- **Left:** VCT Fantasy wordmark in white with VCT red accent line
- **Center:** Current league name + status badge (ACTIVE / COMPLETED / DRAFTING)
- **Right:** User avatar (Discord) + dropdown menu (Switch League, Admin [commissioner only], Sign Out)

### Left Sidebar (240px, collapsible)

League-scoped nav links with icons:

1. Dashboard (home) — match-first hero page
2. Leaderboard (trophy)
3. My Roster (users)
4. Players (search) — full player pool
5. Matches (calendar) — schedule + results
6. Trades (arrows) — inbox + propose
7. History (clock) — transaction log

Each link has contextual badges:
- Red dot on Trades if pending proposals exist
- Green dot on Dashboard if a match is live
- Bottom of sidebar: "Admin" link (commissioner only)

### Mobile (< 768px)

Navbar stays fixed. Sidebar becomes a hamburger slide-out overlay. No bottom tab bar.

## Dashboard (`/leagues/[slug]`)

Two-column layout on desktop (60/40 split), single-column on mobile.

### Left Column (60%)

**1. Live Match Hero (existing, enhanced)**
VCT red gradient card showing current live match: team names, series score, current map + round score. If no live match, shows "Next match: [team] vs [team] in [X hours]" countdown in a muted card. Multiple simultaneous live matches stack vertically.

**2. My Players in This Match (existing, enhanced)**
Renders when a match is live or recently completed. Shows rostered players with live K/D/A and running fantasy point total. Captain shows "47.0 x 1.5 = 70.5". Non-owned players from the match are dimmed but visible.

**3. Recent Results**
Last 3 completed matches as compact cards: team names, series score, date. "+X pts" badge if you had rostered players. Click opens match detail drawer.

### Right Column (40%)

**4. Leaderboard Mini**
Top 7 managers ranked with point totals and rank-change arrows. Your row highlighted. Click goes to full leaderboard.

**5. Upcoming Matches**
Next 5 scheduled matches: date/time, team names. Matches where you have rostered players get a VCT red left border accent.

**6. Activity Feed**
Last 10 league events: trades, FA moves, captain changes, scoring. Icon + description + relative timestamp.

## Matches Page (`/leagues/[slug]/matches`)

### Three tabs: Upcoming | Live | Completed

**Upcoming (default when no live matches):**
Match cards grouped by week ("Week 1", "Week 2"). Each card: team names, date/time, format (Bo3). Rostered player handles appear as small badges below the team name.

**Live (auto-selected when match is live, pulsing red dot on tab):**
Same card format but expanded with current map, map score, series score. Auto-refreshes via SSE.

**Completed:**
Cards show final series score, map count, date. Fantasy point delta from that match in VCT red. Click opens match detail drawer.

### Match Detail Drawer (slide-out from right, 480px)

- Header: team names, series score, status, date
- Per-map sections: map name, score, 10-player stat table
- Stat columns: Player | Team | K | D | A | ACS | Rating | Fantasy Pts
- Fantasy-owned players highlighted with owning manager's name badge
- Captain-owned players show 1.5x multiplier applied
- Winner side gets subtle green background tint

## Roster Page (`/leagues/[slug]/roster`)

### 5 player cards in vertical stack

Each card:
- Player handle (large), team name, agent from last match
- Total fantasy points (big number, right-aligned)
- Mini bar chart of last 5 maps (visual trend)
- Captain badge: ★ with "1.5x" label
- Action buttons: "Drop" and "Trade"

### Captain Change (inline)

Click ★ on non-captain player → confirmation modal with cooldown warning. If cooldown active: star dimmed, tooltip shows "Available in X days".

### Free Agency Modal (from "Drop" button)

- Shows player being dropped with stats
- Scrollable list of unowned players sorted by total points
- Search/filter by team or name
- Confirm dialog with daily cooldown status

### Trade Proposal (from "Trade" button)

Step-by-step flow:
1. Select your player(s) to offer (pre-selected)
2. Select target manager
3. Select their player(s) you want
4. Review + confirm with trade bonus info

### Other Manager's Roster (`/leagues/[slug]/rosters/[userId]`)

Same card layout, read-only. "Propose Trade" button at top pre-fills the target manager.

## Player Detail Drawer

Triggered by clicking any player name anywhere in the app (roster, leaderboard, player pool, match stats).

Slide-out panel (480px) showing:
- Player handle, team, current owner (or "Free Agent")
- Total fantasy points with captain-multiplied breakdown
- Game-by-game stat table: Map | K | D | A | Fantasy Pts | Date
- Ownership history if the player changed hands (traded/dropped)

## Leaderboard (`/leagues/[slug]/leaderboard`)

Table columns: Rank | Manager | Total Pts | Captain | Record (maps won/lost)

- Click manager row → inline expand showing 5-player roster with individual contributions
- "Ex-roster contributions" section shows dropped players and their point contributions before being dropped
- Rank change arrows (up/down/same since last match)
- Your row highlighted with VCT red left border

## Players Page (`/leagues/[slug]/players`)

Filterable/sortable table of all 64 players:
- Columns: Player | Team | Owner (or "Free Agent" in green) | Total Pts | K/D/A | Maps Played
- Filters: team dropdown, ownership (All / Free Agents / Owned), sort by any column
- Search bar for name
- Click any player → player detail drawer

## Trades Page (`/leagues/[slug]/trades`)

Two tabs: Inbox | History

**Inbox:** Pending trade proposals with accept/reject buttons and bonus cooldown warnings.

**History:** Chronological list of all trades (accepted, rejected, reversed) with timestamps and players involved.

"Propose Trade" button at top opens the step-by-step flow.

## History Page (`/leagues/[slug]/history`)

Chronological feed of ALL league events: trades, FA moves, captain changes, scoring updates.

Each entry: icon, description, timestamp, affected manager(s). Filterable by event type and by manager.

## Draft Room (`/leagues/[slug]/draft`)

Existing implementation enhanced:
- Better player cards (team, role visible)
- Draft order sidebar with avatars
- Pick log grouped by round
- Pick timer visual (display only, not enforced in v1)

## Component Architecture

### New shared components

- `AppShell` — wraps all league pages with navbar + sidebar
- `Navbar` — top bar with league info + user menu
- `Sidebar` — nav links with badges
- `PlayerDrawer` — reusable slide-out player detail panel
- `MatchDrawer` — reusable slide-out match detail panel
- `MatchCard` — compact match display (used on dashboard, matches page)
- `PlayerCard` — roster-style player display with actions
- `ActivityFeedItem` — single event in the activity feed
- `RankChangeArrow` — up/down/same indicator
- `PointsDelta` — styled +/- points badge

### Existing components to update

- `LiveMatchHero` — add countdown for next match, support multiple live matches
- `MyPlayersInMatch` — add captain multiplier display, show non-owned players dimmed
- `CompressedStandings` — add rank change arrows
- `TradeRow` — add bonus cooldown warning, router refresh on action

## Data Requirements

All queries and Server Actions already exist. New queries needed:

- `getUpcomingMatches(leagueSlug, limit)` — next N matches with status UPCOMING
- `getCompletedMatches(leagueSlug, limit)` — last N completed matches
- `getPlayerDetail(leagueId, playerId)` — per-game stats, ownership history
- `getActivityFeed(leagueId, limit)` — aggregates recent trades, FA actions, captain changes, scoring events
- `getPlayerPool(leagueId, filters)` — all players with owner info, sortable

## Out of Scope

- Animations / transitions (can add later)
- Team logos (vlr.gg logos are external URLs — defer to avoid hotlinking issues)
- Push notifications (Discord webhook is the notification layer)
- Mobile-native gestures (swipe to trade, etc.)
- Dark/light mode toggle (dark only)
