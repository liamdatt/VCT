// Types for the self-hosted vlrggapi (axsddlr/vlrggapi) responses as of
// April 2026, verified against a running container (`GET /openapi.json`
// and sample calls against `/events`, `/events/matches`, `/match/details`).
//
// Conventions:
// - The upstream API wraps every payload in `{ data: { status, segments } }`.
//   `status` is the upstream HTTP status as a number; `segments` is the
//   payload array/object.
// - Numeric stats are returned as STRINGS in the JSON ("12", "0.92", "56%").
//   Consumers must parse. Empty strings are common for missing values.
// - There are NO stable numeric player IDs or team IDs. Teams are identified
//   by `name` (and sometimes `tag`). Players are identified by `name` only.
//   The seed script must synthesize its own IDs and match by handle.
// - Event IDs are NOT returned as a field. They must be parsed out of the
//   `url_path` on an event segment, e.g.
//   "https://www.vlr.gg/event/2846/rivals-league-2026-season-1" → "2846".
// - The `/events/matches` endpoint is the ONLY way to filter matches by
//   event and returns both upcoming and completed matches in a single list
//   (distinguishable by the per-segment `status` field: "Upcoming" | "LIVE"
//   | "Completed"). It does not expose ISO timestamps — only the human
//   `date` string, which must be parsed or re-sourced from match details.

export type VlrEnvelope<T> = {
  data: {
    status: number;
    segments: T;
  };
};

// ---------- /events ----------
// GET /events?q=upcoming|completed&page=1

export type VlrEventSegment = {
  title: string;
  status: 'upcoming' | 'ongoing' | 'completed' | string;
  prize: string;
  dates: string; // e.g. "Feb 1—Apr 11"
  region: string; // two-letter region code e.g. "se", "in", "un"
  thumb: string;
  url_path: string; // full vlr.gg URL, event id is the first numeric segment
};

// ---------- /events/matches ----------
// GET /events/matches?event_id=2846

export type VlrEventMatchTeam = {
  name: string;
  score: string; // stringified integer; empty for upcoming
  is_winner: boolean;
};

export type VlrEventMatchVod = {
  label: string;
  url: string;
};

export type VlrEventMatchSegment = {
  match_id: string;
  url: string; // full vlr.gg match URL
  date: string; // human-formatted, NOT ISO — e.g. "Sat, April 11, 2026Today"
  status: 'Upcoming' | 'LIVE' | 'Completed' | string;
  note: string;
  event_series: string; // e.g. "Round 1", "Grand Final"
  team1: VlrEventMatchTeam;
  team2: VlrEventMatchTeam;
  vods: VlrEventMatchVod[];
};

// ---------- /match/details ----------
// GET /match/details?match_id=615164

export type VlrMatchDetailEvent = {
  name: string;
  series: string;
  logo: string;
};

export type VlrMatchDetailTeam = {
  name: string;
  tag: string;
  logo: string;
  score: string; // stringified integer
  is_winner: boolean;
};

export type VlrMatchDetailStream = {
  name?: string;
  url?: string;
};

export type VlrMatchDetailPlayerLine = {
  name: string; // player handle
  agent: string;
  rating: string; // "0.92"
  acs: string; // "174"
  kills: string;
  deaths: string;
  assists: string;
  kd_diff: string; // "+3" | "-5"
  kast: string; // "56%"
  adr: string; // "122"
  hs_pct: string; // "20%"
  fk: string;
  fd: string;
  fk_diff: string;
};

export type VlrMatchDetailMapScore = {
  team1: number | string;
  team2: number | string;
};

export type VlrMatchDetailRound = Record<string, unknown>; // upstream shape is not yet used

export type VlrMatchDetailMap = {
  map_name: string;
  picked_by: string;
  duration: string; // "34:54"
  score: VlrMatchDetailMapScore;
  score_ct: VlrMatchDetailMapScore;
  score_t: VlrMatchDetailMapScore;
  score_ot: VlrMatchDetailMapScore;
  players: {
    team1: VlrMatchDetailPlayerLine[];
    team2: VlrMatchDetailPlayerLine[];
  };
  rounds?: VlrMatchDetailRound[];
  performance?: unknown;
  economy?: unknown;
};

export type VlrMatchDetailSegment = {
  match_id: string;
  event: VlrMatchDetailEvent;
  date: string;
  patch: string;
  status: 'final' | 'live' | 'upcoming' | string;
  teams: VlrMatchDetailTeam[]; // always length 2, [team1, team2]
  streams: VlrMatchDetailStream[];
  vods: VlrEventMatchVod[];
  maps: VlrMatchDetailMap[];
  head_to_head: unknown[];
  performance?: unknown;
  economy?: unknown;
  economy_by_map?: unknown;
};

// Re-exports with the ergonomic names used by the rest of the codebase.
// These are thin aliases over the REAL upstream shapes — no field renaming.
export type VlrEventList = VlrEventSegment[];
export type VlrEventMatches = VlrEventMatchSegment[];
export type VlrMatchDetails = VlrMatchDetailSegment;

/** Extract the numeric event id out of a vlr.gg event url_path. */
export function parseEventIdFromUrlPath(urlPath: string): string | null {
  const m = urlPath.match(/\/event\/(\d+)\b/);
  return m ? m[1] : null;
}
