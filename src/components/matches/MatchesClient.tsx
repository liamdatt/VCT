'use client';

import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MatchCard } from '@/components/shared/MatchCard';
import { MatchDrawer } from '@/components/shared/MatchDrawer';

type MatchData = {
  id: string;
  team1: { name: string };
  team2: { name: string };
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  scheduledAt: string;
  finalScore: string | null;
  games: { mapNumber: number }[];
};

type Props = {
  upcoming: MatchData[];
  live: MatchData[];
  completed: MatchData[];
};

export function MatchesClient({ upcoming, live, completed }: Props) {
  const defaultTab = live.length > 0 ? 'live' : 'upcoming';
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openMatch = (id: string) => {
    setSelectedMatchId(id);
    setDrawerOpen(true);
  };

  const renderMatches = (matches: MatchData[]) => {
    if (matches.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-[--muted-foreground]">
          No matches.
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {matches.map((m) => {
          const scores = m.finalScore?.split('-').map((s) => s.trim()) ?? [];
          const d = new Date(m.scheduledAt);
          return (
            <MatchCard
              key={m.id}
              team1Name={m.team1.name}
              team2Name={m.team2.name}
              team1Score={
                m.status === 'COMPLETED'
                  ? scores[0] ?? '—'
                  : m.status === 'LIVE'
                    ? m.games.length.toString()
                    : undefined
              }
              team2Score={
                m.status === 'COMPLETED'
                  ? scores[1] ?? '—'
                  : m.status === 'LIVE'
                    ? ''
                    : undefined
              }
              status={m.status}
              date={d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
              time={d.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
              onClick={() => openMatch(m.id)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="live">
            Live ({live.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">{renderMatches(upcoming)}</TabsContent>
        <TabsContent value="live">{renderMatches(live)}</TabsContent>
        <TabsContent value="completed">{renderMatches(completed)}</TabsContent>
      </Tabs>

      <MatchDrawer
        matchId={selectedMatchId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
