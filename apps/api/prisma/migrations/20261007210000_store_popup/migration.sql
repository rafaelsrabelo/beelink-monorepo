-- CreateEnum
CREATE TYPE "PopupTrigger" AS ENUM ('ON_ARRIVAL', 'ON_LEAVE');

-- CreateTable
CREATE TABLE "store_popups" (
    "storeId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "title" VARCHAR(80),
    "text" VARCHAR(200),
    "buttonLabel" VARCHAR(30),
    "trigger" "PopupTrigger" NOT NULL DEFAULT 'ON_ARRIVAL',
    "delaySeconds" INTEGER NOT NULL DEFAULT 5,
    "promotionId" UUID,
    "couponId" UUID,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_popups_pkey" PRIMARY KEY ("storeId")
);

-- CreateIndex
CREATE INDEX "store_popups_promotionId_idx" ON "store_popups"("promotionId");

-- CreateIndex
CREATE INDEX "store_popups_couponId_idx" ON "store_popups"("couponId");

-- AddForeignKey
ALTER TABLE "store_popups" ADD CONSTRAINT "store_popups_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_popups" ADD CONSTRAINT "store_popups_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_popups" ADD CONSTRAINT "store_popups_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- What the schema cannot say: the delay's bounds, a revision that only counts up from one, and a
-- pop-up that names at most one thing to announce.
ALTER TABLE "store_popups" ADD CONSTRAINT "store_popups_delay_check" CHECK ("delaySeconds" BETWEEN 0 AND 60);
ALTER TABLE "store_popups" ADD CONSTRAINT "store_popups_revision_check" CHECK ("revision" >= 1);
ALTER TABLE "store_popups" ADD CONSTRAINT "store_popups_benefit_check" CHECK ("promotionId" IS NULL OR "couponId" IS NULL);
