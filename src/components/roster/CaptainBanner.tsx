import { TeamLogo } from '@/components/shared/TeamLogo';
import { Badge } from '@/components/shared/Badge';

type Props = {
  handle: string;
  teamName: string;
  teamShortCode: string;
  totalPoints: number;
};

export function CaptainBanner({ handle, teamName, teamShortCode, totalPoints }: Props) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="absolute top-0 right-0 left-0 h-0.5 bg-[var(--accent-primary)]" />
      <div className="flex h-[120px] items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-4">
          <TeamLogo name={teamName} shortCode={teamShortCode} size={56} />
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="captain">★ Captain · 1.5×</Badge>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
                {teamShortCode}
              </span>
            </div>
            <h2 className="mt-1 font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
              {handle}
            </h2>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Total</div>
          <div className="mt-0.5 font-mono text-[32px] font-semibold tabular-nums text-[var(--text-primary)]">
            {totalPoints.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}
