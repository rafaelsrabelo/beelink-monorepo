-- How a page comes to know it was paid (BEELINK-221). The facts are read at bee-link's own Asaas
-- account and written on the page's row: when that read began, so an older one never writes over a
-- newer, and when the billing routine is to read the page again.
ALTER TABLE "store_subscriptions" ADD COLUMN     "asaasCheckedAt" TIMESTAMP(3),
ADD COLUMN     "nextCheckAt" TIMESTAMP(3);

-- The events of bee-link's own Asaas webhook: written before they are answered, worked after. Unique
-- by Asaas's id of the event; nothing of the body is kept but its name and the page it is about.
CREATE TABLE "billing_events" (
    "id" UUID NOT NULL,
    "eventId" VARCHAR(160) NOT NULL,
    "event" VARCHAR(80) NOT NULL,
    "subscriptionId" UUID,
    "outcome" VARCHAR(20),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastError" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_events_eventId_key" ON "billing_events"("eventId");

-- CreateIndex
CREATE INDEX "billing_events_processedAt_nextAttemptAt_idx" ON "billing_events"("processedAt", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "store_subscriptions_nextCheckAt_idx" ON "store_subscriptions"("nextCheckAt");
