import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardLiveClient } from '@/components/dashboard/DashboardLiveClient';

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const league = await db.league.findUnique({
    where: { slug },
    include: {
      matches: {
        where: { status: 'LIVE' },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!league) return <p>League not found</p>;

  const hasLiveMatch = league.matches.length > 0;
  const isCommissioner = session.user.role === 'COMMISSIONER';

  const pendingTradesCount = await db.trade.count({
    where: {
      leagueId: league.id,
      receiverId: session.user.id,
      status: 'PROPOSED',
    },
  });

  return (
    <AppShell
      leagueName={league.name}
      leagueStatus={league.status}
      leagueSlug={slug}
      isCommissioner={isCommissioner}
      pendingTradesCount={pendingTradesCount}
      hasLiveMatch={hasLiveMatch}
    >
      <DashboardLiveClient slug={slug} />
      {children}
    </AppShell>
  );
}
