-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('ECOMMERCE');

-- CreateEnum
CREATE TYPE "StoreLayoutType" AS ENUM ('DEFAULT', 'BANNER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MONEY', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD');

-- CreateTable
CREATE TABLE "store_categories" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(40) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(40),
    "color" VARCHAR(9),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "slug" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "StoreType" NOT NULL DEFAULT 'ECOMMERCE',
    "description" TEXT,
    "logoUrl" TEXT,
    "bannerImageUrl" TEXT,
    "categoryId" UUID,
    "layoutType" "StoreLayoutType" NOT NULL DEFAULT 'DEFAULT',
    "showProductsByCategory" BOOLEAN NOT NULL DEFAULT false,
    "colorBackground" VARCHAR(9) NOT NULL DEFAULT '#F0F9FF',
    "colorPrimary" VARCHAR(9) NOT NULL DEFAULT '#3B7AF7',
    "colorText" VARCHAR(9) NOT NULL DEFAULT '#1A202C',
    "colorHeader" VARCHAR(9) NOT NULL DEFAULT '#3B7AF7',
    "whatsappPhone" VARCHAR(20),
    "instagram" VARCHAR(120),
    "tiktok" VARCHAR(120),
    "spotify" TEXT,
    "youtube" VARCHAR(120),
    "addressStreet" TEXT,
    "addressNumber" VARCHAR(20),
    "addressComplement" TEXT,
    "addressNeighborhood" TEXT,
    "addressCity" VARCHAR(120),
    "addressState" CHAR(2),
    "addressZipCode" VARCHAR(8),
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "layoutSettings" JSONB NOT NULL DEFAULT '{}',
    "paymentMethods" "PaymentMethod"[] DEFAULT ARRAY['MONEY', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD']::"PaymentMethod"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_categories_slug_key" ON "store_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "stores_slug_key" ON "stores"("slug");

-- CreateIndex
CREATE INDEX "stores_ownerId_idx" ON "stores"("ownerId");

-- CreateIndex
CREATE INDEX "stores_categoryId_idx" ON "stores"("categoryId");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "store_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
