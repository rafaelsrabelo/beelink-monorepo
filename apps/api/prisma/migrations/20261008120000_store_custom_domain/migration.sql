-- CreateEnum
CREATE TYPE "CustomDomainStatus" AS ENUM ('PENDING', 'ACTIVE');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "customDomain" VARCHAR(253),
ADD COLUMN     "customDomainCheckedAt" TIMESTAMP(3),
ADD COLUMN     "customDomainProblem" VARCHAR(40),
ADD COLUMN     "customDomainStatus" "CustomDomainStatus";

-- CreateIndex
CREATE UNIQUE INDEX "stores_customDomain_key" ON "stores"("customDomain");

-- The unique index compares bytes: it means "one domain a shop" only while every host is kept in one
-- form — lower case, labels of a-z, 0-9 and hyphens, at least two, no `www.` in front — whoever writes the row.
ALTER TABLE "stores" ADD CONSTRAINT "stores_custom_domain_check" CHECK (
  "customDomain" ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
  AND "customDomain" NOT LIKE 'www.%'
);

-- A domain and its status go together, and a shop with no domain keeps nothing of a check.
ALTER TABLE "stores" ADD CONSTRAINT "stores_custom_domain_status_check" CHECK (
  ("customDomain" IS NULL) = ("customDomainStatus" IS NULL)
  AND ("customDomain" IS NOT NULL OR ("customDomainCheckedAt" IS NULL AND "customDomainProblem" IS NULL))
);
