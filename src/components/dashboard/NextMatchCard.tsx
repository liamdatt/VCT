import { TeamLogo } from '@/components/shared/TeamLogo';

type Props = {
  team1Name: string;
  team1ShortCode: string;
  team2Name: string;
  team2ShortCode: string;
  scheduledAt: Date | string;
};

function formatCountdown(target: Date): string {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return 'Starting soon';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${mins.toString().padStart(2, '0')}m`);
  return parts.join(' ');
}

export function NextMatchCard({
  team1Name,
  team1ShortCode,
  team2Name,
  team2ShortCode,
  scheduledAt,
}: Props) {
  const target = typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt;
  const countdown = formatCountdown(target);
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="flex h-[180px] items-center justify-between gap-8 px-8">
        <div className="flex items-center gap-3">
          <TeamLogo name={team1Name} shortCode={team1ShortCode} size={48} />
          <div className="font-display text-[28px] text-[var(--text-primary)]">{team1Name}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Next match</div>
          <div className="mt-1 font-display text-[32px] font-medium tabular-nums text-[var(--text-primary)]">
            {countdown}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-display text-[28px] text-[var(--text-primary)]">{team2Name}</div>
          <TeamLogo name={team2Name} shortCode={team2ShortCode} size={48} />
        </div>
      </div>
    </div>
  );
}
