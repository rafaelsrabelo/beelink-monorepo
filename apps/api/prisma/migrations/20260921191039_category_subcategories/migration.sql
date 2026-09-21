-- AlterTable
ALTER TABLE "product_categories" ADD COLUMN     "parentId" UUID;

-- CreateIndex
CREATE INDEX "product_categories_parentId_isActive_position_idx" ON "product_categories"("parentId", "isActive", "position");

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
