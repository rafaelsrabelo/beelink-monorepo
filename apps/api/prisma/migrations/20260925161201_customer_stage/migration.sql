-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "inactiveAfterDays" INTEGER NOT NULL DEFAULT 60;

-- CreateIndex
CREATE INDEX "customers_storeId_lastOrderAt_idx" ON "customers"("storeId", "lastOrderAt");
