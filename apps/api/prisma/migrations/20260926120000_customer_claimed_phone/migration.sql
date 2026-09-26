-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "claimedPhone" TEXT;

-- CreateIndex
CREATE INDEX "customers_storeId_claimedPhone_idx" ON "customers"("storeId", "claimedPhone");
