-- A page becomes bands that hold things, instead of a flat list of things.
--
-- The shopkeeper's own words: "seção tem atributos (cores, ordenação) e tem componentes". A flat
-- list could not say two things they needed. A heading above a shelf was only ADJACENT to it, so
-- dragging the shelf left the heading stranded over something else. And a background colour
-- belongs to a band — in a flat list there is no band, only rows that happen to be in a row.
--
-- Every block keeps the place and the visibility it has now. No shop's page changes, and the
-- second half of this file is that promise being kept rather than asserted.

-- ── 1. the old table is the components table ────────────────────────────────
-- Renamed rather than copied: the foreign keys, the primary key and every id stay exactly where
-- they are, and nothing has to be re-pointed at anything.
ALTER TABLE "store_sections" RENAME TO "store_components";
ALTER TABLE "store_components" RENAME CONSTRAINT "store_sections_pkey" TO "store_components_pkey";
ALTER TABLE "store_components" RENAME CONSTRAINT "store_sections_storeId_fkey" TO "store_components_storeId_fkey";
-- The destination constraints are deliberately not renamed: section 6 deletes them.
DROP INDEX IF EXISTS "store_sections_storeId_isActive_position_idx";

-- ── 2. what a component gained ──────────────────────────────────────────────
ALTER TABLE "store_components" ADD COLUMN "body" TEXT;
ALTER TABLE "store_components" ADD COLUMN "columns" INTEGER;

-- ── 3. the bands ────────────────────────────────────────────────────────────
CREATE TABLE "store_sections" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "width" "SectionWidth" NOT NULL DEFAULT 'CONTAINED',
    "background" VARCHAR(9),
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_sections_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "store_sections" ADD CONSTRAINT "store_sections_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "store_sections_storeId_isActive_position_idx"
    ON "store_sections" ("storeId", "isActive", "position");

-- Nullable for exactly one statement, because the statement below both creates the bands and
-- points the components at them. The constraint goes on after it, when every row has one.
ALTER TABLE "store_components" ADD COLUMN "sectionId" UUID;

-- ── 4. one statement: the bands, and what is in them ────────────────────────
-- Data-modifying CTEs, for the reason `20260922260000` wrote down after destroying two heroes:
-- every CTE of one statement reads the same snapshot, so there is no ordering for a later step to
-- get wrong. Nothing here decides identity from a column this statement writes.
--
-- **Consecutive banners become ONE band, and that is not a flourish.** The storefront groups a run
-- of them into a single showcase row today, and that row is what decides their columns: three
-- `THIRDS` handed over separately are three full-width rows, and "um terço" means nothing. Giving
-- each its own section would have changed the look of every shop with posters side by side — the
-- one thing this migration promises not to do. The run that was implicit becomes a band that says
-- so, which is the model earning its keep on its first day.
--
-- Everything else gets a band of its own. Two headings in a row draw as two banded blocks now, and
-- merging them would change the spacing between them.
WITH ordered AS (
  SELECT
    "id", "storeId", "kind", "width", "position", "isActive", "createdAt", "updatedAt",
    ROW_NUMBER() OVER (PARTITION BY "storeId" ORDER BY "position", "createdAt", "id") AS rn
  FROM "store_components"
),
islands AS (
  SELECT
    o.*,
    -- Gaps and islands: for a run of banners, `rn` minus their own numbering is constant, so the
    -- difference names the run. Every other kind takes its own row number and is therefore alone.
    CASE
      WHEN o."kind" = 'BANNER'
        THEN 'b' || (o.rn - ROW_NUMBER() OVER (PARTITION BY o."storeId", o."kind" ORDER BY o.rn))::text
      ELSE 'x' || o.rn::text
    END AS band
  FROM ordered o
),
placed AS (
  SELECT
    i.*,
    -- The first component's id becomes its band's, so a band stays traceable to the block it was
    -- and nothing has to be mapped back from a key invented here.
    FIRST_VALUE(i."id") OVER (PARTITION BY i."storeId", i.band ORDER BY i.rn) AS section_id,
    MIN(i.rn) OVER (PARTITION BY i."storeId", i.band) AS band_rn,
    BOOL_OR(i."isActive") OVER (PARTITION BY i."storeId", i.band) AS band_shown,
    MAX(i."updatedAt") OVER (PARTITION BY i."storeId", i.band) AS band_updated,
    ROW_NUMBER() OVER (PARTITION BY i."storeId", i.band ORDER BY i.rn) - 1 AS slot,
    -- What each one draws today, read off the renderer rather than guessed. A cover honours the
    -- `width` its own row carries. The promises band is full-bleed: it paints a tinted strip edge
    -- to edge and contains its list inside. Everything else is wrapped in the shop's measure.
    CASE
      WHEN i."kind" = 'HERO' THEN i."width"
      WHEN i."kind" = 'BENEFITS' THEN 'FULL'::"SectionWidth"
      ELSE 'CONTAINED'::"SectionWidth"
    END AS band_width
  FROM islands i
),
bands AS (
  SELECT DISTINCT ON ("storeId", band)
    section_id, "storeId", band_rn, band_shown, band_updated, band_width, "createdAt"
  FROM placed
  ORDER BY "storeId", band, rn
),
inserted AS (
  INSERT INTO "store_sections" ("id", "storeId", "width", "background", "position", "isActive", "createdAt", "updatedAt")
  SELECT
    section_id,
    "storeId",
    band_width,
    -- Null is "the page's own colour", which is what every band has today. A shopkeeper picks one
    -- band at a time from here on; inventing one now would repaint pages nobody asked to repaint.
    NULL,
    (ROW_NUMBER() OVER (PARTITION BY "storeId" ORDER BY band_rn))::int - 1,
    band_shown,
    "createdAt",
    band_updated
  FROM bands
  RETURNING "id"
)
UPDATE "store_components" c
SET "sectionId" = p.section_id,
    "position" = p.slot
