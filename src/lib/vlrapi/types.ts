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
