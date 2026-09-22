-- Two things `20260922190000_store_sections` left behind, found by replaying the whole chain on a
-- scratch database rather than by reading it.

-- ── 1. the backfill default outlived the backfill ───────────────────────────
-- `ADD COLUMN "kind" ... DEFAULT 'BANNER'` existed so the rows already in the table would get a
-- kind. Nothing dropped it afterwards, and `schema/section.prisma` declares `kind SectionKind`
-- with no `@default` — so the database and the schema disagree.
--
-- Measured: `prisma migrate diff --from-config-datasource --to-schema ./prisma/schema` emits
-- exactly this statement. Left alone, the next developer to run `migrate dev` is told the schema
-- is out of sync and offered a reset, on a branch that touched nothing. And an INSERT that forgot
-- `kind` would quietly have produced a banner instead of failing.
ALTER TABLE "store_sections" ALTER COLUMN "kind" DROP DEFAULT;

-- ── 2. a promises band with nothing to promise ──────────────────────────────
-- The carry-over inserted one BENEFITS row per shop with no WHERE at all, so a shop whose
-- `paymentMethods` was empty or NULL — the column has a default but no NOT NULL — got an active
-- band holding `[]`. The section schema says what that is: "an `items` nobody draws is a blank
-- band on the shop's front page, reported the same day."
--
-- The same file already applies this rule to the cover twelve lines earlier ("A shop with the
-- toggle on and no picture drew nothing, and still draws nothing — it gets no row"). Hidden rather
-- than deleted, so a shopkeeper who fills it in gets their band back where it always was.
UPDATE "store_sections"
SET "isActive" = false
WHERE "kind" = 'BENEFITS' AND jsonb_array_length("items") = 0;
