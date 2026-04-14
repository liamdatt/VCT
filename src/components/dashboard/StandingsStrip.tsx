import Link from 'next/link';
import { Card, CardHeader } from '@/components/shared/Card';

type Row = {
  userId: string;
  rank: number;
  username: string;
  total: number;
  isMe: boolean;
};

export function StandingsStrip({ rows, leagueSlug }: { rows: Row[]; leagueSlug: string }) {
  return (
    <Card padding="compact">
      <CardHeader label="Standings" />
      <ul className="divide-y divide-[var(--border-subtle)]">
        {rows.map((r) => {
          const delta =
            r.rank === 1 && rows[1] ? r.total - rows[1].total : 0;
          return (
            <li key={r.userId}>
              <Link
                href={`/leagues/${leagueSlug}/rosters/${r.userId}`}
                className={`relative flex h-10 items-center gap-3 px-2 transition-colors hover:bg-white/[0.03] ${
                  r.isMe ? 'bg-white/[0.03]' : ''
                }`}
              >
                {r.isMe && (
                  <span className="absolute top-1 bottom-1 left-0 w-0.5 rounded-r-full bg-[var(--accent-primary)]" />
                )}
                <span className="w-6 font-mono text-[11px] tabular-nums text-[var(--text-tertiary)]">
                  {r.rank}
                </span>
                <span className="flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">
                  {r.username}
                </span>
                {r.rank === 1 && delta > 0 && (
                  <span className="rounded-sm bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400 tabular-nums">
                    +{delta.toFixed(1)}
                  </span>
                )}
                <span className="font-mono text-[14px] font-semibold tabular-nums text-[var(--text-primary)]">
                  {r.total.toFixed(1)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
