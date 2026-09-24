-- Options, their values and variants, and every existing product moved onto a default variant.
--
-- Generated, then extended by hand with what the generator cannot write: the carry-over of every
-- product into its default variant, the codes that would have broken the new unique index, and the
-- trigger that holds a product to three options.
--
-- Product keeps its per-unit columns. They become a cache of the variants, which is what lets the
-- shelf rule, the showcases and every card keep reading one table while the variants arrive.

-- CreateTable
CREATE TABLE "product_options" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_option_values" (
    "id" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "colorHex" VARCHAR(7),
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_option_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priceCents" INTEGER NOT NULL,
    "compareAtPriceCents" INTEGER,
    "costCents" INTEGER,
    "sku" VARCHAR(64),
    "barcode" VARCHAR(64),
    "trackStock" BOOLEAN NOT NULL DEFAULT false,
    "stockQuantity" INTEGER,
    "weightGrams" INTEGER,
    "lengthMm" INTEGER,
    "widthMm" INTEGER,
    "heightMm" INTEGER,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variant_values" (
    "variantId" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "valueId" UUID NOT NULL,

    CONSTRAINT "product_variant_values_pkey" PRIMARY KEY ("variantId","optionId")
);

-- CreateIndex
CREATE INDEX "product_options_productId_position_idx" ON "product_options"("productId", "position");

-- CreateIndex
CREATE INDEX "product_option_values_optionId_position_idx" ON "product_option_values"("optionId", "position");

-- CreateIndex
CREATE INDEX "product_variants_productId_position_idx" ON "product_variants"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_storeId_sku_key" ON "product_variants"("storeId", "sku");

-- CreateIndex
CREATE INDEX "product_variant_values_valueId_idx" ON "product_variant_values"("valueId");

-- AddForeignKey
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "product_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_values" ADD CONSTRAINT "product_variant_values_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_values" ADD CONSTRAINT "product_variant_values_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "product_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_values" ADD CONSTRAINT "product_variant_values_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "product_option_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Codes a shop used twice. The column was not unique until now, and the index above would refuse
-- the carry-over below. The oldest product keeps its code and the others get a numbered one, so no
-- code disappears and the shopkeeper can still tell where each came from.
DO $$
DECLARE
  duplicate RECORD;
  candidate TEXT;
  n INT;
BEGIN
  FOR duplicate IN
    SELECT "id", "storeId", "sku" FROM (
      SELECT "id", "storeId", "sku",
             ROW_NUMBER() OVER (PARTITION BY "storeId", "sku" ORDER BY "createdAt", "id") AS rank
      FROM "products"
      WHERE "sku" IS NOT NULL
    ) ranked
    WHERE rank > 1
  LOOP
    n := 2;
    LOOP
      candidate := LEFT(duplicate."sku", 64 - LENGTH('-' || n)) || '-' || n;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM "products" WHERE "storeId" = duplicate."storeId" AND "sku" = candidate
      );
      n := n + 1;
    END LOOP;
    UPDATE "products" SET "sku" = candidate WHERE "id" = duplicate."id";
  END LOOP;
END $$;

-- The carry-over: one default variant per product, holding what the product held. A variant with
-- no values is the default — a product with no options sells exactly this one thing.
INSERT INTO "product_variants" (
  "id", "productId", "storeId", "position", "isActive",
  "priceCents", "compareAtPriceCents", "costCents", "sku", "barcode",
  "trackStock", "stockQuantity", "weightGrams", "lengthMm", "widthMm", "heightMm",
  "createdAt", "updatedAt"
)
SELECT
  uuidv7(), p."id", p."storeId", 0, true,
  p."priceCents", p."compareAtPriceCents", p."costCents", p."sku", p."barcode",
  p."trackStock", p."stockQuantity", p."weightGrams", p."lengthMm", p."widthMm", p."heightMm",
  p."createdAt", NOW()
FROM "products" p;

-- At most three options per product. A constraint trigger, deferred to the end of the transaction,
-- so a save that adds one option and removes another is judged on where it lands and not on the
-- order of its statements. Prisma has no way to declare this, and does not look at triggers when
-- it compares the schema, so this does not drift.
CREATE FUNCTION "product_options_at_most_three"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COUNT(*) FROM "product_options" WHERE "productId" = NEW."productId") > 3 THEN
    RAISE EXCEPTION 'A product has at most 3 options'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'product_options_at_most_three';
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER "product_options_at_most_three"
  AFTER INSERT OR UPDATE OF "productId" ON "product_options"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "product_options_at_most_three"();
