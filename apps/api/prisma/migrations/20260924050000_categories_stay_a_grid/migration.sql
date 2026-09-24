-- Every categories block that exists stays what it draws: a grid. Written out rather than left null,
-- so the choice the editor shows is the one the page draws. A new block opens as a rail.
UPDATE "store_components"
SET "display" = 'GRID'
WHERE "kind" = 'CATEGORIES';
