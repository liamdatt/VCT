import { getLeaderboard } from '@/server/queries/leaderboard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function LeaderboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await getLeaderboard(slug);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-100">Leaderboard</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead className="text-right">Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.userId}>
              <TableCell>{r.rank}</TableCell>
              <TableCell>{r.username}</TableCell>
              <TableCell className="text-right font-mono">{r.total.toFixed(1)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
