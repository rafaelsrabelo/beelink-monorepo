-- A heading or a paragraph may sit at the left, the centre or the right.
--
-- Nullable on purpose, and null is not a fourth value. A heading has always been drawn centred and
-- a paragraph at the left; a column default would have to pick one and be wrong for the other. Null
-- means "as this kind always drew it", so no existing shop changes, and a value is written only
-- when a shopkeeper chooses one.
CREATE TYPE "TextAlign" AS ENUM ('LEFT', 'CENTER', 'RIGHT');

ALTER TABLE "store_components" ADD COLUMN "align" "TextAlign";
