'use client';

import { useState, useTransition } from 'react';
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
import { proposeTrade } from '@/lib/actions/trade';

type Manager = {
  userId: string;
  username: string;
  players: { id: string; handle: string; teamName: string }[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  leagueSlug: string;
  offeredPlayerId: string;
  offeredPlayerHandle: string;
  managers: Manager[];
};

export function TradeProposalFlow({
  open,
  onClose,
  leagueSlug,
  offeredPlayerId,
  offeredPlayerHandle,
  managers,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [targetManagerId, setTargetManagerId] = useState<string | null>(null);
  const [requestedPlayerId, setRequestedPlayerId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const targetManager = managers.find((m) => m.userId === targetManagerId);

  const reset = () => {
    setStep(1);
    setTargetManagerId(null);
    setRequestedPlayerId(null);
    setError(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      reset();
    }
  };

  const handleConfirm = () => {
    if (!targetManagerId || !requestedPlayerId) return;
    setError(null);
    startTransition(async () => {
      try {
        await proposeTrade({
          leagueSlug,
          receiverUserId: targetManagerId,
          offeredPlayerIds: [offeredPlayerId],
          requestedPlayerIds: [requestedPlayerId],
        });
        onClose();
        reset();
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to propose trade');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Propose Trade</DialogTitle>
          <DialogDescription>
            Offering <span className="font-semibold text-[--foreground]">{offeredPlayerHandle}</span>
            {step === 1
              ? ' — Select a manager'
              : step === 2
                ? ` — Select a player from ${targetManager?.username}`
                : ' — Confirm trade'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select manager */}
        {step === 1 && (
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {managers.map((m) => (
              <button
                key={m.userId}
                type="button"
                onClick={() => {
                  setTargetManagerId(m.userId);
                  setStep(2);
                }}
                className="flex w-full items-center rounded-md border border-[--border] px-3 py-2 text-left text-sm transition-colors hover:border-[--primary]/50"
              >
                <span className="font-medium text-[--foreground]">{m.username}</span>
                <span className="ml-auto text-xs text-[--muted-foreground]">
                  {m.players.length} players
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Select their player */}
        {step === 2 && targetManager && (
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {targetManager.players.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setRequestedPlayerId(p.id);
                  setStep(3);
                }}
                className="flex w-full items-center justify-between rounded-md border border-[--border] px-3 py-2 text-left text-sm transition-colors hover:border-[--primary]/50"
              >
                <span className="font-medium text-[--foreground]">{p.handle}</span>
                <span className="text-xs text-[--muted-foreground]">{p.teamName}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-3 py-2">
            <div className="rounded-md border border-[--border] p-3 text-sm">
              <div className="text-[--muted-foreground]">You send:</div>
              <div className="font-semibold text-[--foreground]">{offeredPlayerHandle}</div>
            </div>
            <div className="text-center text-lg text-[--muted-foreground]">&harr;</div>
            <div className="rounded-md border border-[--border] p-3 text-sm">
              <div className="text-[--muted-foreground]">
                You receive from {targetManager?.username}:
              </div>
              <div className="font-semibold text-[--foreground]">
                {targetManager?.players.find((p) => p.id === requestedPlayerId)?.handle}
              </div>
            </div>
            {error && <p className="text-sm text-[--primary]">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => {
                if (step === 2) {
                  setTargetManagerId(null);
                  setStep(1);
                } else {
                  setRequestedPlayerId(null);
                  setStep(2);
                }
              }}
            >
              Back
            </Button>
          )}
          <Button variant="outline" onClick={() => { onClose(); reset(); }}>
            Cancel
          </Button>
          {step === 3 && (
            <Button onClick={handleConfirm} disabled={isPending}>
              {isPending ? 'Proposing...' : 'Propose Trade'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
