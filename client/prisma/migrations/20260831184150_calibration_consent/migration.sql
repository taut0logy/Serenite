-- AlterTable
ALTER TABLE "User" ADD COLUMN     "calibrationConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "calibrationConsentAt" TIMESTAMP(3);
