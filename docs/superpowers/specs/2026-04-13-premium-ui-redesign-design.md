# Premium UI Redesign — Design Spec

**Date:** 2026-04-13
**Author:** Liam (with Claude)
**Status:** Draft — pending implementation plan

## Summary

Complete UI overhaul of the VCT Fantasy League app with a Stripe/Vercel-inspired premium aesthetic: monochrome zinc palette, surgical VCT-red accents, editorial serif display type for drama, precision typography, glassmorphism on the shell, and motion-minimal but deliberate interactions. Covers every user-facing page plus the commissioner admin/audit surface.

Replaces the current "just styled enough to function" interface with a design language that feels expensive, considered, and distinct — not another SaaS dashboard.

## Direction

**Stripe / Vercel** — dark monochrome, glass, micro-gradients, precision alignment. Engineered, not decorated.

**Typography:** Inter (UI) + Fraunces (display/serif accent) + Geist Mono (numbers).

**Scope:** Every page. Foundations + dashboard + league pages + admin.

## Design System Foundations

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `bg/canvas` | `#09090b` (zinc-950) | Page background |
| `bg/surface` | `#18181b` (zinc-900) | Primary cards |
| `bg/elevated` | `#27272a` (zinc-800) | Nested cards, hover states |
| `bg/glass` | `rgba(24,24,27,0.6)` + `backdrop-blur(12px)` | Navbar, sidebar, drawers |
| `border/subtle` | `rgba(255,255,255,0.06)` | Card borders — almost invisible |
| `border/default` | `rgba(255,255,255,0.1)` | Dividers, input borders |
| `text/primary` | `#fafafa` | Headings, numbers |
| `text/secondary` | `#a1a1aa` (zinc-400) | Body copy |
| `text/tertiary` | `#71717a` (zinc-500) | Labels, metadata |
| `accent/primary` | `#ff4655` (VCT red) | CTAs, live indicators, captain stars — sparingly |
| `accent/glow` | radial `rgba(255,70,85,0.12)` | Subtle glow behind hero elements |
| `status/win` | `#10b981` (emerald-500) | Wins, positive deltas |
| `status/loss` | `#f43f5e` (rose-500) | Losses (distinct from VCT red) |

### Typography

- **UI (body, buttons, forms):** Inter, weights 400/500/600. Loaded via `next/font/google` with `display=swap`.
- **Display (hero headers, team names, big numbers):** Fraunces variable, weights 400-600. Editorial serif layer.
- **Mono (stats, timestamps, numeric columns):** Geist Mono (already installed).
- **Custom scale:** 11 / 12 / 13 / 14 / 16 / 20 / 28 / 40 / 56. No default Tailwind scale.
- **Line-height:** 1.5 across the app.

### Spacing & Rhythm

- 4px base unit.
- Card padding: 16px (compact) / 20px (comfortable) / 24px (hero).
- Container max-width: 1280px. Horizontal padding: 32px desktop / 20px mobile. Vertical: 40px top / 48px bottom.

### Surfaces & Depth

- **No drop shadows on cards.** Depth comes from 1px translucent border + subtle background contrast.
- Elevated elements (drawers, modals): `0 0 80px rgba(0,0,0,0.4)` + backdrop blur.
- Hairline dividers: `border-white/5`.

### Radii

- Small (badges, inputs): 4px
- Cards: 8px
- Modals/drawers: 12px
- No larger radii. Sharp-ish reads as premium.

### Motion

