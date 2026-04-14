'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { dropAndPickup } from '@/lib/actions/free-agency';

type FreeAgent = {
  id: string;
  handle: string;
  teamName: string;
  totalPoints: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  leagueSlug: string;
  droppedPlayerId: string;
  droppedPlayerHandle: string;
  freeAgents: FreeAgent[];
  cooldownReached: boolean;
};

export function FreeAgencyModal({
  open,
  onClose,
  leagueSlug,
  droppedPlayerId,
  droppedPlayerHandle,
  freeAgents,
  cooldownReached,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return freeAgents.filter(
      (p) =>
        p.handle.toLowerCase().includes(q) ||
        p.teamName.toLowerCase().includes(q)
    );
  }, [freeAgents, search]);

  const handleConfirm = () => {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      try {
        await dropAndPickup({
          leagueSlug,
          droppedPlayerId,
          pickedUpPlayerId: selectedId,
        });
        onClose();
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to complete pickup');
      }
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setSearch('');
      setSelectedId(null);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-[20px] font-medium text-[var(--text-primary)]">
            Free Agency
          </DialogTitle>
          <DialogDescription className="sr-only">
            Drop {droppedPlayerHandle} and pick up a free agent
          </DialogDescription>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Dropping
            </div>
            <div className="mt-0.5 font-medium text-[var(--text-primary)]">
              {droppedPlayerHandle}
            </div>
          </div>
        </DialogHeader>

        {cooldownReached ? (
          <div className="py-4 text-center">
            <Badge variant="loss">Cooldown active</Badge>
            <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">
              You have already used your free agency pickup today. Try tomorrow.
            </p>
          </div>
        ) : (
          <>
            <input
              placeholder="Search free agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--text-secondary)] focus:outline-none"
            />

            <div className="max-h-60 space-y-0.5 overflow-y-auto">
              {filtered.map((p) => {
                const selected = selectedId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/[0.03] cursor-pointer ${
                      selected ? 'bg-[var(--bg-elevated)]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--text-primary)]">
                        {p.handle}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                        {p.teamName}
                      </span>
                    </div>
                    <span className="font-mono text-[12px] tabular-nums text-[var(--text-primary)]">
                      {p.totalPoints.toFixed(1)}
                    </span>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="py-4 text-center text-[13px] text-[var(--text-tertiary)]">
                  No free agents found.
                </p>
              )}
            </div>

            {error && (
              <p className="text-[12px] text-rose-400">{error}</p>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {!cooldownReached && (
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={!selectedId || isPending}
            >
              {isPending ? 'Processing…' : 'Confirm'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
