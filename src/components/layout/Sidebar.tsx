'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  leagueSlug: string;
  isCommissioner: boolean;
  pendingTradesCount: number;
  hasLiveMatch: boolean;
}

const navItems = [
  { label: 'Dashboard', href: '', icon: '\u{1F3E0}' },
  { label: 'Leaderboard', href: '/leaderboard', icon: '\u{1F3C6}' },
  { label: 'My Roster', href: '/roster', icon: '\u{1F465}' },
  { label: 'Players', href: '/players', icon: '\u{1F3AE}' },
  { label: 'Matches', href: '/matches', icon: '\u2694\uFE0F' },
  { label: 'Trades', href: '/trades', icon: '\u{1F504}' },
  { label: 'History', href: '/history', icon: '\u{1F4CA}' },
];

export function Sidebar({
  leagueSlug,
  isCommissioner,
  pendingTradesCount,
  hasLiveMatch,
}: SidebarProps) {
  const pathname = usePathname();
  const basePath = `/leagues/${leagueSlug}`;

  function isActive(href: string) {
    const fullPath = href === '' ? basePath : `${basePath}${href}`;
    if (href === '') {
      return pathname === basePath || pathname === `${basePath}/`;
    }
    return pathname.startsWith(fullPath);
  }

  return (
    <aside className="fixed left-0 top-14 hidden h-[calc(100vh-3.5rem)] w-60 border-r border-[--border] bg-[--sidebar] lg:block">
      <nav className="flex h-full flex-col gap-1 p-3">
        <div className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const fullHref = item.href === '' ? basePath : `${basePath}${item.href}`;

            return (
              <Link
                key={item.label}
                href={fullHref}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[--primary]/10 text-[--primary]'
                    : 'text-[--muted-foreground] hover:bg-[--sidebar-accent]'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>

                {/* Live dot on Dashboard */}
                {item.label === 'Dashboard' && hasLiveMatch && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                  </span>
                )}

                {/* Trade count badge */}
                {item.label === 'Trades' && pendingTradesCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                    {pendingTradesCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {isCommissioner && (
          <div className="border-t border-[--border] pt-2">
            <Link
              href={`${basePath}/admin`}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith(`${basePath}/admin`)
                  ? 'bg-[--primary]/10 text-[--primary]'
                  : 'text-[--muted-foreground] hover:bg-[--sidebar-accent]'
              }`}
            >
              <span className="text-base">{'\u2699\uFE0F'}</span>
              <span>Admin</span>
            </Link>
          </div>
        )}
      </nav>
    </aside>
  );
}
