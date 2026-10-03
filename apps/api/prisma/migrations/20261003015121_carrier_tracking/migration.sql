-- BEELINK-188: a carrier moving an order along, and the events already applied.

-- AlterEnum
ALTER TYPE "OrderActor" ADD VALUE 'CARRIER';

-- CreateTable
CREATE TABLE "integration_events" (
    "key" VARCHAR(120) NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_events_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "integration_events_createdAt_idx" ON "integration_events"("createdAt");
