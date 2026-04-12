import type { VlrPlayerLine, VlrMap } from './types';

/**
 * vlr.gg stats are scraped as strings. Convert to number,
 * treating empty strings / dashes as 0.
 */
export function toInt(v: string | number | undefined | null): number {
  if (v === undefined || v === null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.trunc(v) : 0;
  if (v === '-') return 0;
  const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

export type NormalizedPlayerLine = {
  name: string;
  kills: number;
  deaths: number;
  assists: number;
  aces: number;
};

export function normalizePlayerLine(
  line: VlrPlayerLine,
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
 * Ace detection stub. vlr.gg round data doesn't expose per-player
 * per-round kill counts, so we can't automate this. Returns empty
 * Map — commissioner uses ScoringAdjustment for manual ace credits.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function acesFromRounds(_map: VlrMap): Map<string, number> {
  return new Map();
}
