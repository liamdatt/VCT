import { db } from '@/lib/db';

export async function listLeaguesForUser(userId: string) {
  return db.league.findMany({
    where: { memberships: { some: { userId } } },
    orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    select: { id: true, slug: true, name: true, status: true, startDate: true, endDate: true },
  });
}
