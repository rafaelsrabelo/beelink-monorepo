-- Every showcase that exists draws what it drew before: every product on the shelf, on one row
-- that scrolls. Written out rather than left null, so the choice the editor shows is the one the
-- page draws — a null here would be a rail the owner never saw a way to change.
UPDATE "store_components"
SET "source" = 'ALL', "display" = 'RAIL'
WHERE "kind" = 'PRODUCTS';
