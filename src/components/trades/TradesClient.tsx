'use client';
import * as React from 'react';
import { TradeRow } from '@/components/trade/TradeRow';

type Row = {
  id: string;
  proposerName: string;
  receiverName: string;
  status: string;
  items: Array<{ handle: string; direction: 'PROPOSER_TO_RECEIVER' | 'RECEIVER_TO_PROPOSER' }>;
  isInbox: boolean;
  createdAt: string;
};

type Props = {
  inboxIds: string[];
  historyIds: string[];
  rows: Row[];
  leagueSlug: string;
};

type Tab = 'inbox' | 'history';

export function TradesClient({ inboxIds, historyIds, rows }: Props) {
  const [tab, setTab] = React.useState<Tab>(inboxIds.length > 0 ? 'inbox' : 'history');
  const ids = tab === 'inbox' ? inboxIds : historyIds;
  const visible = rows.filter((r) => ids.includes(r.id));

  return (
    <div className="space-y-5">
      <div className="relative flex border-b border-[var(--border-subtle)]">
        {(['inbox', 'history'] as const).map((t) => {
          const isActive = t === tab;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative flex h-9 items-center gap-2 px-4 text-[13px] font-medium transition-colors ${
                isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {t === 'inbox' ? 'Inbox' : 'History'}
              {t === 'inbox' && inboxIds.length > 0 && (
                <span className="inline-flex h-4 items-center rounded-full bg-[var(--accent-primary)]/20 px-1.5 text-[10px] font-semibold text-[var(--accent-primary)]">
                  {inboxIds.length}
                </span>
              )}
              {isActive && (
                <span className="absolute right-3 bottom-0 left-3 h-0.5 rounded-t bg-[var(--accent-primary)]" />
              )}
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        {visible.length === 0 && (
          <p className="py-8 text-center text-[13px] text-[var(--text-tertiary)]">Nothing here.</p>
        )}
        {visible.map((r) => (
          <TradeRow
            key={r.id}
            tradeId={r.id}
            proposerName={r.proposerName}
            receiverName={r.receiverName}
            items={r.items}
            role={r.isInbox ? 'receiver' : 'proposer'}
            status={r.status}
          />
        ))}
      </div>
    </div>
  );
}
