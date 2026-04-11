import { Card } from '@/components/ui/card';

type Line = { handle: string; teamShort: string; isCaptain: boolean; total: number };

export function MyPlayersInMatch({ lines }: { lines: Line[] }) {
  if (lines.length === 0) return null;
  return (
    <Card className="p-4">
      <div className="mb-2 text-xs uppercase text-slate-400">Your Players in this Match</div>
      <div className="space-y-1 text-sm">
        {lines.map((l) => (
          <div key={l.handle} className="flex items-center justify-between">
            <span className="text-slate-100">
              {l.isCaptain && <span className="mr-1 text-red-500">★</span>}
              {l.handle} · {l.teamShort}
            </span>
            <span className={l.total >= 0 ? 'font-mono text-green-400' : 'font-mono text-slate-400'}>
              {l.total >= 0 ? '+' : ''}
              {l.total.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
