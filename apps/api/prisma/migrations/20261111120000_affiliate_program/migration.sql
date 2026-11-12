-- IMPULSEIA-101 (plan 2026-11-11--IMPULSEIA-101--programa-e-tabelas-de-comissao): a shop's
-- affiliate programme, its commission tables, and a product's own rate on a table.
-- CreateTable
CREATE TABLE "affiliate_programs" (
    "storeId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "attributionDays" INTEGER NOT NULL DEFAULT 30,
    "payoutDelayDays" INTEGER NOT NULL DEFAULT 10,
    "termsText" TEXT,
    "termsVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_programs_pkey" PRIMARY KEY ("storeId")
);

-- CreateTable
CREATE TABLE "commission_tables" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "defaultRateBps" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_table_rates" (
    "tableId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_table_rates_pkey" PRIMARY KEY ("tableId","productId")
);

-- CreateIndex
CREATE UNIQUE INDEX "commission_tables_storeId_name_key" ON "commission_tables"("storeId", "name");

-- CreateIndex
CREATE INDEX "commission_table_rates_productId_idx" ON "commission_table_rates"("productId");

-- AddForeignKey
ALTER TABLE "affiliate_programs" ADD CONSTRAINT "affiliate_programs_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_tables" ADD CONSTRAINT "commission_tables_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_table_rates" ADD CONSTRAINT "commission_table_rates_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "commission_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_table_rates" ADD CONSTRAINT "commission_table_rates_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One default table per shop: the one born with the programme, which the product's own form edits.
CREATE UNIQUE INDEX "commission_tables_one_default_key" ON "commission_tables"("storeId") WHERE ("isDefault" = true);

-- What the API validates, held where a write that skipped it would land.
ALTER TABLE "affiliate_programs" ADD CONSTRAINT "affiliate_programs_attribution_days_check" CHECK ("attributionDays" BETWEEN 1 AND 90);
ALTER TABLE "affiliate_programs" ADD CONSTRAINT "affiliate_programs_payout_delay_days_check" CHECK ("payoutDelayDays" BETWEEN 0 AND 60);
ALTER TABLE "affiliate_programs" ADD CONSTRAINT "affiliate_programs_terms_version_check" CHECK ("termsVersion" >= 0);
-- A rate is a share of what was paid: nothing at the least, never more than all of it.
ALTER TABLE "commission_tables" ADD CONSTRAINT "commission_tables_default_rate_check" CHECK ("defaultRateBps" BETWEEN 0 AND 10000);
ALTER TABLE "commission_table_rates" ADD CONSTRAINT "commission_table_rates_rate_check" CHECK ("rateBps" BETWEEN 0 AND 10000);
