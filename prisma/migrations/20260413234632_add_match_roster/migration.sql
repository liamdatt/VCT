-- CreateTable
CREATE TABLE "MatchRoster" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MatchRoster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchRoster_matchId_idx" ON "MatchRoster"("matchId");

-- CreateIndex
CREATE INDEX "MatchRoster_userId_idx" ON "MatchRoster"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchRoster_matchId_userId_playerId_key" ON "MatchRoster"("matchId", "userId", "playerId");

-- AddForeignKey
ALTER TABLE "MatchRoster" ADD CONSTRAINT "MatchRoster_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchRoster" ADD CONSTRAINT "MatchRoster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchRoster" ADD CONSTRAINT "MatchRoster_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
