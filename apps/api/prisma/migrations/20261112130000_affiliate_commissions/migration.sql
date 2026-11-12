-- IMPULSEIA-106 (plan 2026-11-12--IMPULSEIA-106--comissao-do-pedido): the affiliate an order is
-- credited to, its commission line by line, the affiliate's statement and balances, and the e-mails
-- their sales owe.
-- CreateEnum
CREATE TYPE "AffiliateCommissionStatus" AS ENUM ('PENDING', 'AVAILABLE', 'REVERSED');

-- CreateEnum
CREATE TYPE "AffiliateCommissionZeroReason" AS ENUM ('OWN_PURCHASE');

-- CreateEnum
CREATE TYPE "AffiliateEntryKind" AS ENUM ('RELEASED', 'REVERSED', 'ADJUSTED', 'PAID_OUT');

-- CreateEnum
CREATE TYPE "AffiliateSaleNoticeKind" AS ENUM ('SALE', 'CANCELLED');

-- AlterTable
ALTER TABLE "affiliates" ADD COLUMN     "availableCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pendingCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "affiliateId" UUID,
ADD COLUMN     "affiliateVisitAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "affiliate_commissions" (
    "orderId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "affiliateId" UUID NOT NULL,
    "status" "AffiliateCommissionStatus" NOT NULL DEFAULT 'PENDING',
    "baseCents" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL,
    "tableName" VARCHAR(60) NOT NULL,
    "zeroReason" "AffiliateCommissionZeroReason",
    "dueOn" DATE,
    "availableAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_commissions_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "affiliate_commission_lines" (
    "orderItemId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "baseCents" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL,

    CONSTRAINT "affiliate_commission_lines_pkey" PRIMARY KEY ("orderItemId")
);

-- CreateTable
CREATE TABLE "affiliate_entries" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "affiliateId" UUID NOT NULL,
    "kind" "AffiliateEntryKind" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "orderId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_sale_notices" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "kind" "AffiliateSaleNoticeKind" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_sale_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "affiliate_commissions_status_dueOn_idx" ON "affiliate_commissions"("status", "dueOn");

-- CreateIndex
CREATE INDEX "affiliate_commissions_affiliateId_status_dueOn_idx" ON "affiliate_commissions"("affiliateId", "status", "dueOn");

-- CreateIndex
CREATE INDEX "affiliate_commissions_storeId_status_dueOn_idx" ON "affiliate_commissions"("storeId", "status", "dueOn");

-- CreateIndex
CREATE INDEX "affiliate_commission_lines_orderId_idx" ON "affiliate_commission_lines"("orderId");

-- CreateIndex
CREATE INDEX "affiliate_entries_affiliateId_createdAt_idx" ON "affiliate_entries"("affiliateId", "createdAt");

-- CreateIndex
CREATE INDEX "affiliate_entries_orderId_idx" ON "affiliate_entries"("orderId");

-- CreateIndex
CREATE INDEX "affiliate_sale_notices_sentAt_nextAttemptAt_idx" ON "affiliate_sale_notices"("sentAt", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_sale_notices_orderId_kind_key" ON "affiliate_sale_notices"("orderId", "kind");

-- CreateIndex
CREATE INDEX "orders_affiliateId_placedAt_idx" ON "orders"("affiliateId", "placedAt");

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commission_lines" ADD CONSTRAINT "affiliate_commission_lines_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commission_lines" ADD CONSTRAINT "affiliate_commission_lines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "affiliate_commissions"("orderId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_entries" ADD CONSTRAINT "affiliate_entries_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_entries" ADD CONSTRAINT "affiliate_entries_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_entries" ADD CONSTRAINT "affiliate_entries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_sale_notices" ADD CONSTRAINT "affiliate_sale_notices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- What the API keeps, held where a write that skipped it would land.
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_pending_cents_check" CHECK ("pendingCents" >= 0);
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_amounts_check" CHECK ("baseCents" >= 0 AND "commissionCents" >= 0 AND "commissionCents" <= "baseCents");
-- Only a commission of nothing has a reason for being nothing.
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_zero_reason_check" CHECK ("zeroReason" IS NULL OR "commissionCents" = 0);
-- A commission due has a day it fell due on, and one that has not fallen due has no instant it did.
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_available_check" CHECK (("status" = 'AVAILABLE') = ("availableAt" IS NOT NULL));
ALTER TABLE "affiliate_commission_lines" ADD CONSTRAINT "affiliate_commission_lines_amounts_check" CHECK ("rateBps" BETWEEN 0 AND 10000 AND "baseCents" >= 0 AND "commissionCents" >= 0 AND "commissionCents" <= "baseCents");
ALTER TABLE "affiliate_entries" ADD CONSTRAINT "affiliate_entries_amount_check" CHECK ("amountCents" <> 0);
