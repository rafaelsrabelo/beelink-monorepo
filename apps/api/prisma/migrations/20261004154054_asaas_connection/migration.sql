-- CreateEnum
CREATE TYPE "IntegrationWebhookState" AS ENUM ('REGISTERED', 'SKIPPED', 'PAUSED', 'ERROR');

-- AlterTable
ALTER TABLE "store_integrations" ADD COLUMN     "accountDocument" VARCHAR(20),
ADD COLUMN     "webhookId" VARCHAR(64),
ADD COLUMN     "webhookState" "IntegrationWebhookState",
ADD COLUMN     "webhookTokenHash" CHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "store_integrations_webhookTokenHash_key" ON "store_integrations"("webhookTokenHash");

