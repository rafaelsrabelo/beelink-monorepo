-- CreateEnum
CREATE TYPE "CategoryCardStyle" AS ENUM ('PHOTO_WITH_NAME', 'ART_ONLY');

-- AlterTable
-- Nullable and with no default: every row written before the choice keeps null, which draws the
-- photo with its name, so no page changes and no row is rewritten.
ALTER TABLE "store_components" ADD COLUMN "cardStyle" "CategoryCardStyle";
