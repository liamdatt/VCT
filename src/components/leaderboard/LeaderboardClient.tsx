'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronDown, ChevronRight } from 'lucide-react';

type PlayerBreakdown = {
  handle: string;
  teamShortCode: string;
  points: number;
  onRoster: boolean;
};

type LeaderboardRow = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  total: number;
  rank: number;
  players: PlayerBreakdown[];
};

type Props = {
  rows: LeaderboardRow[];
  currentUserId: string;
};

export function LeaderboardClient({ rows, currentUserId }: Props) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead></TableHead>
          <TableHead>Manager</TableHead>
          <TableHead className="text-right">Points</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const isMe = r.userId === currentUserId;
          const isExpanded = expandedUserId === r.userId;

          return (
            <TableRow key={r.userId} className="group">
              <TableCell colSpan={4} className="p-0">
                {/* Main row */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedUserId(isExpanded ? null : r.userId)
                  }
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[--card]/80 ${
                    isMe ? 'border-l-2 border-l-[--primary]' : ''
                  }`}
                >
                  <span className="w-6 text-center font-mono text-sm text-[--muted-foreground]">
                    {r.rank}
                  </span>
                  <span className="text-[--muted-foreground]">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                  <span
                    className={`flex-1 text-sm font-semibold ${
                      isMe ? 'text-[--primary]' : 'text-[--foreground]'
                    }`}
                  >
                    {r.username}
                    {isMe && (
                      <span className="ml-2 text-xs font-normal text-[--muted-foreground]">
                        (you)
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-sm font-bold text-[--foreground]">
                    {r.total.toFixed(1)}
                  </span>
                </button>

                {/* Expanded player breakdown */}
                {isExpanded && r.players.length > 0 && (
                  <div className="border-t border-[--border] bg-[--card]/50 px-4 py-2">
                    <div className="space-y-1">
                      {r.players.map((p) => (
                        <div
                          key={p.handle}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                p.onRoster
                                  ? 'text-[--foreground]'
                                  : 'text-[--muted-foreground] line-through'
                              }
                            >
                              {p.handle}
                            </span>
                            <span className="text-[--muted-foreground]">
                              {p.teamShortCode}
                            </span>
                            {!p.onRoster && (
                              <span className="text-[10px] text-[--muted-foreground]">
                                (ex-roster)
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[--foreground]">
                            {p.points.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