- Transitions: 150ms `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-quint).
- Card hover: `brightness(1.08)` + border color shift. No translate.
- Changing numbers: 400ms fade-swap.
- Page transitions: none (Next.js RSC handles).

## App Shell

### Navbar (fixed, 52px, glass)

- `bg/glass` + `backdrop-blur(12px)` + 1px bottom border (`border/subtle`).
- **Left:** wordmark `VCT FANTASY` in Fraunces 600, 14px, tracking-tight, `text/primary`. No red in the wordmark. Subtle 3s shimmer on "FANTASY" (white → white/60 → white linear-gradient mask).
- **Center:** league pill `VCT Americas · 2026 · Stage 1` with a 6px dot status indicator (red pulse = live match, emerald = active, grey = completed). Hover → league switcher popover.
- **Right:** 24px avatar only. Hover → glassmorphic popover with Switch League / Admin / Sign Out.
- No shadows, no gradients.

### Sidebar (fixed, 240px, glass)

- Same glass treatment, 1px right border.
- Top: `LEAGUE` section header (10px uppercase, tracking-wider, `text/tertiary`).
- Nav items: 32px tall, 12px horizontal padding. Lucide icon (14px, 1.5 stroke) + 13px Inter 500 label.
  - Active: `bg/elevated` + `text/primary` + 2px VCT-red left edge accent.
  - Hover: `bg/elevated/60`.
- Items: Dashboard, Leaderboard, Roster, Players, Matches, Trades, History.
- Badges: pending trade count as rose-500/20 bg + rose-400 text pill. Live match = 6px pulsing dot next to Dashboard.
- Commissioner section (if applicable): hairline divider, `COMMISSIONER` label, Admin + Audit links.

### Responsive

- `< lg`: sidebar becomes a drawer triggered by hamburger in navbar. Backdrop dimmed + blurred.
- Navbar always fixed.

## Component Primitives

### Card

- `bg/surface` + 1px `border/subtle`, 8px radius.
- Paddings: 16 / 20 / 24 px.
- Optional header: label (10px uppercase tracking-wider `text/tertiary`) + right-side action slot.
- Hover only when interactive: border → `border/default`, background brightness +4%.

### Button

- **Primary:** `bg-white` + `text-zinc-950`. Stark white on black. Hover: `bg-white/90`.
- **Secondary:** `bg-white/5` + `text/primary` + 1px `border/default`.
- **Destructive:** `bg-rose-500/10` + `text-rose-400` + `border-rose-500/20`.
- **Hero red** (sparingly, max 1 per page): `bg-[#ff4655]` + `text-white`.
- Sizes: 28 / 32 / 40 px height. Font: Inter 500, 13px. Lucide icons at 14px, 8px gap.

### Table

- No visible table borders. Row dividers: 1px `border/subtle`.
- Header: 11px uppercase tracking-wider `text/tertiary`, 40px height.
- Body: 48px height, 14px Inter.
- Numeric columns: `tabular-nums` + Geist Mono 13px.
- Row hover: `bg/elevated/40`.
- Selected: 2px VCT-red left edge.
- Sticky header on scroll.

### Badge

- **Neutral:** `bg-white/5` + `text/secondary`, 10px uppercase tracking-wider, 20px height, 6px horizontal padding.
- **Status dot:** 6px circle + 11px label. Colors: emerald (live/win), rose (loss/stalled), VCT-red (captain).
- **Numeric delta:** Geist Mono value (colored) + 9px "PTS" suffix in `text/tertiary`.

### Input / Select

- `bg/elevated` + 1px `border/default`, 6px radius, 32px height.
- Focus: border shifts to `text/secondary`. No ring, no glow.
- Placeholder: `text/tertiary` italic.
- Custom chevron icon on selects (never browser default).

### Drawer (player / match detail)

- Slides in from right, 520px wide.
- Backdrop: `bg-black/60` + `backdrop-blur(4px)`.
- Drawer: `bg/canvas` + left border `border/subtle`.
- Shadow: `0 0 80px rgba(0,0,0,0.4)` on left edge.
- Header: 56px, title 16px Inter 600, close X top-right.

### Modal

- Centered, 480px wide, 12px radius.
- Same backdrop treatment as drawer.
- Footer buttons right-aligned.

### Empty state

- Centered, 48px padding.
- 24px lucide icon in `text/tertiary`.
- 14px Inter 500 `text/secondary` headline.
- 13px `text/tertiary` subcopy.
- Optional single secondary button.

### Loading state

- No spinners. Skeleton shimmer only — gradient from `bg/elevated` to `bg/elevated/60` and back, 1.5s cycle. Boxes match target content shape.

## Dashboard

### Layout

Desktop: `grid-cols-[1.618fr_1fr]` (golden ratio). Stack on mobile.

### Hero Match Card (full-width, top)

**When live (240px tall):**
- Background: large team logos bleeding from left/right edges at `opacity-5`, weighted toward their side. Center radial `accent/glow`.
- Team names in Fraunces 500 at 40px, `text/primary`.
- Score in Fraunces 600 at 56px with tabular nums. Winning score has faint VCT-red glow.
- Top-left: glass LIVE pill — 6px pulsing red dot + "LIVE" (10px uppercase).
- Top-right: map name + round score (11px `text/tertiary`).
- Bottom: thin round-progress bar (VCT red fill on `bg/elevated` track).

**When no live match (180px):**
- Two teams at 28px, no glow. Countdown in Fraunces tabular nums (`3d 12h 04m`). Quiet.

### Left Column (1.618fr)

1. **Your Lineup** (only when match is live). Rows with handle + team tag + agent icon + K/D/A + fantasy total. Captain star inline. Non-rostered match players dimmed 40% in a collapsed sub-section.
2. **Recent Results** (3 most recent). Compact match rows with logos 24px, Fraunces 20px score, map count, date. Hover reveals your fantasy delta from the right. Click → drawer.

### Right Column (1fr)

1. **Standings Strip.** 7 manager rows, 40px tall each. Rank (11px mono `tertiary`), username (13px Inter 500), points (Geist Mono 14px). Your row: 2px VCT-red left edge + brighter bg. Tiny delta pill between leader and second.
2. **Upcoming Matches** (next 5). Row per match: team abbreviations + "vs" + date/time (mono). If you own rostered players: thin red accent line + 10px player tags below.
3. **Activity Feed** (last 8). Event type lucide icon (12px `text/tertiary`) + 12px `text/secondary` description + 10px mono relative timestamp. 320px max-height with bottom gradient fade.

### "Wow" Details

- Score tickers fade-swap on change (400ms crossfade).
- LIVE pill pulse uses two concentric animated rings expanding outward (not just opacity).

## League Pages

### Leaderboard

**Hero podium strip (top):** 3 cards in a row, 160px tall. 1st center (taller) / 2nd left / 3rd right. Rank in Fraunces 72px tabular. Username 16px Inter 500. Points Geist Mono 20px. Trend arrow. 1st gets subtle radial VCT-red glow behind the rank number.

**Below:** full table for all 7 managers. Columns: rank, manager, points, captain, record (maps W-L). Row expands inline (200ms height animation) to show per-player breakdown + ex-roster contributions below a hairline divider labeled "DROPPED / TRADED".

### Roster

**Captain banner (top):** 120px tall. Captain handle in Fraunces 40px + team (mono) + "★ CAPTAIN · 1.5x" badge. Top border accent in VCT red.

**Remaining 4 players:** 2×2 grid of portrait cards (220px). Subtle tinted team-color background (~4% opacity). Handle in Fraunces 24px, stats in mono rows below. Three actions at bottom: Drop / Trade / Captain (captain disabled with progress bar if cooldown active).

### Players

**Filter bar:** horizontal pill toggles (All / Free Agents / Owned), scrollable team-logo selector with active state, search input (right) with `⌘K` hint.

**Table:** primitive table style. Columns: player, team (logo + short code), owner, points, K/D/A, maps. Row click → player drawer. Free agents: emerald dot before row.

### Matches

**Tabs:** underline-style segmented control with animated slide (Upcoming · Live · Completed).

**Content:** matches grouped by week. Week header: Fraunces 14px label + divider line extending right. Each match is a full-width 72px MatchCard.

### Match Detail

**Header (200px):** large team logos at 30% opacity as background on each side. Series score in Fraunces 80px tabular centered. Team names 20px. Status pill below.

**Per-map sections:** each in own card. Map name Fraunces 24px, score mono. Stat table. Fantasy-owned players: owner username as 10px badge + captain star if applicable. Winning team rows tinted subtle emerald.

### Trades

**Tabs:** Inbox · History (same underline control).

**Inbox cards:** 100px tall. Accept/reject as primary white + destructive buttons (large).

**History cards:** 56px tall, compact with muted state badges.

**Propose Trade button:** top-right. Opens multi-step modal with 1→2→3→4 stepper indicator (10px uppercase labels).

### History

Single vertical timeline: left rail line in `border/subtle`. Each event = dot on rail + content on right. Dot colors by type: trade = VCT red, FA = emerald, captain = amber. Slim filter bar at top.

### Draft Room

**On-the-Clock banner (top, 80px):** full-width VCT red gradient fade with active manager's avatar + name in Fraunces 32px. Subtle pulse.

**Body:** two columns. Left: player pool with table + search. Right: 320px sidebar with pick order (7 avatars in snake order, active highlighted) + pick log grouped by round.

## Admin / Audit

### Audit Page (`/admin/leagues/[slug]/audit`)

**Top summary strip:** row of 7 compact manager cards (80px). Username + computed total (Geist Mono 20px) + expected (if set) + delta indicator. Nonzero delta: small red triangle. Zero: emerald check. Hover → highlights that manager across the per-match tables below.

**Per-match cards:**
- Full-width cards, 8px radius, `bg/surface`.
- Header (56px, glass tint): team names + series score (Fraunces 24px) left, match date (mono) right, "EDIT ROSTERS" secondary pill far right.
- Body collapsed by default — 2 lines of summary.
- Click header → expand with stat tables + per-manager breakdown + roster editor.

**Expanded:**
- Stat tables: primitive style, compact 36px rows.
- Discrepant rows: rose-500 left edge + tooltip.
- **Roster editor:** separated by hairline + amber "EDIT" badge. 7 manager columns in horizontal scroll (200px each). Manager name (12px Inter 500), 5 stacked compact selects, captain radio as small circle (unfilled → VCT-red filled) left of each slot. Per-column validation errors in rose-400 12px italic. Global conflicts in rose-500/10 banner above editor.
- **Save & Recompute:** bottom-right primary white button with `⚡` icon. Disabled until valid. Saving state: subtle progress bar on bottom edge, no spinner.

### Admin Home (`/admin`)

Clean list of leagues with status pills. Minimal chrome. "Create League" secondary button top-right.

### Admin League Detail (`/admin/leagues/[slug]`)

Three section cards: Adjustments (form + list), Match tools (audit link + refetch), Members & settings (metadata + member list). Utility-first, no hero treatment.

## Out of Scope

- Light mode. Dark only.
- Page transitions (Next.js RSC handles).
- Team brand colors as first-class (only subtle tint on roster cards).
- Animated page charts (e.g. sparklines) — reserved for a follow-up if needed.
- Accessibility audit / ARIA polish beyond basic defaults.
- Mobile-native gestures (swipe actions, etc.).
