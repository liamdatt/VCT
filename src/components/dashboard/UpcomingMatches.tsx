import { Card, CardHeader } from '@/components/shared/Card';
import { TeamLogo } from '@/components/shared/TeamLogo';

type UpcomingRow = {
  id: string;
  team1Name: string;
  team1ShortCode: string;
  team2Name: string;
  team2ShortCode: string;
  scheduledAt: Date | string;
  myPlayers: string[];
};

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function UpcomingMatches({ matches }: { matches: UpcomingRow[] }) {
  if (matches.length === 0) {
    return (
      <Card padding="comfortable">
        <CardHeader label="Upcoming" />
        <p className="text-[13px] text-[var(--text-tertiary)]">No upcoming matches.</p>
      </Card>
    );
  }
  return (
    <Card padding="compact">
      <CardHeader label="Upcoming" />
      <ul className="divide-y divide-[var(--border-subtle)]">
        {matches.map((m) => (
          <li
            key={m.id}
            className={`relative flex items-center gap-3 px-2 py-2.5 ${
              m.myPlayers.length > 0 ? 'pl-3' : ''
            }`}
          >
            {m.myPlayers.length > 0 && (
              <span className="absolute top-1 bottom-1 left-0 w-0.5 rounded-r-full bg-[var(--accent-primary)]" />
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-2 text-[13px]">
                <TeamLogo name={m.team1Name} shortCode={m.team1ShortCode} size={16} />
                <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  {m.team1ShortCode}
                </span>
                <span className="text-[var(--text-tertiary)]">vs</span>
                <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  {m.team2ShortCode}
                </span>
                <TeamLogo name={m.team2Name} shortCode={m.team2ShortCode} size={16} />
              </div>
              {m.myPlayers.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {m.myPlayers.map((p) => (
                    <span
                      key={p}
                      className="font-mono text-[10px] text-[var(--accent-primary)]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="font-mono text-[11px] tabular-nums text-[var(--text-tertiary)]">
              {formatDate(m.scheduledAt)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
