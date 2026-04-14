'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Trophy,
  Users,
  Search,
  Calendar,
  ArrowLeftRight,
  Clock,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { SectionLabel } from '@/components/shared/SectionLabel';
import { StatusDot } from '@/components/shared/StatusDot';

const NAV_ITEMS = [
  { href: '', label: 'Dashboard', Icon: Home },
  { href: '/leaderboard', label: 'Leaderboard', Icon: Trophy },
  { href: '/roster', label: 'Roster', Icon: Users },
  { href: '/players', label: 'Players', Icon: Search },
  { href: '/matches', label: 'Matches', Icon: Calendar },
  { href: '/trades', label: 'Trades', Icon: ArrowLeftRight },
  { href: '/history', label: 'History', Icon: Clock },
] as const;

type Props = {
  leagueSlug: string;
  isCommissioner: boolean;
  pendingTradesCount: number;
  hasLiveMatch: boolean;
};

export function Sidebar({
  leagueSlug,
  isCommissioner,
  pendingTradesCount,
  hasLiveMatch,
}: Props) {
  const pathname = usePathname();
  const base = `/leagues/${leagueSlug}`;

  return (
    <aside className="fixed top-[52px] left-0 hidden h-[calc(100vh-52px)] w-60 border-r border-[var(--border-subtle)] glass lg:flex lg:flex-col">
      <div className="px-4 pt-4 pb-2">
        <SectionLabel>League</SectionLabel>
      </div>
      <nav className="flex flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const fullHref = `${base}${item.href}`;
          const isActive = item.href === '' ? pathname === base : pathname.startsWith(fullHref);
          const Icon = item.Icon;
          const showLiveDot = item.label === 'Dashboard' && hasLiveMatch;
          const showTradeBadge = item.label === 'Trades' && pendingTradesCount > 0;

          return (
            <Link
              key={item.label}
              href={fullHref}
              className={`relative flex h-8 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]'
              }`}
            >
              {isActive && (
                <span className="absolute top-1 left-0 h-6 w-0.5 rounded-r-full bg-[var(--accent-primary)]" />
              )}
              <Icon size={14} strokeWidth={1.5} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
              {showLiveDot && <StatusDot tone="live" pulse />}
              {showTradeBadge && (
                <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500/20 px-1 text-[10px] font-semibold text-rose-400">
                  {pendingTradesCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {isCommissioner && (
        <>
          <div className="mt-6 px-4 pb-2">
            <SectionLabel>Commissioner</SectionLabel>
          </div>
          <nav className="flex flex-col gap-0.5 px-3">
            <Link
              href={`/admin/leagues/${leagueSlug}`}
              className="flex h-8 items-center gap-3 rounded-md px-3 text-[13px] font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
            >
              <Settings size={14} strokeWidth={1.5} />
              <span>Admin</span>
            </Link>
            <Link
              href={`/admin/leagues/${leagueSlug}/audit`}
              className="flex h-8 items-center gap-3 rounded-md px-3 text-[13px] font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
            >
              <ShieldCheck size={14} strokeWidth={1.5} />
              <span>Audit</span>
            </Link>
          </nav>
        </>
      )}
    </aside>
  );
}
