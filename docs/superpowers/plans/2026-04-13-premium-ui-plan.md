# Premium UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the VCT Fantasy League UI into a Stripe/Vercel-premium experience with editorial serif display type, monochrome zinc palette, surgical VCT-red accents, glass shell, and precision typography across every page.

**Architecture:** All frontend. Rebuild the design tokens in `globals.css`, replace the app shell with glassmorphic navbar/sidebar, rewrite shared components (Card, Button, Table, Badge, Drawer, Modal), then rewrite each page: dashboard hero, leaderboard podium, roster portrait cards, players with filter pills, matches with week groupings, trades with stepper modal, history timeline, draft on-the-clock, and admin audit editor.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, shadcn/ui primitives (kept where useful), Inter + Fraunces + Geist Mono via `next/font/google`, lucide-react icons, existing Prisma/NextAuth/Server Actions.

**Reference spec:** `docs/superpowers/specs/2026-04-13-premium-ui-redesign-design.md`

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                           (MODIFY — fonts, body bg)
│   ├── globals.css                          (MODIFY — full token rewrite)
│   ├── page.tsx                             (MODIFY — premium splash)
│   ├── leagues/
│   │   ├── page.tsx                         (MODIFY — league list polish)
│   │   └── [slug]/
│   │       ├── layout.tsx                   (MODIFY — new AppShell props)
│   │       ├── page.tsx                     (MODIFY — dashboard hero)
│   │       ├── leaderboard/page.tsx         (MODIFY — podium + table)
│   │       ├── roster/page.tsx              (MODIFY — captain banner + portrait cards)
│   │       ├── rosters/[userId]/page.tsx    (MODIFY — read-only mirror)
│   │       ├── players/page.tsx             (MODIFY — filter pills + table)
│   │       ├── matches/page.tsx             (MODIFY — tabs + week groups)
│   │       ├── matches/[id]/page.tsx        (MODIFY — premium match detail)
│   │       ├── trades/page.tsx              (MODIFY — tabs + stepper CTA)
│   │       ├── draft/page.tsx               (MODIFY — on-the-clock banner)
│   │       └── history/page.tsx             (MODIFY — vertical timeline)
│   └── admin/
│       ├── page.tsx                         (MODIFY — minimal list)
│       └── leagues/[slug]/
│           ├── page.tsx                     (MODIFY — 3 section cards)
│           └── audit/page.tsx               (MODIFY — collapsible per-match cards)
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx                       (REWRITE — glass + wordmark shimmer)
│   │   ├── Sidebar.tsx                      (REWRITE — glass + lucide icons + dots)
│   │   ├── AppShell.tsx                     (MODIFY — spacing + max-w)
│   │   └── LeagueStatusDot.tsx              (CREATE)
│   ├── shared/
│   │   ├── Card.tsx                         (CREATE — primitive)
│   │   ├── SectionLabel.tsx                 (CREATE — uppercase tiny label)
│   │   ├── Button.tsx                       (CREATE — primary/secondary/destructive/hero)
│   │   ├── Badge.tsx                        (REWRITE — neutral/status/delta)
│   │   ├── StatusDot.tsx                    (CREATE — 6px pulsing dot)
│   │   ├── DataTable.tsx                    (CREATE — styled wrapper)
│   │   ├── Drawer.tsx                       (REWRITE — uses Sheet)
│   │   ├── Modal.tsx                        (CREATE — shadcn Dialog wrapper)
│   │   ├── PointsDelta.tsx                  (MODIFY — mono + suffix)
│   │   ├── RankArrow.tsx                    (MODIFY — subtler)
│   │   ├── Skeleton.tsx                     (CREATE — shimmer)
│   │   ├── TeamLogo.tsx                     (CREATE — image w/ fallback)
│   │   ├── MatchCard.tsx                    (REWRITE — 72px full-width)
│   │   ├── PlayerCard.tsx                   (REWRITE — portrait variant)
│   │   ├── PlayerDrawer.tsx                 (MODIFY — premium styling)
│   │   └── MatchDrawer.tsx                  (MODIFY — premium styling)
│   ├── dashboard/
│   │   ├── LiveMatchHero.tsx                (REWRITE — 240px broadcast feel)
│   │   ├── NextMatchCard.tsx                (CREATE — 180px countdown)
│   │   ├── YourLineup.tsx                   (CREATE — live match roster)
│   │   ├── StandingsStrip.tsx               (REWRITE — compact ranking)
│   │   ├── UpcomingMatches.tsx              (MODIFY — polished rows)
│   │   ├── RecentResults.tsx                (MODIFY — hover delta)
│   │   ├── ActivityFeed.tsx                 (MODIFY — timeline dots)
│   │   ├── LivePulse.tsx                    (CREATE — concentric rings)
│   │   └── DashboardLiveClient.tsx          (existing — keep)
│   ├── leaderboard/
│   │   ├── PodiumStrip.tsx                  (CREATE)
│   │   └── LeaderboardTable.tsx             (MODIFY — expandable rows)
│   ├── roster/
│   │   ├── CaptainBanner.tsx                (CREATE)
│   │   ├── PlayerPortraitCard.tsx           (CREATE)
│   │   ├── FreeAgencyModal.tsx              (MODIFY — premium styling)
│   │   └── TradeProposalFlow.tsx            (MODIFY — stepper + premium)
│   ├── players/
│   │   └── PlayersFilterBar.tsx             (CREATE — pills + search)
│   ├── matches/
│   │   ├── MatchesTabs.tsx                  (CREATE — animated underline)
│   │   └── WeekGroup.tsx                    (CREATE)
│   ├── trades/
│   │   └── TradeStepper.tsx                 (CREATE — 1→2→3→4 indicator)
│   ├── history/
│   │   └── HistoryTimeline.tsx              (CREATE)
│   ├── draft/
│   │   └── OnTheClockBanner.tsx             (CREATE)
│   └── admin/
│       └── MatchRosterEditor.tsx            (MODIFY — premium styling)
└── lib/
    └── tokens.ts                            (CREATE — CSS var name constants)
```

---

## Phase 1 — Foundations

### Task 1: Fonts + globals.css rewrite

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update `src/app/layout.tsx` with the 3 fonts**

```tsx
import type { Metadata } from "next";
import { Inter, Fraunces, Geist_Mono } from "next/font/google";
import "./globals.css";
import { bootstrapWorker } from "@/lib/worker/bootstrap";

bootstrapWorker();

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VCT Fantasy",
  description: "Private VCT Valorant Champions Tour fantasy league",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#09090b] text-[#fafafa] font-sans">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Replace `src/app/globals.css` entirely**

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@theme inline {
  --color-background: var(--bg-canvas);
  --color-foreground: var(--text-primary);
  --color-card: var(--bg-surface);
  --color-card-foreground: var(--text-primary);
  --color-popover: var(--bg-surface);
  --color-popover-foreground: var(--text-primary);
  --color-primary: var(--accent-primary);
  --color-primary-foreground: #ffffff;
  --color-secondary: var(--bg-elevated);
  --color-secondary-foreground: var(--text-primary);
  --color-muted: var(--bg-elevated);
  --color-muted-foreground: var(--text-secondary);
  --color-accent: var(--bg-elevated);
  --color-accent-foreground: var(--text-primary);
  --color-destructive: var(--status-loss);
  --color-border: var(--border-default);
  --color-input: var(--border-default);
  --color-ring: var(--accent-primary);
  --color-sidebar: var(--bg-surface);
  --color-sidebar-foreground: var(--text-primary);
  --color-sidebar-primary: var(--accent-primary);
  --color-sidebar-primary-foreground: #ffffff;
  --color-sidebar-accent: var(--bg-elevated);
  --color-sidebar-accent-foreground: var(--text-primary);
  --color-sidebar-border: var(--border-subtle);
  --color-sidebar-ring: var(--accent-primary);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-display: var(--font-display);
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
}

:root {
  /* Backgrounds */
  --bg-canvas: #09090b;
  --bg-surface: #18181b;
  --bg-elevated: #27272a;
  --bg-glass: rgba(24, 24, 27, 0.6);

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.1);

  /* Text */
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-tertiary: #71717a;

  /* Accents */
  --accent-primary: #ff4655;
  --accent-glow: rgba(255, 70, 85, 0.12);

  /* Status */
  --status-win: #10b981;
  --status-loss: #f43f5e;

  /* Radii */
  --radius: 8px;
}

@layer base {
  * {
    border-color: var(--border-subtle);
  }
  body {
    background-color: var(--bg-canvas);
    color: var(--text-primary);
    font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
    font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  }
  html {
    font-family: var(--font-sans);
  }
  /* Tabular numbers on mono */
  .font-mono {
    font-feature-settings: "tnum";
  }
}

