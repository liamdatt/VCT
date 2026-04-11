import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { leagueBus, type LeagueEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse('unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const leagueSlug = searchParams.get('league');
  if (!leagueSlug) return new NextResponse('missing league', { status: 400 });

  const league = await db.league.findUnique({
    where: { slug: leagueSlug },
    include: { memberships: { where: { userId: session.user.id } } },
  });
  if (!league || league.memberships.length === 0) {
    return new NextResponse('forbidden', { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      send({ type: 'hello', leagueId: league.id });

      const onEvent = (ev: LeagueEvent) => {
        if (ev.leagueId !== league.id) return;
        if (ev.userIds && !ev.userIds.includes(session.user.id)) return;
        send(ev);
      };
      leagueBus.on('event', onEvent);

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 20_000);

      const abort = () => {
        clearInterval(heartbeat);
        leagueBus.off('event', onEvent);
        try { controller.close(); } catch {}
      };
      req.signal.addEventListener('abort', abort);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
