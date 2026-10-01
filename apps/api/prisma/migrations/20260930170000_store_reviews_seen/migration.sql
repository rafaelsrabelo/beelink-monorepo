-- BEELINK-158: when the owner last opened the panel's reviews, for the menu's count of new ones.

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "reviewsSeenAt" TIMESTAMP(3);
