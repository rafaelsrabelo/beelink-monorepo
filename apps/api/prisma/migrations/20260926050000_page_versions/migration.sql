-- CreateTable
CREATE TABLE "store_page_versions" (
    "id" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "document" JSONB NOT NULL,
    "note" VARCHAR(140),
    "authorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_page_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_page_versions_storeId_idx" ON "store_page_versions"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "store_page_versions_pageId_number_key" ON "store_page_versions"("pageId", "number");

-- AddForeignKey
ALTER TABLE "store_page_versions" ADD CONSTRAINT "store_page_versions_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "store_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_page_versions" ADD CONSTRAINT "store_page_versions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_page_versions" ADD CONSTRAINT "store_page_versions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- backfill:begin
-- Every page the shop serves today, frozen as it is served: version 1. Hidden bands and blocks go in
-- too — the read drops them, as the live read did — so the first restore loses nothing. Kept between
-- these markers because an e2e runs this exact SQL and compares it with `documentOf`.
INSERT INTO "store_page_versions" ("id", "pageId", "storeId", "number", "document", "note", "authorId", "createdAt")
SELECT uuidv7(), p."id", p."storeId", 1,
  jsonb_build_object('format', 1, 'sections', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', b."id", 'name', b."name", 'width', b."width"::text, 'background', b."background", 'isActive', b."isActive",
      'components', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', c."id", 'kind', c."kind"::text, 'title', c."title", 'subtitle', c."subtitle", 'body', c."body",
          'span', c."span"::text, 'display', c."display"::text, 'source', c."source"::text,
          'sourceCategoryId', c."sourceCategoryId", 'limit', c."limit", 'columns', c."columns",
          'align', c."align"::text, 'visibleOn', c."visibleOn"::text, 'items', c."items", 'isActive', c."isActive"
        ) ORDER BY c."position", c."id") FROM "store_components" c WHERE c."sectionId" = b."id"), '[]'::jsonb)
    ) ORDER BY b."position", b."id") FROM "store_sections" b WHERE b."pageId" = p."id"), '[]'::jsonb)),
  NULL, s."ownerId", COALESCE(p."publishedAt", NOW())
FROM "store_pages" p JOIN "stores" s ON s."id" = p."storeId"
WHERE p."status" = 'PUBLISHED'
  AND NOT EXISTS (SELECT 1 FROM "store_page_versions" v WHERE v."pageId" = p."id");
-- backfill:end
