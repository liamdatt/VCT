type Props = {
  team1Name: string;
  team2Name: string;
  team1Wins: number;
  team2Wins: number;
  currentMap: string | null;
};

export function LiveMatchHero({ team1Name, team2Name, team1Wins, team2Wins, currentMap }: Props) {
  return (
    <div className="rounded-lg bg-gradient-to-br from-[#ff4655] to-[#7a1620] p-6 text-white shadow-lg">
      <div className="text-xs uppercase opacity-85">● LIVE NOW</div>
      <div className="mt-1 text-2xl font-bold">
        {team1Name} {team1Wins} — {team2Wins} {team2Name}
      </div>
      {currentMap && <div className="mt-1 text-sm opacity-85">{currentMap}</div>}
    </div>
  );
}
