import { TeamLogo } from '@/components/shared/TeamLogo';
import { LivePulse } from './LivePulse';

type Props = {
  team1Name: string;
  team1ShortCode: string;
  team2Name: string;
  team2ShortCode: string;
  team1Wins: number;
  team2Wins: number;
  currentMap: string | null;
  currentMapScore?: { t1: number; t2: number };
};

export function LiveMatchHero({
  team1Name,
  team1ShortCode,
  team2Name,
  team2ShortCode,
  team1Wins,
  team2Wins,
  currentMap,
  currentMapScore,
}: Props) {
  const totalRounds = currentMapScore ? currentMapScore.t1 + currentMapScore.t2 : 0;
  const progressPct = Math.min(100, (totalRounds / 24) * 100);

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between opacity-[0.05]">
        <div className="-ml-16 h-60 w-60">
          <TeamLogo name={team1Name} shortCode={team1ShortCode} size={240} />
        </div>
        <div className="-mr-16 h-60 w-60">
          <TeamLogo name={team2Name} shortCode={team2ShortCode} size={240} />
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 60%)',
        }}
      />

      <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-black/40 px-2.5 py-1 backdrop-blur-sm">
        <LivePulse />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white">Live</span>
      </div>

      {currentMap && (
        <div className="absolute top-4 right-4 z-10 text-right">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Current map</div>
          <div className="font-display text-[14px] text-[var(--text-primary)]">
            {currentMap}
            {currentMapScore && (
              <span className="ml-2 font-mono text-[12px] tabular-nums text-[var(--text-secondary)]">
                {currentMapScore.t1}–{currentMapScore.t2}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="relative flex h-60 items-center justify-center gap-12 px-8">
        <div className="text-right">
          <div className="font-display text-[40px] leading-none font-medium tracking-tight text-[var(--text-primary)]">
            {team1Name}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <ScoreDigit value={team1Wins} winning={team1Wins > team2Wins} />
          <span className="font-display text-[28px] text-[var(--text-tertiary)]">–</span>
          <ScoreDigit value={team2Wins} winning={team2Wins > team1Wins} />
        </div>
        <div className="text-left">
          <div className="font-display text-[40px] leading-none font-medium tracking-tight text-[var(--text-primary)]">
            {team2Name}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--bg-elevated)]">
        <div
          className="h-full bg-[var(--accent-primary)] transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}

function ScoreDigit({ value, winning }: { value: number; winning: boolean }) {
  return (
    <span
      className={`font-display text-[56px] font-semibold tabular-nums leading-none ${
        winning ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
      }`}
      style={
        winning
          ? { textShadow: '0 0 32px rgba(255,70,85,0.35)' }
          : undefined
      }
    >
      {value}
    </span>
  );
}
