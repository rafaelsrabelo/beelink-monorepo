-- Which option values a product photo is of. A photo with none is of every combination. See
-- ProductImageValue in the schema.

-- CreateTable
CREATE TABLE "product_image_values" (
    "imageId" UUID NOT NULL,
    "valueId" UUID NOT NULL,

    CONSTRAINT "product_image_values_pkey" PRIMARY KEY ("imageId","valueId")
);

-- CreateIndex
CREATE INDEX "product_image_values_valueId_idx" ON "product_image_values"("valueId");

-- AddForeignKey
ALTER TABLE "product_image_values" ADD CONSTRAINT "product_image_values_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "product_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image_values" ADD CONSTRAINT "product_image_values_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "product_option_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;
