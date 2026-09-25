-- A search that ignores accents and case: "crochê" finds "croche", and "blusa" finds "Blusa".
--
-- The column holds the name and the description as the search compares them. A trigger writes it on
-- every insert and every change to either, so no writer — the API, the dev seed, a later migration —
-- can leave it behind, and a trigram index lets the substring match use an index. Both extensions
-- ship with Postgres.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "products" ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '';

CREATE FUNCTION "products_search_text"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."searchText" := lower(unaccent(NEW."name" || ' ' || COALESCE(NEW."description", '')));
  RETURN NEW;
END $$;

CREATE TRIGGER "products_search_text"
  BEFORE INSERT OR UPDATE OF "name", "description" ON "products"
  FOR EACH ROW EXECUTE FUNCTION "products_search_text"();

-- Every product already written.
UPDATE "products" SET "searchText" = lower(unaccent("name" || ' ' || COALESCE("description", '')));

CREATE INDEX "products_searchText_idx" ON "products" USING GIN ("searchText" gin_trgm_ops);
