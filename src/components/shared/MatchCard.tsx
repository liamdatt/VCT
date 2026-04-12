import { Badge } from '@/components/ui/badge';
import { PointsDelta } from './PointsDelta';

type MatchCardProps = {
  team1Name: string;
  team2Name: string;
  team1Score?: number | string;
  team2Score?: number | string;
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
  team2Name,
  team1Score,
  team2Score,
  status,
  date,
  time,
  series,
  fantasyDelta,
  myPlayerHandles,
  onClick,
}: MatchCardProps) {
  const hasScore =
    team1Score !== undefined &&
    team1Score !== null &&
    team2Score !== undefined &&
    team2Score !== null;

  return (
    <div
      onClick={onClick}
      className={`rounded-lg border border-[--border] bg-[--card] p-4 transition-colors ${
        onClick ? 'cursor-pointer hover:border-[--primary]/50 hover:bg-[--card]/80' : ''
      }`}
    >
      {/* Teams + Score */}
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-[--foreground]">
          {team1Name}
        </span>

        <div className="flex items-center gap-2 text-center">
          {hasScore ? (
            <span className="font-mono text-lg font-bold text-[--foreground]">
              {team1Score} - {team2Score}
            </span>
          ) : (
            <span className="text-sm text-[--muted-foreground]">vs</span>
          )}
        </div>

        <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-[--foreground]">
          {team2Name}
        </span>
      </div>

      {/* Status + Meta */}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {status === 'LIVE' ? (
            <Badge variant="destructive" className="animate-pulse text-[10px]">
              LIVE
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-[--muted-foreground]">
              {status}
            </Badge>
          )}
          {series && (
            <span className="text-[--muted-foreground]">{series}</span>
          )}
          {(date || time) && (
            <span className="text-[--muted-foreground]">
              {date}
              {date && time ? ' · ' : ''}
              {time}
            </span>
          )}
        </div>

        {fantasyDelta !== undefined && <PointsDelta value={fantasyDelta} />}
      </div>

      {/* My rostered players */}
      {myPlayerHandles && myPlayerHandles.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {myPlayerHandles.map((h) => (
            <Badge
              key={h}
              variant="secondary"
              className="text-[10px] font-normal"
            >
              {h}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
