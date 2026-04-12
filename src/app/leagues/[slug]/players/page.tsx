import { getPlayerPool } from '@/server/queries/players';
import { PlayersClient } from '@/components/players/PlayersClient';

export default async function PlayersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const players = await getPlayerPool(slug);

  const teams = [...new Set(players.map((p) => p.teamName))].sort();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[--foreground]">Players</h1>
      <PlayersClient players={players} teams={teams} />
    </div>
  );
}
