-- The public page is white.
--
-- Every palette tinted the page a wash of its own brand colour, and the shop owner said it should
-- be white. It is the right call for a second reason the storefront makes plain: `--shop-background`
-- does double duty there. It paints the page AND it is the colour of every word printed on a
-- coloured surface — the header, the footer, the price badge, the WhatsApp button. A near-white
-- tint on a coloured button is a smudge; white is the contrast that was wanted all along.
--
-- The default moves with the palettes, so a shop created before it picks one starts white too.
ALTER TABLE "stores" ALTER COLUMN "colorBackground" SET DEFAULT '#FFFFFF';

-- And the shops that already exist, because a change to where the palettes start changes nothing
-- for a shop that already picked one. This OVERWRITES a stored value: the colour is still a column
-- and still editable, so a shopkeeper who wants a cream page picks one again — but they do have to
-- pick it again.
UPDATE "stores" SET "colorBackground" = '#FFFFFF' WHERE "colorBackground" <> '#FFFFFF';
