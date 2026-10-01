-- BEELINK-245: who a promotion or a coupon is for — everyone, or only a customer's first purchase.
-- Those that exist were written for everyone, and stay so.

-- CreateEnum
CREATE TYPE "DiscountAudience" AS ENUM ('EVERYONE', 'FIRST_PURCHASE');

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "audience" "DiscountAudience" NOT NULL DEFAULT 'EVERYONE';

-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "audience" "DiscountAudience" NOT NULL DEFAULT 'EVERYONE';
