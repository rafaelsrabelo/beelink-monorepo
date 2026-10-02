-- BEELINK-240: an order spends the customer's cashback — what it spent, and which lots it came from.

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cashbackUsedCents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "cashback_redemptions" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "creditId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),

    CONSTRAINT "cashback_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cashback_redemptions_creditId_idx" ON "cashback_redemptions"("creditId");

-- CreateIndex
CREATE UNIQUE INDEX "cashback_redemptions_orderId_creditId_key" ON "cashback_redemptions"("orderId", "creditId");

-- AddForeignKey
ALTER TABLE "cashback_redemptions" ADD CONSTRAINT "cashback_redemptions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_redemptions" ADD CONSTRAINT "cashback_redemptions_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "cashback_credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- What an order spent is nothing or something; a use of a lot is something.
ALTER TABLE "orders" ADD CONSTRAINT "orders_cashback_used_check" CHECK ("cashbackUsedCents" >= 0);
ALTER TABLE "cashback_redemptions" ADD CONSTRAINT "cashback_redemptions_amount_check" CHECK ("amountCents" > 0);
