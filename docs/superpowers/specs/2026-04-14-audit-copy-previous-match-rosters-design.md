# Audit: Copy Previous Match Rosters

## Problem

On the audit page (`/admin/leagues/[slug]/audit`), each completed match has a `MatchRosterEditor` for retroactively setting who owned which player at that match. When auditing historical matches in order (match 1, match 2, …), the commissioner currently has to rebuild each match's roster from scratch — the editor starts empty if no `MatchRoster` rows exist for that match. For incremental changes series-over-series, the ideal starting point is the previous match's saved roster.

## Goal

Add a per-match "Copy from previous match" button to the audit page's roster editor. Clicking it populates the editor with the immediately previous match's saved `MatchRoster` data, which the commissioner can then tweak before saving.

## Scope Decisions (from brainstorming)

- **Q1 — "series" definition:** Each VCT match (single `Match` row). "Previous series" = previous `Match` in chronological order.
- **Q2 — fallback when prior match has no saved rosters:** Button is disabled. No walk-back, no fallback to current `RosterSlot`.
- **Q3 — button scope:** One button per match, copies all managers' rosters at once.
- **Q4 — overwrite behavior:** Always overwrite the editor state, no confirm dialog. User must still click "Save & Recompute" to persist.

## Design

### Server side — `src/app/admin/leagues/[slug]/audit/page.tsx`

`matches` is already ordered by `scheduledAt asc`. When building the editor props for each match, look at the previous entry (`matches[i-1]`):

- If `matchRosterByMatch` has rows for the previous match, build `previousRosters` (same shape as `initialRosters`) and `previousMatchLabel` (e.g. `"SEN vs 100T"`).
- Otherwise pass `previousRosters = null` and `previousMatchLabel = null`.

Pass both new props to `<MatchRosterEditor />`.

### Client side — `src/components/admin/MatchRosterEditor.tsx`

**New props:**

```ts
previousRosters: Array<{ userId: string; playerIds: string[]; captainPlayerId: string }> | null;
previousMatchLabel: string | null;
```

**UI:** In the header row (next to "Save & Recompute"), add a secondary `Button`:

- Label: `Copy from previous (${previousMatchLabel})`
- Disabled when `previousRosters === null`
- Size: `sm`, variant: `secondary` (or whatever matches existing secondary style in the codebase)

**On click:**

1. Build a `Map<userId, previousEntry>` from `previousRosters`.
2. For each manager in `managers` (authoritative list for current editor), look up their previous entry.
   - If found: use `padTo5(entry.playerIds.filter(pid => allPlayers.some(p => p.id === pid)))` and `captainPlayerId` (only if it survived the filter; else `''`).
   - If not found (manager is new, or wasn't in previous match): `padTo5([])` and empty captain.
3. `setRosters(nextRosters)` and `setMessage(null)`.

No server call — purely client-side populate. Save flow is unchanged.

### No schema changes

Both `MatchRoster` rows and the audit page's data fetch already contain everything needed.

## Testing

Manual:

1. In a league with ≥2 completed matches, save rosters for match 1 via the editor.
2. Open match 2's editor. Button should be enabled and labeled with match 1's teams.
3. Click it. Verify every manager card populates with match 1's players + captain.
4. Tweak one manager's roster, click Save & Recompute, confirm it persists and snapshots update.
5. For the earliest match in the list, verify the button is disabled.
6. For a match where the previous match has no saved `MatchRoster`, verify the button is disabled.

## Out of Scope

- Per-manager copy buttons
- Walking back multiple matches to find saved rosters
- Falling back to current `RosterSlot` when no prior match rosters exist
- Any server-side action or schema change
