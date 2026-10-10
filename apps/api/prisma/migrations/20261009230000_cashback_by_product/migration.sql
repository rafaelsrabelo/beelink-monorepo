-- BEELINK-313: a shop gives its cashback at one rate, or product by product.

-- CreateEnum
CREATE TYPE "CashbackMode" AS ENUM ('STORE', 'PRODUCT');

-- AlterTable
ALTER TABLE "cashback_settings" ADD COLUMN     "mode" "CashbackMode" NOT NULL DEFAULT 'STORE';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "cashbackRateBps" INTEGER;

-- A rate is a share of what was paid: never nothing, never more than all of it.
ALTER TABLE "products" ADD CONSTRAINT "products_cashback_rate_check" CHECK ("cashbackRateBps" IS NULL OR "cashbackRateBps" BETWEEN 1 AND 10000);
