-- AlterTable
ALTER TABLE "products" ADD COLUMN     "barcode" VARCHAR(64),
ADD COLUMN     "costCents" INTEGER,
ADD COLUMN     "heightMm" INTEGER,
ADD COLUMN     "lengthMm" INTEGER,
ADD COLUMN     "sku" VARCHAR(64),
ADD COLUMN     "stockQuantity" INTEGER,
ADD COLUMN     "trackStock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weightGrams" INTEGER,
ADD COLUMN     "widthMm" INTEGER;
