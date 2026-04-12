// Types for the self-hosted vlr.gg scraper API (vlr-scraper/).
// The scraper returns clean JSON — no envelope wrapping, no string-typed
// numbers. Stats (kills, deaths, etc.) are still strings from the HTML
// and must be parsed with toInt().

export type VlrEventMatchTeam = {
  name: string;
  score: string;
};

export type VlrEventMatch = {
  match_id: string;
  team1: VlrEventMatchTeam;
  team2: VlrEventMatchTeam;
  status: 'upcoming' | 'live' | 'completed';
  date: string;
  time: string;
  series: string;
};

export type VlrEventMatchesResponse = {
  event_id: string;
  matches: VlrEventMatch[];
};

export type VlrPlayerLine = {
  name: string;
  team: string;
  agent: string;
  player_url: string;
  rating: string;
  acs: string;
  kills: string;
  deaths: string;
  assists: string;
  kd_diff: string;
  kast: string;
  adr: string;
  hs_pct: string;
  fk: string;
  fd: string;
  fk_diff: string;
};

export type VlrMap = {
  map_name: string;
  team1_score: number;
  team2_score: number;
  winner: string | null;
  duration: string;
  players: {
    team1: VlrPlayerLine[];
    team2: VlrPlayerLine[];
  };
};

export type VlrMatchTeam = {
  name: string;
  tag: string;
  score: string;
  is_winner: boolean;
};

export type VlrMatchDetail = {
  match_id: string;
  status: 'upcoming' | 'live' | 'completed';
  format: string;
  teams: VlrMatchTeam[];
  maps: VlrMap[];
};
