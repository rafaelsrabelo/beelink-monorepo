-- CreateEnum
CREATE TYPE "PageKind" AS ENUM ('HOME', 'LANDING');

-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "store_pages" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "kind" "PageKind" NOT NULL DEFAULT 'LANDING',
    "slug" VARCHAR(60),
    "title" VARCHAR(80) NOT NULL,
    "usesChrome" BOOLEAN NOT NULL DEFAULT true,
    "inMenu" BOOLEAN NOT NULL DEFAULT false,
    "seoTitle" VARCHAR(70),
    "seoDescription" VARCHAR(160),
    "seoImageUrl" TEXT,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_pages_pkey" PRIMARY KEY ("id"),
    -- The home lives at /<shop>; a landing always has an address. Prisma does not diff CHECKs.
    CONSTRAINT "store_pages_home_has_no_slug" CHECK (("kind" = 'HOME') = ("slug" IS NULL))
);

-- CreateIndex
CREATE INDEX "store_pages_storeId_status_inMenu_idx" ON "store_pages"("storeId", "status", "inMenu");

-- CreateIndex
CREATE UNIQUE INDEX "store_pages_storeId_slug_key" ON "store_pages"("storeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "store_pages_one_home_key" ON "store_pages"("storeId") WHERE ("kind" = 'HOME');

-- AddForeignKey
ALTER TABLE "store_pages" ADD CONSTRAINT "store_pages_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every shop's home, published: the page /<shop> has always served.
INSERT INTO "store_pages" ("id", "storeId", "kind", "slug", "title", "status", "publishedAt", "createdAt", "updatedAt")
SELECT uuidv7(), s."id", 'HOME', NULL, 'Página inicial', 'PUBLISHED', NOW(), NOW(), NOW() FROM "stores" s;

-- Every band there is belongs to its shop's home.
ALTER TABLE "store_sections" ADD COLUMN "pageId" UUID;
UPDATE "store_sections" b SET "pageId" = p."id" FROM "store_pages" p WHERE p."storeId" = b."storeId" AND p."kind" = 'HOME';
ALTER TABLE "store_sections" ALTER COLUMN "pageId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "store_sections" ADD CONSTRAINT "store_sections_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "store_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropIndex
DROP INDEX "store_sections_storeId_isActive_position_idx";

-- CreateIndex
CREATE INDEX "store_sections_pageId_isActive_position_idx" ON "store_sections"("pageId", "isActive", "position");

-- CreateIndex
CREATE INDEX "store_sections_storeId_idx" ON "store_sections"("storeId");
