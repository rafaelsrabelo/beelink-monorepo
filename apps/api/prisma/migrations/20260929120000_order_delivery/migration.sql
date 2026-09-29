-- How a delivery goes (BEELINK-146): who brings it, its tracking and the window it should arrive in.
-- One per order, beside it, so the courier app and the carriers write it without touching the order.


-- CreateEnum
CREATE TYPE "OrderDeliveryKind" AS ENUM ('OWN', 'CARRIER');

-- CreateTable
CREATE TABLE "order_deliveries" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "kind" "OrderDeliveryKind" NOT NULL,
    "carrier" VARCHAR(60),
    "service" VARCHAR(60),
    "trackingCode" VARCHAR(60),
    "trackingUrl" VARCHAR(500),
    "estimateFrom" DATE,
    "estimateTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_deliveries_orderId_key" ON "order_deliveries"("orderId");

-- AddForeignKey
ALTER TABLE "order_deliveries" ADD CONSTRAINT "order_deliveries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- The window is both days or neither, and never ends before it starts: the API refuses it first.
ALTER TABLE "order_deliveries" ADD CONSTRAINT "order_deliveries_estimate_window" CHECK (("estimateFrom" IS NULL) = ("estimateTo" IS NULL) AND ("estimateTo" IS NULL OR "estimateTo" >= "estimateFrom"));
