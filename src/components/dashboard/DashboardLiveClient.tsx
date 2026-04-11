'use client';
import { useLeagueStream } from '@/components/useLeagueStream';

export function DashboardLiveClient({ slug }: { slug: string }) {
  useLeagueStream(slug);
  return null;
}
