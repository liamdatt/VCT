import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LeagueStatusDot } from './LeagueStatusDot';

type NavbarProps = {
  leagueName: string;
  leagueStatus: string;
  leagueSlug: string;
  isCommissioner: boolean;
  hasLiveMatch: boolean;
};

export async function Navbar({
  leagueName,
  leagueStatus,
  leagueSlug,
  isCommissioner,
  hasLiveMatch,
}: NavbarProps) {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <header className="fixed top-0 right-0 left-0 z-50 flex h-[52px] items-center justify-between border-b border-[var(--border-subtle)] glass px-5">
      <Link href="/leagues" className="font-display text-[14px] font-semibold tracking-tight">
        <span className="text-[var(--text-primary)]">VCT </span>
        <span className="shimmer">FANTASY</span>
      </Link>

      <div className="hidden items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-white/[0.03] px-3 py-1 text-[12px] text-[var(--text-secondary)] md:inline-flex">
        <LeagueStatusDot status={leagueStatus} hasLiveMatch={hasLiveMatch} />
        <span>{leagueName}</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]">
          <Avatar className="h-6 w-6">
            <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? ''} />
            <AvatarFallback className="bg-[var(--bg-elevated)] text-[10px] text-[var(--text-secondary)]">
              {(session.user.name ?? '?')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 border-[var(--border-default)] bg-[var(--bg-surface)]"
        >
          <div className="px-2 py-1.5 text-[12px] text-[var(--text-secondary)]">
            {session.user.name}
          </div>
          <DropdownMenuSeparator />
          <Link href="/leagues">
            <DropdownMenuItem className="cursor-pointer text-[13px]">
              Switch League
            </DropdownMenuItem>
          </Link>
          {isCommissioner && (
            <Link href={`/admin/leagues/${leagueSlug}`}>
              <DropdownMenuItem className="cursor-pointer text-[13px]">Admin</DropdownMenuItem>
            </Link>
          )}
          <DropdownMenuSeparator />
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
          >
            <DropdownMenuItem className="cursor-pointer text-[13px]" nativeButton>
              <button type="submit" className="w-full text-left">
                Sign Out
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
