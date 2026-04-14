'use client';
import * as React from 'react';
import { ArrowLeftRight, UserPlus, Star } from 'lucide-react';

type EventItem = {
  id: string;
  type: 'trade' | 'free_agency' | 'captain_change';
  description: string;
  timestamp: string;
  managers: string[];
};

function relative(ts: string): string {
  const d = new Date(ts);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Dot({ type }: { type: EventItem['type'] }) {
  const color =
    type === 'trade'
      ? 'bg-[var(--accent-primary)]'
      : type === 'free_agency'
        ? 'bg-emerald-400'
        : 'bg-amber-400';
  return (
    <span className="relative z-10 inline-flex h-3 w-3 items-center justify-center">
      <span className={`h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}

function Icon({ type }: { type: EventItem['type'] }) {
  const common = 'h-3 w-3 text-[var(--text-tertiary)]';
  if (type === 'trade') return <ArrowLeftRight className={common} strokeWidth={1.5} />;
  if (type === 'free_agency') return <UserPlus className={common} strokeWidth={1.5} />;
  return <Star className={common} strokeWidth={1.5} />;
}

type Props = {
  events: EventItem[];
  managers: string[];
};

export function HistoryTimeline({ events, managers }: Props) {
  const [typeFilter, setTypeFilter] = React.useState<EventItem['type'] | 'all'>('all');
  const [managerFilter, setManagerFilter] = React.useState<string | 'all'>('all');

  const visible = events.filter((e) => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    if (managerFilter !== 'all' && !e.managers.includes(managerFilter)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="h-7 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-[12px] text-[var(--text-primary)]"
        >
          <option value="all">All types</option>
          <option value="trade">Trades</option>
          <option value="free_agency">Free Agency</option>
          <option value="captain_change">Captain Changes</option>
        </select>
        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="h-7 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-[12px] text-[var(--text-primary)]"
        >
          <option value="all">All managers</option>
          {managers.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <ol className="relative space-y-4 pl-8">
        <span className="absolute top-0 bottom-0 left-[7px] w-px bg-[var(--border-subtle)]" />
        {visible.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute top-0.5 -left-8">
              <Dot type={e.type} />
            </span>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]">
                <Icon type={e.type} />
                <span>{e.description}</span>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-[var(--text-tertiary)]">
                {relative(e.timestamp)}
              </span>
            </div>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="pl-0 text-[13px] text-[var(--text-tertiary)]">No matching events.</li>
        )}
      </ol>
    </div>
  );
}
