-- A hero whose picture is still in the column, not in its slides.
--
-- Reported as "a top banner that does not exist": the shop window draws a hero from its slides, so
-- one with an empty `items` drew nothing at all — while design mode's panel listed the row, because
-- the row is there. The picture was in `imageUrl`.
--
-- Two ways to arrive at it. `20260922260000` folded the heroes that existed when it ran, and a hero
-- created after it through the banner form's old path — which wrote `kind: HERO` with the form's
-- own `imageUrl` — was never folded by anything. That path is closed now: saving a top banner adds
-- a slide to the shop's hero.
UPDATE "store_sections"
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
    -- Cleared for the same reason the fold cleared them: a hero points nowhere, its slides do, and
    -- the CHECK demands NONE with all three empty.
    "imageUrl" = NULL,
    "title" = NULL,
    "subtitle" = NULL,
    "target" = 'NONE',
    "categoryId" = NULL,
    "productId" = NULL,
    "externalUrl" = NULL
WHERE "kind" = 'HERO'
  AND "imageUrl" IS NOT NULL
  AND jsonb_array_length("items") = 0;
