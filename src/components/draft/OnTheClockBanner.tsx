import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type Props = {
  managerName: string;
  managerAvatarUrl: string | null;
  round: number;
  pickNumber: number;
  isYou: boolean;
};

export function OnTheClockBanner({
  managerName,
  managerAvatarUrl,
  round,
  pickNumber,
  isYou,
}: Props) {
  return (
    <div className="relative h-[80px] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(255,70,85,0.15) 0%, transparent 60%)',
        }}
      />
      <div className="relative flex h-full items-center gap-4 px-6">
        <Avatar className="h-12 w-12 ring-2 ring-[var(--accent-primary)]/30">
          <AvatarImage src={managerAvatarUrl ?? undefined} />
          <AvatarFallback className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
            {managerName[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            {isYou ? "You're on the clock" : 'On the clock'}
          </div>
          <div className="mt-0.5 font-display text-[28px] leading-none font-medium text-[var(--text-primary)]">
            {managerName}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Round · Pick
          </div>
          <div className="font-display text-[28px] font-semibold tabular-nums text-[var(--text-primary)]">
            R{round} · #{pickNumber}
          </div>
        </div>
      </div>
    </div>
  );
}
