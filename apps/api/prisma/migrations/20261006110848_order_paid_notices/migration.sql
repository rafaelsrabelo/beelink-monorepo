-- The paid order tells its customer and its shop (BEELINK-207): the news of a payment approved, told
-- once an order, and what a conversation's notice tells beyond a status.

-- CreateEnum
CREATE TYPE "OrderMessageNotice" AS ENUM ('PAYMENT_APPROVED', 'CANCELLED_UNPAID');

-- AlterTable
ALTER TABLE "order_messages" ADD COLUMN     "notice" "OrderMessageNotice";

-- CreateTable
CREATE TABLE "order_paid_notices" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "toldAt" TIMESTAMP(3),
    "seenAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_paid_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_paid_notices_orderId_key" ON "order_paid_notices"("orderId");

-- CreateIndex
CREATE INDEX "order_paid_notices_unseen_idx" ON "order_paid_notices"("storeId") WHERE ("seenAt" IS NULL);

-- CreateIndex
CREATE INDEX "order_paid_notices_owed_idx" ON "order_paid_notices"("nextAttemptAt") WHERE ("sentAt" IS NULL) AND (attempts < 5);

-- AddForeignKey
ALTER TABLE "order_paid_notices" ADD CONSTRAINT "order_paid_notices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A notice told of a status and nothing else; now it tells of a status, of a payment approved, or of
-- both a cancellation and why. Loosened, never tightened: every row that stood still stands.
ALTER TABLE "order_messages" DROP CONSTRAINT "order_messages_status_notice_check";
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_status_notice_check"
  CHECK (("author"::text = 'SYSTEM') = ("status" IS NOT NULL OR "notice" IS NOT NULL));
