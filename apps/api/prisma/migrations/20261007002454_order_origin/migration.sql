-- An order keeps where its buyer came from (BEELINK-275): the campaign labels on the order itself,
-- for a report to group by with no join; and, apart, what stood in the buyer's browser with their yes
-- to the shop's pixel — a row that exists only where that yes stood.

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "originAt" TIMESTAMP(3),
ADD COLUMN     "originMetaAd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "utmCampaign" VARCHAR(80),
ADD COLUMN     "utmContent" VARCHAR(80),
ADD COLUMN     "utmMedium" VARCHAR(80),
ADD COLUMN     "utmSource" VARCHAR(80),
ADD COLUMN     "utmTerm" VARCHAR(80);

-- CreateTable
CREATE TABLE "order_marketing_consents" (
    "orderId" UUID NOT NULL,
    "fbclid" VARCHAR(500),
    "clickedAt" TIMESTAMP(3),
    "fbp" VARCHAR(100),
    "userAgent" VARCHAR(512),
    "pageUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_marketing_consents_pkey" PRIMARY KEY ("orderId")
);

-- CreateIndex
CREATE INDEX "orders_storeId_utmSource_utmMedium_utmCampaign_idx" ON "orders"("storeId", "utmSource", "utmMedium", "utmCampaign");

-- AddForeignKey
ALTER TABLE "order_marketing_consents" ADD CONSTRAINT "order_marketing_consents_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A click identifier and the instant it arrived: both or neither. Meta's `fbc` is built from the two.
ALTER TABLE "order_marketing_consents" ADD CONSTRAINT "order_marketing_consents_click_check"
  CHECK (("fbclid" IS NULL) = ("clickedAt" IS NULL));

