import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface NavbarProps {
  leagueName: string;
  leagueStatus: string;
  leagueSlug: string;
  isCommissioner: boolean;
}

export async function Navbar({
  leagueName,
  leagueStatus,
  leagueSlug,
  isCommissioner,
}: NavbarProps) {
  const session = await auth();

  const statusColor: Record<string, string> = {
    DRAFT_PENDING: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/40',
    DRAFTING: 'bg-blue-600/20 text-blue-400 border-blue-600/40',
    ACTIVE: 'bg-green-600/20 text-green-400 border-green-600/40',
    COMPLETED: 'bg-slate-600/20 text-slate-400 border-slate-600/40',
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-[--border] bg-[#0a0e14]/95 px-4 backdrop-blur-sm">
      {/* Left: Wordmark */}
      <Link href="/leagues" className="flex items-center gap-1 text-lg font-bold">
        <span className="text-white">VCT</span>
        <span className="text-[--primary]">Fantasy</span>
      </Link>

      {/* Center: League name + status */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[--foreground]">{leagueName}</span>
        <Badge
          variant="outline"
          className={statusColor[leagueStatus] ?? 'bg-slate-600/20 text-slate-400'}
        >
          {leagueStatus.replace('_', ' ')}
        </Badge>
      </div>

      {/* Right: User avatar dropdown */}
      {session?.user && (
        <DropdownMenu>
          <DropdownMenuTrigger className="relative flex h-8 w-8 items-center justify-center rounded-full outline-none">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? ''} />
              <AvatarFallback className="bg-[--primary]/20 text-[--primary] text-xs">
                {(session.user.name ?? '?')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-sm font-medium text-[--foreground]">
              {session.user.name}
            </div>
            <DropdownMenuSeparator />
            <Link href="/leagues">
              <DropdownMenuItem className="cursor-pointer">
                Switch League
              </DropdownMenuItem>
            </Link>
            {isCommissioner && (
              <Link href={`/admin/leagues/${leagueSlug}`}>
                <DropdownMenuItem className="cursor-pointer">
                  Admin
                </DropdownMenuItem>
              </Link>
            )}
            <DropdownMenuSeparator />
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <DropdownMenuItem className="cursor-pointer" nativeButton>
                <button type="submit" className="w-full text-left">Sign Out</button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
