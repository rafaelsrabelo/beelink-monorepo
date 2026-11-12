-- IMPULSEIA-107 (plan 2026-11-12--IMPULSEIA-107--painel-do-dinheiro): what the shop pays its
-- affiliates outside bee-link, who wrote each line of their statement, and the orders it moves
-- from one affiliate to another.
-- CreateEnum
CREATE TYPE "AffiliatePayoutMethod" AS ENUM ('PIX', 'TRANSFER', 'CASH');

-- AlterTable
ALTER TABLE "affiliate_entries" ADD COLUMN     "actorId" UUID,
ADD COLUMN     "payoutId" UUID,
ADD COLUMN     "reason" VARCHAR(200);

-- CreateTable
CREATE TABLE "affiliate_payouts" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "affiliateId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidOn" DATE NOT NULL,
    "method" "AffiliatePayoutMethod" NOT NULL,
    "note" VARCHAR(200),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_attribution_changes" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "fromAffiliateId" UUID,
    "fromName" VARCHAR(120),
    "toAffiliateId" UUID,
    "toName" VARCHAR(120),
    "reason" VARCHAR(200) NOT NULL,
    "actorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_attribution_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "affiliate_payouts_affiliateId_paidOn_idx" ON "affiliate_payouts"("affiliateId", "paidOn");

-- CreateIndex
CREATE INDEX "affiliate_attribution_changes_orderId_createdAt_idx" ON "affiliate_attribution_changes"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_entries_payoutId_key" ON "affiliate_entries"("payoutId");

-- AddForeignKey
ALTER TABLE "affiliate_entries" ADD CONSTRAINT "affiliate_entries_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_entries" ADD CONSTRAINT "affiliate_entries_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "affiliate_payouts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_attribution_changes" ADD CONSTRAINT "affiliate_attribution_changes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_attribution_changes" ADD CONSTRAINT "affiliate_attribution_changes_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_attribution_changes" ADD CONSTRAINT "affiliate_attribution_changes_fromAffiliateId_fkey" FOREIGN KEY ("fromAffiliateId") REFERENCES "affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_attribution_changes" ADD CONSTRAINT "affiliate_attribution_changes_toAffiliateId_fkey" FOREIGN KEY ("toAffiliateId") REFERENCES "affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_attribution_changes" ADD CONSTRAINT "affiliate_attribution_changes_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- What the API validates, held where a write that skipped it would land.
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_amount_check" CHECK ("amountCents" >= 1);
-- An adjustment says why; a payout's line names its payout, and only a payout's does.
ALTER TABLE "affiliate_entries" ADD CONSTRAINT "affiliate_entries_adjusted_reason_check" CHECK ("kind" <> 'ADJUSTED' OR "reason" IS NOT NULL);
ALTER TABLE "affiliate_entries" ADD CONSTRAINT "affiliate_entries_payout_check" CHECK (("kind" = 'PAID_OUT') = ("payoutId" IS NOT NULL));
