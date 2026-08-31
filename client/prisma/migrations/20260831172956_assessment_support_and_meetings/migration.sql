/*
  Warnings:

  - You are about to drop the column `targetCognitivePatterns` on the `SupportGroup` table. All the data in the column will be lost.
  - You are about to drop the column `targetDailyFunctioning` on the `SupportGroup` table. All the data in the column will be lost.
  - You are about to drop the column `targetDistress` on the `SupportGroup` table. All the data in the column will be lost.
  - You are about to drop the column `targetFearAvoidance` on the `SupportGroup` table. All the data in the column will be lost.
  - You are about to drop the column `targetTraumaStress` on the `SupportGroup` table. All the data in the column will be lost.
  - You are about to drop the `MentalHealthProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuestionnaireResponse` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SupportConversationStatus" AS ENUM ('OPEN', 'CLAIMED', 'CLOSED');

-- DropForeignKey
ALTER TABLE "MentalHealthProfile" DROP CONSTRAINT "MentalHealthProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionnaireResponse" DROP CONSTRAINT "QuestionnaireResponse_userId_fkey";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "supportConversationId" TEXT;

-- AlterTable
ALTER TABLE "SupportGroup" DROP COLUMN "targetCognitivePatterns",
DROP COLUMN "targetDailyFunctioning",
DROP COLUMN "targetDistress",
DROP COLUMN "targetFearAvoidance",
DROP COLUMN "targetTraumaStress",
ADD COLUMN     "facilitatorId" TEXT,
ADD COLUMN     "targetThetaAnxiety" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "targetThetaDepression" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "targetThetaSelfWorth" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "targetThetaSleep" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "targetThetaSocial" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "targetThetaTrauma" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "MentalHealthProfile";

-- DropTable
DROP TABLE "QuestionnaireResponse";

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parameterSetId" TEXT NOT NULL,
    "encryptedData" BYTEA,
    "iv" BYTEA,
    "salt" BYTEA,
    "thetaDepression" DOUBLE PRECISION,
    "seDepression" DOUBLE PRECISION,
    "thetaAnxiety" DOUBLE PRECISION,
    "seAnxiety" DOUBLE PRECISION,
    "thetaTrauma" DOUBLE PRECISION,
    "seTrauma" DOUBLE PRECISION,
    "thetaSleep" DOUBLE PRECISION,
    "seSleep" DOUBLE PRECISION,
    "thetaSocial" DOUBLE PRECISION,
    "seSocial" DOUBLE PRECISION,
    "thetaSelfWorth" DOUBLE PRECISION,
    "seSelfWorth" DOUBLE PRECISION,
    "phq9Raw" INTEGER,
    "gad7Raw" INTEGER,
    "pcptsd5Raw" INTEGER,
    "traumaExposed" BOOLEAN NOT NULL DEFAULT false,
    "overallSeverity" "SeverityLevel" NOT NULL DEFAULT 'MINIMAL',
    "priorities" TEXT[],
    "riskFlag" BOOLEAN NOT NULL DEFAULT false,
    "riskEscalated" BOOLEAN NOT NULL DEFAULT false,
    "qualityFlagged" BOOLEAN NOT NULL DEFAULT false,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationResponse" (
    "id" TEXT NOT NULL,
    "respondentKey" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "responseTimeMs" INTEGER,
    "parameterSetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalibrationResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportConversation" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "SupportConversationStatus" NOT NULL DEFAULT 'OPEN',
    "claimedById" TEXT,
    "assessmentId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assessment_userId_isComplete_idx" ON "Assessment"("userId", "isComplete");

-- CreateIndex
CREATE INDEX "Assessment_overallSeverity_idx" ON "Assessment"("overallSeverity");

-- CreateIndex
CREATE INDEX "CalibrationResponse_itemId_idx" ON "CalibrationResponse"("itemId");

-- CreateIndex
CREATE INDEX "CalibrationResponse_respondentKey_idx" ON "CalibrationResponse"("respondentKey");

-- CreateIndex
CREATE UNIQUE INDEX "SupportConversation_memberId_key" ON "SupportConversation"("memberId");

-- CreateIndex
CREATE INDEX "SupportConversation_status_openedAt_idx" ON "SupportConversation"("status", "openedAt");

-- CreateIndex
CREATE INDEX "SupportConversation_claimedById_idx" ON "SupportConversation"("claimedById");

-- CreateIndex
CREATE INDEX "Message_supportConversationId_idx" ON "Message"("supportConversationId");

-- CreateIndex
CREATE INDEX "SupportGroup_facilitatorId_idx" ON "SupportGroup"("facilitatorId");

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportGroup" ADD CONSTRAINT "SupportGroup_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_supportConversationId_fkey" FOREIGN KEY ("supportConversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
