type Row = { rank: number; username: string; total: number };
export function CompressedStandings({ rows, meRank }: { rows: Row[]; meRank: number | null }) {
  return (
    <div className="rounded-lg border border-slate-800 p-3 text-xs text-slate-400">
      <div className="mb-1 flex justify-between">
        <span className="uppercase">Standings</span>
        {meRank && <span>You: #{meRank}</span>}
      </div>
      <div className="text-slate-200">
        {rows.map((r) => `${r.username} ${r.total.toFixed(1)}`).join(' · ')}
      </div>
    </div>
  );
}
