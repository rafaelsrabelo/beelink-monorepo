-- A component's width in its band, and how a banner lays out its slides, as two columns.
--
-- `layout` carried both, and a third meaning besides: a banner of one slide took the column as its
-- grid cell, and a banner of two or more ignored it and drew a full-width carousel. So a shopkeeper
-- who picked "um terço" on a carousel saw full width, which is the defect this splits apart.
--
-- `span` is `layout` translated word for word, on every row and whatever the slide count. It is
-- the width the shopkeeper picked; drawing it is the band's job, in a later change. The CASE has
-- no ELSE on purpose: a value missing from it becomes NULL, meets NOT NULL, and stops the migration
-- instead of quietly turning somebody's choice into FULL.
--
-- `display` is CAROUSEL on every banner, including those of one slide. One slide draws the same
-- cover either way, and CAROUSEL is what the next slide the shopkeeper adds does today. Every
-- other kind is NULL: nothing draws `display` there yet, and a value would decide for it.
CREATE TYPE "ComponentSpan" AS ENUM ('FULL', 'HALF', 'THIRD', 'TWO_THIRDS');

CREATE TYPE "ComponentDisplay" AS ENUM ('CAROUSEL', 'GRID');

ALTER TABLE "store_components"
ADD COLUMN "span" "ComponentSpan" NOT NULL DEFAULT 'FULL',
ADD COLUMN "display" "ComponentDisplay";

UPDATE "store_components"
SET
  "span" = CASE "layout"
    WHEN 'FULL' THEN 'FULL'::"ComponentSpan"
    WHEN 'HALVES' THEN 'HALF'::"ComponentSpan"
    WHEN 'THIRDS' THEN 'THIRD'::"ComponentSpan"
  END,
  "display" = CASE WHEN "kind" = 'BANNER' THEN 'CAROUSEL'::"ComponentDisplay" END;

ALTER TABLE "store_components" DROP COLUMN "layout";

DROP TYPE "ShowcaseLayout";
