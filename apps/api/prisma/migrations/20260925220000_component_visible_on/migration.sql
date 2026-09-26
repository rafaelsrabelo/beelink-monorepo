-- CreateEnum
CREATE TYPE "DeviceVisibility" AS ENUM ('ALL', 'DESKTOP', 'PHONE');

-- AlterTable
ALTER TABLE "store_components" ADD COLUMN "visibleOn" "DeviceVisibility" NOT NULL DEFAULT 'ALL';
