-- A hero becomes one block holding several pictures, instead of several blocks side by side.
--
-- This reverses `20260922230000`, on purpose and on the shopkeeper's evidence. That migration made
-- each hero its own row, and two adjacent rows drew a carousel — the shape read off the count,
-- with no switch to disagree with it. Tried, it was confusing in both directions: making a
-- carousel meant creating two banners and hoping they stayed next to each other, and the editor
-- listed two entries for one thing on the page.
--
-- The objection that produced the old shape was real and survives here: a slide could only hold an
-- address, so one pointing at `/lessari/blusas` would die the day that category was renamed. A
-- slide keeps an **id** instead, resolved to an address on the way out — the same promise the
-- foreign key made. What it gives up is the cascade, and that trade is in this shape's favour: a
-- deleted category used to take the whole banner with it, and now the slide simply stops linking.

-- ── one statement, one snapshot ────────────────────────────────────────────
-- Data-modifying CTEs, and that is the whole correctness argument. The first draft computed "which
-- row to keep" from `imageUrl IS NOT NULL`, cleared `imageUrl` on the row it kept, and then
-- recomputed the same predicate to decide what to delete — which by then named a different row and
-- deleted the survivor. It destroyed both heroes of the shop it was tested on.
--
-- A temp table was the second draft, and Prisma does not keep one across the statements of a
-- migration: `42P01`. Every CTE of one statement reads the same snapshot, so there is no ordering
-- for a later step to get wrong. The rule this file now follows: never decide identity from a
-- column the same migration rewrites.
WITH fold AS (
  SELECT
    "storeId",
    MIN("position") AS keep_position,
    (ARRAY_AGG("id" ORDER BY "position", "createdAt"))[1] AS keep_id,
    BOOL_OR("isActive") AS any_shown,
    jsonb_agg(
      jsonb_strip_nulls(
        jsonb_build_object(
          -- The row's own id becomes the slide's, so a slide stays traceable to the banner it was.
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
      ORDER BY "position", "createdAt"
    ) AS items
  FROM "store_sections"
  WHERE "kind" = 'HERO' AND "imageUrl" IS NOT NULL
  GROUP BY "storeId"
),
folded AS (
  DELETE FROM "store_sections" s
  USING fold f
  WHERE s."storeId" = f."storeId" AND s."kind" = 'HERO' AND s."id" <> f.keep_id
  RETURNING s."id"
)
UPDATE "store_sections" s
SET "items" = f.items,
    "position" = f.keep_position,
    -- A shop whose heroes were all hidden keeps it hidden; one with any shown keeps it shown.
    "isActive" = f.any_shown,
    -- The block's own destination columns are cleared: a hero points nowhere now, its slides do.
    -- The CHECK requires exactly this — NONE, and all three empty.
    "imageUrl" = NULL,
    "target" = 'NONE',
    "categoryId" = NULL,
    "productId" = NULL,
    "externalUrl" = NULL
FROM fold f
WHERE s."id" = f.keep_id;

-- A hero that never had a picture has nothing to become a slide, and an empty carousel is a band
-- of nothing. It goes, rather than sitting hidden forever in a list the shopkeeper reads. Its own
-- statement, which is safe: it reads what the statement above wrote, rather than deciding identity
-- from it.
DELETE FROM "store_sections" WHERE "kind" = 'HERO' AND jsonb_array_length("items") = 0;
