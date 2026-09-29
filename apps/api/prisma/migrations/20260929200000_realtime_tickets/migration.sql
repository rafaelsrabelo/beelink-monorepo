-- Short, single-use passes to the real-time channel (BEELINK-161), by the hash of the ticket. Taken with
-- a DELETE … RETURNING, so any instance of the API takes one once.


-- CreateEnum
CREATE TYPE "RealtimeAudience" AS ENUM ('SHOP', 'CUSTOMER');

-- CreateTable
CREATE TABLE "realtime_tickets" (
    "tokenHash" CHAR(64) NOT NULL,
    "audience" "RealtimeAudience" NOT NULL,
    "storeId" UUID NOT NULL,
    "customerId" UUID,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "realtime_tickets_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateIndex
CREATE INDEX "realtime_tickets_expiresAt_idx" ON "realtime_tickets"("expiresAt");

