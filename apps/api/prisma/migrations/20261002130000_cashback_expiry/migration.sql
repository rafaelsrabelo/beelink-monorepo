-- BEELINK-241: credit expires by itself, and its customer is told before — the e-mail owed, one per lot, and the choice to turn it off.

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "notifyCashback" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "cashback_expiry_notices" (
    "id" UUID NOT NULL,
    "creditId" UUID NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cashback_expiry_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cashback_expiry_notices_creditId_key" ON "cashback_expiry_notices"("creditId");

-- CreateIndex
CREATE INDEX "cashback_expiry_notices_sentAt_nextAttemptAt_idx" ON "cashback_expiry_notices"("sentAt", "nextAttemptAt");

-- AddForeignKey
ALTER TABLE "cashback_expiry_notices" ADD CONSTRAINT "cashback_expiry_notices_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "cashback_credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
