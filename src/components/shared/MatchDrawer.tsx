'use client';

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/shared/Badge';
import { Skeleton } from '@/components/shared/Skeleton';
import { DataTable, THead, Th, TBody, Tr, Td } from '@/components/shared/DataTable';

type MatchDrawerProps = {
  matchId: string | null;
  open: boolean;
  onClose: () => void;
};

type MapPlayer = {
  name: string;
  team: string;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  rating: number;
  fantasyPts: number;
  ownerUsername: string | null;
  isCaptain: boolean;
  won: boolean;
};

type MapData = {
  mapName: string;
  team1Score: number;
  team2Score: number;
  players: MapPlayer[];
};

type MatchData = {
  team1Name: string;
  team2Name: string;
  team1Score: string;
  team2Score: string;
  status: string;
  maps: MapData[];
};

export function MatchDrawer({ matchId, open, onClose }: MatchDrawerProps) {
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !matchId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/matches/${matchId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: MatchData | null) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, matchId]);

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-[520px] border-l border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-6 overflow-y-auto"
      >
        {loading && (
          <div className="space-y-3 py-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        )}

        {!loading && data && (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-[20px] font-medium text-[var(--text-primary)]">
                {data.team1Name} vs {data.team2Name}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <span className="font-mono text-[20px] font-semibold tabular-nums text-[var(--text-primary)]">
                  {data.team1Score}–{data.team2Score}
                </span>
                {data.status === 'LIVE' ? (
                  <Badge variant="live">LIVE</Badge>
                ) : (
                  <Badge variant="neutral">{data.status}</Badge>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="pb-4">
              {data.maps.map((map, mi) => (
                <div
                  key={mi}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 mt-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-display text-[16px] font-medium text-[var(--text-primary)]">
                      {map.mapName}
                    </h3>
                    <span className="font-mono text-[14px] font-semibold tabular-nums text-[var(--text-secondary)]">
                      {map.team1Score}–{map.team2Score}
                    </span>
                  </div>

                  <DataTable>
                    <THead>
                      <tr>
                        <Th>Player</Th>
                        <Th className="text-right">K</Th>
                        <Th className="text-right">D</Th>
                        <Th className="text-right">A</Th>
                        <Th className="text-right">Pts</Th>
                      </tr>
                    </THead>
                    <TBody>
                      {map.players.map((p, pi) => (
                        <Tr key={pi} className={p.won ? 'bg-emerald-500/[0.04]' : ''}>
                          <Td>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-medium text-[var(--text-primary)]">
                                {p.name}
                              </span>
                              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                                {p.team}
                              </span>
                              {p.ownerUsername && (
                                <Badge variant="neutral">{p.ownerUsername}</Badge>
                              )}
                              {p.isCaptain && (
                                <span className="text-[var(--accent-primary)]">★</span>
                              )}
                            </div>
                          </Td>
                          <Td numeric className="text-right">
                            {p.kills}
                          </Td>
                          <Td numeric className="text-right">
                            {p.deaths}
                          </Td>
                          <Td numeric className="text-right">
                            {p.assists}
                          </Td>
                          <Td numeric className="text-right">
                            {p.fantasyPts.toFixed(1)}
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </DataTable>
                </div>
              ))}

              {data.maps.length === 0 && (
                <p className="mt-6 text-center text-[13px] text-[var(--text-tertiary)]">
                  No maps played yet.
                </p>
              )}
            </div>
          </>
        )}

        {!loading && !data && open && (
          <div className="flex h-40 items-center justify-center">
            <span className="text-[13px] text-[var(--text-tertiary)]">Match not found.</span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
