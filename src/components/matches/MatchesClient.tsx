'use client';
import * as React from 'react';
import { MatchesTabs, type Tab } from './MatchesTabs';
import { WeekGroup } from './WeekGroup';
import { MatchCard } from '@/components/shared/MatchCard';
import { MatchDrawer } from '@/components/shared/MatchDrawer';

type MatchRow = {
  id: string;
  team1Name: string;
  team1ShortCode: string;
  team2Name: string;
  team2ShortCode: string;
  team1Wins: number;
  team2Wins: number;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  scheduledAt: string;
  series: string;
  fantasyDelta?: number;
};

type Props = {
  upcoming: MatchRow[];
  live: MatchRow[];
  completed: MatchRow[];
};

function groupByWeek(rows: MatchRow[]): Map<string, MatchRow[]> {
  const groups = new Map<string, MatchRow[]>();
  for (const r of rows) {
    const key = r.series || 'All matches';
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  return groups;
}

export function MatchesClient({ upcoming, live, completed }: Props) {
  const [tab, setTab] = React.useState<Tab>(live.length > 0 ? 'live' : 'upcoming');
  const [openId, setOpenId] = React.useState<string | null>(null);

  const source = tab === 'upcoming' ? upcoming : tab === 'live' ? live : completed;
  const groups = groupByWeek(source);

  return (
    <div className="space-y-5">
      <MatchesTabs active={tab} onChange={setTab} liveCount={live.length} />
      {[...groups.entries()].map(([week, rows]) => (
        <WeekGroup key={week} title={week}>
          {rows.map((m) => {
            const date = new Date(m.scheduledAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });
            const t1s = m.status === 'UPCOMING' ? undefined : String(m.team1Wins);
            const t2s = m.status === 'UPCOMING' ? undefined : String(m.team2Wins);
            return (
              <MatchCard
                key={m.id}
                team1Name={m.team1Name}
                team1ShortCode={m.team1ShortCode}
                team2Name={m.team2Name}
                team2ShortCode={m.team2ShortCode}
                team1Score={t1s}
                team2Score={t2s}
                status={m.status}
                date={date}
                fantasyDelta={m.fantasyDelta}
                onClick={() => setOpenId(m.id)}
              />
            );
          })}
        </WeekGroup>
      ))}
      <MatchDrawer matchId={openId} open={!!openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
