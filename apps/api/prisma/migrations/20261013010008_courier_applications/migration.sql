-- BEELINK-321: the couriers who asked to deliver — a list of interest, one row a CPF.

-- CreateEnum
CREATE TYPE "CourierVehicle" AS ENUM ('MOTORCYCLE', 'BICYCLE', 'CAR', 'VAN');

-- CreateTable
CREATE TABLE "courier_applications" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "document" CHAR(11) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "whatsapp" VARCHAR(20) NOT NULL,
    "city" VARCHAR(40) NOT NULL,
    "vehicle" "CourierVehicle" NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courier_applications_document_key" ON "courier_applications"("document");

-- Digits only, both: a CPF is its eleven, and the WhatsApp carries its country code so that
-- wa.me/<it> can be built. What makes a CPF's check digits right is the API's to say.
ALTER TABLE "courier_applications" ADD CONSTRAINT "courier_applications_document_check" CHECK ("document" ~ '^[0-9]{11}$');
ALTER TABLE "courier_applications" ADD CONSTRAINT "courier_applications_whatsapp_check" CHECK ("whatsapp" ~ '^[0-9]{10,15}$');
