import type { VlrEventDetails, VlrMatchDetails, VlrMatchSummary } from './types';

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

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return (await res.json()) as T;
}

export const vlrapi = {
  getEventDetails: (eventId: string) =>
    withRetry(
      () => get<VlrEventDetails>(`/events/${encodeURIComponent(eventId)}`),
      `getEventDetails(${eventId})`,
    ),
  getEventMatches: (eventId: string) =>
    withRetry(
      () => get<VlrMatchSummary[]>(`/events/${encodeURIComponent(eventId)}/matches`),
      `getEventMatches(${eventId})`,
    ),
  getMatch: (matchId: string) =>
    withRetry(
      () => get<VlrMatchDetails>(`/matches/${encodeURIComponent(matchId)}`),
      `getMatch(${matchId})`,
    ),
};

export type VlrApi = typeof vlrapi;
