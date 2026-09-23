-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'WON', 'LOST');

-- AlterEnum
-- Added and not read in this file: Postgres refuses an enum value used in the transaction that
-- added it. The first row with it is written at runtime, by a site adding a contact form.
ALTER TYPE "ComponentKind" ADD VALUE 'CONTACT';

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "componentId" UUID,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254),
    "phone" VARCHAR(20),
    "answers" JSONB NOT NULL DEFAULT '[]',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_storeId_createdAt_idx" ON "leads"("storeId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "leads_storeId_status_idx" ON "leads"("storeId", "status");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "store_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

