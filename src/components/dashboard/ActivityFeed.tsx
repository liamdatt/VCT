type HistoryEvent = {
  id: string;
  type: 'trade' | 'free_agency' | 'captain_change';
  description: string;
  timestamp: Date;
  managers: string[];
};

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return '1d ago';
  return `${diffDays}d ago`;
}

const typeIcons: Record<string, string> = {
  trade: '\u21C4',
  free_agency: '\uD83D\uDD01',
  captain_change: '\u2605',
};

export function ActivityFeed({ events }: { events: HistoryEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-[--border] p-4 text-center text-sm text-[--muted-foreground]">
        No recent activity.
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase text-[--muted-foreground]">
        Recent Activity
      </h3>
      <div className="space-y-1">
        {events.slice(0, 10).map((e) => (
          <div
            key={e.id}
            className="flex items-start gap-2 rounded-lg border border-[--border] bg-[--card] px-3 py-2"
          >
            <span className="mt-0.5 shrink-0 text-base">{typeIcons[e.type] ?? '?'}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[--foreground]">{e.description}</p>
              <span className="text-[10px] text-[--muted-foreground]">
                {relativeTime(e.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
