-- BEELINK-239: an order earns cashback — what it earns photographed on it, the lot's validity kept until
-- the delivery starts it, what an undone order could not take back, and the forfeit of a deleted account.

-- AlterEnum
ALTER TYPE "CashbackEntryKind" ADD VALUE 'FORFEIT';

-- AlterTable
ALTER TABLE "cashback_credits" ADD COLUMN     "unrecoveredCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "validityDays" INTEGER;

-- AlterTable
ALTER TABLE "order_messages" ADD COLUMN     "cashbackCents" INTEGER;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cashbackEarnedCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cashbackRateBps" INTEGER;

-- What an order earns is nothing or something, at a rate a shop can set; both or neither.
ALTER TABLE "orders" ADD CONSTRAINT "orders_cashback_check" CHECK (
  "cashbackEarnedCents" >= 0
  AND ("cashbackRateBps" IS NULL OR "cashbackRateBps" BETWEEN 1 AND 10000)
  AND ("cashbackEarnedCents" = 0) = ("cashbackRateBps" IS NULL)
);

-- What a lot still pays out and what it could not take back never add up to more than it was worth.
ALTER TABLE "cashback_credits" ADD CONSTRAINT "cashback_credits_unrecovered_check" CHECK (
  "unrecoveredCents" >= 0 AND "remainingCents" + "unrecoveredCents" <= "amountCents"
);
ALTER TABLE "cashback_credits" ADD CONSTRAINT "cashback_credits_validity_check" CHECK ("validityDays" IS NULL OR "validityDays" BETWEEN 1 AND 3650);

-- A notice's cashback is something, and only a notice carries it.
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_cashback_check" CHECK ("cashbackCents" IS NULL OR ("cashbackCents" > 0 AND "author" = 'SYSTEM'));
