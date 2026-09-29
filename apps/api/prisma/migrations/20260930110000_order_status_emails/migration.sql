-- A customer's notices by e-mail (BEELINK-151): their preferences on the shop's record, and the
-- outbox an order's move writes and a dispatcher sends from, after the move commits.
-- Hand-written from `prisma migrate diff`.

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "notifyFavorites" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOffers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyOffersAt" TIMESTAMP(3),
ADD COLUMN     "notifyOrders" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "order_status_emails" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_status_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_status_emails_sentAt_nextAttemptAt_idx" ON "order_status_emails"("sentAt", "nextAttemptAt");

-- AddForeignKey
ALTER TABLE "order_status_emails" ADD CONSTRAINT "order_status_emails_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
