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
