-- AlterEnum
ALTER TYPE "IntegrationProvider" ADD VALUE 'GOOGLE_ANALYTICS';

-- AlterTable
ALTER TABLE "store_integrations" ADD COLUMN     "measurementId" VARCHAR(18);

-- A measurement ID is served to anyone in the shop's public data: `G-` and capital letters or digits, whoever writes the row.
ALTER TABLE "store_integrations" ADD CONSTRAINT "store_integrations_measurement_id_check" CHECK ("measurementId" ~ '^G-[A-Z0-9]{6,16}$');
