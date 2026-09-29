-- Short, single-use passes to the real-time channel (BEELINK-161), by the hash of the ticket. Taken with
-- a DELETE … RETURNING while the session that asked for it is alive, so any instance of the API takes
-- one once. Hand-written from `prisma migrate diff`, plus the CHECK the schema cannot say.


-- CreateEnum
CREATE TYPE "RealtimeAudience" AS ENUM ('SHOP', 'CUSTOMER');

-- CreateTable
CREATE TABLE "realtime_tickets" (
    "tokenHash" CHAR(64) NOT NULL,
    "audience" "RealtimeAudience" NOT NULL,
    "storeId" UUID NOT NULL,
    "customerId" UUID,
    "sessionId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "realtime_tickets_pkey" PRIMARY KEY ("tokenHash")
);

-- A shopper's ticket names their record at the shop; a shopkeeper's names none.
ALTER TABLE "realtime_tickets" ADD CONSTRAINT "realtime_tickets_customer_check"
    CHECK (("audience" = 'CUSTOMER') = ("customerId" IS NOT NULL));

-- CreateIndex
CREATE INDEX "realtime_tickets_expiresAt_idx" ON "realtime_tickets"("expiresAt");

