-- CreateEnum
CREATE TYPE "FunnelStep" AS ENUM ('PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_START');

-- CreateTable
CREATE TABLE "store_funnel_days" (
    "storeId" UUID NOT NULL,
    "day" DATE NOT NULL,
    "step" "FunnelStep" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "store_funnel_days_pkey" PRIMARY KEY ("storeId","day","step")
);

-- CreateIndex
CREATE INDEX "store_funnel_days_day_idx" ON "store_funnel_days"("day");

-- AddForeignKey
ALTER TABLE "store_funnel_days" ADD CONSTRAINT "store_funnel_days_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
