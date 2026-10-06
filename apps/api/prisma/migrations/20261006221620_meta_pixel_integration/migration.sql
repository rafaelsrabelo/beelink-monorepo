-- AlterEnum
ALTER TYPE "IntegrationProvider" ADD VALUE 'META_PIXEL';

-- AlterTable
ALTER TABLE "store_integrations" ADD COLUMN     "pixelId" VARCHAR(20),
ALTER COLUMN "secretSealed" SET DEFAULT '';

-- A pixel's ID is served to anyone in the shop's public data: digits and nothing else, whoever writes the row.
ALTER TABLE "store_integrations" ADD CONSTRAINT "store_integrations_pixel_id_check" CHECK ("pixelId" ~ '^[0-9]{10,20}$');
