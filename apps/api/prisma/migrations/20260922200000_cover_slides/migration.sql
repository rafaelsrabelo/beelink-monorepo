-- A cover draws its slides from `items`, and the carry-over left its picture in `imageUrl`.
--
-- Caught by comparing a shop's rendered landing page before and after the rename: every band came
-- back in the right order and the cover did not come back at all. `20260922190000_store_sections`
-- moved `stores.bannerImageUrl` into the new row's `imageUrl` column, which is where a BANNER
-- keeps its picture — but a COVER is one or many slides, and one slide is still a slide.
--
-- Its own migration rather than an edit to that one: the first has already been applied, and
-- Prisma records a checksum per migration. Editing an applied file makes the next `migrate status`
-- refuse the whole folder, which is a worse failure than the one being fixed.
UPDATE "store_sections"
SET "items" = jsonb_build_array(
      jsonb_build_object('id', 'slide-1', 'imageUrl', "imageUrl")
    ),
    "imageUrl" = NULL
WHERE "kind" = 'COVER'
  AND "imageUrl" IS NOT NULL
  AND "items" = '[]'::jsonb;
