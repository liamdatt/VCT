'use client';
import { Button } from '@/components/shared/Button';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { Star } from 'lucide-react';

type Props = {
  handle: string;
  teamName: string;
  teamShortCode: string;
  totalPoints: number;
  kills: number;
  deaths: number;
  assists: number;
  mapsPlayed: number;
  captainCooldownDays: number | null;
  onDrop?: () => void;
  onTrade?: () => void;
  onMakeCaptain?: () => void;
  readOnly?: boolean;
};

export function PlayerPortraitCard({
  handle,
  teamName,
  teamShortCode,
  totalPoints,
  kills,
  deaths,
  assists,
  mapsPlayed,
  captainCooldownDays,
  onDrop,
  onTrade,
  onMakeCaptain,
  readOnly,
}: Props) {
  const cooldownActive = captainCooldownDays !== null && captainCooldownDays > 0;
  return (
    <div className="relative flex h-[220px] flex-col justify-between overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-start justify-between">
        <TeamLogo name={teamName} shortCode={teamShortCode} size={32} />
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
          {mapsPlayed} maps
        </span>
      </div>
      <div>
        <h3 className="font-display text-[24px] leading-tight font-medium text-[var(--text-primary)]">
          {handle}
        </h3>
        <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
          {teamShortCode}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="space-y-0.5 font-mono text-[11px] tabular-nums text-[var(--text-secondary)]">
          <div>K {kills} · D {deaths} · A {assists}</div>
          <div className="text-[18px] font-semibold text-[var(--text-primary)]">
            {totalPoints.toFixed(1)}
          </div>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={onDrop}>
              Drop
            </Button>
            <Button size="sm" variant="secondary" onClick={onTrade}>
              Trade
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={cooldownActive}
              onClick={onMakeCaptain}
              icon={<Star size={14} strokeWidth={1.5} />}
              title={cooldownActive ? `Available in ${captainCooldownDays}d` : 'Make captain'}
            >
              {cooldownActive ? `${captainCooldownDays}d` : 'Captain'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
