-- AlterTable
-- The wide picture a category's own page opens with. Nullable and with no default: a category
-- has none until its owner uploads one, and its page is then drawn as it always was.
ALTER TABLE "product_categories" ADD COLUMN "bannerUrl" TEXT;
