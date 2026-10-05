-- BEELINK-203: how a shop is paid through Asaas — Pix, credit card and its instalments, paying on delivery.

-- CreateTable
CREATE TABLE "asaas_settings" (
    "storeId" UUID NOT NULL,
    "pix" BOOLEAN NOT NULL DEFAULT true,
    "card" BOOLEAN NOT NULL DEFAULT true,
    "maxInstallments" INTEGER NOT NULL DEFAULT 1,
    "offline" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asaas_settings_pkey" PRIMARY KEY ("storeId")
);

-- AddForeignKey
ALTER TABLE "asaas_settings" ADD CONSTRAINT "asaas_settings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- What the API validates, held where a write that skipped it would land. Each is named so a refusal
-- says which rule it was.
ALTER TABLE "asaas_settings" ADD CONSTRAINT "asaas_settings_installments_check" CHECK ("maxInstallments" BETWEEN 1 AND 12);
-- A shop with every way off could not be paid at all.
ALTER TABLE "asaas_settings" ADD CONSTRAINT "asaas_settings_one_way_check" CHECK ("pix" OR "card" OR "offline");
