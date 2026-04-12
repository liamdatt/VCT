import { MatchCard } from '@/components/shared/MatchCard';

type Match = {
  id: string;
  team1: { name: string };
  team2: { name: string };
  scheduledAt: Date;
};

export function UpcomingMatches({
  matches,
  myPlayerHandles,
}: {
  matches: Match[];
  myPlayerHandles?: Record<string, string[]>;
}) {
  if (matches.length === 0) {
    return (
      <div className="rounded-lg border border-[--border] p-4 text-center text-sm text-[--muted-foreground]">
        No upcoming matches.
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase text-[--muted-foreground]">
        Upcoming Matches
      </h3>
      <div className="space-y-2">
        {matches.map((m) => (
          <MatchCard
            key={m.id}
            team1Name={m.team1.name}
            team2Name={m.team2.name}
            status="UPCOMING"
            date={m.scheduledAt.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
            time={m.scheduledAt.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
            myPlayerHandles={myPlayerHandles?.[m.id]}
          />
        ))}
      </div>
    </div>
  );
}
