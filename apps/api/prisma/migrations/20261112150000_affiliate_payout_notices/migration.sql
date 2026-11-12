-- IMPULSEIA-108 (plan 2026-11-12--IMPULSEIA-108--area-do-afiliado): the e-mail a payout owes its
-- affiliate, one per payout — an outbox, like affiliate_sale_notices.
-- CreateTable
CREATE TABLE "affiliate_payout_notices" (
    "id" UUID NOT NULL,
    "payoutId" UUID NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_payout_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_payout_notices_payoutId_key" ON "affiliate_payout_notices"("payoutId");

-- CreateIndex
CREATE INDEX "affiliate_payout_notices_sentAt_nextAttemptAt_idx" ON "affiliate_payout_notices"("sentAt", "nextAttemptAt");

-- AddForeignKey
ALTER TABLE "affiliate_payout_notices" ADD CONSTRAINT "affiliate_payout_notices_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "affiliate_payouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
