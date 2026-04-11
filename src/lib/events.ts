import { EventEmitter } from 'node:events';

export type LeagueEventType =
  | 'scoreUpdate'
  | 'tradeProposed'
  | 'tradeAccepted'
  | 'tradeRejected'
  | 'freeAgency'
  | 'captainChange'
  | 'draftPick';

export type LeagueEvent = {
  type: LeagueEventType;
  leagueId: string;
  userIds?: string[]; // optional targeting
  payload: unknown;
};

declare global {
  var __leagueBus: EventEmitter | undefined;
}

export const leagueBus: EventEmitter =
  globalThis.__leagueBus ?? (globalThis.__leagueBus = new EventEmitter());
leagueBus.setMaxListeners(200);
