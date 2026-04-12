'use client';

import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type PlayerCardProps = {
  handle: string;
  teamName: string;
  totalPoints: number;
  isCaptain: boolean;
  acquiredVia: string;
  onDrop?: () => void;
  onTrade?: () => void;
  onCaptainToggle?: () => void;
  captainCooldownActive?: boolean;
  readOnly?: boolean;
};

export function PlayerCard({
  handle,
  teamName,
  totalPoints,
  isCaptain,
  acquiredVia,
  onDrop,
  onTrade,
  onCaptainToggle,
  captainCooldownActive,
  readOnly,
}: PlayerCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[--border] bg-[--card] p-3">
      {/* Captain star */}
      <button
        type="button"
        onClick={onCaptainToggle}
        disabled={readOnly || captainCooldownActive}
        className={`shrink-0 transition-colors ${
          isCaptain
            ? 'text-yellow-400'
            : captainCooldownActive
              ? 'text-[--muted-foreground]/30 cursor-not-allowed'
              : 'text-[--muted-foreground] hover:text-yellow-400'
        } ${readOnly ? 'pointer-events-none' : 'cursor-pointer'}`}
        title={
          isCaptain
            ? 'Captain'
            : captainCooldownActive
              ? 'Captain cooldown active'
              : 'Set as captain'
        }
      >
        <Star
          className="h-5 w-5"
          fill={isCaptain ? 'currentColor' : 'none'}
        />
      </button>

      {/* Player info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-[--foreground]">
            {handle}
          </span>
          <Badge variant="outline" className="text-[10px] text-[--muted-foreground]">
            {acquiredVia}
          </Badge>
        </div>
        <span className="text-xs text-[--muted-foreground]">{teamName}</span>
      </div>

      {/* Points */}
      <span className="shrink-0 font-mono text-lg font-bold text-[--foreground]">
        {totalPoints.toFixed(1)}
      </span>

      {/* Actions */}
      {!readOnly && (
        <div className="flex shrink-0 gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onDrop}
          >
            Drop
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onTrade}
          >
            Trade
          </Button>
        </div>
      )}
    </div>
  );
}
