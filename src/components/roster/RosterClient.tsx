'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PlayerCard } from '@/components/shared/PlayerCard';
import { FreeAgencyModal } from './FreeAgencyModal';
import { TradeProposalFlow } from './TradeProposalFlow';
import { changeCaptain } from '@/lib/actions/captain';

type RosterSlot = {
  id: string;
  playerId: string;
  handle: string;
  teamName: string;
  isCaptain: boolean;
  acquiredVia: string;
  totalPoints: number;
};

type FreeAgent = {
  id: string;
  handle: string;
  teamName: string;
  totalPoints: number;
};

type Manager = {
  userId: string;
  username: string;
  players: { id: string; handle: string; teamName: string }[];
};

type Props = {
  leagueSlug: string;
  slots: RosterSlot[];
  freeAgents: FreeAgent[];
  managers: Manager[];
  cooldownReached: boolean;
  captainCooldownActive: boolean;
};

export function RosterClient({
  leagueSlug,
  slots,
  freeAgents,
  managers,
  cooldownReached,
  captainCooldownActive,
}: Props) {
  const router = useRouter();
  const [faModal, setFaModal] = useState<{
    playerId: string;
    handle: string;
  } | null>(null);
  const [tradeModal, setTradeModal] = useState<{
    playerId: string;
    handle: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  const handleCaptainToggle = (playerId: string) => {
    startTransition(async () => {
      try {
        await changeCaptain({ leagueSlug, newCaptainPlayerId: playerId });
        router.refresh();
      } catch {
        // Captain cooldown or other error — ignore silently
      }
    });
  };

  return (
    <>
      <div className="space-y-2">
        {slots.map((s) => (
          <PlayerCard
            key={s.id}
            handle={s.handle}
            teamName={s.teamName}
            totalPoints={s.totalPoints}
            isCaptain={s.isCaptain}
            acquiredVia={s.acquiredVia}
            captainCooldownActive={captainCooldownActive}
            onCaptainToggle={() => handleCaptainToggle(s.playerId)}
            onDrop={() => setFaModal({ playerId: s.playerId, handle: s.handle })}
            onTrade={() =>
              setTradeModal({ playerId: s.playerId, handle: s.handle })
            }
          />
        ))}
        {slots.length === 0 && (
          <p className="py-8 text-center text-sm text-[--muted-foreground]">
            No players on your roster.
          </p>
        )}
      </div>

      {faModal && (
        <FreeAgencyModal
          open
          onClose={() => setFaModal(null)}
          leagueSlug={leagueSlug}
          droppedPlayerId={faModal.playerId}
          droppedPlayerHandle={faModal.handle}
          freeAgents={freeAgents}
          cooldownReached={cooldownReached}
        />
      )}

      {tradeModal && (
        <TradeProposalFlow
          open
          onClose={() => setTradeModal(null)}
          leagueSlug={leagueSlug}
          offeredPlayerId={tradeModal.playerId}
          offeredPlayerHandle={tradeModal.handle}
          managers={managers}
        />
      )}
    </>
  );
}
