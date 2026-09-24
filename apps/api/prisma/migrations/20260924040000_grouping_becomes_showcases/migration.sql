-- A shop that grouped its landing by category keeps what it drew. The switch replaced the one shelf
-- of every product with a shelf per category — the first six the menu lists, twelve products each —
-- and every showcase now draws its own source, so the switch would do nothing. Each showcase of
-- every product in such a shop becomes those shelves, as showcases, where it stood: the first takes
-- its place and its id, the rest follow it in the same band. None keeps a title: a grouped shelf was
-- named by its category, whatever the showcase was called.
--
-- A category is listed when it is active and something in it, or in an active category under it, is
-- published — the menu's own rule (ProductCategoriesService.listPublic), which reads active rows
-- only. A grouped shop with no such category drew no shelf at all; its showcase is left drawing
-- every product rather than turned into nothing.
--
-- A showcase's position is read again on every turn: two in one band shift each other, and the
-- position the loop's query saw is stale by the time the second one is reached.
DO $$
DECLARE
  showcase RECORD;
  category RECORD;
  added INT;
  origin INT;
BEGIN
  FOR showcase IN
    SELECT c.*
    FROM "store_components" c
    JOIN "stores" s ON s."id" = c."storeId"
    WHERE s."showProductsByCategory" AND c."kind" = 'PRODUCTS' AND c."source" = 'ALL'
    ORDER BY c."sectionId", c."position"
  LOOP
    added := 0;
    SELECT "position" INTO origin FROM "store_components" WHERE "id" = showcase."id";

    FOR category IN
      SELECT pc."id"
      FROM "product_categories" pc
      WHERE pc."storeId" = showcase."storeId"
        AND pc."isActive"
        AND EXISTS (
          SELECT 1
          FROM "products" p
          LEFT JOIN "product_categories" child ON child."id" = p."categoryId" AND child."isActive"
          WHERE p."status" = 'ACTIVE' AND (p."categoryId" = pc."id" OR child."parentId" = pc."id")
        )
      ORDER BY pc."position", pc."name"
      LIMIT 6
    LOOP
      IF added = 0 THEN
        UPDATE "store_components"
        SET "source" = 'CATEGORY', "sourceCategoryId" = category."id", "limit" = 12, "title" = NULL, "updatedAt" = now()
        WHERE "id" = showcase."id";
      ELSE
        UPDATE "store_components"
        SET "position" = "position" + 1
        WHERE "sectionId" = showcase."sectionId" AND "position" >= origin + added;

        INSERT INTO "store_components"
          ("id", "sectionId", "storeId", "kind", "span", "display", "source", "sourceCategoryId", "limit",
           "items", "position", "isActive", "createdAt", "updatedAt")
        VALUES
          (gen_random_uuid(), showcase."sectionId", showcase."storeId", 'PRODUCTS', showcase."span",
           showcase."display", 'CATEGORY', category."id", 12, '[]', origin + added,
           showcase."isActive", now(), now());
      END IF;

      added := added + 1;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE "stores" DROP COLUMN "showProductsByCategory";
