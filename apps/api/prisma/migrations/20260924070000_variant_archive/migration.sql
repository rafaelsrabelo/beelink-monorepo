-- A variant whose combination stopped existing is archived rather than deleted, so an order that
-- named it will keep something to point at. Nothing is archived yet.
ALTER TABLE "product_variants" ADD COLUMN     "archivedAt" TIMESTAMP(3);