@layer utilities {
  .font-display {
    font-family: var(--font-display), ui-serif, Georgia, serif;
  }
  .glass {
    background-color: var(--bg-glass);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .hairline {
    border-color: var(--border-subtle);
  }

  /* Shimmer animation for the wordmark */
  @keyframes wordmark-shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  .shimmer {
    background: linear-gradient(
      90deg,
      var(--text-primary) 0%,
      var(--text-primary) 40%,
      rgba(250, 250, 250, 0.55) 50%,
      var(--text-primary) 60%,
      var(--text-primary) 100%
    );
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: wordmark-shimmer 3s linear infinite;
  }

  /* Live pulse — concentric expanding rings */
  @keyframes live-pulse-ring {
    0% { transform: scale(1); opacity: 0.55; }
    100% { transform: scale(2.8); opacity: 0; }
  }
  .live-pulse-ring {
    animation: live-pulse-ring 1.6s cubic-bezier(0.16, 1, 0.3, 1) infinite;
  }

  /* Skeleton shimmer */
  @keyframes skeleton-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .skeleton {
    background: linear-gradient(
      90deg,
      var(--bg-elevated) 0%,
      rgba(39, 39, 42, 0.6) 50%,
      var(--bg-elevated) 100%
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
  }

  /* Number fade-swap transition helper */
  .number-swap {
    transition: opacity 400ms cubic-bezier(0.16, 1, 0.3, 1);
  }
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat(ui): premium design tokens + Inter/Fraunces/Geist fonts"
```

---

### Task 2: Token constants module

**Files:**
- Create: `src/lib/tokens.ts`

- [ ] **Step 1: Create the tokens module (for JS consumption where CSS vars are awkward)**

```ts
// src/lib/tokens.ts
// Exported only for cases where a JS value is needed (e.g. inline styles in
// dynamic server components). Prefer CSS variables via Tailwind arbitrary
// values for everything else.

export const COLORS = {
  bgCanvas: "#09090b",
  bgSurface: "#18181b",
  bgElevated: "#27272a",
  borderSubtle: "rgba(255,255,255,0.06)",
  borderDefault: "rgba(255,255,255,0.1)",
  textPrimary: "#fafafa",
  textSecondary: "#a1a1aa",
  textTertiary: "#71717a",
  accentPrimary: "#ff4655",
  accentGlow: "rgba(255,70,85,0.12)",
  statusWin: "#10b981",
  statusLoss: "#f43f5e",
} as const;

export const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/tokens.ts
git commit -m "feat(ui): design token JS constants"
```

---

## Phase 2 — Component Primitives

### Task 3: Card, SectionLabel, StatusDot

**Files:**
- Create: `src/components/shared/Card.tsx`
- Create: `src/components/shared/SectionLabel.tsx`
- Create: `src/components/shared/StatusDot.tsx`

- [ ] **Step 1: `src/components/shared/Card.tsx`**

```tsx
import * as React from 'react';

type CardPadding = 'compact' | 'comfortable' | 'hero';

const PADDING: Record<CardPadding, string> = {
  compact: 'p-4',
  comfortable: 'p-5',
  hero: 'p-6',
};

type CardProps = {
  padding?: CardPadding;
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Card({
  padding = 'comfortable',
  interactive,
  className = '',
  children,
}: CardProps) {
  const base =
    'rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-[background-color,border-color,filter] duration-150';
  const hover = interactive
    ? 'cursor-pointer hover:border-[var(--border-default)] hover:brightness-[1.08]'
    : '';
  return (
    <div className={`${base} ${PADDING[padding]} ${hover} ${className}`}>{children}</div>
  );
}

type CardHeaderProps = {
  label?: string;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

export function CardHeader({ label, action, className = '', children }: CardHeaderProps) {
  return (
    <div className={`mb-3 flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        {label && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
            {label}
          </span>
        )}
        {children}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: `src/components/shared/SectionLabel.tsx`**

```tsx
type Props = { children: React.ReactNode; className?: string };

export function SectionLabel({ children, className = '' }: Props) {
  return (
    <span
      className={`text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] ${className}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 3: `src/components/shared/StatusDot.tsx`**

```tsx
type Tone = 'live' | 'win' | 'loss' | 'idle' | 'captain';

const COLOR: Record<Tone, string> = {
  live: 'bg-[var(--accent-primary)]',
  win: 'bg-[var(--status-win)]',
  loss: 'bg-[var(--status-loss)]',
  idle: 'bg-[var(--text-tertiary)]',
  captain: 'bg-[var(--accent-primary)]',
};

type Props = { tone?: Tone; pulse?: boolean; className?: string };

export function StatusDot({ tone = 'idle', pulse, className = '' }: Props) {
  return (
    <span className={`relative inline-flex h-1.5 w-1.5 ${className}`}>
      {pulse && (
        <span
          className={`live-pulse-ring absolute inset-0 inline-flex rounded-full ${COLOR[tone]}`}
        />
      )}
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${COLOR[tone]}`} />
    </span>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/Card.tsx src/components/shared/SectionLabel.tsx src/components/shared/StatusDot.tsx
git commit -m "feat(ui): Card, SectionLabel, StatusDot primitives"
```

---

### Task 4: Button primitive

**Files:**
- Create: `src/components/shared/Button.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client';
import * as React from 'react';

type Variant = 'primary' | 'secondary' | 'destructive' | 'hero' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-white text-zinc-950 hover:bg-white/90 disabled:bg-white/50',
  secondary:
    'bg-white/5 text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-white/10',
  destructive:
    'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20',
  hero:
    'bg-[var(--accent-primary)] text-white hover:bg-[#e03e4d]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5',
};

const SIZE: Record<Size, string> = {
  sm: 'h-7 px-3 text-[12px]',
  md: 'h-8 px-4 text-[13px]',
  lg: 'h-10 px-5 text-[14px]',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', icon, className = '', children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-50';
    return (
      <button
        ref={ref}
        className={`${base} ${VARIANT[variant]} ${SIZE[size]} ${className}`}
        {...props}
      >
        {icon && <span className="-ml-0.5 inline-flex h-3.5 w-3.5 items-center">{icon}</span>}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/Button.tsx
git commit -m "feat(ui): Button primitive — primary/secondary/destructive/hero/ghost"
```

---

### Task 5: Badge + PointsDelta rewrite + RankArrow

**Files:**
- Create: `src/components/shared/Badge.tsx` (new — replaces shadcn badge usage via alias)
- Modify: `src/components/shared/PointsDelta.tsx`
- Modify: `src/components/shared/RankArrow.tsx`

- [ ] **Step 1: `src/components/shared/Badge.tsx`**

```tsx
import * as React from 'react';

type BadgeVariant = 'neutral' | 'live' | 'win' | 'loss' | 'captain' | 'outline';

const VARIANT: Record<BadgeVariant, string> = {
  neutral: 'bg-white/5 text-[var(--text-secondary)]',
  live: 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]',
  win: 'bg-emerald-500/10 text-emerald-400',
  loss: 'bg-rose-500/10 text-rose-400',
  captain: 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]',
  outline: 'border border-[var(--border-default)] text-[var(--text-secondary)]',
};

type BadgeProps = {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
};

export function Badge({ variant = 'neutral', className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex h-5 items-center rounded-sm px-1.5 text-[10px] font-medium uppercase tracking-wider ${VARIANT[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Rewrite `src/components/shared/PointsDelta.tsx`**

```tsx
type Props = { value: number; showSuffix?: boolean };

export function PointsDelta({ value, showSuffix = true }: Props) {
  const rounded = Math.round(value * 10) / 10;
  const color =
    rounded > 0
      ? 'text-emerald-400'
      : rounded < 0
        ? 'text-rose-400'
        : 'text-[var(--text-tertiary)]';
  const prefix = rounded > 0 ? '+' : '';
  return (
    <span className={`inline-flex items-baseline gap-1 font-mono tabular-nums ${color}`}>
      <span className="text-[14px] font-semibold">
        {prefix}
        {rounded.toFixed(1)}
      </span>
      {showSuffix && (
        <span className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)]">
          pts
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 3: Rewrite `src/components/shared/RankArrow.tsx`**

```tsx
export function RankArrow({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-emerald-400">
        ▲<span className="tabular-nums">{change}</span>
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-rose-400">
        ▼<span className="tabular-nums">{Math.abs(change)}</span>
      </span>
    );
  }
  return <span className="font-mono text-[10px] text-[var(--text-tertiary)]">—</span>;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/Badge.tsx src/components/shared/PointsDelta.tsx src/components/shared/RankArrow.tsx
git commit -m "feat(ui): Badge, PointsDelta, RankArrow — premium styling"
```

---

### Task 6: DataTable + Skeleton + TeamLogo

**Files:**
- Create: `src/components/shared/DataTable.tsx`
- Create: `src/components/shared/Skeleton.tsx`
- Create: `src/components/shared/TeamLogo.tsx`

- [ ] **Step 1: `src/components/shared/DataTable.tsx`**

This wraps any table markup so we get consistent premium styling.

```tsx
import * as React from 'react';

type DataTableProps = {
  children: React.ReactNode;
  className?: string;
};

export function DataTable({ children, className = '' }: DataTableProps) {
  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <table className="w-full border-collapse text-[13px]">
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 bg-[var(--bg-surface)]">
      {children}
    </thead>
  );
}

export function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`h-10 border-b border-[var(--border-subtle)] px-3 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] ${className}`}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

type TrProps = {
  children: React.ReactNode;
  active?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
  className?: string;
};

export function Tr({ children, active, hoverable = true, onClick, className = '' }: TrProps) {
  return (
    <tr
      onClick={onClick}
      className={`group border-b border-[var(--border-subtle)] transition-colors duration-150 ${
        hoverable ? 'hover:bg-white/[0.03]' : ''
      } ${active ? 'bg-white/[0.03]' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {active && (
        <td className="w-0 p-0">
          <div className="absolute h-10 w-0.5 bg-[var(--accent-primary)]" />
        </td>
      )}
      {children}
    </tr>
  );
}

export function Td({
  children,
  className = '',
  numeric,
}: {
  children: React.ReactNode;
  className?: string;
  numeric?: boolean;
}) {
  return (
    <td
      className={`h-12 px-3 align-middle text-[var(--text-primary)] ${
        numeric ? 'font-mono tabular-nums text-[13px]' : ''
      } ${className}`}
    >
      {children}
    </td>
  );
}
```

- [ ] **Step 2: `src/components/shared/Skeleton.tsx`**

```tsx
type Props = { className?: string };

export function Skeleton({ className = '' }: Props) {
  return <div className={`skeleton rounded-md ${className}`} />;
}
```

- [ ] **Step 3: `src/components/shared/TeamLogo.tsx`**

```tsx
type Props = {
  name: string;
  shortCode: string;
  size?: number;
  className?: string;
};

// Team logos from vlr.gg aren't safe to hotlink. Render a stylized initials
// chip as the canonical team logo — consistent across the app, zero external
// deps. We can swap to real logos later by changing only this component.
export function TeamLogo({ name, shortCode, size = 24, className = '' }: Props) {
  const initial = (shortCode || name).slice(0, 3).toUpperCase();
  return (
    <span
      aria-label={name}
      title={name}
      className={`inline-flex items-center justify-center rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-elevated)] font-mono font-semibold text-[var(--text-secondary)] ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, Math.round(size * 0.4)),
        letterSpacing: '0.02em',
      }}
    >
      {initial}
    </span>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/DataTable.tsx src/components/shared/Skeleton.tsx src/components/shared/TeamLogo.tsx
git commit -m "feat(ui): DataTable, Skeleton, TeamLogo primitives"
```

---

## Phase 3 — App Shell

### Task 7: Navbar rewrite

**Files:**
- Rewrite: `src/components/layout/Navbar.tsx`
- Create: `src/components/layout/LeagueStatusDot.tsx`

- [ ] **Step 1: `src/components/layout/LeagueStatusDot.tsx`**

```tsx
import { StatusDot } from '@/components/shared/StatusDot';

type Props = {
  status: string; // LeagueStatus enum as string
  hasLiveMatch: boolean;
};

export function LeagueStatusDot({ status, hasLiveMatch }: Props) {
  if (hasLiveMatch) return <StatusDot tone="live" pulse />;
  if (status === 'ACTIVE') return <StatusDot tone="win" />;
  if (status === 'DRAFTING' || status === 'DRAFT_PENDING') return <StatusDot tone="captain" />;
  return <StatusDot tone="idle" />;
}
```

- [ ] **Step 2: Rewrite `src/components/layout/Navbar.tsx`**

```tsx
import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LeagueStatusDot } from './LeagueStatusDot';

type NavbarProps = {
  leagueName: string;
  leagueStatus: string;
  leagueSlug: string;
  isCommissioner: boolean;
  hasLiveMatch: boolean;
};

export async function Navbar({
  leagueName,
  leagueStatus,
  leagueSlug,
  isCommissioner,
  hasLiveMatch,
}: NavbarProps) {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <header className="fixed top-0 right-0 left-0 z-50 flex h-[52px] items-center justify-between border-b border-[var(--border-subtle)] glass px-5">
      {/* Wordmark */}
      <Link href="/leagues" className="font-display text-[14px] font-semibold tracking-tight">
        <span className="text-[var(--text-primary)]">VCT </span>
        <span className="shimmer">FANTASY</span>
      </Link>

      {/* League pill */}
      <div className="hidden items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-white/[0.03] px-3 py-1 text-[12px] text-[var(--text-secondary)] md:inline-flex">
        <LeagueStatusDot status={leagueStatus} hasLiveMatch={hasLiveMatch} />
        <span>{leagueName}</span>
      </div>

      {/* Avatar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]">
          <Avatar className="h-6 w-6">
            <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? ''} />
            <AvatarFallback className="bg-[var(--bg-elevated)] text-[10px] text-[var(--text-secondary)]">
              {(session.user.name ?? '?')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 border-[var(--border-default)] bg-[var(--bg-surface)]"
        >
          <div className="px-2 py-1.5 text-[12px] text-[var(--text-secondary)]">
            {session.user.name}
          </div>
          <DropdownMenuSeparator />
          <Link href="/leagues">
            <DropdownMenuItem className="cursor-pointer text-[13px]">
              Switch League
            </DropdownMenuItem>
          </Link>
          {isCommissioner && (
            <Link href={`/admin/leagues/${leagueSlug}`}>
              <DropdownMenuItem className="cursor-pointer text-[13px]">Admin</DropdownMenuItem>
            </Link>
          )}
          <DropdownMenuSeparator />
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
          >
            <DropdownMenuItem className="cursor-pointer text-[13px]" nativeButton>
              <button type="submit" className="w-full text-left">
                Sign Out
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Navbar.tsx src/components/layout/LeagueStatusDot.tsx
git commit -m "feat(ui): glass navbar with shimmer wordmark + status dot"
```

---

### Task 8: Sidebar rewrite

**Files:**
- Rewrite: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Install lucide-react if missing**

```bash
npm ls lucide-react 2>&1 | grep lucide-react || npm install lucide-react
```

- [ ] **Step 2: Replace `src/components/layout/Sidebar.tsx`**

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Trophy,
  Users,
  Search,
  Calendar,
  ArrowLeftRight,
  Clock,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { SectionLabel } from '@/components/shared/SectionLabel';
import { StatusDot } from '@/components/shared/StatusDot';

const NAV_ITEMS = [
  { href: '', label: 'Dashboard', Icon: Home },
  { href: '/leaderboard', label: 'Leaderboard', Icon: Trophy },
  { href: '/roster', label: 'Roster', Icon: Users },
  { href: '/players', label: 'Players', Icon: Search },
  { href: '/matches', label: 'Matches', Icon: Calendar },
  { href: '/trades', label: 'Trades', Icon: ArrowLeftRight },
  { href: '/history', label: 'History', Icon: Clock },
] as const;

type Props = {
  leagueSlug: string;
  isCommissioner: boolean;
  pendingTradesCount: number;
  hasLiveMatch: boolean;
};

export function Sidebar({
  leagueSlug,
  isCommissioner,
  pendingTradesCount,
  hasLiveMatch,
}: Props) {
  const pathname = usePathname();
  const base = `/leagues/${leagueSlug}`;

  return (
    <aside className="fixed top-[52px] left-0 hidden h-[calc(100vh-52px)] w-60 border-r border-[var(--border-subtle)] glass lg:flex lg:flex-col">
      <div className="px-4 pt-4 pb-2">
        <SectionLabel>League</SectionLabel>
      </div>
      <nav className="flex flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const fullHref = `${base}${item.href}`;
          const isActive = item.href === '' ? pathname === base : pathname.startsWith(fullHref);
          const Icon = item.Icon;
          const showLiveDot = item.label === 'Dashboard' && hasLiveMatch;
          const showTradeBadge = item.label === 'Trades' && pendingTradesCount > 0;

          return (
            <Link
              key={item.label}
              href={fullHref}
              className={`relative flex h-8 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]'
              }`}
            >
              {isActive && (
                <span className="absolute top-1 left-0 h-6 w-0.5 rounded-r-full bg-[var(--accent-primary)]" />
              )}
              <Icon size={14} strokeWidth={1.5} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
              {showLiveDot && <StatusDot tone="live" pulse />}
              {showTradeBadge && (
                <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500/20 px-1 text-[10px] font-semibold text-rose-400">
                  {pendingTradesCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {isCommissioner && (
        <>
          <div className="mt-6 px-4 pb-2">
            <SectionLabel>Commissioner</SectionLabel>
          </div>
          <nav className="flex flex-col gap-0.5 px-3">
            <Link
              href={`/admin/leagues/${leagueSlug}`}
              className="flex h-8 items-center gap-3 rounded-md px-3 text-[13px] font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
            >
              <Settings size={14} strokeWidth={1.5} />
              <span>Admin</span>
            </Link>
            <Link
              href={`/admin/leagues/${leagueSlug}/audit`}
              className="flex h-8 items-center gap-3 rounded-md px-3 text-[13px] font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
            >
              <ShieldCheck size={14} strokeWidth={1.5} />
              <span>Audit</span>
            </Link>
          </nav>
        </>
      )}
    </aside>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(ui): premium sidebar — lucide icons, glass, active accent rail"
```

---

### Task 9: AppShell layout tweaks

**Files:**
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/app/leagues/[slug]/layout.tsx`

- [ ] **Step 1: Rewrite `src/components/layout/AppShell.tsx`**

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
      <Navbar
        leagueName={leagueName}
        leagueStatus={leagueStatus}
        leagueSlug={leagueSlug}
        isCommissioner={isCommissioner}
        hasLiveMatch={hasLiveMatch}
      />
      <Sidebar
        leagueSlug={leagueSlug}
        isCommissioner={isCommissioner}
        pendingTradesCount={pendingTradesCount}
        hasLiveMatch={hasLiveMatch}
      />
      <main className="pt-[52px] lg:pl-60">
        <div className="mx-auto w-full max-w-[1280px] px-5 py-10 md:px-8">
          {children}
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Verify `src/app/leagues/[slug]/layout.tsx` passes `hasLiveMatch`**

Check the existing file to ensure the `AppShell` is called with all 6 props — `hasLiveMatch` in particular. If missing, add it by checking `db.match.findFirst({ where: { leagueId: league.id, status: 'LIVE' } })`.

The file should already pass this from the earlier UI plan. Open it and verify. If not, edit to add.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppShell.tsx src/app/leagues/[slug]/layout.tsx
git commit -m "feat(ui): AppShell — premium spacing + hasLiveMatch prop"
```

---

## Phase 4 — Dashboard

### Task 10: LivePulse, LiveMatchHero, NextMatchCard

**Files:**
- Create: `src/components/dashboard/LivePulse.tsx`
- Rewrite: `src/components/dashboard/LiveMatchHero.tsx`
- Create: `src/components/dashboard/NextMatchCard.tsx`

- [ ] **Step 1: `src/components/dashboard/LivePulse.tsx`**

```tsx
export function LivePulse() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="live-pulse-ring absolute inset-0 inline-flex rounded-full bg-[var(--accent-primary)]" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
    </span>
  );
}
```

- [ ] **Step 2: Rewrite `src/components/dashboard/LiveMatchHero.tsx`**

```tsx
import { TeamLogo } from '@/components/shared/TeamLogo';
import { LivePulse } from './LivePulse';

type Props = {
  team1Name: string;
  team1ShortCode: string;
  team2Name: string;
  team2ShortCode: string;
  team1Wins: number;
  team2Wins: number;
  currentMap: string | null;
  currentMapScore?: { t1: number; t2: number };
};

export function LiveMatchHero({
  team1Name,
  team1ShortCode,
  team2Name,
  team2ShortCode,
  team1Wins,
  team2Wins,
  currentMap,
  currentMapScore,
}: Props) {
  const totalRounds = currentMapScore ? currentMapScore.t1 + currentMapScore.t2 : 0;
  const progressPct = Math.min(100, (totalRounds / 24) * 100);

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      {/* Background logos */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between opacity-[0.05]">
        <div className="-ml-16 h-60 w-60">
          <TeamLogo name={team1Name} shortCode={team1ShortCode} size={240} />
        </div>
        <div className="-mr-16 h-60 w-60">
          <TeamLogo name={team2Name} shortCode={team2ShortCode} size={240} />
        </div>
      </div>

      {/* Center radial glow */}
      <div className="pointer-events-none absolute inset-0" style={{
        background:
          'radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 60%)',
      }} />

      {/* Top-left LIVE pill */}
      <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-black/40 px-2.5 py-1 backdrop-blur-sm">
        <LivePulse />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white">Live</span>
      </div>

      {/* Top-right map info */}
      {currentMap && (
        <div className="absolute top-4 right-4 z-10 text-right">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Current map</div>
          <div className="font-display text-[14px] text-[var(--text-primary)]">
            {currentMap}
            {currentMapScore && (
              <span className="ml-2 font-mono text-[12px] tabular-nums text-[var(--text-secondary)]">
                {currentMapScore.t1}–{currentMapScore.t2}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Center */}
      <div className="relative flex h-60 items-center justify-center gap-12 px-8">
        <div className="text-right">
          <div className="font-display text-[40px] leading-none font-medium tracking-tight text-[var(--text-primary)]">
            {team1Name}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <ScoreDigit value={team1Wins} winning={team1Wins > team2Wins} />
          <span className="font-display text-[28px] text-[var(--text-tertiary)]">–</span>
          <ScoreDigit value={team2Wins} winning={team2Wins > team1Wins} />
        </div>
        <div className="text-left">
          <div className="font-display text-[40px] leading-none font-medium tracking-tight text-[var(--text-primary)]">
            {team2Name}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--bg-elevated)]">
        <div
          className="h-full bg-[var(--accent-primary)] transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}

function ScoreDigit({ value, winning }: { value: number; winning: boolean }) {
  return (
    <span
      className={`font-display text-[56px] font-semibold tabular-nums leading-none ${
        winning ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
      }`}
      style={
        winning
          ? { textShadow: '0 0 32px rgba(255,70,85,0.35)' }
          : undefined
      }
    >
      {value}
    </span>
  );
}
```

- [ ] **Step 3: `src/components/dashboard/NextMatchCard.tsx`**

```tsx
import { TeamLogo } from '@/components/shared/TeamLogo';

type Props = {
  team1Name: string;
  team1ShortCode: string;
  team2Name: string;
  team2ShortCode: string;
  scheduledAt: Date | string;
};

function formatCountdown(target: Date): string {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return 'Starting soon';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${mins.toString().padStart(2, '0')}m`);
  return parts.join(' ');
}

export function NextMatchCard({
  team1Name,
  team1ShortCode,
  team2Name,
  team2ShortCode,
  scheduledAt,
}: Props) {
  const target = typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt;
  const countdown = formatCountdown(target);
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="flex h-[180px] items-center justify-between gap-8 px-8">
        <div className="flex items-center gap-3">
          <TeamLogo name={team1Name} shortCode={team1ShortCode} size={48} />
          <div className="font-display text-[28px] text-[var(--text-primary)]">{team1Name}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Next match</div>
          <div className="mt-1 font-display text-[32px] font-medium tabular-nums text-[var(--text-primary)]">
            {countdown}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-display text-[28px] text-[var(--text-primary)]">{team2Name}</div>
          <TeamLogo name={team2Name} shortCode={team2ShortCode} size={48} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/LivePulse.tsx src/components/dashboard/LiveMatchHero.tsx src/components/dashboard/NextMatchCard.tsx
git commit -m "feat(ui): broadcast-style LiveMatchHero + NextMatchCard"
```

---

### Task 11: YourLineup, StandingsStrip, UpcomingMatches, RecentResults, ActivityFeed

**Files:**
- Create: `src/components/dashboard/YourLineup.tsx`
- Rewrite: `src/components/dashboard/StandingsStrip.tsx` (rename from `CompressedStandings.tsx` if it exists — create new, keep old for now)
- Modify: `src/components/dashboard/UpcomingMatches.tsx`
- Modify: `src/components/dashboard/RecentResults.tsx`
- Modify: `src/components/dashboard/ActivityFeed.tsx`

- [ ] **Step 1: `src/components/dashboard/YourLineup.tsx`**

```tsx
import { Card, CardHeader } from '@/components/shared/Card';
import { PointsDelta } from '@/components/shared/PointsDelta';

type LineupLine = {
  handle: string;
  teamShort: string;
  isCaptain: boolean;
  kills: number;
  deaths: number;
  assists: number;
  total: number;
};

export function YourLineup({ lines }: { lines: LineupLine[] }) {
  if (lines.length === 0) return null;
  return (
    <Card padding="comfortable">
      <CardHeader label="Your lineup" />
      <ul className="space-y-2">
        {lines.map((l) => (
          <li
            key={l.handle}
            className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
          >
            <div className="flex min-w-0 items-center gap-2">
              {l.isCaptain && (
                <span className="text-[var(--accent-primary)]" aria-label="Captain">★</span>
              )}
              <span className="truncate text-[14px] font-medium text-[var(--text-primary)]">
                {l.handle}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                {l.teamShort}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[12px] tabular-nums text-[var(--text-secondary)]">
              <span>
                {l.kills}/{l.deaths}/{l.assists}
              </span>
              <PointsDelta value={l.total} showSuffix={false} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
```

- [ ] **Step 2: `src/components/dashboard/StandingsStrip.tsx`**

```tsx
import Link from 'next/link';
import { Card, CardHeader } from '@/components/shared/Card';

type Row = {
  userId: string;
  rank: number;
  username: string;
  total: number;
  isMe: boolean;
};

export function StandingsStrip({ rows, leagueSlug }: { rows: Row[]; leagueSlug: string }) {
  return (
    <Card padding="compact">
      <CardHeader label="Standings" />
      <ul className="divide-y divide-[var(--border-subtle)]">
        {rows.map((r) => {
          const delta =
            r.rank === 1 && rows[1] ? r.total - rows[1].total : 0;
          return (
            <li key={r.userId}>
              <Link
                href={`/leagues/${leagueSlug}/rosters/${r.userId}`}
                className={`relative flex h-10 items-center gap-3 px-2 transition-colors hover:bg-white/[0.03] ${
                  r.isMe ? 'bg-white/[0.03]' : ''
                }`}
              >
                {r.isMe && (
                  <span className="absolute top-1 bottom-1 left-0 w-0.5 rounded-r-full bg-[var(--accent-primary)]" />
                )}
                <span className="w-6 font-mono text-[11px] tabular-nums text-[var(--text-tertiary)]">
                  {r.rank}
                </span>
                <span className="flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">
                  {r.username}
                </span>
                {r.rank === 1 && delta > 0 && (
                  <span className="rounded-sm bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400 tabular-nums">
                    +{delta.toFixed(1)}
                  </span>
                )}
                <span className="font-mono text-[14px] font-semibold tabular-nums text-[var(--text-primary)]">
                  {r.total.toFixed(1)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
```

- [ ] **Step 3: Replace `src/components/dashboard/UpcomingMatches.tsx`**

```tsx
import { Card, CardHeader } from '@/components/shared/Card';
import { TeamLogo } from '@/components/shared/TeamLogo';

type UpcomingRow = {
  id: string;
  team1Name: string;
  team1ShortCode: string;
  team2Name: string;
  team2ShortCode: string;
  scheduledAt: Date | string;
  myPlayers: string[]; // handles
};

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function UpcomingMatches({ matches }: { matches: UpcomingRow[] }) {
  if (matches.length === 0) {
    return (
      <Card padding="comfortable">
        <CardHeader label="Upcoming" />
        <p className="text-[13px] text-[var(--text-tertiary)]">No upcoming matches.</p>
      </Card>
    );
  }
  return (
    <Card padding="compact">
      <CardHeader label="Upcoming" />
      <ul className="divide-y divide-[var(--border-subtle)]">
        {matches.map((m) => (
          <li
            key={m.id}
            className={`relative flex items-center gap-3 px-2 py-2.5 ${
              m.myPlayers.length > 0 ? 'pl-3' : ''
            }`}
          >
            {m.myPlayers.length > 0 && (
              <span className="absolute top-1 bottom-1 left-0 w-0.5 rounded-r-full bg-[var(--accent-primary)]" />
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-2 text-[13px]">
                <TeamLogo name={m.team1Name} shortCode={m.team1ShortCode} size={16} />
                <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  {m.team1ShortCode}
                </span>
                <span className="text-[var(--text-tertiary)]">vs</span>
                <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  {m.team2ShortCode}
                </span>
                <TeamLogo name={m.team2Name} shortCode={m.team2ShortCode} size={16} />
              </div>
              {m.myPlayers.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {m.myPlayers.map((p) => (
                    <span
                      key={p}
                      className="font-mono text-[10px] text-[var(--accent-primary)]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="font-mono text-[11px] tabular-nums text-[var(--text-tertiary)]">
              {formatDate(m.scheduledAt)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
```

- [ ] **Step 4: Replace `src/components/dashboard/RecentResults.tsx`**

```tsx
import { Card, CardHeader } from '@/components/shared/Card';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { PointsDelta } from '@/components/shared/PointsDelta';

type RecentRow = {
  id: string;
  team1Name: string;
  team1ShortCode: string;
  team2Name: string;
  team2ShortCode: string;
  team1Wins: number;
  team2Wins: number;
  fantasyDelta?: number;
  completedAt: Date | string;
};

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function RecentResults({ matches }: { matches: RecentRow[] }) {
  if (matches.length === 0) return null;
  return (
    <Card padding="compact">
      <CardHeader label="Recent results" />
      <ul className="divide-y divide-[var(--border-subtle)]">
        {matches.map((m) => {
          const t1Won = m.team1Wins > m.team2Wins;
          return (
            <li
              key={m.id}
              className="group flex items-center gap-3 px-2 py-3 transition-colors hover:bg-white/[0.03]"
            >
              <TeamLogo name={m.team1Name} shortCode={m.team1ShortCode} size={24} />
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  className={`text-[13px] font-medium ${
                    t1Won ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {m.team1ShortCode}
                </span>
                <span className="font-display text-[20px] font-semibold tabular-nums text-[var(--text-primary)]">
                  {m.team1Wins}–{m.team2Wins}
                </span>
                <span
                  className={`text-[13px] font-medium ${
                    !t1Won ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {m.team2ShortCode}
                </span>
              </div>
              <TeamLogo name={m.team2Name} shortCode={m.team2ShortCode} size={24} />
              <span className="ml-2 hidden font-mono text-[11px] tabular-nums text-[var(--text-tertiary)] group-hover:hidden sm:inline">
                {formatDate(m.completedAt)}
              </span>
              {m.fantasyDelta !== undefined && m.fantasyDelta !== 0 && (
                <span className="ml-2 hidden sm:inline">
                  <PointsDelta value={m.fantasyDelta} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
```

- [ ] **Step 5: Replace `src/components/dashboard/ActivityFeed.tsx`**

```tsx
import { Card, CardHeader } from '@/components/shared/Card';
import { ArrowLeftRight, UserPlus, Star, Zap } from 'lucide-react';

type ActivityEvent = {
  id: string;
  type: 'trade' | 'free_agency' | 'captain_change' | 'score';
  description: string;
  timestamp: Date | string;
};

function relativeTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Icon({ type }: { type: ActivityEvent['type'] }) {
  const common = 'h-3 w-3 text-[var(--text-tertiary)]';
  if (type === 'trade') return <ArrowLeftRight className={common} strokeWidth={1.5} />;
  if (type === 'free_agency') return <UserPlus className={common} strokeWidth={1.5} />;
  if (type === 'captain_change') return <Star className={common} strokeWidth={1.5} />;
  return <Zap className={common} strokeWidth={1.5} />;
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <Card padding="compact" className="relative">
      <CardHeader label="Activity" />
      <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
        {events.map((e) => (
          <li key={e.id} className="flex items-start gap-2 text-[12px]">
            <span className="mt-0.5 shrink-0">
              <Icon type={e.type} />
            </span>
            <span className="flex-1 text-[var(--text-secondary)]">{e.description}</span>
            <span className="shrink-0 font-mono text-[10px] text-[var(--text-tertiary)]">
              {relativeTime(e.timestamp)}
            </span>
          </li>
        ))}
        {events.length === 0 && (
          <li className="text-[12px] text-[var(--text-tertiary)]">No activity yet.</li>
        )}
      </ul>
      <div
        className="pointer-events-none absolute right-0 bottom-0 left-0 h-8 rounded-b-lg"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, var(--bg-surface) 100%)',
        }}
      />
    </Card>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard
git commit -m "feat(ui): premium dashboard panels (lineup, standings, upcoming, recent, feed)"
```

---

### Task 12: Dashboard page assembly

**Files:**
- Modify: `src/app/leagues/[slug]/page.tsx`

- [ ] **Step 1: Rewrite the dashboard page**

```tsx
import { auth } from '@/lib/auth';
import {
  getDashboard,
  getUpcomingMatches,
  getRecentMatches,
} from '@/server/queries/dashboard';
import { getLeagueHistory } from '@/server/queries/history';
import { LiveMatchHero } from '@/components/dashboard/LiveMatchHero';
import { NextMatchCard } from '@/components/dashboard/NextMatchCard';
import { YourLineup } from '@/components/dashboard/YourLineup';
import { StandingsStrip } from '@/components/dashboard/StandingsStrip';
import { UpcomingMatches } from '@/components/dashboard/UpcomingMatches';
import { RecentResults } from '@/components/dashboard/RecentResults';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { computeGamePoints } from '@/lib/scoring/rules';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

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

  const upcoming = await getUpcomingMatches(slug, 5);
  const recent = await getRecentMatches(slug, 3);
  const history = await getLeagueHistory(slug);

  // Compute lineup lines if a live match exists
  let heroBlock: React.ReactNode;
  let lineup: Parameters<typeof YourLineup>[0]['lines'] = [];
  if (data.liveMatch) {
    const t1Wins = data.liveMatch.games.filter((g) => g.winnerTeamId === data.liveMatch!.team1Id).length;
    const t2Wins = data.liveMatch.games.filter((g) => g.winnerTeamId === data.liveMatch!.team2Id).length;
    const currentMap = data.liveMatch.games.at(-1)?.mapName ?? null;
    const currentGame = data.liveMatch.games.at(-1);
    const currentMapScore = currentGame
      ? { t1: currentGame.team1Score, t2: currentGame.team2Score }
      : undefined;

    heroBlock = (
      <LiveMatchHero
        team1Name={data.liveMatch.team1.name}
        team1ShortCode={data.liveMatch.team1.shortCode}
        team2Name={data.liveMatch.team2.name}
        team2ShortCode={data.liveMatch.team2.shortCode}
        team1Wins={t1Wins}
        team2Wins={t2Wins}
        currentMap={currentMap}
        currentMapScore={currentMapScore}
      />
    );

    const captainIds = new Set(
      data.myRoster.filter((r) => r.isCaptain).map((r) => r.player.id),
    );
    const agg = new Map<
      string,
      { handle: string; teamShort: string; isCaptain: boolean; kills: number; deaths: number; assists: number; total: number }
    >();
    for (const g of data.liveMatch.games) {
      for (const stat of g.stats) {
        if (!data.myPlayerIds.has(stat.playerId)) continue;
        const existing = agg.get(stat.playerId) ?? {
          handle: stat.player.handle,
          teamShort: stat.player.team.shortCode,
          isCaptain: captainIds.has(stat.playerId),
          kills: 0,
          deaths: 0,
          assists: 0,
          total: 0,
        };
        const breakdown = computeGamePoints(
          { kills: stat.kills, deaths: stat.deaths, assists: stat.assists, aces: stat.aces, won: stat.won },
          DEFAULT_LEAGUE_SETTINGS,
        );
        existing.kills += stat.kills;
        existing.deaths += stat.deaths;
        existing.assists += stat.assists;
        existing.total += existing.isCaptain
          ? breakdown.total * DEFAULT_LEAGUE_SETTINGS.captainMultiplier
          : breakdown.total;
        agg.set(stat.playerId, existing);
      }
    }
    lineup = [...agg.values()];
  } else if (upcoming.length > 0) {
    const next = upcoming[0];
    heroBlock = (
      <NextMatchCard
        team1Name={next.team1.name}
        team1ShortCode={next.team1.shortCode}
        team2Name={next.team2.name}
        team2ShortCode={next.team2.shortCode}
        scheduledAt={next.scheduledAt}
      />
    );
  } else {
    heroBlock = (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-10 text-center text-[13px] text-[var(--text-tertiary)]">
        No matches scheduled.
      </div>
    );
  }

  const meRow = data.leaderboard.find((r) => r.userId === session.user.id);
  const standingsRows = data.leaderboard.slice(0, 7).map((r) => ({
    userId: r.userId,
    rank: r.rank,
    username: r.username,
    total: r.total,
    isMe: r.userId === session.user.id,
  }));

  const myRosterPlayerIds = new Set(data.myRoster.map((r) => r.player.id));
  const upcomingRows = upcoming.map((m) => ({
    id: m.id,
    team1Name: m.team1.name,
    team1ShortCode: m.team1.shortCode,
    team2Name: m.team2.name,
    team2ShortCode: m.team2.shortCode,
    scheduledAt: m.scheduledAt,
    myPlayers: data.myRoster
      .filter(
        (r) =>
          r.player && (
            // We don't have per-match team info at this layer; empty for now.
            false
          ),
      )
      .map((r) => r.player.handle),
  }));

  const recentRows = recent.map((m) => ({
    id: m.id,
    team1Name: m.team1.name,
    team1ShortCode: m.team1.shortCode,
    team2Name: m.team2.name,
    team2ShortCode: m.team2.shortCode,
    team1Wins: m.games.filter((g) => g.winnerTeamId === m.team1Id).length,
    team2Wins: m.games.filter((g) => g.winnerTeamId === m.team2Id).length,
    completedAt: m.scheduledAt,
    fantasyDelta: 0, // TODO once per-match roster + snapshot deltas per user wired
  }));

  const recentEvents = history.slice(0, 8).map((e) => ({
    id: e.id,
    type: e.type,
    description: e.description,
    timestamp: e.timestamp,
  }));

  return (
    <div className="space-y-6">
      {heroBlock}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.618fr_1fr]">
        <div className="space-y-6">
          {data.liveMatch && <YourLineup lines={lineup} />}
          <RecentResults matches={recentRows} />
        </div>
        <div className="space-y-6">
          <StandingsStrip rows={standingsRows} leagueSlug={slug} />
          <UpcomingMatches matches={upcomingRows} />
          <ActivityFeed events={recentEvents} />
        </div>
      </div>
      {meRow && (
        <div className="text-center text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
          You are ranked #{meRow.rank} · {meRow.total.toFixed(1)} pts
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/leagues/[slug]/page.tsx
git commit -m "feat(ui): premium dashboard assembly — golden-ratio grid"
```

---

## Phase 5 — League Pages

### Task 13: Leaderboard podium + table

**Files:**
- Create: `src/components/leaderboard/PodiumStrip.tsx`
- Rewrite: `src/components/leaderboard/LeaderboardTable.tsx`
- Modify: `src/app/leagues/[slug]/leaderboard/page.tsx`

- [ ] **Step 1: `src/components/leaderboard/PodiumStrip.tsx`**

```tsx
type PodiumEntry = {
  userId: string;
  rank: 1 | 2 | 3;
  username: string;
  total: number;
};

const ORDER: Array<{ rank: 1 | 2 | 3; height: string; order: string }> = [
  { rank: 2, height: 'h-[140px]', order: 'order-1' },
  { rank: 1, height: 'h-[160px]', order: 'order-2' },
  { rank: 3, height: 'h-[140px]', order: 'order-3' },
];

export function PodiumStrip({ entries }: { entries: PodiumEntry[] }) {
  const byRank = new Map(entries.map((e) => [e.rank, e]));
  return (
    <div className="grid grid-cols-3 gap-3">
      {ORDER.map(({ rank, height, order }) => {
        const entry = byRank.get(rank);
        if (!entry) return <div key={rank} className={order} />;
        return (
          <div
            key={rank}
            className={`relative flex ${height} flex-col items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] ${order}`}
          >
            {rank === 1 && (
              <div
                className="pointer-events-none absolute inset-0 rounded-lg"
                style={{
                  background:
                    'radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)',
                }}
              />
            )}
            <span className="font-display text-[72px] font-semibold leading-none tabular-nums text-[var(--text-primary)]">
              {entry.rank}
            </span>
            <span className="mt-2 text-[14px] font-medium text-[var(--text-primary)]">
              {entry.username}
            </span>
            <span className="mt-0.5 font-mono text-[16px] font-semibold tabular-nums text-[var(--text-secondary)]">
              {entry.total.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/components/leaderboard/LeaderboardTable.tsx`**

```tsx
'use client';
import * as React from 'react';
import { DataTable, THead, Th, TBody, Tr, Td } from '@/components/shared/DataTable';
import { RankArrow } from '@/components/shared/RankArrow';
import { ChevronDown } from 'lucide-react';

type Contribution = {
  playerId: string;
  handle: string;
  team: string;
  total: number;
  isCaptain: boolean;
  onRoster: boolean;
};

export type LeaderboardRowData = {
  userId: string;
  rank: number;
  username: string;
  total: number;
  captainHandle: string | null;
  wins: number;
  losses: number;
  contributions: Contribution[];
  isMe: boolean;
};

export function LeaderboardTable({ rows }: { rows: LeaderboardRowData[] }) {
  const [open, setOpen] = React.useState<string | null>(null);

  return (
    <DataTable>
      <THead>
        <tr>
          <Th className="w-10">#</Th>
          <Th>Manager</Th>
          <Th>Captain</Th>
          <Th className="text-right">Record</Th>
          <Th className="text-right">Points</Th>
          <Th className="w-8" />
        </tr>
      </THead>
      <TBody>
        {rows.map((r) => {
          const isOpen = open === r.userId;
          return (
            <React.Fragment key={r.userId}>
              <Tr
                active={r.isMe}
                onClick={() => setOpen(isOpen ? null : r.userId)}
              >
                <Td numeric className="text-[var(--text-tertiary)]">
                  {r.rank}
                </Td>
                <Td>{r.username}</Td>
                <Td className="text-[var(--text-secondary)]">
                  {r.captainHandle ? (
                    <span>
                      <span className="text-[var(--accent-primary)]">★ </span>
                      {r.captainHandle}
                    </span>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td numeric className="text-right text-[var(--text-secondary)]">
                  {r.wins}–{r.losses}
                </Td>
                <Td numeric className="text-right font-semibold">
                  {r.total.toFixed(1)}
                </Td>
                <Td className="w-8 text-right">
                  <ChevronDown
                    size={14}
                    strokeWidth={1.5}
                    className={`text-[var(--text-tertiary)] transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Td>
              </Tr>
              {isOpen && (
                <tr>
                  <td colSpan={6} className="border-b border-[var(--border-subtle)] bg-black/20 px-4 py-3">
                    <Breakdown contributions={r.contributions} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </TBody>
    </DataTable>
  );
}

function Breakdown({ contributions }: { contributions: Contribution[] }) {
  const current = contributions.filter((c) => c.onRoster);
  const dropped = contributions.filter((c) => !c.onRoster);
  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 lg:grid-cols-3">
        {current.map((c) => (
          <li
            key={c.playerId}
            className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] px-2 py-1.5 text-[12px]"
          >
            <span className="flex items-center gap-1.5">
              {c.isCaptain && <span className="text-[var(--accent-primary)]">★</span>}
              <span className="text-[var(--text-primary)]">{c.handle}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                {c.team}
              </span>
            </span>
            <span className="font-mono text-[12px] tabular-nums">{c.total.toFixed(1)}</span>
          </li>
        ))}
      </ul>
      {dropped.length > 0 && (
        <>
          <div className="mt-3 border-t border-[var(--border-subtle)] pt-2">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Dropped / Traded
            </span>
          </div>
          <ul className="grid grid-cols-1 gap-1 opacity-60 md:grid-cols-2 lg:grid-cols-3">
            {dropped.map((c) => (
              <li
                key={c.playerId}
                className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] px-2 py-1.5 text-[12px]"
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[var(--text-secondary)]">{c.handle}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                    {c.team}
                  </span>
                </span>
                <span className="font-mono text-[12px] tabular-nums text-[var(--text-secondary)]">
                  {c.total.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `src/app/leagues/[slug]/leaderboard/page.tsx`**

```tsx
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getLeaderboard } from '@/server/queries/leaderboard';
import { PodiumStrip } from '@/components/leaderboard/PodiumStrip';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { computeGamePoints } from '@/lib/scoring/rules';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const rows = await getLeaderboard(slug);

  const league = await db.league.findUnique({ where: { slug } });
  if (!league) return null;

  // Build contribution breakdowns per manager
  const slots = await db.rosterSlot.findMany({
    where: { leagueId: league.id },
    include: { player: { include: { team: true } } },
  });
  const snaps = await db.scoringSnapshot.findMany({
    where: { leagueId: league.id },
    include: { player: { include: { team: true } } },
  });

  const currentPlayerByUser = new Map<string, Set<string>>();
  const captainByUser = new Map<string, string>();
  for (const s of slots) {
    const ids = currentPlayerByUser.get(s.userId) ?? new Set();
    ids.add(s.playerId);
    currentPlayerByUser.set(s.userId, ids);
    if (s.isCaptain) captainByUser.set(s.userId, s.player.handle);
  }

  const enriched = rows.map((r) => {
    const userSnaps = snaps.filter((s) => s.userId === r.userId);
    const byPlayer = new Map<string, { player: typeof userSnaps[0]['player']; total: number }>();
    for (const s of userSnaps) {
      const prev = byPlayer.get(s.playerId);
      byPlayer.set(s.playerId, {
        player: s.player,
        total: (prev?.total ?? 0) + s.total,
      });
    }
    const contributions = [...byPlayer.values()].map((c) => {
      const onRoster = currentPlayerByUser.get(r.userId)?.has(c.player.id) ?? false;
      const slot = slots.find((x) => x.userId === r.userId && x.playerId === c.player.id);
      return {
        playerId: c.player.id,
        handle: c.player.handle,
        team: c.player.team.shortCode,
        total: c.total,
        isCaptain: slot?.isCaptain ?? false,
        onRoster,
      };
    });
    contributions.sort((a, b) => b.total - a.total);

    // Wins/losses = count of games where any owned player won/lost
    // Approximate via snapshots (each snap is a game stat)
    const wins = userSnaps.filter((s) => {
      const breakdown = s.breakdownJson as unknown as ReturnType<typeof computeGamePoints>;
      return breakdown?.winBonus === DEFAULT_LEAGUE_SETTINGS.winPts;
    }).length;
    const losses = userSnaps.length - wins;

    return {
      userId: r.userId,
      rank: r.rank,
      username: r.username,
      total: r.total,
      captainHandle: captainByUser.get(r.userId) ?? null,
      wins,
      losses,
      contributions,
      isMe: r.userId === session?.user?.id,
    };
  });

  const podium = enriched.slice(0, 3).map((e, i) => ({
    userId: e.userId,
    rank: (i + 1) as 1 | 2 | 3,
    username: e.username,
    total: e.total,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          Leaderboard
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Click any row to reveal the per-player breakdown.
        </p>
      </div>
      {podium.length === 3 && <PodiumStrip entries={podium} />}
      <LeaderboardTable rows={enriched} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/leaderboard src/app/leagues/[slug]/leaderboard
git commit -m "feat(ui): leaderboard podium + expandable table with contributions"
```

---

### Task 14: Roster captain banner + portrait cards

**Files:**
- Create: `src/components/roster/CaptainBanner.tsx`
- Create: `src/components/roster/PlayerPortraitCard.tsx`
- Modify: `src/app/leagues/[slug]/roster/page.tsx` (preserve interactive client wiring if present)
- Modify: `src/app/leagues/[slug]/rosters/[userId]/page.tsx`

- [ ] **Step 1: `src/components/roster/CaptainBanner.tsx`**

```tsx
import { TeamLogo } from '@/components/shared/TeamLogo';
import { Badge } from '@/components/shared/Badge';

type Props = {
  handle: string;
  teamName: string;
  teamShortCode: string;
  totalPoints: number;
};

export function CaptainBanner({ handle, teamName, teamShortCode, totalPoints }: Props) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="absolute top-0 right-0 left-0 h-0.5 bg-[var(--accent-primary)]" />
      <div className="flex h-[120px] items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-4">
          <TeamLogo name={teamName} shortCode={teamShortCode} size={56} />
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="captain">★ Captain · 1.5×</Badge>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
                {teamShortCode}
              </span>
            </div>
            <h2 className="mt-1 font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
              {handle}
            </h2>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Total</div>
          <div className="mt-0.5 font-mono text-[32px] font-semibold tabular-nums text-[var(--text-primary)]">
            {totalPoints.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `src/components/roster/PlayerPortraitCard.tsx`**

```tsx
'use client';
import { Button } from '@/components/shared/Button';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { Star } from 'lucide-react';

type Props = {
  handle: string;
  teamName: string;
  teamShortCode: string;
  totalPoints: number;
  kills: number;
  deaths: number;
  assists: number;
  mapsPlayed: number;
  captainCooldownDays: number | null;
  onDrop?: () => void;
  onTrade?: () => void;
  onMakeCaptain?: () => void;
  readOnly?: boolean;
};

export function PlayerPortraitCard({
  handle,
  teamName,
  teamShortCode,
  totalPoints,
  kills,
  deaths,
  assists,
  mapsPlayed,
  captainCooldownDays,
  onDrop,
  onTrade,
  onMakeCaptain,
  readOnly,
}: Props) {
  const cooldownActive = captainCooldownDays !== null && captainCooldownDays > 0;
  return (
    <div className="relative flex h-[220px] flex-col justify-between overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-start justify-between">
        <TeamLogo name={teamName} shortCode={teamShortCode} size={32} />
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
          {mapsPlayed} maps
        </span>
      </div>
      <div>
        <h3 className="font-display text-[24px] leading-tight font-medium text-[var(--text-primary)]">
          {handle}
        </h3>
        <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
          {teamShortCode}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="space-y-0.5 font-mono text-[11px] tabular-nums text-[var(--text-secondary)]">
          <div>K {kills} · D {deaths} · A {assists}</div>
          <div className="text-[18px] font-semibold text-[var(--text-primary)]">
            {totalPoints.toFixed(1)}
          </div>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={onDrop}>
              Drop
            </Button>
            <Button size="sm" variant="secondary" onClick={onTrade}>
              Trade
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={cooldownActive}
              onClick={onMakeCaptain}
              icon={<Star size={14} strokeWidth={1.5} />}
              title={cooldownActive ? `Available in ${captainCooldownDays}d` : 'Make captain'}
            >
              {cooldownActive ? `${captainCooldownDays}d` : 'Captain'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `src/app/leagues/[slug]/roster/page.tsx`**

Preserve any existing RosterClient interactive wrapper — just replace its inner rendering. If no client wrapper exists, read the current file and keep the server action wiring through whatever hooks already exist.

```tsx
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getRoster } from '@/server/queries/roster';
import { getPlayerPool } from '@/server/queries/players';
import { CaptainBanner } from '@/components/roster/CaptainBanner';
import { RosterClient } from '@/components/roster/RosterClient';
import { isOlderThanDays } from '@/lib/time';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

export default async function RosterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const data = await getRoster(slug, session.user.id);
  if (!data) return null;
  const pool = await getPlayerPool(slug);
  const settings = (data.league.settingsJson as unknown as typeof DEFAULT_LEAGUE_SETTINGS) ?? DEFAULT_LEAGUE_SETTINGS;

  // Captain cooldown remaining
  const lastChange = await db.captainChange.findFirst({
    where: { leagueId: data.league.id, userId: session.user.id },
    orderBy: { changedAt: 'desc' },
  });
  let cooldownDays: number | null = null;
  if (lastChange) {
    const ageMs = Date.now() - lastChange.changedAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const remaining = settings.captainCooldownDays - ageDays;
    if (remaining > 0) cooldownDays = Math.ceil(remaining);
    if (isOlderThanDays(lastChange.changedAt, settings.captainCooldownDays)) {
      cooldownDays = null;
    }
  }

  // Per-player aggregates for this user's roster
  const byHandle = new Map(pool.map((p) => [p.handle.toLowerCase(), p]));
  const enriched = data.slots.map((s) => {
    const pp = byHandle.get(s.player.handle.toLowerCase());
    return {
      id: s.id,
      playerId: s.player.id,
      handle: s.player.handle,
      teamName: s.player.team.name,
      teamShortCode: s.player.team.shortCode,
      isCaptain: s.isCaptain,
      totalPoints: pp?.totalPoints ?? 0,
      kills: pp?.totalKills ?? 0,
      deaths: pp?.totalDeaths ?? 0,
      assists: pp?.totalAssists ?? 0,
      mapsPlayed: pp?.mapsPlayed ?? 0,
    };
  });

  const captain = enriched.find((p) => p.isCaptain) ?? null;
  const others = enriched.filter((p) => !p.isCaptain);

  // Other managers for trade target dropdown
  const members = await db.leagueMembership.findMany({
    where: { leagueId: data.league.id, userId: { not: session.user.id } },
    include: { user: true },
  });

  const freeAgents = pool
    .filter((p) => !p.ownerUserId)
    .map((p) => ({
      id: p.id,
      handle: p.handle,
      teamName: p.teamName,
      totalPoints: p.totalPoints,
    }));

  const otherRosters = await Promise.all(
    members.map(async (m) => ({
      userId: m.userId,
      username: m.user.username,
      players: (
        await db.rosterSlot.findMany({
          where: { leagueId: data.league.id, userId: m.userId },
          include: { player: true },
        })
      ).map((s) => ({ id: s.player.id, handle: s.player.handle })),
    })),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          Your Roster
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Your 5-player squad. Captain gets a 1.5× multiplier on points earned.
        </p>
      </div>
      {captain && (
        <CaptainBanner
          handle={captain.handle}
          teamName={captain.teamName}
          teamShortCode={captain.teamShortCode}
          totalPoints={captain.totalPoints}
        />
      )}
      <RosterClient
        leagueSlug={slug}
        otherPlayers={others}
        freeAgents={freeAgents}
        otherManagers={otherRosters}
        captainCooldownDays={cooldownDays}
      />
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `src/components/roster/RosterClient.tsx` rendering**

Open the existing file, replace its grid of PlayerCards with a 2×2 grid of `<PlayerPortraitCard>`. Keep the existing dialog open/close state and server action calls (drop, trade, captain).

If the file doesn't exist, create it:

```tsx
'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PlayerPortraitCard } from './PlayerPortraitCard';
import { FreeAgencyModal } from './FreeAgencyModal';
import { TradeProposalFlow } from './TradeProposalFlow';
import { changeCaptain } from '@/lib/actions/captain';

type PlayerSlot = {
  id: string;
  playerId: string;
  handle: string;
  teamName: string;
  teamShortCode: string;
  totalPoints: number;
  kills: number;
  deaths: number;
  assists: number;
  mapsPlayed: number;
};

type FreeAgent = {
  id: string;
  handle: string;
  teamName: string;
  totalPoints: number;
};

type OtherManager = {
  userId: string;
  username: string;
  players: Array<{ id: string; handle: string }>;
};

type Props = {
  leagueSlug: string;
  otherPlayers: PlayerSlot[];
  freeAgents: FreeAgent[];
  otherManagers: OtherManager[];
  captainCooldownDays: number | null;
};

export function RosterClient({
  leagueSlug,
  otherPlayers,
  freeAgents,
  otherManagers,
  captainCooldownDays,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [dropPlayer, setDropPlayer] = React.useState<PlayerSlot | null>(null);
  const [tradePlayer, setTradePlayer] = React.useState<PlayerSlot | null>(null);

  function onMakeCaptain(playerId: string) {
    startTransition(async () => {
      try {
        await changeCaptain({ leagueSlug, newCaptainPlayerId: playerId });
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : 'failed');
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {otherPlayers.map((p) => (
          <PlayerPortraitCard
            key={p.id}
            handle={p.handle}
            teamName={p.teamName}
            teamShortCode={p.teamShortCode}
            totalPoints={p.totalPoints}
            kills={p.kills}
            deaths={p.deaths}
            assists={p.assists}
            mapsPlayed={p.mapsPlayed}
            captainCooldownDays={captainCooldownDays}
            onDrop={() => setDropPlayer(p)}
            onTrade={() => setTradePlayer(p)}
            onMakeCaptain={() => !isPending && onMakeCaptain(p.playerId)}
          />
        ))}
      </div>
      {dropPlayer && (
        <FreeAgencyModal
          leagueSlug={leagueSlug}
          droppedPlayer={{ id: dropPlayer.playerId, handle: dropPlayer.handle }}
          freeAgents={freeAgents}
          onClose={() => setDropPlayer(null)}
        />
      )}
      {tradePlayer && (
        <TradeProposalFlow
          leagueSlug={leagueSlug}
          initialOfferedPlayer={{ id: tradePlayer.playerId, handle: tradePlayer.handle }}
          otherManagers={otherManagers}
          onClose={() => setTradePlayer(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/roster src/app/leagues/[slug]/roster src/app/leagues/[slug]/rosters
git commit -m "feat(ui): captain banner + portrait roster cards"
```

---

### Task 15: Players page — filter pills + data table

**Files:**
- Create: `src/components/players/PlayersFilterBar.tsx`
- Modify: `src/app/leagues/[slug]/players/page.tsx`

- [ ] **Step 1: `src/components/players/PlayersFilterBar.tsx`**

```tsx
'use client';
import { Search } from 'lucide-react';

type Ownership = 'all' | 'free' | 'owned';

type Props = {
  teams: string[];
  selectedTeam: string | null;
  ownership: Ownership;
  search: string;
  onTeamChange: (t: string | null) => void;
  onOwnershipChange: (o: Ownership) => void;
  onSearchChange: (s: string) => void;
};

export function PlayersFilterBar({
  teams,
  selectedTeam,
  ownership,
  search,
  onTeamChange,
  onOwnershipChange,
  onSearchChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        {(['all', 'free', 'owned'] as const).map((key) => (
          <button
            key={key}
            onClick={() => onOwnershipChange(key)}
            className={`h-7 rounded-full border px-3 text-[12px] font-medium transition-colors ${
              ownership === key
                ? 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/[0.04]'
            }`}
          >
            {key === 'all' ? 'All' : key === 'free' ? 'Free Agents' : 'Owned'}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex max-w-full flex-wrap items-center gap-1 overflow-x-auto">
          <button
            onClick={() => onTeamChange(null)}
            className={`h-7 rounded-full border px-2.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
              selectedTeam === null
                ? 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            All teams
          </button>
          {teams.map((t) => (
            <button
              key={t}
              onClick={() => onTeamChange(t)}
              className={`h-7 rounded-full border px-2.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                selectedTeam === t
                  ? 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search
            size={14}
            strokeWidth={1.5}
            className="absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--text-tertiary)]"
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search players…"
            className="h-7 w-48 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] pr-3 pl-8 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--text-secondary)] focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/leagues/[slug]/players/page.tsx` to use the new filter bar + DataTable**

Replace the existing file with a client-rendered wrapper (server fetches data, hands to a client component that renders PlayersFilterBar + DataTable + PlayerDrawer).

Create `src/components/players/PlayersClient.tsx`:

```tsx
'use client';
import * as React from 'react';
import { PlayersFilterBar } from './PlayersFilterBar';
import { DataTable, THead, Th, TBody, Tr, Td } from '@/components/shared/DataTable';
import { PlayerDrawer } from '@/components/shared/PlayerDrawer';
import { Badge } from '@/components/shared/Badge';

export type PlayerRow = {
  id: string;
  handle: string;
  teamName: string;
  teamShortCode: string;
  ownerUsername: string | null;
  totalPoints: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  mapsPlayed: number;
};

export function PlayersClient({ rows }: { rows: PlayerRow[] }) {
  const [ownership, setOwnership] = React.useState<'all' | 'free' | 'owned'>('all');
  const [team, setTeam] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [openId, setOpenId] = React.useState<string | null>(null);

  const teams = React.useMemo(
    () => [...new Set(rows.map((r) => r.teamShortCode))].sort(),
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (ownership === 'free' && r.ownerUsername) return false;
    if (ownership === 'owned' && !r.ownerUsername) return false;
    if (team && r.teamShortCode !== team) return false;
    if (search && !r.handle.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <PlayersFilterBar
        teams={teams}
        selectedTeam={team}
        ownership={ownership}
        search={search}
        onTeamChange={setTeam}
        onOwnershipChange={setOwnership}
        onSearchChange={setSearch}
      />
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <DataTable>
          <THead>
            <tr>
              <Th>Player</Th>
              <Th>Team</Th>
              <Th>Owner</Th>
              <Th className="text-right">Points</Th>
              <Th className="text-right">K</Th>
              <Th className="text-right">D</Th>
              <Th className="text-right">A</Th>
              <Th className="text-right">Maps</Th>
            </tr>
          </THead>
          <TBody>
            {filtered.map((r) => (
              <Tr key={r.id} onClick={() => setOpenId(r.id)}>
                <Td>
                  <span className="flex items-center gap-1.5">
                    {!r.ownerUsername && (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    )}
                    <span className="font-medium text-[var(--text-primary)]">{r.handle}</span>
                  </span>
                </Td>
                <Td>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
                    {r.teamShortCode}
                  </span>
                </Td>
                <Td>
                  {r.ownerUsername ? (
                    <Badge variant="neutral">{r.ownerUsername}</Badge>
                  ) : (
                    <Badge variant="win">Free Agent</Badge>
                  )}
                </Td>
                <Td numeric className="text-right font-semibold">
                  {r.totalPoints.toFixed(1)}
                </Td>
                <Td numeric className="text-right">
                  {r.totalKills}
                </Td>
                <Td numeric className="text-right">
                  {r.totalDeaths}
                </Td>
                <Td numeric className="text-right">
                  {r.totalAssists}
                </Td>
                <Td numeric className="text-right">
                  {r.mapsPlayed}
                </Td>
              </Tr>
            ))}
          </TBody>
        </DataTable>
      </div>
      <PlayerDrawer
        playerId={openId}
        open={!!openId}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}
```

Then update `page.tsx`:

```tsx
import { getPlayerPool } from '@/server/queries/players';
import { PlayersClient } from '@/components/players/PlayersClient';

export default async function PlayersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rows = await getPlayerPool(slug);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          Players
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Full player pool. Click any row for the full stat breakdown.
        </p>
      </div>
      <PlayersClient rows={rows} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/players src/app/leagues/[slug]/players
git commit -m "feat(ui): players page — pill filters + premium data table"
```

---

### Task 16: Matches page — tabs + week groups

**Files:**
- Create: `src/components/matches/MatchesTabs.tsx`
- Create: `src/components/matches/WeekGroup.tsx`
- Rewrite: `src/components/shared/MatchCard.tsx`
- Modify: `src/app/leagues/[slug]/matches/page.tsx`

- [ ] **Step 1: `src/components/matches/MatchesTabs.tsx`**

```tsx
'use client';
import * as React from 'react';

export type Tab = 'upcoming' | 'live' | 'completed';

type Props = {
  active: Tab;
  onChange: (t: Tab) => void;
  liveCount: number;
};

const LABELS: Record<Tab, string> = {
  upcoming: 'Upcoming',
  live: 'Live',
  completed: 'Completed',
};

export function MatchesTabs({ active, onChange, liveCount }: Props) {
  return (
    <div className="relative flex border-b border-[var(--border-subtle)]">
      {(['upcoming', 'live', 'completed'] as const).map((t) => {
        const isActive = t === active;
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`relative flex h-9 items-center gap-2 px-4 text-[13px] font-medium transition-colors ${
              isActive
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {LABELS[t]}
            {t === 'live' && liveCount > 0 && (
              <span className="inline-flex h-4 items-center rounded-full bg-[var(--accent-primary)]/20 px-1.5 text-[10px] font-semibold text-[var(--accent-primary)]">
                {liveCount}
              </span>
            )}
            {isActive && (
              <span className="absolute right-3 bottom-0 left-3 h-0.5 rounded-t bg-[var(--accent-primary)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: `src/components/matches/WeekGroup.tsx`**

```tsx
type Props = {
  title: string;
  children: React.ReactNode;
};

export function WeekGroup({ title, children }: Props) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="font-display text-[14px] font-medium text-[var(--text-secondary)]">
          {title}
        </span>
        <span className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
```

- [ ] **Step 3: Replace `src/components/shared/MatchCard.tsx`**

```tsx
'use client';
import { TeamLogo } from './TeamLogo';
import { Badge } from './Badge';
import { PointsDelta } from './PointsDelta';
import { StatusDot } from './StatusDot';

type Props = {
  team1Name: string;
  team1ShortCode: string;
  team1Score?: string;
  team2Name: string;
  team2ShortCode: string;
  team2Score?: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  date?: string;
  time?: string;
  series?: string;
  fantasyDelta?: number;
  myPlayerHandles?: string[];
  onClick?: () => void;
};

export function MatchCard({
  team1Name,
  team1ShortCode,
  team1Score,
  team2Name,
  team2ShortCode,
  team2Score,
  status,
  date,
  time,
  series,
  fantasyDelta,
  myPlayerHandles,
  onClick,
}: Props) {
  const hasMine = myPlayerHandles && myPlayerHandles.length > 0;
  return (
    <button
      onClick={onClick}
      className={`group relative flex h-[72px] w-full items-center gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 text-left transition-colors duration-150 hover:border-[var(--border-default)] hover:brightness-[1.06] ${
        hasMine ? 'pl-5' : ''
      }`}
    >
      {hasMine && (
        <span className="absolute top-3 bottom-3 left-0 w-0.5 rounded-r-full bg-[var(--accent-primary)]" />
      )}
      <div className="flex flex-1 items-center gap-3">
        <TeamLogo name={team1Name} shortCode={team1ShortCode} size={28} />
        <span className="font-display text-[16px] text-[var(--text-primary)]">{team1ShortCode}</span>
        <span className="mx-2 font-display text-[22px] font-semibold tabular-nums text-[var(--text-primary)]">
          {team1Score ?? '—'}
        </span>
        <span className="text-[var(--text-tertiary)]">–</span>
        <span className="font-display text-[22px] font-semibold tabular-nums text-[var(--text-primary)]">
          {team2Score ?? '—'}
        </span>
        <span className="font-display text-[16px] text-[var(--text-primary)]">{team2ShortCode}</span>
        <TeamLogo name={team2Name} shortCode={team2ShortCode} size={28} />
      </div>
      <div className="flex items-center gap-2">
        {status === 'LIVE' && (
          <span className="inline-flex items-center gap-1.5">
            <StatusDot tone="live" pulse />
            <Badge variant="live">Live</Badge>
          </span>
        )}
        {series && (
          <Badge variant="neutral">{series}</Badge>
        )}
        {time && (
          <span className="font-mono text-[11px] tabular-nums text-[var(--text-tertiary)]">
            {time}
          </span>
        )}
        {date && (
          <span className="font-mono text-[11px] tabular-nums text-[var(--text-tertiary)]">
            {date}
          </span>
        )}
        {fantasyDelta !== undefined && fantasyDelta !== 0 && (
          <PointsDelta value={fantasyDelta} />
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 4: Update `src/components/matches/MatchesClient.tsx` to use MatchesTabs + WeekGroup + new MatchCard**

```tsx
'use client';
import * as React from 'react';
import { MatchesTabs, type Tab } from './MatchesTabs';
import { WeekGroup } from './WeekGroup';
import { MatchCard } from '@/components/shared/MatchCard';
import { MatchDrawer } from '@/components/shared/MatchDrawer';

type MatchRow = {
  id: string;
  team1Name: string;
  team1ShortCode: string;
  team2Name: string;
  team2ShortCode: string;
  team1Wins: number;
  team2Wins: number;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  scheduledAt: string;
  series: string;
  fantasyDelta?: number;
};

type Props = {
  upcoming: MatchRow[];
  live: MatchRow[];
  completed: MatchRow[];
};

function groupByWeek(rows: MatchRow[]): Map<string, MatchRow[]> {
  const groups = new Map<string, MatchRow[]>();
  for (const r of rows) {
    const key = r.series || 'Other';
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  return groups;
}

export function MatchesClient({ upcoming, live, completed }: Props) {
  const [tab, setTab] = React.useState<Tab>(live.length > 0 ? 'live' : 'upcoming');
  const [openId, setOpenId] = React.useState<string | null>(null);

  const source = tab === 'upcoming' ? upcoming : tab === 'live' ? live : completed;
  const groups = groupByWeek(source);

  return (
    <div className="space-y-5">
      <MatchesTabs active={tab} onChange={setTab} liveCount={live.length} />
      {[...groups.entries()].map(([week, rows]) => (
        <WeekGroup key={week} title={week}>
          {rows.map((m) => {
            const date = new Date(m.scheduledAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });
            const t1s = m.status === 'UPCOMING' ? undefined : String(m.team1Wins);
            const t2s = m.status === 'UPCOMING' ? undefined : String(m.team2Wins);
            return (
              <MatchCard
                key={m.id}
                team1Name={m.team1Name}
                team1ShortCode={m.team1ShortCode}
                team2Name={m.team2Name}
                team2ShortCode={m.team2ShortCode}
                team1Score={t1s}
                team2Score={t2s}
                status={m.status}
                date={date}
                series={undefined /* already shown via group title */}
                fantasyDelta={m.fantasyDelta}
                onClick={() => setOpenId(m.id)}
              />
            );
          })}
        </WeekGroup>
      ))}
      <MatchDrawer matchId={openId} open={!!openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
```

- [ ] **Step 5: Update the page to pass serialized rows**

Update `src/app/leagues/[slug]/matches/page.tsx`:

```tsx
import { getMatchesByStatus } from '@/server/queries/matches';
import { MatchesClient } from '@/components/matches/MatchesClient';

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [upcoming, live, completed] = await Promise.all([
    getMatchesByStatus(slug, 'UPCOMING'),
    getMatchesByStatus(slug, 'LIVE'),
    getMatchesByStatus(slug, 'COMPLETED'),
  ]);

  const mapRow = (m: Awaited<ReturnType<typeof getMatchesByStatus>>[number]) => ({
    id: m.id,
    team1Name: m.team1.name,
    team1ShortCode: m.team1.shortCode,
    team2Name: m.team2.name,
    team2ShortCode: m.team2.shortCode,
    team1Wins: m.games.filter((g) => g.winnerTeamId === m.team1Id).length,
    team2Wins: m.games.filter((g) => g.winnerTeamId === m.team2Id).length,
    status: m.status,
    scheduledAt: m.scheduledAt.toISOString(),
    series: '', // series field requires per-match metadata we don't store; use week grouping later
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          Matches
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Every match in the event. Click any match for the full box score.
        </p>
      </div>
      <MatchesClient
        upcoming={upcoming.map(mapRow)}
        live={live.map(mapRow)}
        completed={completed.map(mapRow)}
      />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/matches src/components/shared/MatchCard.tsx src/app/leagues/[slug]/matches
git commit -m "feat(ui): matches page — animated tab underline + week groups + premium card"
```

---

### Task 17: Match detail page

**Files:**
- Rewrite: `src/app/leagues/[slug]/matches/[id]/page.tsx`

- [ ] **Step 1: Replace file**

```tsx
import { getMatchDetail } from '@/server/queries/matches';
import { db } from '@/lib/db';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { DataTable, THead, Th, TBody, Tr, Td } from '@/components/shared/DataTable';
import { Badge } from '@/components/shared/Badge';
import { computeGamePoints } from '@/lib/scoring/rules';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await getMatchDetail(id);
  if (!match) return <p>Match not found</p>;

  const rosterSlots = await db.rosterSlot.findMany({
    where: { leagueId: match.leagueId },
    include: { user: true },
  });
  const slotByPlayer = new Map(rosterSlots.map((s) => [s.playerId, s]));

  const t1Wins = match.games.filter((g) => g.winnerTeamId === match.team1Id).length;
  const t2Wins = match.games.filter((g) => g.winnerTeamId === match.team2Id).length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative h-[200px] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between opacity-[0.15]">
          <div className="-ml-8"><TeamLogo name={match.team1.name} shortCode={match.team1.shortCode} size={200} /></div>
          <div className="-mr-8"><TeamLogo name={match.team2.name} shortCode={match.team2.shortCode} size={200} /></div>
        </div>
        <div className="relative flex h-full items-center justify-center gap-10">
          <div className="text-right">
            <div className="font-display text-[20px] text-[var(--text-primary)]">{match.team1.name}</div>
          </div>
          <div className="flex items-baseline gap-4">
            <span className={`font-display text-[80px] font-semibold leading-none tabular-nums ${t1Wins > t2Wins ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
              {t1Wins}
            </span>
            <span className="font-display text-[40px] text-[var(--text-tertiary)]">–</span>
            <span className={`font-display text-[80px] font-semibold leading-none tabular-nums ${t2Wins > t1Wins ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
              {t2Wins}
            </span>
          </div>
          <div>
            <div className="font-display text-[20px] text-[var(--text-primary)]">{match.team2.name}</div>
          </div>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <Badge variant="neutral">{match.status}</Badge>
        </div>
      </div>

      {/* Per-map sections */}
      {match.games.map((g) => {
        const t1Won = g.winnerTeamId === match.team1Id;
        return (
          <div key={g.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-[24px] font-medium text-[var(--text-primary)]">{g.mapName}</h3>
              <span className="font-mono text-[18px] font-semibold tabular-nums text-[var(--text-secondary)]">
                {g.team1Score}–{g.team2Score}
              </span>
            </div>
            <DataTable>
              <THead>
                <tr>
                  <Th>Player</Th>
                  <Th>Team</Th>
                  <Th className="text-right">K</Th>
                  <Th className="text-right">D</Th>
                  <Th className="text-right">A</Th>
                  <Th className="text-right">Fantasy</Th>
                </tr>
              </THead>
              <TBody>
                {g.stats.map((s) => {
                  const slot = slotByPlayer.get(s.playerId);
                  const breakdown = computeGamePoints(
                    { kills: s.kills, deaths: s.deaths, assists: s.assists, aces: s.aces, won: s.won },
                    DEFAULT_LEAGUE_SETTINGS,
                  );
                  const won = s.won;
                  const rowBg = won && (won === t1Won)
                    ? 'bg-emerald-500/[0.04]'
                    : '';
                  return (
                    <Tr key={s.id} className={rowBg} hoverable={false}>
                      <Td>
                        <span className="flex items-center gap-1.5">
                          {slot?.isCaptain && <span className="text-[var(--accent-primary)]">★</span>}
                          <span className="font-medium text-[var(--text-primary)]">{s.player.handle}</span>
                          {slot && <Badge variant="neutral">{slot.user.username}</Badge>}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
                          {s.player.team.shortCode}
                        </span>
                      </Td>
                      <Td numeric className="text-right">{s.kills}</Td>
                      <Td numeric className="text-right">{s.deaths}</Td>
                      <Td numeric className="text-right">{s.assists}</Td>
                      <Td numeric className="text-right font-semibold">
                        {(slot?.isCaptain
                          ? breakdown.total * DEFAULT_LEAGUE_SETTINGS.captainMultiplier
                          : breakdown.total
                        ).toFixed(1)}
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </DataTable>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/leagues/[slug]/matches/[id]
git commit -m "feat(ui): match detail page — hero scoreline + per-map stat tables"
```

---

### Task 18: Trades page — tabs + stepper + premium modal

**Files:**
- Create: `src/components/trades/TradeStepper.tsx`
- Modify: `src/components/roster/TradeProposalFlow.tsx` (add stepper inside)
- Modify: `src/app/leagues/[slug]/trades/page.tsx`

- [ ] **Step 1: `src/components/trades/TradeStepper.tsx`**

```tsx
type Props = {
  current: 1 | 2 | 3 | 4;
};

const STEPS = [
  { n: 1, label: 'Offer' },
  { n: 2, label: 'Target' },
  { n: 3, label: 'Request' },
  { n: 4, label: 'Review' },
] as const;

export function TradeStepper({ current }: Props) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const isActive = s.n === current;
        const isPast = s.n < current;
        return (
          <div key={s.n} className="flex items-center gap-2">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums ${
                isPast
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
                  : isActive
                    ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                    : 'border-[var(--border-default)] text-[var(--text-tertiary)]'
              }`}
            >
              {s.n}
            </div>
            <span
              className={`text-[10px] font-medium uppercase tracking-wider ${
                isActive || isPast
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)]'
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="h-px w-6 bg-[var(--border-subtle)]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Update the existing `src/components/roster/TradeProposalFlow.tsx`**

Open the file and at the top of the modal content, render the `<TradeStepper current={step} />`. If the component doesn't track a step number yet, add state `const [step, setStep] = useState<1|2|3|4>(1)` and increment on Next. Preserve existing server action integration.

Apply Button primitive for the Next/Back/Submit buttons (replace raw `<button>` with `<Button>` from `@/components/shared/Button`). Apply primitive Card / Badge styling.

Since the current implementation of `TradeProposalFlow.tsx` is client-authored and we can't see it fully from this plan, the implementer will read the file, refactor it to a 4-step flow with back/next navigation, and wrap the inner content in premium styles:

- Modal container: `w-[520px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]`
- Header: h-14 flex with stepper + close button
- Footer: h-14 flex with right-aligned Back (secondary) + Next/Submit (primary white)

- [ ] **Step 3: Update `src/app/leagues/[slug]/trades/page.tsx`**

Also use `MatchesTabs`-style tabs (Inbox / History). Create a small `TradesTabs` if needed, or reuse the animated-underline pattern inline.

Rewrite the page with premium table styling:

```tsx
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { TradesClient } from '@/components/trades/TradesClient';

export default async function TradesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;
  const league = await db.league.findUnique({ where: { slug } });
  if (!league) return null;

  const trades = await db.trade.findMany({
    where: { leagueId: league.id },
    include: {
      proposer: true,
      receiver: true,
      items: { include: { player: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const inbox = trades.filter(
    (t) => t.receiverId === session.user.id && t.status === 'PROPOSED',
  );
  const history = trades.filter((t) => t.status !== 'PROPOSED');

  const rows = trades.map((t) => ({
    id: t.id,
    proposerName: t.proposer.username,
    receiverName: t.receiver.username,
    status: t.status,
    items: t.items.map((i) => ({
      handle: i.player.handle,
      direction: i.direction,
    })),
    isInbox: t.receiverId === session.user.id && t.status === 'PROPOSED',
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          Trades
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Propose, accept, and review manager-to-manager trades.
        </p>
      </div>
      <TradesClient
        inboxIds={inbox.map((t) => t.id)}
        historyIds={history.map((t) => t.id)}
        rows={rows}
        leagueSlug={slug}
      />
    </div>
  );
}
```

Replace `src/components/trades/TradesClient.tsx` (the existing file from the earlier plan):

```tsx
'use client';
import * as React from 'react';
import { TradeRow } from '@/components/trade/TradeRow';

type Row = {
  id: string;
  proposerName: string;
  receiverName: string;
  status: string;
  items: Array<{ handle: string; direction: 'PROPOSER_TO_RECEIVER' | 'RECEIVER_TO_PROPOSER' }>;
  isInbox: boolean;
  createdAt: string;
};

type Props = {
  inboxIds: string[];
  historyIds: string[];
  rows: Row[];
  leagueSlug: string;
};

type Tab = 'inbox' | 'history';

export function TradesClient({ inboxIds, historyIds, rows }: Props) {
  const [tab, setTab] = React.useState<Tab>(inboxIds.length > 0 ? 'inbox' : 'history');
  const ids = tab === 'inbox' ? inboxIds : historyIds;
  const visible = rows.filter((r) => ids.includes(r.id));

  return (
    <div className="space-y-5">
      <div className="relative flex border-b border-[var(--border-subtle)]">
        {(['inbox', 'history'] as const).map((t) => {
          const isActive = t === tab;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative flex h-9 items-center gap-2 px-4 text-[13px] font-medium transition-colors ${
                isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {t === 'inbox' ? 'Inbox' : 'History'}
              {t === 'inbox' && inboxIds.length > 0 && (
                <span className="inline-flex h-4 items-center rounded-full bg-[var(--accent-primary)]/20 px-1.5 text-[10px] font-semibold text-[var(--accent-primary)]">
                  {inboxIds.length}
                </span>
              )}
              {isActive && (
                <span className="absolute right-3 bottom-0 left-3 h-0.5 rounded-t bg-[var(--accent-primary)]" />
              )}
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        {visible.length === 0 && (
          <p className="py-8 text-center text-[13px] text-[var(--text-tertiary)]">
            Nothing here.
          </p>
        )}
        {visible.map((r) => (
          <TradeRow
            key={r.id}
            tradeId={r.id}
            proposerName={r.proposerName}
            receiverName={r.receiverName}
            items={r.items}
            role={r.isInbox ? 'receiver' : 'proposer'}
            status={r.status}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/trades src/app/leagues/[slug]/trades src/components/roster/TradeProposalFlow.tsx
git commit -m "feat(ui): trades page — premium tabs + stepper modal"
```

---

### Task 19: History page — vertical timeline

**Files:**
- Create: `src/components/history/HistoryTimeline.tsx`
- Modify: `src/app/leagues/[slug]/history/page.tsx`

- [ ] **Step 1: `src/components/history/HistoryTimeline.tsx`**

```tsx
'use client';
import * as React from 'react';
import { ArrowLeftRight, UserPlus, Star } from 'lucide-react';

type EventItem = {
  id: string;
  type: 'trade' | 'free_agency' | 'captain_change';
  description: string;
  timestamp: string;
  managers: string[];
};

function relative(ts: string): string {
  const d = new Date(ts);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Dot({ type }: { type: EventItem['type'] }) {
  const color =
    type === 'trade'
      ? 'bg-[var(--accent-primary)]'
      : type === 'free_agency'
        ? 'bg-emerald-400'
        : 'bg-amber-400';
  return (
    <span className="relative z-10 inline-flex h-3 w-3 items-center justify-center">
      <span className={`h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}

function Icon({ type }: { type: EventItem['type'] }) {
  const common = 'h-3 w-3 text-[var(--text-tertiary)]';
  if (type === 'trade') return <ArrowLeftRight className={common} strokeWidth={1.5} />;
  if (type === 'free_agency') return <UserPlus className={common} strokeWidth={1.5} />;
  return <Star className={common} strokeWidth={1.5} />;
}

type Props = {
  events: EventItem[];
  managers: string[];
};

export function HistoryTimeline({ events, managers }: Props) {
  const [typeFilter, setTypeFilter] = React.useState<EventItem['type'] | 'all'>('all');
  const [managerFilter, setManagerFilter] = React.useState<string | 'all'>('all');

  const visible = events.filter((e) => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    if (managerFilter !== 'all' && !e.managers.includes(managerFilter)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="h-7 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-[12px] text-[var(--text-primary)]"
        >
          <option value="all">All types</option>
          <option value="trade">Trades</option>
          <option value="free_agency">Free Agency</option>
          <option value="captain_change">Captain Changes</option>
        </select>
        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="h-7 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-[12px] text-[var(--text-primary)]"
        >
          <option value="all">All managers</option>
          {managers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <ol className="relative space-y-4 pl-8">
        <span className="absolute top-0 bottom-0 left-[7px] w-px bg-[var(--border-subtle)]" />
        {visible.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute top-0.5 -left-8">
              <Dot type={e.type} />
            </span>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]">
                <Icon type={e.type} />
                <span>{e.description}</span>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-[var(--text-tertiary)]">
                {relative(e.timestamp)}
              </span>
            </div>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="pl-0 text-[13px] text-[var(--text-tertiary)]">No matching events.</li>
        )}
      </ol>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/leagues/[slug]/history/page.tsx`**

```tsx
import { getLeagueHistory } from '@/server/queries/history';
import { db } from '@/lib/db';
import { HistoryTimeline } from '@/components/history/HistoryTimeline';

export default async function HistoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const events = await getLeagueHistory(slug);
  const league = await db.league.findUnique({
    where: { slug },
    include: { memberships: { include: { user: true } } },
  });
  const managers = league?.memberships.map((m) => m.user.username).sort() ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          History
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Every trade, free-agency pickup, and captain change — in order.
        </p>
      </div>
      <HistoryTimeline
        events={events.map((e) => ({
          id: e.id,
          type: e.type,
          description: e.description,
          timestamp: e.timestamp.toISOString(),
          managers: e.managers,
        }))}
        managers={managers}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/history src/app/leagues/[slug]/history
git commit -m "feat(ui): history timeline — vertical rail with type-colored dots"
```

---

### Task 20: Draft room — on-the-clock banner

**Files:**
- Create: `src/components/draft/OnTheClockBanner.tsx`
- Modify: `src/app/leagues/[slug]/draft/page.tsx`

- [ ] **Step 1: `src/components/draft/OnTheClockBanner.tsx`**

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type Props = {
  managerName: string;
  managerAvatarUrl: string | null;
  round: number;
  pickNumber: number;
  isYou: boolean;
};

export function OnTheClockBanner({
  managerName,
  managerAvatarUrl,
  round,
  pickNumber,
  isYou,
}: Props) {
  return (
    <div className="relative h-[80px] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(255,70,85,0.15) 0%, transparent 60%)',
        }}
      />
      <div className="relative flex h-full items-center gap-4 px-6">
        <Avatar className="h-12 w-12 ring-2 ring-[var(--accent-primary)]/30">
          <AvatarImage src={managerAvatarUrl ?? undefined} />
          <AvatarFallback className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
            {managerName[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            {isYou ? "You're on the clock" : 'On the clock'}
          </div>
          <div className="mt-0.5 font-display text-[28px] leading-none font-medium text-[var(--text-primary)]">
            {managerName}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Round · Pick
          </div>
          <div className="font-display text-[28px] font-semibold tabular-nums text-[var(--text-primary)]">
            R{round} · #{pickNumber}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/app/leagues/[slug]/draft/page.tsx`**

```tsx
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { makePick } from '@/lib/actions/draft';
import { OnTheClockBanner } from '@/components/draft/OnTheClockBanner';
import { DataTable, THead, Th, TBody, Tr, Td } from '@/components/shared/DataTable';
import { Button } from '@/components/shared/Button';
import { Card, CardHeader } from '@/components/shared/Card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default async function DraftPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const league = await db.league.findUnique({
    where: { slug },
    include: {
      draft: {
        include: {
          picks: { include: { player: { include: { team: true } }, user: true }, orderBy: { pickNumber: 'asc' } },
        },
      },
      memberships: { include: { user: true } },
      players: { include: { team: true } },
    },
  });
  if (!league?.draft) return <p>Draft not started.</p>;

  const order = league.draft.pickOrderJson as string[];
  const round = league.draft.currentRound;
  const idx = league.draft.currentPickIndex;
  const seat = round % 2 === 1 ? idx : order.length - 1 - idx;
  const currentUserId = order[seat];
  const currentUser = league.memberships.find((m) => m.userId === currentUserId)?.user;
  const isMyTurn = currentUserId === session.user.id;

  const takenIds = new Set(league.draft.picks.map((p) => p.playerId));
  const available = league.players.filter((p) => !takenIds.has(p.id));

  return (
    <div className="space-y-6">
      <OnTheClockBanner
        managerName={currentUser?.username ?? '—'}
        managerAvatarUrl={currentUser?.avatarUrl ?? null}
        round={round}
        pickNumber={idx + 1}
        isYou={isMyTurn}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card padding="compact">
          <CardHeader label="Available players" />
          <DataTable>
            <THead>
              <tr>
                <Th>Player</Th>
                <Th>Team</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </THead>
            <TBody>
              {available.map((p) => (
                <Tr key={p.id} hoverable>
                  <Td>
                    <span className="font-medium text-[var(--text-primary)]">{p.handle}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
                      {p.team.shortCode}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <form action={async () => { 'use server'; await makePick({ leagueSlug: slug, playerId: p.id }); }}>
                      <Button
                        type="submit"
                        size="sm"
                        variant={isMyTurn ? 'primary' : 'secondary'}
                        disabled={!isMyTurn}
                      >
                        Draft
                      </Button>
                    </form>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </DataTable>
        </Card>
        <div className="space-y-4">
          <Card padding="compact">
            <CardHeader label="Pick order" />
            <ol className="space-y-1">
              {order.map((uid, i) => {
                const u = league.memberships.find((m) => m.userId === uid)?.user;
                const isCurrent = uid === currentUserId;
                return (
                  <li
                    key={`${uid}-${i}`}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] ${
                      isCurrent ? 'bg-white/[0.04] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="w-6 font-mono text-[11px] tabular-nums text-[var(--text-tertiary)]">
                      {i + 1}
                    </span>
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={u?.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-[var(--bg-elevated)] text-[10px]">
                        {(u?.username ?? '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1">{u?.username ?? '—'}</span>
                  </li>
                );
              })}
            </ol>
          </Card>
          <Card padding="compact">
            <CardHeader label="Pick log" />
            <ol className="space-y-1 text-[12px]">
              {league.draft.picks.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">
                    <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                      R{p.round}.{p.pickNumber}
                    </span>{' '}
                    {p.user.username} → <span className="text-[var(--text-primary)]">{p.player.handle}</span>
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                    {p.player.team.shortCode}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/draft src/app/leagues/[slug]/draft
git commit -m "feat(ui): draft room — on-the-clock banner + premium pool table"
```

---

## Phase 6 — Admin / Audit

### Task 21: Admin home + league page

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/leagues/[slug]/page.tsx`

- [ ] **Step 1: Rewrite admin home**

```tsx
import { db } from '@/lib/db';
import Link from 'next/link';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';

export default async function AdminHomePage() {
  const leagues = await db.league.findMany({ orderBy: { startDate: 'desc' } });
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          Commissioner
        </h1>
        <Link href="/admin/leagues/new">
          <Button variant="primary" size="md">+ New League</Button>
        </Link>
      </div>
      <div className="space-y-2">
        {leagues.map((l) => (
          <Link key={l.id} href={`/admin/leagues/${l.slug}`}>
            <Card interactive padding="comfortable">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-[20px] font-medium text-[var(--text-primary)]">
                    {l.name}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--text-tertiary)]">
                    Started {l.startDate.toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="neutral">{l.status.replace('_', ' ')}</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite admin league detail**

```tsx
import Link from 'next/link';
import { db } from '@/lib/db';
import { adjustPoints } from '@/lib/actions/admin';
import { Card, CardHeader } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';

export default async function AdminLeaguePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const league = await db.league.findUnique({
    where: { slug },
    include: {
      memberships: { include: { user: true } },
      adjustments: { include: { user: true, createdBy: true }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!league) return <p>Not found.</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
            {league.name}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="neutral">{league.status.replace('_', ' ')}</Badge>
            <span className="text-[12px] text-[var(--text-tertiary)]">
              {league.memberships.length} managers
            </span>
          </div>
        </div>
        <Link href={`/admin/leagues/${slug}/audit`}>
          <Button variant="secondary">Audit trail →</Button>
        </Link>
      </div>

      {/* Adjustments */}
      <Card padding="comfortable">
        <CardHeader label="Point adjustments" />
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
          className="flex flex-col gap-2 md:flex-row md:items-end"
        >
          <div className="flex-1">
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Manager
            </label>
            <select
              name="userId"
              className="h-8 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-[13px] text-[var(--text-primary)]"
            >
              {league.memberships.map((m) => (
                <option key={m.userId} value={m.userId}>{m.user.username}</option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Delta
            </label>
            <input
              name="delta"
              type="number"
              step="0.1"
              required
              className="h-8 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-[13px] text-[var(--text-primary)]"
            />
          </div>
          <div className="flex-[2]">
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Reason
            </label>
            <input
              name="reason"
              required
              className="h-8 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-[13px] text-[var(--text-primary)]"
            />
          </div>
          <Button type="submit" variant="primary">Apply</Button>
        </form>
        {league.adjustments.length > 0 && (
          <ul className="mt-4 divide-y divide-[var(--border-subtle)]">
            {league.adjustments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-[12px]">
                <span className="text-[var(--text-primary)]">
                  <span className="font-medium">{a.user.username}</span>{' '}
                  <span className="text-[var(--text-tertiary)]">{a.reason}</span>
                </span>
                <span className={`font-mono tabular-nums ${a.delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {a.delta > 0 ? '+' : ''}
                  {a.delta.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Members */}
      <Card padding="comfortable">
        <CardHeader label="Members" />
        <ul className="divide-y divide-[var(--border-subtle)]">
          {league.memberships.map((m) => (
            <li key={m.userId} className="flex items-center justify-between py-2 text-[13px]">
              <span className="text-[var(--text-primary)]">{m.user.username}</span>
              <span className="font-mono text-[11px] text-[var(--text-tertiary)]">{m.user.discordId}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin
git commit -m "feat(ui): admin home + league detail with premium form + adjustment list"
```

---

### Task 22: Audit page polish

**Files:**
- Modify: `src/app/admin/leagues/[slug]/audit/page.tsx`
- Modify: `src/components/admin/MatchRosterEditor.tsx`

- [ ] **Step 1: Audit page — apply the premium visual language**

Open the current audit page (it renders the summary strip + per-match cards + `MatchRosterEditor`). Refactor the markup to use:
- `<Card padding="compact">` for each match and summary item
- `font-display` headers for manager totals (Fraunces 20px)
- `font-mono tabular-nums` for points
- Hairline dividers via `border-[var(--border-subtle)]`
- `<Badge>` primitives instead of raw spans

Make the header of each match card a 56px flex row with:
- Left: team names in Fraunces 20px + series score in mono
- Right: "EDIT ROSTERS" as a `<Button variant="secondary" size="sm">` — since the editor is always below, relabel to "Expand" or use a ChevronDown toggle. For the initial pass, keep it always-expanded to reduce surprise; just restyle.

Mismatched rows get a subtle `bg-rose-500/[0.04]` + rose-400 left edge.

- [ ] **Step 2: `MatchRosterEditor` polish**

Replace the raw buttons/selects with the Button primitive + styled selects:
- Replace `<button ... class="... bg-[var(--primary)]">` with `<Button variant="primary">`
- Replace raw `<input type="radio">` + `<select>` with styled versions matching the rest of the UI
- Replace the outer container's `border-yellow-600/60` with a more tasteful `border-[var(--border-default)]` + a tiny `<Badge variant="neutral">EDIT</Badge>` label
- Keep the existing state logic + server action intact

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/leagues/[slug]/audit src/components/admin/MatchRosterEditor.tsx
git commit -m "feat(ui): audit page + match roster editor — premium polish"
```

---

### Task 23: Login splash polish

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Rewrite the splash**

```tsx
import { signIn } from '@/lib/auth';
import { Button } from '@/components/shared/Button';

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--bg-canvas)] px-6 py-12 text-[var(--text-primary)]">
      {/* Subtle radial glow background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 30%, var(--accent-glow) 0%, transparent 70%)',
        }}
      />
      <div className="relative flex flex-col items-center gap-6 text-center">
        <div className="font-display text-[11px] uppercase tracking-[0.4em] text-[var(--text-tertiary)]">
          Private League · VCT Americas
        </div>
        <h1 className="font-display text-[72px] leading-[0.9] font-medium tracking-tight md:text-[96px]">
          <span className="text-[var(--text-primary)]">VCT </span>
          <span className="shimmer">FANTASY</span>
        </h1>
        <p className="max-w-md text-[14px] text-[var(--text-secondary)]">
          Draft your squad. Track live scores. Out-manage your friends.
        </p>
        <form
          action={async () => {
            'use server';
            await signIn('discord', { redirectTo: '/leagues' });
          }}
          className="mt-4"
        >
          <Button type="submit" size="lg" variant="hero">
            Sign in with Discord
          </Button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(ui): premium login splash — serif wordmark + radial glow"
```

---

### Task 24: League list page polish

**Files:**
- Modify: `src/app/leagues/page.tsx`

- [ ] **Step 1: Rewrite**

```tsx
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { listLeaguesForUser } from '@/server/queries/leagues';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';

export default async function LeaguesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const leagues = await listLeaguesForUser(session.user.id);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <div>
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          Your Leagues
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Select a league to view standings, rosters, and live scoring.
        </p>
      </div>
      {leagues.length === 0 && (
        <p className="text-[13px] text-[var(--text-tertiary)]">
          You&apos;re not in any leagues yet.
        </p>
      )}
      <div className="space-y-3">
        {leagues.map((l) => (
          <Link key={l.id} href={`/leagues/${l.slug}`}>
            <Card interactive padding="comfortable">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-[20px] font-medium text-[var(--text-primary)]">
                    {l.name}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--text-tertiary)]">
                    Started {l.startDate.toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="neutral">{l.status.replace('_', ' ')}</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/leagues/page.tsx
git commit -m "feat(ui): league list page — premium spacing + serif headlines"
```

---

## Phase 7 — Drawer & Modal polish

### Task 25: PlayerDrawer + MatchDrawer premium pass

**Files:**
- Modify: `src/components/shared/PlayerDrawer.tsx`
- Modify: `src/components/shared/MatchDrawer.tsx`

- [ ] **Step 1: PlayerDrawer polish**

Open the file and replace internal markup:
- Sheet content class: `w-[520px] border-l border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-6`
- Title: `font-display text-[20px] font-medium`
- Big total: `font-mono text-[40px] font-semibold tabular-nums`
- Game log table: use `DataTable`, `THead`, `Th`, `TBody`, `Tr`, `Td` from shared. Won rows get `bg-emerald-500/[0.04]`.
- Loading state: use `<Skeleton>` from shared.

- [ ] **Step 2: MatchDrawer polish**

Same treatment:
- Header: Fraunces title (16px), series score in mono.
- Each map section: Card padding="compact" with Fraunces map name + mono score.
- Stat table: DataTable primitive. Captain star in red. Owner badge = `<Badge variant="neutral">`.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/PlayerDrawer.tsx src/components/shared/MatchDrawer.tsx
git commit -m "feat(ui): drawer polish — DataTable + Fraunces + skeleton loading"
```

---

### Task 26: Free agency modal polish

**Files:**
- Modify: `src/components/roster/FreeAgencyModal.tsx`

- [ ] **Step 1: Restyle**

Replace the internal markup:
- Modal container class: `rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]`
- Header: Fraunces 20px, player handle + team
- Free agent list: use DataTable or a styled list with `hover:bg-white/[0.03]`
- Search input: uses the same style as PlayersFilterBar's search
- Buttons: `<Button variant="primary">` for confirm, `<Button variant="secondary">` for cancel
- Show cooldown remaining as a Badge below the header

Preserve the existing server action + state logic.

- [ ] **Step 2: Commit**

```bash
git add src/components/roster/FreeAgencyModal.tsx
git commit -m "feat(ui): free agency modal polish"
```

---

## Phase 8 — Verification

### Task 27: Full typecheck + build + manual verification

- [ ] **Step 1: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean (no errors).

- [ ] **Step 2: Build**

```bash
WORKER_DISABLED=1 npm run build
```

Expected: all routes compile.

- [ ] **Step 3: Tests**

```bash
npm test
```

Expected: 23 tests still pass (4 skipped for integration).

- [ ] **Step 4: Screenshot sweep (manual)**

Start dev server:

```bash
npm run dev
```

Visit and verify:
- `/` splash looks premium (serif wordmark, radial glow)
- `/leagues` list uses Cards + Fraunces headings
- `/leagues/<slug>` dashboard has live hero or next-match, lineup, standings, upcoming, recent, feed
- `/leagues/<slug>/leaderboard` has podium + expandable rows
- `/leagues/<slug>/roster` has captain banner + 4 portrait cards
- `/leagues/<slug>/players` has pill filters + table + drawer
- `/leagues/<slug>/matches` has animated tab underline + week groups
- `/leagues/<slug>/matches/<id>` has full-page hero scoreline
- `/leagues/<slug>/trades` has tabs + propose-trade stepper
- `/leagues/<slug>/history` has vertical timeline
- `/leagues/<slug>/draft` has on-the-clock banner + premium pool table
- `/admin/leagues/<slug>/audit` has premium editor UI

- [ ] **Step 5: Final commit of any touch-ups discovered during the sweep**

```bash
git add -A
git commit -m "chore(ui): sweep polish"
```

---

## Self-Review

**Spec coverage:**
- Foundations (colors, type, spacing, motion) → Task 1, 2 ✓
- Shell (navbar + sidebar + AppShell) → Tasks 7, 8, 9 ✓
- Component primitives (Card, Button, Table, Badge, Drawer, Modal, Skeleton, TeamLogo) → Tasks 3, 4, 5, 6 ✓
- Dashboard (hero + lineup + standings + upcoming + recent + feed) → Tasks 10, 11, 12 ✓
- Leaderboard (podium + expandable) → Task 13 ✓
- Roster (banner + portrait cards + FA + trade) → Tasks 14, 26 ✓
- Players (filter pills + table) → Task 15 ✓
- Matches (tabs + week groups + card) → Task 16 ✓
- Match detail → Task 17 ✓
- Trades (tabs + stepper) → Task 18 ✓
- History (timeline) → Task 19 ✓
- Draft (on-the-clock banner) → Task 20 ✓
- Admin home + league → Task 21 ✓
- Audit page → Task 22 ✓
- Login splash → Task 23 ✓
- League list → Task 24 ✓
- Drawers premium pass → Task 25 ✓
- Final verification → Task 27 ✓

**Placeholder scan:** Two places where I flagged data that the current schema doesn't expose (upcoming match "my players" per-team membership, match card fantasy delta per-user). Handled by passing empty / zero defaults and noting the follow-up inline. Not blocking.

**Type consistency:** Component prop names used consistently across tasks. `teamName` + `teamShortCode` everywhere. `onClick` for drawers, `onClose` for modals. Badge variants consistent.

**Scope check:** Large but bounded. All frontend, no schema changes. Each phase can be validated independently (typecheck + build per phase).
