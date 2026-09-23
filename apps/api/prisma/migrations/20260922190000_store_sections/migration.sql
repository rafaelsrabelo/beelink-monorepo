-- The banners table becomes the blocks a landing page is made of.
--
-- Written by hand, and the reason is the whole second half of this file: every existing shop has
-- to come out of it drawing EXACTLY the page it drew going in. The generator can rename a table;
-- it cannot know that the cover used to be two columns on `stores`, that the payment band used to
-- be derived from an enum array, or that `belowProducts` was a boolean standing in for a position.
--
-- The page a shop draws today, band by band: the cover, then the payment band, then the posters
-- with `belowProducts = false`, then the product rails, then the posters with `belowProducts = true`.
-- The positions assigned below are that order, written down.

-- ── 1. the table keeps its rows and loses its name ──────────────────────────
-- A rename and not a new table plus a copy: the foreign keys, the primary key and the four weeks
-- of ids stay exactly where they are, and nothing has to be re-pointed at anything.
ALTER TABLE "store_banners" RENAME TO "store_sections";
ALTER TABLE "store_sections" RENAME CONSTRAINT "store_banners_pkey" TO "store_sections_pkey";
ALTER TABLE "store_sections" RENAME CONSTRAINT "store_banners_storeId_fkey" TO "store_sections_storeId_fkey";
ALTER TABLE "store_sections" RENAME CONSTRAINT "store_banners_categoryId_fkey" TO "store_sections_categoryId_fkey";
ALTER TABLE "store_sections" RENAME CONSTRAINT "store_banners_productId_fkey" TO "store_sections_productId_fkey";
ALTER TABLE "store_sections" RENAME CONSTRAINT "store_banners_one_target" TO "store_sections_one_target";
ALTER TYPE "BannerTarget" RENAME TO "SectionTarget";
DROP INDEX IF EXISTS "store_banners_storeId_isActive_belowProducts_position_idx";

-- ── 2. the new vocabulary ───────────────────────────────────────────────────
CREATE TYPE "SectionKind" AS ENUM ('COVER', 'BANNER', 'TEXT', 'BENEFITS', 'PRODUCTS');
CREATE TYPE "SectionWidth" AS ENUM ('FULL', 'CONTAINED');

-- BANNER for every row that is already there, which is what every one of them is.
ALTER TABLE "store_sections" ADD COLUMN "kind" "SectionKind" NOT NULL DEFAULT 'BANNER';
ALTER TABLE "store_sections" ADD COLUMN "width" "SectionWidth" NOT NULL DEFAULT 'FULL';
ALTER TABLE "store_sections" ADD COLUMN "items" JSONB NOT NULL DEFAULT '[]';

-- A title and a picture stop being required, because three of the five kinds have neither. The
-- rule that a BANNER must have a picture moves to the zod union, where it is stated per kind
-- instead of for every row in the table.
ALTER TABLE "store_sections" ALTER COLUMN "title" DROP NOT NULL;
ALTER TABLE "store_sections" ALTER COLUMN "imageUrl" DROP NOT NULL;
ALTER TABLE "store_sections" ALTER COLUMN "layout" SET DEFAULT 'FULL';
ALTER TABLE "store_sections" ALTER COLUMN "target" SET DEFAULT 'NONE';

-- The one-target CHECK has to be re-stated: it named a banner's columns and it must now let the
-- three kinds that point nowhere through untouched.
ALTER TABLE "store_sections" DROP CONSTRAINT "store_sections_one_target";
ALTER TABLE "store_sections" ADD CONSTRAINT "store_sections_one_target" CHECK (
  ("target" = 'CATEGORY' AND "categoryId" IS NOT NULL AND "productId" IS NULL AND "externalUrl" IS NULL)
  OR ("target" = 'PRODUCT' AND "productId" IS NOT NULL AND "categoryId" IS NULL AND "externalUrl" IS NULL)
  OR ("target" = 'EXTERNAL' AND "externalUrl" IS NOT NULL AND "categoryId" IS NULL AND "productId" IS NULL)
  OR ("target" = 'NONE' AND "categoryId" IS NULL AND "productId" IS NULL AND "externalUrl" IS NULL)
);

