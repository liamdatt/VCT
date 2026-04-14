import { StatusDot } from '@/components/shared/StatusDot';

type Props = {
  status: string;
  hasLiveMatch: boolean;
};

export function LeagueStatusDot({ status, hasLiveMatch }: Props) {
  if (hasLiveMatch) return <StatusDot tone="live" pulse />;
  if (status === 'ACTIVE') return <StatusDot tone="win" />;
  if (status === 'DRAFTING' || status === 'DRAFT_PENDING') return <StatusDot tone="captain" />;
  return <StatusDot tone="idle" />;
}
