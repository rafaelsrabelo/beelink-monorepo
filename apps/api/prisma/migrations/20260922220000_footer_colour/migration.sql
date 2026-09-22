-- The foot gets a colour of its own, and the ink stops being a choice.
--
-- `colorText` goes because every word written on a surface is now derived from that surface — the
-- WCAG's relative luminance, in packages/ui/src/lib/contrast.ts. That is not a feature, it is a
-- defect being paid off: `--shop-background` used to paint the page AND colour every word printed
-- on a coloured one, which works only while the page is pale and the top is not. A shop that chose
-- black for both was black on black, and nothing in the panel would have warned its owner.
--
-- It is also what a "dark theme" would have been. A dark page with light words IS the dark theme,
-- so there is one mechanism here and not two for the same result.
ALTER TABLE "stores" ADD COLUMN "colorFooter" VARCHAR(9) NOT NULL DEFAULT '#3B7AF7';

-- Every shop's foot keeps exactly the colour it had: it borrowed the top's, so it takes the top's.
-- Nobody's page changes because of this migration.
UPDATE "stores" SET "colorFooter" = "colorHeader";

ALTER TABLE "stores" DROP COLUMN "colorText";
