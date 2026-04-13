'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateMatchRoster } from '@/lib/actions/match-roster';

type Manager = { userId: string; username: string };
type PlayerOption = { id: string; handle: string; teamName: string };

type RosterState = {
  userId: string;
  playerIds: string[]; // length 5, may contain '' while editing
  captainPlayerId: string;
};

type Props = {
  matchId: string;
  leagueSlug: string;
  managers: Manager[];
  initialRosters: Array<{
    userId: string;
    playerIds: string[];
    captainPlayerId: string;
  }>;
  allPlayers: PlayerOption[];
};

function padTo5(ids: string[]): string[] {
  const out = ids.slice(0, 5);
  while (out.length < 5) out.push('');
  return out;
}

export function MatchRosterEditor({
  matchId,
  leagueSlug,
  managers,
  initialRosters,
  allPlayers,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const initial: RosterState[] = useMemo(() => {
    const byUser = new Map(initialRosters.map((r) => [r.userId, r]));
    return managers.map((m) => {
      const existing = byUser.get(m.userId);
      return {
        userId: m.userId,
        playerIds: padTo5(existing?.playerIds ?? []),
        captainPlayerId: existing?.captainPlayerId ?? '',
      };
    });
  }, [managers, initialRosters]);

  const [rosters, setRosters] = useState<RosterState[]>(initial);

  // Compute global conflicts: playerId -> count
  const playerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rosters) {
      for (const pid of r.playerIds) {
        if (!pid) continue;
        counts.set(pid, (counts.get(pid) ?? 0) + 1);
      }
    }
    return counts;
  }, [rosters]);

  const playerLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of allPlayers) m.set(p.id, `${p.handle} (${p.teamName})`);
    return m;
  }, [allPlayers]);

  function setSlot(managerIdx: number, slotIdx: number, playerId: string) {
    setRosters((prev) => {
      const next = prev.map((r) => ({ ...r, playerIds: [...r.playerIds] }));
      const roster = next[managerIdx];
      const oldPid = roster.playerIds[slotIdx];
      roster.playerIds[slotIdx] = playerId;
      // If the replaced player was captain, clear captain
      if (roster.captainPlayerId === oldPid) {
        roster.captainPlayerId = '';
      }
      return next;
    });
  }

  function setCaptain(managerIdx: number, playerId: string) {
    setRosters((prev) => {
      const next = prev.map((r) => ({ ...r, playerIds: [...r.playerIds] }));
      next[managerIdx].captainPlayerId = playerId;
      return next;
    });
  }

  // Validation
  const validationErrors: string[] = [];
  for (const r of rosters) {
    const username = managers.find((m) => m.userId === r.userId)?.username ?? r.userId;
    const filled = r.playerIds.filter(Boolean);
    const uniq = new Set(filled);
    if (filled.length !== 5) {
      validationErrors.push(`${username} needs 5 players (has ${filled.length})`);
    } else if (uniq.size !== 5) {
      validationErrors.push(`${username} has duplicate players`);
    }
    if (!r.captainPlayerId) {
      validationErrors.push(`${username} needs a captain`);
    } else if (!uniq.has(r.captainPlayerId)) {
      validationErrors.push(`${username} captain must be one of their 5 players`);
    }
  }
  const conflicts: string[] = [];
  for (const [pid, count] of playerCounts) {
    if (count > 1) {
      conflicts.push(`${playerLabel.get(pid) ?? pid} is on ${count} rosters`);
    }
  }

  const canSubmit = validationErrors.length === 0 && conflicts.length === 0 && !isPending;

  function onSave() {
    setMessage(null);
    startTransition(async () => {
      try {
        await updateMatchRoster({
          matchId,
          leagueSlug,
          rosters: rosters.map((r) => ({
            userId: r.userId,
            playerIds: r.playerIds,
            captainPlayerId: r.captainPlayerId,
          })),
        });
        setMessage({ kind: 'ok', text: 'Rosters saved and snapshots recomputed.' });
        router.refresh();
      } catch (err) {
        const text = err instanceof Error ? err.message : 'failed to save';
        setMessage({ kind: 'err', text });
      }
    });
  }

  return (
    <div className="rounded border border-yellow-600/60 bg-[--card] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-yellow-400">Edit Rosters (per-match)</h3>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSubmit}
          className="rounded bg-[--primary] px-3 py-1.5 text-sm font-semibold text-white shadow hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? 'Saving…' : 'Save & Recompute'}
        </button>
      </div>

      {(validationErrors.length > 0 || conflicts.length > 0) && (
        <div className="space-y-1 rounded border border-[--primary]/50 bg-[--primary]/10 p-2 text-xs">
          {validationErrors.map((e, i) => (
            <div key={`v${i}`} className="text-[--primary]">• {e}</div>
          ))}
          {conflicts.map((e, i) => (
            <div key={`c${i}`} className="text-[--primary]">⚠ {e}</div>
          ))}
        </div>
      )}

      {message && (
        <div
          className={`rounded border p-2 text-xs ${
            message.kind === 'ok'
              ? 'border-[--chart-2]/50 bg-[--chart-2]/10 text-[--chart-2]'
              : 'border-[--primary]/50 bg-[--primary]/10 text-[--primary]'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rosters.map((r, managerIdx) => {
          const manager = managers.find((m) => m.userId === r.userId);
          return (
            <div
              key={r.userId}
              className="rounded border border-[--border] bg-[--card] p-3"
            >
              <div className="mb-2 text-sm font-medium text-[--foreground]">
                {manager?.username ?? r.userId}
              </div>
              <div className="space-y-1.5">
                {r.playerIds.map((pid, slotIdx) => {
                  const isConflict = pid && (playerCounts.get(pid) ?? 0) > 1;
                  const isCaptain = r.captainPlayerId && pid === r.captainPlayerId;
                  return (
                    <div key={slotIdx} className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name={`captain-${matchId}-${r.userId}`}
                        checked={!!isCaptain}
                        disabled={!pid}
                        onChange={() => setCaptain(managerIdx, pid)}
                        title="Captain"
                        className="accent-yellow-400"
                      />
                      <select
                        value={pid}
                        onChange={(e) => setSlot(managerIdx, slotIdx, e.target.value)}
                        className={`flex-1 rounded border bg-slate-800 px-1.5 py-1 text-xs text-white ${
                          isConflict
                            ? 'border-[--primary] text-[--primary]'
                            : 'border-[--border]'
                        }`}
                      >
                        <option value="">— select player —</option>
                        {allPlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.handle} ({p.teamName})
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
