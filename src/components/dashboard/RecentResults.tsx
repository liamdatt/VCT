import { MatchCard } from '@/components/shared/MatchCard';

type Match = {
  id: string;
  team1: { name: string };
  team2: { name: string };
  finalScore: string | null;
  scheduledAt: Date;
};

export function RecentResults({ matches }: { matches: Match[] }) {
  if (matches.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase text-[--muted-foreground]">
        Recent Results
      </h3>
      <div className="space-y-2">
        {matches.map((m) => {
          const scores = m.finalScore?.split('-').map((s) => s.trim()) ?? [];
          return (
            <MatchCard
              key={m.id}
              team1Name={m.team1.name}
              team2Name={m.team2.name}
              team1Score={scores[0] ?? '—'}
              team2Score={scores[1] ?? '—'}
              status="COMPLETED"
              date={m.scheduledAt.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            />
          );
        })}
      </div>
    </div>
  );
}
