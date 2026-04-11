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
