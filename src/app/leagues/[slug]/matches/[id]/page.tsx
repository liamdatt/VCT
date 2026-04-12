import { getMatchDetail } from '@/server/queries/matches';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PointsDelta } from '@/components/shared/PointsDelta';
import { Star } from 'lucide-react';
import { db } from '@/lib/db';

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const match = await getMatchDetail(id);

  if (!match)
    return <p className="text-[--muted-foreground]">Match not found</p>;

  // Get league for roster context
  const league = await db.league.findUnique({ where: { slug } });
  const rosterSlots = league
    ? await db.rosterSlot.findMany({
        where: { leagueId: league.id },
        include: { user: true },
      })
    : [];
  const ownerMap = new Map(
    rosterSlots.map((s) => [s.playerId, s.user.username])
  );
  const captainSet = new Set(
    rosterSlots.filter((s) => s.isCaptain).map((s) => s.playerId)
  );

  const t1Wins = match.games.filter(
    (g) => g.winnerTeamId === match.team1Id
  ).length;
  const t2Wins = match.games.filter(
    (g) => g.winnerTeamId === match.team2Id
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-2xl font-bold text-[--foreground]">
            {match.team1.name} vs {match.team2.name}
          </h1>
          {match.status === 'LIVE' ? (
            <Badge variant="destructive" className="animate-pulse">
              LIVE
            </Badge>
          ) : (
            <Badge variant="outline">{match.status}</Badge>
          )}
        </div>
        <div className="mt-2 font-mono text-3xl font-bold text-[--foreground]">
          {t1Wins} - {t2Wins}
        </div>
        {match.finalScore && (
          <div className="mt-1 text-sm text-[--muted-foreground]">
            Final: {match.finalScore}
          </div>
        )}
      </div>

      {/* Maps */}
      {match.games.map((game) => {
        const pts = (s: (typeof game.stats)[number]) =>
          s.kills * 2 + s.assists * 1.5 - s.deaths + (s.aces ?? 0) * 5 + (s.won ? 10 : -5);

        return (
          <div key={game.id}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-[--foreground]">
                {game.mapName}
              </span>
              <span className="font-mono text-sm text-[--muted-foreground]">
                {game.team1Score} - {game.team2Score}
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">K</TableHead>
                  <TableHead className="text-right">D</TableHead>
                  <TableHead className="text-right">A</TableHead>
                  <TableHead className="text-right">Pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {game.stats.map((s) => (
                  <TableRow
                    key={s.id}
                    className={s.won ? 'bg-[--chart-2]/5' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-[--foreground]">
                          {s.player.handle}
                        </span>
                        <span className="text-[10px] text-[--muted-foreground]">
                          {s.player.team.shortCode}
                        </span>
                        {ownerMap.has(s.playerId) && (
                          <Badge variant="outline" className="text-[10px]">
                            {ownerMap.get(s.playerId)}
                          </Badge>
                        )}
                        {captainSet.has(s.playerId) && (
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {s.kills}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {s.deaths}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {s.assists}
                    </TableCell>
                    <TableCell className="text-right">
                      <PointsDelta value={pts(s)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}

      {match.games.length === 0 && (
        <p className="text-center text-sm text-[--muted-foreground]">
          No maps played yet.
        </p>
      )}
    </div>
  );
}
