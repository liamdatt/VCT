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

type PlayerDrawerProps = {
  playerId: string | null;
  open: boolean;
  onClose: () => void;
};

type GameEntry = {
  mapName: string;
  kills: number;
  deaths: number;
  assists: number;
  fantasyPts: number;
  date: string;
  won: boolean;
};

type PlayerData = {
  handle: string;
  teamName: string;
  ownerUsername: string | null;
  totalPoints: number;
  games: GameEntry[];
};

export function PlayerDrawer({ playerId, open, onClose }: PlayerDrawerProps) {
  const [data, setData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !playerId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/players/${playerId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: PlayerData | null) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, playerId]);

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
                {data.handle}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <span className="text-[var(--text-tertiary)]">{data.teamName}</span>
                <Badge variant={data.ownerUsername ? 'neutral' : 'win'}>
                  {data.ownerUsername ?? 'Free Agent'}
                </Badge>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                Total Fantasy Points
              </div>
              <div className="font-mono text-[40px] font-semibold tabular-nums text-[var(--text-primary)]">
                {data.totalPoints.toFixed(1)}
              </div>
            </div>

            <div className="mt-6">
              {data.games.length > 0 ? (
                <DataTable>
                  <THead>
                    <tr>
                      <Th>Map</Th>
                      <Th className="text-right">K</Th>
                      <Th className="text-right">D</Th>
                      <Th className="text-right">A</Th>
                      <Th className="text-right">Pts</Th>
                    </tr>
                  </THead>
                  <TBody>
                    {data.games.map((g, i) => (
                      <Tr key={i} className={g.won ? 'bg-emerald-500/[0.04]' : ''}>
                        <Td>
                          <div className="flex flex-col">
                            <span className="text-[13px]">{g.mapName}</span>
                            <span className="text-[10px] text-[var(--text-tertiary)]">
                              {g.date}
                            </span>
                          </div>
                        </Td>
                        <Td numeric className="text-right">
                          {g.kills}
                        </Td>
                        <Td numeric className="text-right">
                          {g.deaths}
                        </Td>
                        <Td numeric className="text-right">
                          {g.assists}
                        </Td>
                        <Td numeric className="text-right">
                          {g.fantasyPts.toFixed(1)}
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </DataTable>
              ) : (
                <p className="text-center text-[13px] text-[var(--text-tertiary)]">
                  No games played yet.
                </p>
              )}
            </div>
          </>
        )}

        {!loading && !data && open && (
          <div className="flex h-40 items-center justify-center">
            <span className="text-[13px] text-[var(--text-tertiary)]">
              Player not found.
            </span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
