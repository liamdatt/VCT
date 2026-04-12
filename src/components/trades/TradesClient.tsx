'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { TradeRow } from '@/components/trade/TradeRow';
import { TradeProposalFlow } from '@/components/roster/TradeProposalFlow';

type TradeItem = {
  handle: string;
  direction: 'PROPOSER_TO_RECEIVER' | 'RECEIVER_TO_PROPOSER';
};

type TradeData = {
  id: string;
  proposerName: string;
  receiverName: string;
  items: TradeItem[];
  role: 'proposer' | 'receiver';
  status: string;
  createdAt: string;
};

type Manager = {
  userId: string;
  username: string;
  players: { id: string; handle: string; teamName: string }[];
};

type MyPlayer = {
  id: string;
  handle: string;
};

type Props = {
  inbox: TradeData[];
  history: TradeData[];
  leagueSlug: string;
  managers: Manager[];
  myPlayers: MyPlayer[];
};

export function TradesClient({
  inbox,
  history,
  leagueSlug,
  managers,
  myPlayers,
}: Props) {
  const [tradeOpen, setTradeOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<MyPlayer | null>(null);

  const openPropose = () => {
    if (myPlayers.length > 0) {
      setSelectedPlayer(myPlayers[0]);
      setTradeOpen(true);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[--foreground]">Trades</h1>
        <Button onClick={openPropose} disabled={myPlayers.length === 0}>
          Propose Trade
        </Button>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList className="mb-4">
          <TabsTrigger value="inbox">Inbox ({inbox.length})</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <div className="space-y-2">
            {inbox.map((t) => (
              <TradeRow
                key={t.id}
                tradeId={t.id}
                proposerName={t.proposerName}
                receiverName={t.receiverName}
                items={t.items}
                role={t.role}
                status={t.status}
              />
            ))}
            {inbox.length === 0 && (
              <p className="py-8 text-center text-sm text-[--muted-foreground]">
                No pending trades.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-2">
            {history.map((t) => (
              <TradeRow
                key={t.id}
                tradeId={t.id}
                proposerName={t.proposerName}
                receiverName={t.receiverName}
                items={t.items}
                role={t.role}
                status={t.status}
              />
            ))}
            {history.length === 0 && (
              <p className="py-8 text-center text-sm text-[--muted-foreground]">
                No trade history.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {selectedPlayer && (
        <TradeProposalFlow
          open={tradeOpen}
          onClose={() => {
            setTradeOpen(false);
            setSelectedPlayer(null);
          }}
          leagueSlug={leagueSlug}
          offeredPlayerId={selectedPlayer.id}
          offeredPlayerHandle={selectedPlayer.handle}
          managers={managers}
        />
      )}
    </>
  );
}
