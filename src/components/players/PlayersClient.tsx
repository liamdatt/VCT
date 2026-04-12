'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlayerDrawer } from '@/components/shared/PlayerDrawer';

type PlayerRow = {
  id: string;
  handle: string;
  teamName: string;
  teamShortCode: string;
  ownerUsername: string | null;
  totalPoints: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  mapsPlayed: number;
};

type SortKey = 'handle' | 'totalPoints' | 'totalKills' | 'totalDeaths' | 'totalAssists' | 'mapsPlayed';

type Props = {
  players: PlayerRow[];
  teams: string[];
};

export function PlayersClient({ players, teams }: Props) {
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'free' | 'owned'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('totalPoints');
  const [sortAsc, setSortAsc] = useState(false);
  const [drawerPlayerId, setDrawerPlayerId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = players;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.handle.toLowerCase().includes(q));
    }
    if (teamFilter) {
      result = result.filter((p) => p.teamName === teamFilter);
    }
    if (ownerFilter === 'free') {
      result = result.filter((p) => p.ownerUsername === null);
    } else if (ownerFilter === 'owned') {
      result = result.filter((p) => p.ownerUsername !== null);
    }
    const dir = sortAsc ? 1 : -1;
    result = [...result].sort((a, b) => {
      if (sortKey === 'handle') {
        return dir * a.handle.localeCompare(b.handle);
      }
      return dir * ((a[sortKey] as number) - (b[sortKey] as number));
    });
    return result;
  }, [players, search, teamFilter, ownerFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortAsc ? ' \u2191' : ' \u2193';
  };

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by handle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="rounded-md border border-[--border] bg-[--card] px-3 py-2 text-sm text-[--foreground]"
        >
          <option value="">All Teams</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value as 'all' | 'free' | 'owned')}
          className="rounded-md border border-[--border] bg-[--card] px-3 py-2 text-sm text-[--foreground]"
        >
          <option value="all">All Players</option>
          <option value="free">Free Agents</option>
          <option value="owned">Owned</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer"
                onClick={() => toggleSort('handle')}
              >
                Player{sortIndicator('handle')}
              </TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => toggleSort('totalPoints')}
              >
                Pts{sortIndicator('totalPoints')}
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => toggleSort('totalKills')}
              >
                K{sortIndicator('totalKills')}
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => toggleSort('totalDeaths')}
              >
                D{sortIndicator('totalDeaths')}
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => toggleSort('totalAssists')}
              >
                A{sortIndicator('totalAssists')}
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => toggleSort('mapsPlayed')}
              >
                Maps{sortIndicator('mapsPlayed')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer hover:bg-[--card]/80"
                onClick={() => {
                  setDrawerPlayerId(p.id);
                  setDrawerOpen(true);
                }}
              >
                <TableCell className="font-medium text-[--foreground]">
                  {p.handle}
                </TableCell>
                <TableCell className="text-xs text-[--muted-foreground]">
                  {p.teamShortCode}
                </TableCell>
                <TableCell>
                  {p.ownerUsername ? (
                    <Badge variant="outline" className="text-[10px]">
                      {p.ownerUsername}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-[--chart-2]"
                    >
                      Free Agent
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {p.totalPoints.toFixed(1)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {p.totalKills}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {p.totalDeaths}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {p.totalAssists}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {p.mapsPlayed}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-sm text-[--muted-foreground]"
                >
                  No players found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PlayerDrawer
        playerId={drawerPlayerId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
