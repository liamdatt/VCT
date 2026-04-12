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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Drop & Pick Up</DialogTitle>
          <DialogDescription>
            Dropping <span className="font-semibold text-[--foreground]">{droppedPlayerHandle}</span>
          </DialogDescription>
        </DialogHeader>

        {cooldownReached ? (
          <p className="py-4 text-center text-sm text-[--primary]">
            Cooldown: you have already used your free agency pickup today. Try
            tomorrow.
          </p>
        ) : (
          <>
            <Input
              placeholder="Search free agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />

            <div className="max-h-60 space-y-1 overflow-y-auto">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    selectedId === p.id
                      ? 'border-[--primary] bg-[--primary]/10'
                      : 'border-[--border] hover:border-[--primary]/50'
                  }`}
                >
                  <div>
                    <span className="font-medium text-[--foreground]">{p.handle}</span>
                    <span className="ml-2 text-xs text-[--muted-foreground]">{p.teamName}</span>
                  </div>
                  <span className="font-mono text-xs text-[--foreground]">
                    {p.totalPoints.toFixed(1)} pts
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="py-4 text-center text-sm text-[--muted-foreground]">
                  No free agents found.
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-[--primary]">{error}</p>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {!cooldownReached && (
            <Button
              onClick={handleConfirm}
              disabled={!selectedId || isPending}
            >
              {isPending ? 'Processing...' : 'Confirm Pickup'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
