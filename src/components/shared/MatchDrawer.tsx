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
import { Star } from 'lucide-react';
import { PointsDelta } from './PointsDelta';

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
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        {loading && (
          <div className="flex h-40 items-center justify-center">
            <span className="text-sm text-[--muted-foreground]">Loading...</span>
          </div>
        )}

        {!loading && data && (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg text-[--foreground]">
                {data.team1Name} vs {data.team2Name}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <span className="font-mono text-xl font-bold text-[--foreground]">
                  {data.team1Score} - {data.team2Score}
                </span>
                {data.status === 'LIVE' ? (
                  <Badge variant="destructive" className="animate-pulse">
                    LIVE
                  </Badge>
                ) : (
                  <Badge variant="outline">{data.status}</Badge>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-4">
              {data.maps.map((map, mi) => (
                <div key={mi}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-[--foreground]">
                      {map.mapName}
                    </span>
                    <span className="font-mono text-sm text-[--muted-foreground]">
                      {map.team1Score} - {map.team2Score}
                    </span>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead className="text-right">K</TableHead>
                        <TableHead className="text-right">D</TableHead>
                        <TableHead className="text-right">A</TableHead>
                        <TableHead className="text-right">Pts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {map.players.map((p, pi) => (
                        <TableRow
                          key={pi}
                          className={p.won ? 'bg-[--chart-2]/5' : ''}
                        >
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-[--foreground]">
                                {p.name}
                              </span>
                              <span className="text-[10px] text-[--muted-foreground]">
                                {p.team}
                              </span>
                              {p.ownerUsername && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {p.ownerUsername}
                                </Badge>
                              )}
                              {p.isCaptain && (
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {p.kills}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {p.deaths}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {p.assists}
                          </TableCell>
                          <TableCell className="text-right">
                            <PointsDelta value={p.fantasyPts} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}

              {data.maps.length === 0 && (
                <p className="text-center text-sm text-[--muted-foreground]">
                  No maps played yet.
                </p>
              )}
            </div>
          </>
        )}

        {!loading && !data && open && (
          <div className="flex h-40 items-center justify-center">
            <span className="text-sm text-[--muted-foreground]">
              Match not found.
            </span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
