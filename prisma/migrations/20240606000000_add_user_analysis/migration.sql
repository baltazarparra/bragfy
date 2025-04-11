-- CreateTable
CREATE TABLE "UserAnalysis" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "telegramId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAnalysis_userId_idx" ON "UserAnalysis"("userId");

-- CreateIndex
CREATE INDEX "UserAnalysis_telegramId_idx" ON "UserAnalysis"("telegramId");

-- AddForeignKey
ALTER TABLE "UserAnalysis" ADD CONSTRAINT "UserAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 