-- The user's review of the affiliates epic (plan 2026-11-12--IMPULSEIA-100--comissao-por-categoria-e-cpf):
-- a category's own commission on a table, and the CPF an affiliate is registered with.
-- AlterTable
ALTER TABLE "affiliates" ADD COLUMN     "cpf" CHAR(11);

-- CreateTable
CREATE TABLE "commission_table_category_rates" (
    "tableId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_table_category_rates_pkey" PRIMARY KEY ("tableId","categoryId")
);

-- CreateIndex
CREATE INDEX "commission_table_category_rates_categoryId_idx" ON "commission_table_category_rates"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_live_cpf_key" ON "affiliates"("storeId", "cpf") WHERE (status <> 'ENDED'::"AffiliateStatus") AND (cpf IS NOT NULL);

-- AddForeignKey
ALTER TABLE "commission_table_category_rates" ADD CONSTRAINT "commission_table_category_rates_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "commission_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_table_category_rates" ADD CONSTRAINT "commission_table_category_rates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- What the API validates, held where a write that skipped it would land.
ALTER TABLE "commission_table_category_rates" ADD CONSTRAINT "commission_table_category_rates_rate_check" CHECK ("rateBps" BETWEEN 0 AND 10000);
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_cpf_digits_check" CHECK ("cpf" IS NULL OR "cpf" ~ '^[0-9]{11}$');
