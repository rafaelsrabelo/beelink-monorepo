-- Every shop lists its products.
--
-- A shop reached a landing page with no PRODUCTS component: the component's own row drew no bin,
-- but the bin on the band holding it did not ask what was inside, and the menu had no way to put
-- the shelves back. Three products existed and none appeared — on the panel or on the page.
--
-- The API refuses that delete now, at both levels, and a new shop opens with the band already
-- there. This is the third half: the shops that lost it get it back, last on the page, where a
-- new band always lands. Dragging it up is the shopkeeper's, and takes one gesture.
--
-- One statement, so the band and its component are written from the same snapshot. Idempotent:
-- a shop that has the component is not touched.
WITH missing AS (
  SELECT s."id" AS store_id
  FROM "stores" s
  WHERE NOT EXISTS (
    SELECT 1 FROM "store_components" c WHERE c."storeId" = s."id" AND c."kind" = 'PRODUCTS'
  )
),
bands AS (
  INSERT INTO "store_sections" ("id", "storeId", "width", "position", "isActive", "createdAt", "updatedAt")
  SELECT
    uuidv7(),
    m.store_id,
    'CONTAINED',
    COALESCE((SELECT MAX(b."position") + 1 FROM "store_sections" b WHERE b."storeId" = m.store_id), 0),
    true,
    NOW(),
    NOW()
  FROM missing m
  RETURNING "id", "storeId"
)
INSERT INTO "store_components" ("id", "storeId", "sectionId", "kind", "layout", "items", "position", "isActive", "createdAt", "updatedAt")
SELECT uuidv7(), b."storeId", b."id", 'PRODUCTS', 'FULL', '[]'::jsonb, 0, true, NOW(), NOW()
FROM bands b;