-- ── 3. the posters keep their order, with room left between them ────────────
-- Renumbered into two blocks with a gap, so the rows invented below can be slotted between them
-- without renumbering anything twice. Gaps are fine: the storefront reads `ORDER BY position` and
-- the reorder endpoint rewrites every position on the first drag.
WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (PARTITION BY "storeId" ORDER BY "position", "title") AS rn,
         "belowProducts"
  FROM "store_sections"
)
UPDATE "store_sections" s
SET "position" = CASE WHEN ranked."belowProducts" THEN 1000 + ranked.rn ELSE 100 + ranked.rn END
FROM ranked
WHERE s."id" = ranked."id";

-- ── 4. the cover stops being two columns on `stores` ────────────────────────
-- One row per shop that actually draws a cover today. The condition is the storefront's own,
-- copied from storefront-frame.tsx: `layoutType === 'BANNER' && bannerImageUrl`. A shop with the
-- toggle on and no picture drew nothing, and still draws nothing — it gets no row.
--
-- `stores.layoutType` and `stores.bannerImageUrl` are deliberately NOT dropped here. They are
-- still written by the panel's Aparência tab until the screen that replaces it lands, and a column
-- dropped before its last writer is a 500 on save.
INSERT INTO "store_sections" ("id", "storeId", "kind", "imageUrl", "width", "target", "items", "position", "isActive", "createdAt", "updatedAt")
SELECT uuidv7(), s."id", 'COVER', s."bannerImageUrl", 'FULL', 'NONE', '[]'::jsonb, 0, true, NOW(), NOW()
FROM "stores" s
WHERE s."layoutType" = 'BANNER' AND s."bannerImageUrl" IS NOT NULL;

-- ── 5. the payment band becomes the shop's own words ────────────────────────
-- It was derived: four fixed rows keyed by the PaymentMethod enum, with the platform's copy and
-- the platform's icons, projected through the shopkeeper's stored order. It becomes data they can
-- edit, which is what was asked for.
--
-- The words are written in pt-BR, and that is a decision rather than an oversight: this band had
-- no stored copy to carry over, the product's locale is pt-BR, and the alternative — leaving the
-- rows blank — would empty a band every shop currently shows. A shopkeeper who wants other words
-- now types them, which they could not do before.
INSERT INTO "store_sections" ("id", "storeId", "kind", "width", "target", "items", "position", "isActive", "createdAt", "updatedAt")
SELECT
  uuidv7(),
  s."id",
  'BENEFITS',
  'CONTAINED',
  'NONE',
  COALESCE(
    (
      SELECT jsonb_agg(row_for_method ORDER BY ord)
      FROM (
        SELECT
          method,
          ord,
          CASE method
            WHEN 'MONEY'       THEN jsonb_build_object('id', 'money',      'icon', 'banknote',    'title', 'Dinheiro',          'detail', 'Na entrega')
            WHEN 'PIX'         THEN jsonb_build_object('id', 'pix',        'icon', 'qr-code',     'title', 'PIX',               'detail', 'Transferência na hora')
            WHEN 'CREDIT_CARD' THEN jsonb_build_object('id', 'credit',     'icon', 'credit-card', 'title', 'Cartão de crédito', 'detail', 'Principais bandeiras')
            ELSE                    jsonb_build_object('id', 'debit',      'icon', 'wallet',      'title', 'Cartão de débito',  'detail', 'Débito na conta')
          END AS row_for_method
        FROM unnest(s."paymentMethods") WITH ORDINALITY AS t(method, ord)
      ) rows
    ),
    '[]'::jsonb
  ),
  1,
  true,
  NOW(),
  NOW()
FROM "stores" s;

-- ── 6. `belowProducts` becomes a position ───────────────────────────────────
-- The boolean only ever existed because the product rails had no row to be ordered against. Now
-- they have one, and it goes exactly where the boolean used to put the line: after every poster
-- that was above it, before every poster that was below it.
INSERT INTO "store_sections" ("id", "storeId", "kind", "width", "target", "items", "position", "isActive", "createdAt", "updatedAt")
SELECT uuidv7(), s."id", 'PRODUCTS', 'CONTAINED', 'NONE', '[]'::jsonb, 500, true, NOW(), NOW()
FROM "stores" s;

ALTER TABLE "store_sections" DROP COLUMN "belowProducts";

-- ── 7. the storefront's read, in one index scan ─────────────────────────────
CREATE INDEX "store_sections_storeId_isActive_position_idx"
  ON "store_sections" ("storeId", "isActive", "position");
