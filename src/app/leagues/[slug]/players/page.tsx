import { getPlayerPool } from '@/server/queries/players';
import { PlayersClient } from '@/components/players/PlayersClient';

export default async function PlayersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rows = await getPlayerPool(slug);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[40px] leading-none font-medium text-[var(--text-primary)]">
          Players
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Full player pool. Click any row for the full stat breakdown.
        </p>
      </div>
      <PlayersClient rows={rows} />
    </div>
  );
}
