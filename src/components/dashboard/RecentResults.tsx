import { Card, CardHeader } from '@/components/shared/Card';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { PointsDelta } from '@/components/shared/PointsDelta';

type RecentRow = {
  id: string;
  team1Name: string;
  team1ShortCode: string;
  team2Name: string;
  team2ShortCode: string;
  team1Wins: number;
  team2Wins: number;
  fantasyDelta?: number;
  completedAt: Date | string;
};

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function RecentResults({ matches }: { matches: RecentRow[] }) {
  if (matches.length === 0) return null;
  return (
    <Card padding="compact">
      <CardHeader label="Recent results" />
      <ul className="divide-y divide-[var(--border-subtle)]">
        {matches.map((m) => {
          const t1Won = m.team1Wins > m.team2Wins;
          return (
            <li
              key={m.id}
              className="group flex items-center gap-3 px-2 py-3 transition-colors hover:bg-white/[0.03]"
            >
              <TeamLogo name={m.team1Name} shortCode={m.team1ShortCode} size={24} />
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  className={`text-[13px] font-medium ${
                    t1Won ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {m.team1ShortCode}
                </span>
                <span className="font-display text-[20px] font-semibold tabular-nums text-[var(--text-primary)]">
                  {m.team1Wins}–{m.team2Wins}
                </span>
                <span
                  className={`text-[13px] font-medium ${
                    !t1Won ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {m.team2ShortCode}
                </span>
              </div>
              <TeamLogo name={m.team2Name} shortCode={m.team2ShortCode} size={24} />
              <span className="ml-2 hidden font-mono text-[11px] tabular-nums text-[var(--text-tertiary)] sm:inline">
                {formatDate(m.completedAt)}
              </span>
              {m.fantasyDelta !== undefined && m.fantasyDelta !== 0 && (
                <span className="ml-2 hidden sm:inline">
                  <PointsDelta value={m.fantasyDelta} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
