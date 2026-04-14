'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PlayerPortraitCard } from './PlayerPortraitCard';
import { FreeAgencyModal } from './FreeAgencyModal';
import { TradeProposalFlow } from './TradeProposalFlow';
import { changeCaptain } from '@/lib/actions/captain';

type PlayerSlot = {
  id: string;
  playerId: string;
  handle: string;
  teamName: string;
  teamShortCode: string;
  totalPoints: number;
  kills: number;
  deaths: number;
  assists: number;
  mapsPlayed: number;
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
  otherPlayers: PlayerSlot[];
  freeAgents: FreeAgent[];
  managers: Manager[];
  cooldownReached: boolean;
  captainCooldownDays: number | null;
};

export function RosterClient({
  leagueSlug,
  otherPlayers,
  freeAgents,
  managers,
  cooldownReached,
  captainCooldownDays,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [dropPlayer, setDropPlayer] = React.useState<PlayerSlot | null>(null);
  const [tradePlayer, setTradePlayer] = React.useState<PlayerSlot | null>(null);

  function onMakeCaptain(playerId: string) {
    startTransition(async () => {
      try {
        await changeCaptain({ leagueSlug, newCaptainPlayerId: playerId });
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : 'failed');
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {otherPlayers.map((p) => (
          <PlayerPortraitCard
            key={p.id}
            handle={p.handle}
            teamName={p.teamName}
            teamShortCode={p.teamShortCode}
            totalPoints={p.totalPoints}
            kills={p.kills}
            deaths={p.deaths}
            assists={p.assists}
            mapsPlayed={p.mapsPlayed}
            captainCooldownDays={captainCooldownDays}
            onDrop={() => setDropPlayer(p)}
            onTrade={() => setTradePlayer(p)}
            onMakeCaptain={() => !isPending && onMakeCaptain(p.playerId)}
          />
        ))}
      </div>
      {dropPlayer && (
        <FreeAgencyModal
          open
          onClose={() => setDropPlayer(null)}
          leagueSlug={leagueSlug}
          droppedPlayerId={dropPlayer.playerId}
          droppedPlayerHandle={dropPlayer.handle}
          freeAgents={freeAgents}
          cooldownReached={cooldownReached}
        />
      )}
      {tradePlayer && (
        <TradeProposalFlow
          open
          onClose={() => setTradePlayer(null)}
          leagueSlug={leagueSlug}
          offeredPlayerId={tradePlayer.playerId}
          offeredPlayerHandle={tradePlayer.handle}
          managers={managers}
        />
      )}
    </>
  );
}
