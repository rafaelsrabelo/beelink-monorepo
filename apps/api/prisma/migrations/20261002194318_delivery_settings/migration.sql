-- BEELINK-175: a shop's delivery rules — pickup, its own delivery by distance bands, carriers.

-- CreateTable
CREATE TABLE "delivery_settings" (
    "storeId" UUID NOT NULL,
    "pickupEnabled" BOOLEAN NOT NULL,
    "ownDeliveryEnabled" BOOLEAN NOT NULL,
    "freeAboveCents" INTEGER,
    "carriersEnabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_settings_pkey" PRIMARY KEY ("storeId")
);

-- CreateTable
CREATE TABLE "delivery_bands" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "upToMeters" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "windowFromMinutes" INTEGER NOT NULL,
    "windowToMinutes" INTEGER NOT NULL,

    CONSTRAINT "delivery_bands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_bands_storeId_upToMeters_key" ON "delivery_bands"("storeId", "upToMeters");

-- AddForeignKey
ALTER TABLE "delivery_settings" ADD CONSTRAINT "delivery_settings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_bands" ADD CONSTRAINT "delivery_bands_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "delivery_settings"("storeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- The DTO's bounds, repeated where a write that skipped it would land.
ALTER TABLE "delivery_settings" ADD CONSTRAINT "delivery_settings_free_above_check" CHECK ("freeAboveCents" IS NULL OR "freeAboveCents" BETWEEN 1 AND 100000000);
ALTER TABLE "delivery_bands" ADD CONSTRAINT "delivery_bands_reach_check" CHECK ("upToMeters" BETWEEN 1 AND 200000);
ALTER TABLE "delivery_bands" ADD CONSTRAINT "delivery_bands_fee_check" CHECK ("feeCents" BETWEEN 0 AND 100000000);
ALTER TABLE "delivery_bands" ADD CONSTRAINT "delivery_bands_window_check" CHECK ("windowFromMinutes" >= 0 AND "windowFromMinutes" <= "windowToMinutes" AND "windowToMinutes" <= 10080);
