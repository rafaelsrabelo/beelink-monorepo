-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('MELHOR_ENVIO', 'ASAAS');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'NEEDS_RECONNECT');

-- CreateTable
CREATE TABLE "store_integrations" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'CONNECTED',
    "secretSealed" TEXT NOT NULL,
    "accessExpiresAt" TIMESTAMP(3),
    "refreshExpiresAt" TIMESTAMP(3),
    "lastRefreshedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "accountId" TEXT,
    "accountName" TEXT,
    "accountEmail" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_oauth_states" (
    "state" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "storeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_oauth_states_pkey" PRIMARY KEY ("state")
);

-- CreateIndex
CREATE INDEX "store_integrations_provider_status_accessExpiresAt_idx" ON "store_integrations"("provider", "status", "accessExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "store_integrations_storeId_provider_key" ON "store_integrations"("storeId", "provider");

-- CreateIndex
CREATE INDEX "integration_oauth_states_expiresAt_idx" ON "integration_oauth_states"("expiresAt");

-- AddForeignKey
ALTER TABLE "store_integrations" ADD CONSTRAINT "store_integrations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
