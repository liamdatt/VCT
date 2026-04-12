'use client';

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PointsDelta } from './PointsDelta';

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
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {loading && (
          <div className="flex h-40 items-center justify-center">
            <span className="text-sm text-[--muted-foreground]">Loading...</span>
          </div>
        )}

        {!loading && data && (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg text-[--foreground]">
                {data.handle}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <span className="text-[--muted-foreground]">{data.teamName}</span>
                {data.ownerUsername ? (
                  <Badge variant="outline" className="text-xs">
                    {data.ownerUsername}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-xs text-[--chart-2]"
                  >
                    Free Agent
                  </Badge>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="px-4">
              <div className="mb-4 text-center">
                <span className="font-mono text-3xl font-bold text-[--foreground]">
                  {data.totalPoints.toFixed(1)}
                </span>
                <span className="ml-1 text-sm text-[--muted-foreground]">pts</span>
              </div>

              {data.games.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Map</TableHead>
                      <TableHead className="text-right">K</TableHead>
                      <TableHead className="text-right">D</TableHead>
                      <TableHead className="text-right">A</TableHead>
                      <TableHead className="text-right">Pts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.games.map((g, i) => (
                      <TableRow
                        key={i}
                        className={g.won ? 'bg-[--chart-2]/5' : ''}
                      >
                        <TableCell className="text-xs">
                          {g.mapName}
                          <span className="ml-1 text-[10px] text-[--muted-foreground]">
                            {g.date}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {g.kills}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {g.deaths}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {g.assists}
                        </TableCell>
                        <TableCell className="text-right">
                          <PointsDelta value={g.fantasyPts} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-sm text-[--muted-foreground]">
                  No games played yet.
                </p>
              )}
            </div>
          </>
        )}

        {!loading && !data && open && (
          <div className="flex h-40 items-center justify-center">
            <span className="text-sm text-[--muted-foreground]">
              Player not found.
            </span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
