'use client';
import { Search } from 'lucide-react';

type Ownership = 'all' | 'free' | 'owned';

type Props = {
  teams: string[];
  selectedTeam: string | null;
  ownership: Ownership;
  search: string;
  onTeamChange: (t: string | null) => void;
  onOwnershipChange: (o: Ownership) => void;
  onSearchChange: (s: string) => void;
};

export function PlayersFilterBar({
  teams,
  selectedTeam,
  ownership,
  search,
  onTeamChange,
  onOwnershipChange,
  onSearchChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        {(['all', 'free', 'owned'] as const).map((key) => (
          <button
            key={key}
            onClick={() => onOwnershipChange(key)}
            className={`h-7 rounded-full border px-3 text-[12px] font-medium transition-colors ${
              ownership === key
                ? 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/[0.04]'
            }`}
          >
            {key === 'all' ? 'All' : key === 'free' ? 'Free Agents' : 'Owned'}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex max-w-full flex-wrap items-center gap-1 overflow-x-auto">
          <button
            onClick={() => onTeamChange(null)}
            className={`h-7 rounded-full border px-2.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
              selectedTeam === null
                ? 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            All teams
          </button>
          {teams.map((t) => (
            <button
              key={t}
              onClick={() => onTeamChange(t)}
              className={`h-7 rounded-full border px-2.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                selectedTeam === t
                  ? 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search
            size={14}
            strokeWidth={1.5}
            className="absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--text-tertiary)]"
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search players…"
            className="h-7 w-48 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] pr-3 pl-8 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--text-secondary)] focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
