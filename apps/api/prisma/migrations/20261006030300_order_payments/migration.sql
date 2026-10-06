-- CreateEnum
CREATE TYPE "OrderPaymentChannel" AS ENUM ('OFFLINE', 'ONLINE');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('ASAAS');

-- CreateEnum
CREATE TYPE "OrderPaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'RECEIVED', 'OVERDUE', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED', 'FAILED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paymentChannel" "OrderPaymentChannel" NOT NULL DEFAULT 'OFFLINE',
ADD COLUMN     "paymentClaimedUntil" TIMESTAMP(3),
ADD COLUMN     "paymentInstallments" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "order_payments" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'ASAAS',
    "providerId" VARCHAR(64),
    "providerInstallmentId" VARCHAR(64),
    "method" "PaymentMethod" NOT NULL,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "amountCents" INTEGER NOT NULL,
    "refundedCents" INTEGER NOT NULL DEFAULT 0,
    "status" "OrderPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "providerStatus" VARCHAR(40),
    "lastError" VARCHAR(500),
    "invoiceUrl" VARCHAR(500),
    "pixPayload" TEXT,
    "pixImage" TEXT,
    "dueDate" DATE,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asaas_customers" (
    "customerId" UUID NOT NULL,
    "providerId" VARCHAR(64) NOT NULL,
    "cpf" CHAR(11) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asaas_customers_pkey" PRIMARY KEY ("customerId")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_payments_providerId_key" ON "order_payments"("providerId");

-- CreateIndex
CREATE INDEX "order_payments_orderId_createdAt_idx" ON "order_payments"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "order_payments_storeId_status_idx" ON "order_payments"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "order_payments_one_live_key" ON "order_payments"("orderId") WHERE (status <> ALL (ARRAY['CANCELLED'::"OrderPaymentStatus", 'FAILED'::"OrderPaymentStatus"]));

-- AddForeignKey
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asaas_customers" ADD CONSTRAINT "asaas_customers_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Only what Asaas charges is paid online, and only an online card is split.
ALTER TABLE "orders" ADD CONSTRAINT "orders_online_method_check" CHECK ("paymentChannel" = 'OFFLINE' OR "paymentMethod" IN ('PIX', 'CREDIT_CARD'));
ALTER TABLE "orders" ADD CONSTRAINT "orders_installments_check" CHECK ("paymentInstallments" BETWEEN 1 AND 12 AND ("paymentInstallments" = 1 OR ("paymentChannel" = 'ONLINE' AND "paymentMethod" = 'CREDIT_CARD')));

ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_amounts_check" CHECK ("amountCents" > 0 AND "refundedCents" BETWEEN 0 AND "amountCents");
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_method_check" CHECK ("method" IN ('PIX', 'CREDIT_CARD') AND "installments" BETWEEN 1 AND 12 AND ("installments" = 1 OR "method" = 'CREDIT_CARD'));
-- Every attempt but one Asaas refused to create names its charge there.
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_provider_id_check" CHECK ("status" = 'FAILED' OR "providerId" IS NOT NULL);
