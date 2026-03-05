-- CreateTable
CREATE TABLE "UserEncryptionKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wrappedMasterKey" BYTEA NOT NULL,
    "kekSalt" BYTEA NOT NULL,
    "kekIterations" INTEGER NOT NULL DEFAULT 600000,
    "wrappedMasterKeyByRecovery" BYTEA,
    "recoveryKeyHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEncryptionKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserEncryptionKey_userId_key" ON "UserEncryptionKey"("userId");

-- CreateIndex
CREATE INDEX "UserEncryptionKey_userId_idx" ON "UserEncryptionKey"("userId");

-- AddForeignKey
ALTER TABLE "UserEncryptionKey" ADD CONSTRAINT "UserEncryptionKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
