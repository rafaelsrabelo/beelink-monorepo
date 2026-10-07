-- CreateEnum
CREATE TYPE "IntegrationSecretRefusal" AS ENUM ('TOKEN_REJECTED', 'PIXEL_NOT_FOUND');

-- CreateEnum
CREATE TYPE "MetaPurchaseOutcome" AS ENUM ('SENT', 'SKIPPED', 'GIVEN_UP');

-- AlterTable
ALTER TABLE "store_integrations" ADD COLUMN     "secretRefusal" "IntegrationSecretRefusal",
ADD COLUMN     "secretRefusedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "order_meta_purchases" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "countedAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "outcome" "MetaPurchaseOutcome",
    "lastError" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_meta_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_meta_purchases_orderId_key" ON "order_meta_purchases"("orderId");

-- CreateIndex
CREATE INDEX "order_meta_purchases_owed_idx" ON "order_meta_purchases"("nextAttemptAt") WHERE ("processedAt" IS NULL);

-- CreateIndex
CREATE INDEX "order_meta_purchases_store_owed_idx" ON "order_meta_purchases"("storeId") WHERE ("processedAt" IS NULL);

-- AddForeignKey
ALTER TABLE "order_meta_purchases" ADD CONSTRAINT "order_meta_purchases_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
