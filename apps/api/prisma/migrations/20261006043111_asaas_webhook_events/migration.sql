-- CreateEnum
CREATE TYPE "StrayPaymentReason" AS ENUM ('ORDER_CANCELLED', 'ORDER_ALREADY_PAID');

-- AlterTable
ALTER TABLE "order_payments" ADD COLUMN     "checkedAt" TIMESTAMP(3),
ADD COLUMN     "checks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nextCheckAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paymentDueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "store_integrations" ADD COLUMN     "webhookCheckedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "order_stray_payments" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "providerId" VARCHAR(64) NOT NULL,
    "reason" "StrayPaymentReason" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_stray_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asaas_events" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "eventId" VARCHAR(160) NOT NULL,
    "event" VARCHAR(80) NOT NULL,
    "orderId" UUID,
    "outcome" VARCHAR(20),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastError" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asaas_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_stray_payments_providerId_key" ON "order_stray_payments"("providerId");

-- CreateIndex
CREATE INDEX "order_stray_payments_orderId_createdAt_idx" ON "order_stray_payments"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "asaas_events_processedAt_nextAttemptAt_idx" ON "asaas_events"("processedAt", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "asaas_events_storeId_eventId_key" ON "asaas_events"("storeId", "eventId");

-- CreateIndex
CREATE INDEX "order_payments_nextCheckAt_idx" ON "order_payments"("nextCheckAt");

-- CreateIndex
CREATE INDEX "orders_paymentDueAt_idx" ON "orders"("paymentDueAt");

-- AddForeignKey
ALTER TABLE "order_stray_payments" ADD CONSTRAINT "order_stray_payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asaas_events" ADD CONSTRAINT "asaas_events_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
