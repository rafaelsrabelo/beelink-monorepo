-- A customer's many addresses (BEELINK-148): each with a name and who receives there, one of them
-- the default. Hand-written from `prisma migrate diff`, reordered so the address a customer already
-- has is copied into the new table, as their default, before its columns go.

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "label" TEXT,
    "recipientName" TEXT,
    "zipCode" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_addresses_customerId_idx" ON "customer_addresses"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_addresses_one_default_key" ON "customer_addresses"("customerId") WHERE ("isDefault" = true);

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The address each customer has, as their default: only where some part of it was filled in. No
-- name and no recipient — nobody said it was home, and the customer receives it themselves.
INSERT INTO "customer_addresses" (
    "id", "customerId", "zipCode", "street", "number", "complement", "neighborhood", "city", "state",
    "isDefault", "createdAt", "updatedAt"
)
SELECT
    uuidv7(), c."id",
    NULLIF(btrim(c."zipCode"), ''), NULLIF(btrim(c."street"), ''), NULLIF(btrim(c."number"), ''),
    NULLIF(btrim(c."complement"), ''), NULLIF(btrim(c."neighborhood"), ''), NULLIF(btrim(c."city"), ''),
    NULLIF(btrim(c."state"), ''),
    true, NOW(), NOW()
FROM "customers" c
WHERE COALESCE(
    NULLIF(btrim(c."zipCode"), ''), NULLIF(btrim(c."street"), ''), NULLIF(btrim(c."number"), ''),
    NULLIF(btrim(c."complement"), ''), NULLIF(btrim(c."neighborhood"), ''), NULLIF(btrim(c."city"), ''),
    NULLIF(btrim(c."state"), '')
) IS NOT NULL;

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "city",
DROP COLUMN "complement",
DROP COLUMN "neighborhood",
DROP COLUMN "number",
DROP COLUMN "state",
DROP COLUMN "street",
DROP COLUMN "zipCode";
