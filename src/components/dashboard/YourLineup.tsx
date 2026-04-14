import { Card, CardHeader } from '@/components/shared/Card';
import { PointsDelta } from '@/components/shared/PointsDelta';

type LineupLine = {
  handle: string;
  teamShort: string;
  isCaptain: boolean;
  kills: number;
  deaths: number;
  assists: number;
  total: number;
};

export function YourLineup({ lines }: { lines: LineupLine[] }) {
  if (lines.length === 0) return null;
  return (
    <Card padding="comfortable">
      <CardHeader label="Your lineup" />
      <ul className="space-y-2">
        {lines.map((l) => (
          <li
            key={l.handle}
            className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
          >
            <div className="flex min-w-0 items-center gap-2">
              {l.isCaptain && (
                <span className="text-[var(--accent-primary)]" aria-label="Captain">★</span>
              )}
              <span className="truncate text-[14px] font-medium text-[var(--text-primary)]">
                {l.handle}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                {l.teamShort}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[12px] tabular-nums text-[var(--text-secondary)]">
              <span>
                {l.kills}/{l.deaths}/{l.assists}
              </span>
              <PointsDelta value={l.total} showSuffix={false} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
