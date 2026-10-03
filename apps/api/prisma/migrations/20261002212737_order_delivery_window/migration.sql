-- BEELINK-178: the window an order was quoted when it was placed.

-- CreateEnum
CREATE TYPE "ShippingWindowUnit" AS ENUM ('MINUTES', 'BUSINESS_DAYS');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryWindowFrom" INTEGER,
ADD COLUMN     "deliveryWindowTo" INTEGER,
ADD COLUMN     "deliveryWindowUnit" "ShippingWindowUnit";

-- All three or none, and never ending before it starts.
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_window_check" CHECK (
  ("deliveryWindowUnit" IS NULL AND "deliveryWindowFrom" IS NULL AND "deliveryWindowTo" IS NULL)
  OR ("deliveryWindowUnit" IS NOT NULL AND "deliveryWindowFrom" >= 0 AND "deliveryWindowFrom" <= "deliveryWindowTo")
);
