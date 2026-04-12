'use client';

import { useState, useMemo } from 'react';

type HistoryEvent = {
  id: string;
  type: 'trade' | 'free_agency' | 'captain_change';
  description: string;
  timestamp: string;
  managers: string[];
};

type Props = {
  events: HistoryEvent[];
  allManagers: string[];
};

const typeIcons: Record<string, string> = {
  trade: '\u21C4',
  free_agency: '\uD83D\uDD01',
  captain_change: '\u2605',
};

const typeLabels: Record<string, string> = {
  trade: 'Trade',
  free_agency: 'Free Agency',
  captain_change: 'Captain Change',
};

function relativeTime(isoStr: string): string {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return '1d ago';
  return `${diffDays}d ago`;
}

export function HistoryClient({ events, allManagers }: Props) {
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [managerFilter, setManagerFilter] = useState<string>('');

  const filtered = useMemo(() => {
    let result = events;
    if (typeFilter) {
      result = result.filter((e) => e.type === typeFilter);
    }
    if (managerFilter) {
      result = result.filter((e) => e.managers.includes(managerFilter));
    }
    return result;
  }, [events, typeFilter, managerFilter]);

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-[--border] bg-[--card] px-3 py-2 text-sm text-[--foreground]"
        >
          <option value="">All Types</option>
          <option value="trade">Trades</option>
          <option value="free_agency">Free Agency</option>
          <option value="captain_change">Captain Changes</option>
        </select>
        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="rounded-md border border-[--border] bg-[--card] px-3 py-2 text-sm text-[--foreground]"
        >
          <option value="">All Managers</option>
          {allManagers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Event list */}
      <div className="space-y-2">
        {filtered.map((e) => (
          <div
            key={e.id}
            className="flex items-start gap-3 rounded-lg border border-[--border] bg-[--card] px-4 py-3"
          >
            <span className="mt-0.5 shrink-0 text-lg">
              {typeIcons[e.type] ?? '?'}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] rounded bg-[--border] px-1.5 py-0.5 font-medium uppercase text-[--muted-foreground]">
                  {typeLabels[e.type] ?? e.type}
                </span>
                <span className="text-xs text-[--muted-foreground]">
                  {relativeTime(e.timestamp)}
                </span>
              </div>
              <p className="mt-1 text-sm text-[--foreground]">{e.description}</p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-[--muted-foreground]">
            No history events found.
          </p>
        )}
      </div>
    </>
  );
}
