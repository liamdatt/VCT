import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  leagueName: string;
  leagueStatus: string;
  leagueSlug: string;
  isCommissioner: boolean;
  pendingTradesCount: number;
  hasLiveMatch: boolean;
  children: React.ReactNode;
}

export function AppShell({
  leagueName,
  leagueStatus,
  leagueSlug,
  isCommissioner,
  pendingTradesCount,
  hasLiveMatch,
  children,
}: AppShellProps) {
  return (
    <>
      <Navbar
        leagueName={leagueName}
        leagueStatus={leagueStatus}
        leagueSlug={leagueSlug}
        isCommissioner={isCommissioner}
      />
      <Sidebar
        leagueSlug={leagueSlug}
        isCommissioner={isCommissioner}
        pendingTradesCount={pendingTradesCount}
        hasLiveMatch={hasLiveMatch}
      />
      <main className="pt-14 lg:pl-60">
        <div className="mx-auto max-w-5xl p-6">{children}</div>
      </main>
    </>
  );
}
