-- The discount in whole percent, rounded down, for a shelf to sort and filter by. It is the same
-- number the shop window prints on the badge. A trigger keeps it from the two price columns on every
-- write, so no writer can leave it behind and it can never disagree with them.
ALTER TABLE "products" ADD COLUMN     "discountPercent" INTEGER NOT NULL DEFAULT 0;

CREATE FUNCTION "products_discount_percent"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."discountPercent" := CASE
    WHEN NEW."compareAtPriceCents" IS NOT NULL AND NEW."compareAtPriceCents" > NEW."priceCents"
      THEN floor((NEW."compareAtPriceCents" - NEW."priceCents") * 100.0 / NEW."compareAtPriceCents")::int
    ELSE 0
  END;
  RETURN NEW;
END $$;

CREATE TRIGGER "products_discount_percent"
  BEFORE INSERT OR UPDATE OF "priceCents", "compareAtPriceCents" ON "products"
  FOR EACH ROW EXECUTE FUNCTION "products_discount_percent"();

-- Every product already written.
UPDATE "products" SET "discountPercent" = CASE
  WHEN "compareAtPriceCents" IS NOT NULL AND "compareAtPriceCents" > "priceCents"
    THEN floor(("compareAtPriceCents" - "priceCents") * 100.0 / "compareAtPriceCents")::int
  ELSE 0
END;

CREATE INDEX "products_storeId_status_discountPercent_idx" ON "products"("storeId", "status", "discountPercent");
