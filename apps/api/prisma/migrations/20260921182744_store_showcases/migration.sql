-- CreateEnum
CREATE TYPE "ShowcaseLayout" AS ENUM ('THIRDS', 'HALVES');

-- CreateTable
CREATE TABLE "store_showcases" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "subtitle" VARCHAR(200),
    "imageUrl" TEXT NOT NULL,
    "href" TEXT,
    "layout" "ShowcaseLayout" NOT NULL DEFAULT 'THIRDS',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_showcases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_showcases_storeId_isActive_position_idx" ON "store_showcases"("storeId", "isActive", "position");

-- AddForeignKey
ALTER TABLE "store_showcases" ADD CONSTRAINT "store_showcases_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
