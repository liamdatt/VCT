import type {
  VlrEnvelope,
  VlrEventList,
  VlrEventMatches,
  VlrEventSegment,
  VlrEventMatchSegment,
  VlrMatchDetails,
  VlrMatchDetailSegment,
} from './types';

// Thin typed client for the self-hosted vlrggapi container.
//
// Endpoint shapes verified against a running build of
// github.com/axsddlr/vlrggapi at `/openapi.json`:
//
//   GET /events?q=upcoming|completed&page=N
//     → envelope<VlrEventSegment[]>
//   GET /events/matches?event_id=<numeric>
//     → envelope<VlrEventMatchSegment[]>
//   GET /match/details?match_id=<numeric>
//     → envelope<VlrMatchDetailSegment[]>  (list, usually length 1)
//
// Notes for callers:
// - Upstream does NOT expose a "get single event by id" route. Event rosters
//   must be derived by fetching that event's match list and walking the
//   unique team names / player handles that appear in match details.
//   `getEventDetails` is therefore kept as a convenience that currently just
//   resolves to the match list; if we ever need hydrated rosters we will
//   either enumerate match details or add a scraper ourselves.
// - `getEventMatches` returns BOTH upcoming and completed matches in a
//   single array (differentiated by the per-row `status` field). There is
//   no separate "upcoming vs completed" endpoint scoped to an event.

const BASE = process.env.VLRAPI_BASE_URL ?? 'http://localhost:8000';

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const delays = [2000, 4000, 8000];
  let lastErr: unknown;
  for (let attempt = 0; attempt < delays.length + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === delays.length) break;
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  throw new Error(`vlrapi ${label} failed after retries: ${String(lastErr)}`);
}

async function getEnvelope<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  const body = (await res.json()) as VlrEnvelope<T>;
  if (!body?.data) {
    throw new Error(`${path} → malformed response (no data field)`);
  }
  return body.data.segments;
}

export const vlrapi = {
  /**
   * Lists events with a given status. vlrggapi only supports `upcoming` and
   * `completed` on its `q` param; pass no query to get the default list.
   */
  listEvents: (status?: 'upcoming' | 'completed', page = 1) =>
    withRetry(
      () =>
        getEnvelope<VlrEventList>(
          `/events?${status ? `q=${status}&` : ''}page=${page}`,
        ),
      `listEvents(${status ?? 'default'}, ${page})`,
    ),

  /**
   * Upstream has no per-event detail endpoint. For now this is an alias of
   * `getEventMatches`, so the caller can at least discover the team names
   * in that event. See module-level note.
   */
  getEventDetails: (eventId: string) =>
    withRetry(
      () =>
        getEnvelope<VlrEventMatches>(
          `/events/matches?event_id=${encodeURIComponent(eventId)}`,
        ),
      `getEventDetails(${eventId})`,
    ),

  /**
   * Returns every match (upcoming, live, completed) for a single event id.
   * Callers filter on each segment's `status` field.
   */
  getEventMatches: (eventId: string) =>
    withRetry(
      () =>
        getEnvelope<VlrEventMatches>(
          `/events/matches?event_id=${encodeURIComponent(eventId)}`,
        ),
      `getEventMatches(${eventId})`,
    ),

  /**
   * Returns full per-map per-player stats for a single match. Upstream
   * returns an array of segments; we unwrap to the single match segment.
   */
  getMatch: (matchId: string) =>
    withRetry(async () => {
      const segments = await getEnvelope<VlrMatchDetailSegment[]>(
        `/match/details?match_id=${encodeURIComponent(matchId)}`,
      );
      if (!segments.length) {
        throw new Error(`match/details ${matchId} returned no segments`);
      }
      return segments[0] satisfies VlrMatchDetails;
    }, `getMatch(${matchId})`),
};

export type VlrApi = typeof vlrapi;

// Re-export types intentionally kept alongside the client so callers can
// import everything from one place.
export type { VlrEventSegment, VlrEventMatchSegment, VlrMatchDetailSegment };
