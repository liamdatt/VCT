import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

type Props = {
  children: React.ReactNode;
  leagueName: string;
  leagueStatus: string;
  leagueSlug: string;
  isCommissioner: boolean;
  pendingTradesCount: number;
  hasLiveMatch: boolean;
};

export function AppShell({
  children,
  leagueName,
  leagueStatus,
  leagueSlug,
  isCommissioner,
  pendingTradesCount,
  hasLiveMatch,
}: Props) {
  return (
    <>
      <Navbar
        leagueName={leagueName}
        leagueStatus={leagueStatus}
        leagueSlug={leagueSlug}
        isCommissioner={isCommissioner}
        hasLiveMatch={hasLiveMatch}
      />
      <Sidebar
        leagueSlug={leagueSlug}
        isCommissioner={isCommissioner}
        pendingTradesCount={pendingTradesCount}
        hasLiveMatch={hasLiveMatch}
      />
      <main className="pt-[52px] lg:pl-60">
        <div className="mx-auto w-full max-w-[1280px] px-5 py-10 md:px-8">
          {children}
        </div>
      </main>
    </>
  );
}