FROM placed p
WHERE c."id" = p."id";

ALTER TABLE "store_components" ALTER COLUMN "sectionId" SET NOT NULL;
ALTER TABLE "store_components" ADD CONSTRAINT "store_components_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "store_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- How wide a band sits is the band's business, and that is the whole reason a cover stops needing
-- a kind of its own. Dropped only now, because the statement above read it.
ALTER TABLE "store_components" DROP COLUMN "width";

-- ── 5. a poster becomes a banner with one slide ─────────────────────────────
-- A cover already kept its pictures in `items`; a poster still kept its one in `imageUrl`, with
-- its destination in four columns beside it. After this migration both are the same kind, so they
-- have to hold their pictures the same way — and the one that already survived a rename is the
-- slide, which stores a category by id rather than by address.
--
-- `20260922270000` wrote this exact statement for heroes. It is the same fold, on the rows that
-- were not heroes. Without it every poster on every shop loses its picture, which is the one thing
-- this file promises cannot happen.
UPDATE "store_components"
SET "items" = jsonb_build_array(
      jsonb_strip_nulls(
        jsonb_build_object(
          'id', "id"::text,
          'imageUrl', "imageUrl",
          'title', "title",
          'subtitle', "subtitle",
          'target', "target"::text,
          'categoryId', "categoryId"::text,
          'productId', "productId"::text,
          'externalUrl', "externalUrl"
        )
      )
    ),
    -- The words were drawn OVER the picture, so they belong to the slide and not to the block.
    -- A block's own title is a band heading, which a poster never had.
    "title" = NULL,
    "subtitle" = NULL
WHERE "kind" = 'BANNER' AND "imageUrl" IS NOT NULL;

-- A poster with no picture drew an empty frame. There should be none — the form required one —
-- but a row that arrived some other way would be a blank block on a page a stranger asks for.
UPDATE "store_components" SET "isActive" = false
WHERE "kind" = 'BANNER' AND jsonb_array_length("items") = 0;

-- ── 6. the columns that stopped having a reader ─────────────────────────────
-- Dropped rather than left empty. They existed so a poster could point somewhere; a poster points
-- through its slides now, and four columns nobody reads are four columns that rot — `belowProducts`
-- and sixteen keys of `layoutSettings` are this repository's own evidence for that.
--
-- What is given up is the foreign key's cascade, and the trade was made and measured when slides
-- were introduced: a deleted category used to take the whole banner with it, and a dangling id in
-- a slide resolves to null, so the slide stops being a link and the picture stays on the page.
ALTER TABLE "store_components" DROP CONSTRAINT "store_sections_one_target";
ALTER TABLE "store_components" DROP COLUMN "imageUrl";
ALTER TABLE "store_components" DROP COLUMN "target";
ALTER TABLE "store_components" DROP COLUMN "categoryId";
ALTER TABLE "store_components" DROP COLUMN "productId";
ALTER TABLE "store_components" DROP COLUMN "externalUrl";
DROP TYPE "SectionTarget";

-- ── 7. the vocabulary a component speaks ────────────────────────────────────
-- A fresh type rather than renaming values on the old one, and the reason is `HERO`: Postgres has
-- no `ALTER TYPE ... DROP VALUE`, so a rename would leave a value the application no longer knows
-- sitting in the type forever, reachable by a hand-written INSERT. Creating a type and using its
-- values in one transaction is allowed — it is `ADD VALUE` on an existing type that is not, which
-- is what forced three earlier migrations to add a value and deliberately not use it.
--
-- `HERO` becomes an ordinary banner: the cover's band already carries the full width that used to
-- be the point of it. `TEXT` becomes `HEADING`, which is what it always drew — a title and the
-- line under it — and the name is freed for the paragraph it was asked for.
CREATE TYPE "ComponentKind" AS ENUM ('ANNOUNCEMENT', 'BANNER', 'HEADING', 'TEXT', 'BENEFITS', 'CATEGORIES', 'PRODUCTS');

ALTER TABLE "store_components"
  ALTER COLUMN "kind" TYPE "ComponentKind"
  USING (
    CASE "kind"::text
      WHEN 'HERO' THEN 'BANNER'
      WHEN 'TEXT' THEN 'HEADING'
      ELSE "kind"::text
    END
  )::"ComponentKind";

DROP TYPE "SectionKind";

-- ── 8. the two reads this module makes ──────────────────────────────────────
CREATE INDEX "store_components_sectionId_position_idx" ON "store_components" ("sectionId", "position");
CREATE INDEX "store_components_storeId_kind_idx" ON "store_components" ("storeId", "kind");
