-- CreateEnum
CREATE TYPE "OrderRefundStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'DONE', 'REFUSED', 'DENIED');

-- CreateEnum
CREATE TYPE "OrderRefundOrigin" AS ENUM ('PANEL', 'CANCELLATION', 'ASAAS');

-- AlterEnum
ALTER TYPE "OrderMessageNotice" ADD VALUE 'PAYMENT_REFUNDED';

-- AlterTable
ALTER TABLE "order_messages" ADD COLUMN     "refundCents" INTEGER;

-- AlterTable
ALTER TABLE "order_payments" ADD COLUMN     "refundingCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "order_stray_payments" ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "order_refunds" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "providerId" VARCHAR(64) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "OrderRefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "origin" "OrderRefundOrigin" NOT NULL,
    "reason" VARCHAR(300),
    "lastError" VARCHAR(500),
    "requestedById" UUID,
    "claimedUntil" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_refund_notices" (
    "id" UUID NOT NULL,
    "refundId" UUID NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_refund_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_refunds_orderId_createdAt_idx" ON "order_refunds"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "order_refunds_providerId_createdAt_idx" ON "order_refunds"("providerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "order_refunds_one_requested_key" ON "order_refunds"("providerId") WHERE (status = 'REQUESTED'::"OrderRefundStatus");

-- CreateIndex
CREATE UNIQUE INDEX "order_refund_notices_refundId_key" ON "order_refund_notices"("refundId");

-- CreateIndex
CREATE INDEX "order_refund_notices_owed_idx" ON "order_refund_notices"("nextAttemptAt") WHERE ("sentAt" IS NULL) AND (attempts < 5);

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refund_notices" ADD CONSTRAINT "order_refund_notices_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "order_refunds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
