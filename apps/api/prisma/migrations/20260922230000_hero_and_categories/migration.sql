-- The cover becomes a hero banner, and the categories become a block of their own.
--
-- A hero is a row, not a slide inside one, and that is the whole change. A slide could only ever
-- store an `href`: a hero pointing at `/lessari/blusas` would be a dead link the day that category
-- was renamed, which is the exact failure `5639c47` deleted a table over. As a row it points by
-- foreign key, and the address is built from the slug the target has now.
--
-- One is a cover; two or more in a row are a carousel. No column says which — the shape is read
-- off the count, which is one fewer thing that can disagree with itself.

-- ── 1. the kind ─────────────────────────────────────────────────────────────
-- A rename and not an add-plus-update: the rows keep their identity, and there is no window in
-- which a shop has a kind the application does not know.
ALTER TYPE "SectionKind" RENAME VALUE 'COVER' TO 'HERO';

-- Added, and deliberately NOT used below. Postgres refuses to USE an enum value in the same
-- transaction that added it, and no existing shop should suddenly grow a grid of categories it
-- never asked for.
ALTER TYPE "SectionKind" ADD VALUE 'CATEGORIES';

-- ── 2. the slide goes back to being the row's own picture ───────────────────
-- `20260922200000_cover_slides` moved it the other way, into `items`, because a cover drew from
-- there. A hero draws from `imageUrl` like every other banner, so it comes back — and `items` is
-- left holding only what the promises band puts in it.
UPDATE "store_sections"
SET "imageUrl" = "items" -> 0 ->> 'imageUrl',
    "items" = '[]'::jsonb
WHERE "kind" = 'HERO'
  AND jsonb_array_length("items") > 0;

-- A hero with no picture at all is a band of nothing. There is none in any shop — the carry-over
-- only ever made one where `bannerImageUrl` was set — but a row that survived some other way would
-- draw an empty strip on a page a stranger asked for, so it is hidden rather than drawn.
UPDATE "store_sections" SET "isActive" = false WHERE "kind" = 'HERO' AND "imageUrl" IS NULL;
