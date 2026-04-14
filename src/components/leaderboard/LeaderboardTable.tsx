'use client';
import * as React from 'react';
import { DataTable, THead, Th, TBody, Tr, Td } from '@/components/shared/DataTable';
import { ChevronDown } from 'lucide-react';

type Contribution = {
  playerId: string;
  handle: string;
  team: string;
  total: number;
  isCaptain: boolean;
  onRoster: boolean;
};

export type LeaderboardRowData = {
  userId: string;
  rank: number;
  username: string;
  total: number;
  captainHandle: string | null;
  wins: number;
  losses: number;
  contributions: Contribution[];
  isMe: boolean;
};

export function LeaderboardTable({ rows }: { rows: LeaderboardRowData[] }) {
  const [open, setOpen] = React.useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <DataTable>
        <THead>
          <tr>
            <Th className="w-10">#</Th>
            <Th>Manager</Th>
            <Th>Captain</Th>
            <Th className="text-right">Record</Th>
            <Th className="text-right">Points</Th>
            <Th className="w-8"> </Th>
          </tr>
        </THead>
        <TBody>
          {rows.map((r) => {
            const isOpen = open === r.userId;
            return (
              <React.Fragment key={r.userId}>
                <Tr
                  active={r.isMe}
                  onClick={() => setOpen(isOpen ? null : r.userId)}
                >
                  <Td numeric className="text-[var(--text-tertiary)]">
                    {r.rank}
                  </Td>
                  <Td>{r.username}</Td>
                  <Td className="text-[var(--text-secondary)]">
                    {r.captainHandle ? (
                      <span>
                        <span className="text-[var(--accent-primary)]">★ </span>
                        {r.captainHandle}
                      </span>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td numeric className="text-right text-[var(--text-secondary)]">
                    {r.wins}–{r.losses}
                  </Td>
                  <Td numeric className="text-right font-semibold">
                    {r.total.toFixed(1)}
                  </Td>
                  <Td className="w-8 text-right">
                    <ChevronDown
                      size={14}
                      strokeWidth={1.5}
                      className={`text-[var(--text-tertiary)] transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </Td>
                </Tr>
                {isOpen && (
                  <tr>
                    <td colSpan={6} className="border-b border-[var(--border-subtle)] bg-black/20 px-4 py-3">
                      <Breakdown contributions={r.contributions} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </TBody>
      </DataTable>
    </div>
  );
}

function Breakdown({ contributions }: { contributions: Contribution[] }) {
  const current = contributions.filter((c) => c.onRoster);
  const dropped = contributions.filter((c) => !c.onRoster);
  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 lg:grid-cols-3">
        {current.map((c) => (
          <li
            key={c.playerId}
            className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] px-2 py-1.5 text-[12px]"
          >
            <span className="flex items-center gap-1.5">
              {c.isCaptain && <span className="text-[var(--accent-primary)]">★</span>}
              <span className="text-[var(--text-primary)]">{c.handle}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                {c.team}
              </span>
            </span>
            <span className="font-mono text-[12px] tabular-nums">{c.total.toFixed(1)}</span>
          </li>
        ))}
      </ul>
      {dropped.length > 0 && (
        <>
          <div className="mt-3 border-t border-[var(--border-subtle)] pt-2">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Dropped / Traded
            </span>
          </div>
          <ul className="grid grid-cols-1 gap-1 opacity-60 md:grid-cols-2 lg:grid-cols-3">
            {dropped.map((c) => (
              <li
                key={c.playerId}
                className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] px-2 py-1.5 text-[12px]"
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[var(--text-secondary)]">{c.handle}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                    {c.team}
                  </span>
                </span>
                <span className="font-mono text-[12px] tabular-nums text-[var(--text-secondary)]">
                  {c.total.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
