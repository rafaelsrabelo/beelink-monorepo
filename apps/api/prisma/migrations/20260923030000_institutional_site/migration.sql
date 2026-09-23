-- A second product in the same house: a site that presents and takes contact instead of selling.
--
-- A type of the same row, not a table of its own — everything a site needs underneath is what a
-- shop already has. The value is added and deliberately not used here: Postgres refuses to USE an
-- enum value in the transaction that added it, and no existing shop becomes a site.
ALTER TYPE "StoreType" ADD VALUE 'INSTITUTIONAL';

-- What a band is called on the page, if its owner named it. Null on every band that exists: none
-- was ever named, and a site's menu is made of the named ones only.
ALTER TABLE "store_sections" ADD COLUMN "name" VARCHAR(60);
