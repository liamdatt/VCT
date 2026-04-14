'use client';
import { TeamLogo } from './TeamLogo';
import { Badge } from './Badge';
import { PointsDelta } from './PointsDelta';
import { StatusDot } from './StatusDot';

type Props = {
  team1Name: string;
  team1ShortCode: string;
  team1Score?: string;
  team2Name: string;
  team2ShortCode: string;
  team2Score?: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  date?: string;
  time?: string;
  series?: string;
  fantasyDelta?: number;
  myPlayerHandles?: string[];
  onClick?: () => void;
};

export function MatchCard({
  team1Name,
  team1ShortCode,
  team1Score,
  team2Name,
  team2ShortCode,
  team2Score,
  status,
  date,
  time,
  series,
  fantasyDelta,
  myPlayerHandles,
  onClick,
}: Props) {
  const hasMine = myPlayerHandles && myPlayerHandles.length > 0;
  return (
    <button
      onClick={onClick}
      className={`group relative flex h-[72px] w-full items-center gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 text-left transition-colors duration-150 hover:border-[var(--border-default)] hover:brightness-[1.06] ${
        hasMine ? 'pl-5' : ''
      }`}
    >
      {hasMine && (
        <span className="absolute top-3 bottom-3 left-0 w-0.5 rounded-r-full bg-[var(--accent-primary)]" />
      )}
      <div className="flex flex-1 items-center gap-3">
        <TeamLogo name={team1Name} shortCode={team1ShortCode} size={28} />
        <span className="font-display text-[16px] text-[var(--text-primary)]">{team1ShortCode}</span>
        <span className="mx-2 font-display text-[22px] font-semibold tabular-nums text-[var(--text-primary)]">
          {team1Score ?? '—'}
        </span>
        <span className="text-[var(--text-tertiary)]">–</span>
        <span className="font-display text-[22px] font-semibold tabular-nums text-[var(--text-primary)]">
          {team2Score ?? '—'}
        </span>
        <span className="font-display text-[16px] text-[var(--text-primary)]">{team2ShortCode}</span>
        <TeamLogo name={team2Name} shortCode={team2ShortCode} size={28} />
      </div>
      <div className="flex items-center gap-2">
        {status === 'LIVE' && (
          <span className="inline-flex items-center gap-1.5">
            <StatusDot tone="live" pulse />
            <Badge variant="live">Live</Badge>
          </span>
        )}
        {series && <Badge variant="neutral">{series}</Badge>}
        {time && (
          <span className="font-mono text-[11px] tabular-nums text-[var(--text-tertiary)]">
            {time}
          </span>
        )}
        {date && (
          <span className="font-mono text-[11px] tabular-nums text-[var(--text-tertiary)]">
            {date}
          </span>
        )}
        {fantasyDelta !== undefined && fantasyDelta !== 0 && (
          <PointsDelta value={fantasyDelta} />
        )}
      </div>
    </button>
  );
}
