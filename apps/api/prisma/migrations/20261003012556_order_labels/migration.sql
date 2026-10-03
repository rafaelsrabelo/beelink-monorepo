-- BEELINK-187: an order's shipping label, the shop as its sender, and the CPF of who receives it.

-- CreateEnum
CREATE TYPE "OrderLabelStatus" AS ENUM ('IN_CART', 'PAID', 'GENERATED', 'CANCELLED');

-- AlterTable
ALTER TABLE "melhor_envio_settings" ADD COLUMN     "senderDocument" VARCHAR(14),
ADD COLUMN     "senderStateRegister" VARCHAR(20);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryDocument" VARCHAR(14);

-- CreateTable
CREATE TABLE "order_labels" (
    "orderId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "providerId" VARCHAR(64) NOT NULL,
    "protocol" VARCHAR(60),
    "status" "OrderLabelStatus" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "lengthMm" INTEGER NOT NULL,
    "widthMm" INTEGER NOT NULL,
    "heightMm" INTEGER NOT NULL,
    "invoiceKey" CHAR(44),
    "trackingCode" VARCHAR(60),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_labels_pkey" PRIMARY KEY ("orderId")
);

-- CreateIndex
CREATE INDEX "order_labels_storeId_status_idx" ON "order_labels"("storeId", "status");

-- AddForeignKey
ALTER TABLE "order_labels" ADD CONSTRAINT "order_labels_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Digits only: a CPF (11) or a CNPJ (14) for the sender, a CPF for who receives.
ALTER TABLE "melhor_envio_settings" ADD CONSTRAINT "melhor_envio_settings_sender_document_check" CHECK ("senderDocument" IS NULL OR "senderDocument" ~ '^([0-9]{11}|[0-9]{14})$');
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_document_check" CHECK ("deliveryDocument" IS NULL OR "deliveryDocument" ~ '^[0-9]{11}$');
ALTER TABLE "order_labels" ADD CONSTRAINT "order_labels_invoice_key_check" CHECK ("invoiceKey" IS NULL OR "invoiceKey" ~ '^[0-9]{44}$');
