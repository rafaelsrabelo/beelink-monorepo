-- BEELINK-238: a shop's cashback rules, the customer's credit lots and statement, and the balance caches.

-- CreateEnum
CREATE TYPE "CashbackCreditStatus" AS ENUM ('PENDING', 'AVAILABLE', 'VOIDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CashbackEntryKind" AS ENUM ('EARN', 'REDEEM', 'REVERSAL', 'EXPIRE', 'ADJUST');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "cashbackBalanceCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cashbackPendingCents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "cashback_settings" (
    "storeId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rateBps" INTEGER NOT NULL,
    "expiresAfterDays" INTEGER,
    "minSubtotalCents" INTEGER NOT NULL DEFAULT 0,
    "maxRedeemBps" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashback_settings_pkey" PRIMARY KEY ("storeId")
);

-- CreateTable
CREATE TABLE "cashback_credits" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "orderId" UUID,
    "status" "CashbackCreditStatus" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "remainingCents" INTEGER NOT NULL,
    "availableAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashback_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashback_entries" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "kind" "CashbackEntryKind" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "creditId" UUID,
    "orderId" UUID,
    "reason" VARCHAR(200),
    "actorUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cashback_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cashback_credits_orderId_key" ON "cashback_credits"("orderId");

-- CreateIndex
CREATE INDEX "cashback_credits_customerId_status_expiresAt_idx" ON "cashback_credits"("customerId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "cashback_credits_storeId_status_expiresAt_idx" ON "cashback_credits"("storeId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "cashback_entries_customerId_createdAt_idx" ON "cashback_entries"("customerId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "cashback_settings" ADD CONSTRAINT "cashback_settings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_credits" ADD CONSTRAINT "cashback_credits_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_credits" ADD CONSTRAINT "cashback_credits_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_credits" ADD CONSTRAINT "cashback_credits_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_entries" ADD CONSTRAINT "cashback_entries_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_entries" ADD CONSTRAINT "cashback_entries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_entries" ADD CONSTRAINT "cashback_entries_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "cashback_credits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_entries" ADD CONSTRAINT "cashback_entries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_entries" ADD CONSTRAINT "cashback_entries_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- What the API validates, held where a write that skipped it cannot pass either. Each is named so a
-- refusal says which rule it was.
ALTER TABLE "cashback_settings" ADD CONSTRAINT "cashback_settings_rate_check" CHECK ("rateBps" BETWEEN 1 AND 10000);
ALTER TABLE "cashback_settings" ADD CONSTRAINT "cashback_settings_redeem_check" CHECK ("maxRedeemBps" BETWEEN 1 AND 10000);
ALTER TABLE "cashback_settings" ADD CONSTRAINT "cashback_settings_validity_check" CHECK ("expiresAfterDays" IS NULL OR "expiresAfterDays" BETWEEN 1 AND 3650);
ALTER TABLE "cashback_settings" ADD CONSTRAINT "cashback_settings_minimum_check" CHECK ("minSubtotalCents" >= 0);

-- A lot is worth something, and what is left of it is never below nothing nor above what it was worth.
ALTER TABLE "cashback_credits" ADD CONSTRAINT "cashback_credits_amount_check" CHECK ("amountCents" > 0 AND "remainingCents" BETWEEN 0 AND "amountCents");

-- A line of the statement moves the balance one way or the other; a line of nothing is a mistake.
ALTER TABLE "cashback_entries" ADD CONSTRAINT "cashback_entries_amount_check" CHECK ("amountCents" <> 0);
-- A reason is the shopkeeper's, on their adjustment, and an adjustment always has one.
ALTER TABLE "cashback_entries" ADD CONSTRAINT "cashback_entries_reason_check" CHECK (("kind" = 'ADJUST') = ("reason" IS NOT NULL));

-- The balance stops at zero (decided 01/10/2026): an undone order takes back what is left, never more.
ALTER TABLE "customers" ADD CONSTRAINT "customers_cashback_check" CHECK ("cashbackBalanceCents" >= 0 AND "cashbackPendingCents" >= 0);
