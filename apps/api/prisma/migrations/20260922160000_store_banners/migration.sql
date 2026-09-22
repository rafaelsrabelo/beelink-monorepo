-- A banner becomes a row again, and every category that was a poster becomes one.
--
-- Written by hand for two reasons the generator cannot cover: the CHECK below, which Prisma has no
-- way to express, and the carry-over in the middle — without it, every shop that had marked a
-- category as a poster would simply lose it, and the shopkeeper would find out by looking at their
-- own shop window.

CREATE TYPE "BannerTarget" AS ENUM ('CATEGORY', 'PRODUCT', 'EXTERNAL');

CREATE TABLE "store_banners" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "subtitle" VARCHAR(200),
    "imageUrl" TEXT NOT NULL,
    "layout" "ShowcaseLayout" NOT NULL,
    "target" "BannerTarget" NOT NULL,
    "categoryId" UUID,
    "productId" UUID,
    "externalUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_banners_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "store_banners_storeId_isActive_position_idx" ON "store_banners"("storeId", "isActive", "position");

ALTER TABLE "store_banners" ADD CONSTRAINT "store_banners_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cascade on both targets, and it is the constraint below that decides it: `SET NULL` would leave a
-- row whose `target` says CATEGORY with nowhere to go, which is precisely the state the constraint
-- exists to make impossible. Deleting a category takes its poster with it.
ALTER TABLE "store_banners" ADD CONSTRAINT "store_banners_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_banners" ADD CONSTRAINT "store_banners_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactly one destination, and it must be the one `target` names.
--
-- In the database and not only in the DTO, because the DTO guards one door. A banner with a target
-- it cannot reach is a poster the shop window has no way to draw, and the first one would be found
-- by a visitor rather than by a test.
ALTER TABLE "store_banners" ADD CONSTRAINT "store_banners_one_target" CHECK (
    ("target" = 'CATEGORY' AND "categoryId" IS NOT NULL AND "productId" IS NULL AND "externalUrl" IS NULL)
 OR ("target" = 'PRODUCT'  AND "productId"  IS NOT NULL AND "categoryId" IS NULL AND "externalUrl" IS NULL)
 OR ("target" = 'EXTERNAL' AND "externalUrl" IS NOT NULL AND "categoryId" IS NULL AND "productId" IS NULL)
);

-- The carry-over. A category that is a poster today becomes a banner pointing at itself, keeping
-- its picture, its order and whether it was hidden.
--
-- `imageUrl IS NOT NULL` is not a filter that loses anything: the web already skipped a poster with
-- no picture, so a category without one was never on the home to begin with. The description is
-- truncated because a subtitle is bounded at 200 and a category description is not.
INSERT INTO "store_banners" (
    "id", "storeId", "title", "subtitle", "imageUrl", "layout",
    "target", "categoryId", "productId", "externalUrl",
    "position", "isActive", "createdAt", "updatedAt"
)
SELECT
    uuidv7(), c."storeId", c."name", left(c."description", 200), c."imageUrl", c."showcaseLayout",
    'CATEGORY', c."id", NULL, NULL,
    c."position", c."isActive", now(), now()
FROM "product_categories" c
WHERE c."showcaseLayout" IS NOT NULL
  AND c."imageUrl" IS NOT NULL;

-- One way to put a poster on the home, which is what 5639c47 argued for in the first place.
ALTER TABLE "product_categories" DROP COLUMN "showcaseLayout";
