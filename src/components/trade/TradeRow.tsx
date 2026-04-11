'use client';
import { Button } from '@/components/ui/button';
import { resolveTrade } from '@/lib/actions/trade';

type Item = {
  handle: string;
  direction: 'PROPOSER_TO_RECEIVER' | 'RECEIVER_TO_PROPOSER';
};
type Props = {
  tradeId: string;
  proposerName: string;
  receiverName: string;
  items: Item[];
  role: 'proposer' | 'receiver';
  status: string;
};

export function TradeRow({
  tradeId,
  proposerName,
  receiverName,
  items,
  role,
  status,
}: Props) {
  const offered = items
    .filter((i) => i.direction === 'PROPOSER_TO_RECEIVER')
    .map((i) => i.handle)
    .join(', ');
  const requested = items
    .filter((i) => i.direction === 'RECEIVER_TO_PROPOSER')
    .map((i) => i.handle)
    .join(', ');
  return (
    <div className="flex items-center justify-between rounded border border-slate-800 p-3">
      <div className="text-sm text-slate-200">
        <div>
          <strong>{proposerName}</strong> → <strong>{receiverName}</strong>
        </div>
        <div className="text-slate-400">
          {offered} for {requested}
        </div>
      </div>
      {role === 'receiver' && status === 'PROPOSED' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => resolveTrade({ tradeId, accept: true })}>
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => resolveTrade({ tradeId, accept: false })}
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
