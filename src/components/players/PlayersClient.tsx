'use client';
import * as React from 'react';
import { PlayersFilterBar } from './PlayersFilterBar';
import { DataTable, THead, Th, TBody, Tr, Td } from '@/components/shared/DataTable';
import { PlayerDrawer } from '@/components/shared/PlayerDrawer';
import { Badge } from '@/components/shared/Badge';

export type PlayerRow = {
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

export function PlayersClient({ rows }: { rows: PlayerRow[] }) {
  const [ownership, setOwnership] = React.useState<'all' | 'free' | 'owned'>('all');
  const [team, setTeam] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [openId, setOpenId] = React.useState<string | null>(null);

  const teams = React.useMemo(
    () => [...new Set(rows.map((r) => r.teamShortCode))].sort(),
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (ownership === 'free' && r.ownerUsername) return false;
    if (ownership === 'owned' && !r.ownerUsername) return false;
    if (team && r.teamShortCode !== team) return false;
    if (search && !r.handle.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <PlayersFilterBar
        teams={teams}
        selectedTeam={team}
        ownership={ownership}
        search={search}
        onTeamChange={setTeam}
        onOwnershipChange={setOwnership}
        onSearchChange={setSearch}
      />
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <DataTable>
          <THead>
            <tr>
              <Th>Player</Th>
              <Th>Team</Th>
              <Th>Owner</Th>
              <Th className="text-right">Points</Th>
              <Th className="text-right">K</Th>
              <Th className="text-right">D</Th>
              <Th className="text-right">A</Th>
              <Th className="text-right">Maps</Th>
            </tr>
          </THead>
          <TBody>
            {filtered.map((r) => (
              <Tr key={r.id} onClick={() => setOpenId(r.id)}>
                <Td>
                  <span className="flex items-center gap-1.5">
                    {!r.ownerUsername && (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    )}
                    <span className="font-medium text-[var(--text-primary)]">{r.handle}</span>
                  </span>
                </Td>
                <Td>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
                    {r.teamShortCode}
                  </span>
                </Td>
                <Td>
                  {r.ownerUsername ? (
                    <Badge variant="neutral">{r.ownerUsername}</Badge>
                  ) : (
                    <Badge variant="win">Free Agent</Badge>
                  )}
                </Td>
                <Td numeric className="text-right font-semibold">
                  {r.totalPoints.toFixed(1)}
                </Td>
                <Td numeric className="text-right">
                  {r.totalKills}
                </Td>
                <Td numeric className="text-right">
                  {r.totalDeaths}
                </Td>
                <Td numeric className="text-right">
                  {r.totalAssists}
                </Td>
                <Td numeric className="text-right">
                  {r.mapsPlayed}
                </Td>
              </Tr>
            ))}
          </TBody>
        </DataTable>
      </div>
      <PlayerDrawer
        playerId={openId}
        open={!!openId}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}
