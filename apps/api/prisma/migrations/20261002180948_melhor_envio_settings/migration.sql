-- CreateTable
CREATE TABLE "melhor_envio_settings" (
    "storeId" UUID NOT NULL,
    "handlingDays" INTEGER NOT NULL DEFAULT 1,
    "serviceIds" INTEGER[],
    "packageWeightGrams" INTEGER,
    "packageLengthMm" INTEGER,
    "packageWidthMm" INTEGER,
    "packageHeightMm" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "melhor_envio_settings_pkey" PRIMARY KEY ("storeId")
);

-- AddForeignKey
ALTER TABLE "melhor_envio_settings" ADD CONSTRAINT "melhor_envio_settings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
