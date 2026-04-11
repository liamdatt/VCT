import type {
  VlrMatchDetailMap,
  VlrMatchDetailPlayerLine,
} from './types';

/**
 * vlrggapi returns all player stats as strings. This converts to number,
 * treating empty strings / dashes as 0.
 */
export function toInt(v: string | number | undefined | null): number {
  if (v === undefined || v === null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.trunc(v) : 0;
  if (v === '-') return 0;
  const n = parseInt(v.replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

export type NormalizedPlayerLine = {
  name: string;
  kills: number;
  deaths: number;
  assists: number;
  aces: number; // from rounds parsing; 0 if unavailable
};

export function normalizePlayerLine(
  line: VlrMatchDetailPlayerLine,
  aces: number,
): NormalizedPlayerLine {
  return {
    name: line.name,
    kills: toInt(line.kills),
    deaths: toInt(line.deaths),
    assists: toInt(line.assists),
    aces,
  };
}

/**
 * Count aces (5+ kills in a single round by one player) for a given map.
 *
 * WHY THIS IS A STUB: the real vlrggapi container we consume exposes only a
 * very thin `rounds` blob per map — each entry has the shape
 *   { round_num: number, winner: "team1" | "team2", side: "ct" | "t" }
 * and does NOT include per-round per-player kill counts. There is NO way to
 * reconstruct per-round kills from this payload.
 *
 * We DID investigate `map.performance.advanced_stats` (which on vlr.gg's UI
 * has a "5K" column) and `seg.performance.by_map[]`. The column mapping
 * (col "5" = 5K count) is correct, BUT:
 *   1. `map.performance.advanced_stats` is populated with TOURNAMENT-wide
 *      totals, not per-map — inspection of a real 2-map match showed the
 *      same numbers on both maps.
 *   2. `seg.performance.by_map` has per-game-id entries, but every entry
 *      also contained the same aggregated numbers (upstream bug — likely a
 *      mis-duplication during scraping). We cannot reliably attribute an
 *      ace to the correct map.
 *
 * Therefore automated per-map ace detection is not safe. We return an
 * empty Map and the worker defaults `aces` to 0 for every player line.
 * The commissioner can apply ace adjustments manually via
 * `ScoringAdjustment` when they occur. If/when upstream fixes by_map we
 * can revisit and implement this properly.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function acesFromRounds(_map: VlrMatchDetailMap): Map<string, number> {
  return new Map();
}
