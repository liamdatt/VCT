import { Card, CardHeader } from '@/components/shared/Card';
import { ArrowLeftRight, UserPlus, Star, Zap } from 'lucide-react';

type ActivityEvent = {
  id: string;
  type: 'trade' | 'free_agency' | 'captain_change' | 'score';
  description: string;
  timestamp: Date | string;
};

function relativeTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Icon({ type }: { type: ActivityEvent['type'] }) {
  const common = 'h-3 w-3 text-[var(--text-tertiary)]';
  if (type === 'trade') return <ArrowLeftRight className={common} strokeWidth={1.5} />;
  if (type === 'free_agency') return <UserPlus className={common} strokeWidth={1.5} />;
  if (type === 'captain_change') return <Star className={common} strokeWidth={1.5} />;
  return <Zap className={common} strokeWidth={1.5} />;
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <Card padding="compact" className="relative">
      <CardHeader label="Activity" />
      <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
        {events.map((e) => (
          <li key={e.id} className="flex items-start gap-2 text-[12px]">
            <span className="mt-0.5 shrink-0">
              <Icon type={e.type} />
            </span>
            <span className="flex-1 text-[var(--text-secondary)]">{e.description}</span>
            <span className="shrink-0 font-mono text-[10px] text-[var(--text-tertiary)]">
              {relativeTime(e.timestamp)}
            </span>
          </li>
        ))}
        {events.length === 0 && (
          <li className="text-[12px] text-[var(--text-tertiary)]">No activity yet.</li>
        )}
      </ul>
      <div
        className="pointer-events-none absolute right-0 bottom-0 left-0 h-8 rounded-b-lg"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, var(--bg-surface) 100%)',
        }}
      />
    </Card>
  );
}
