-- AlterTable
-- False for every order already placed: none of them took stock, so cancelling one gives none back.
ALTER TABLE "orders" ADD COLUMN "stockTaken" BOOLEAN NOT NULL DEFAULT false;
