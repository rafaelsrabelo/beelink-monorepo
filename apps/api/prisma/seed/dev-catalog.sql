-- Mock catalogue for local work. NOT platform data, and deliberately NOT wired into
-- `migrations.seed` in prisma.config.ts — `prisma migrate reset` must never put invented products
-- into a database that might one day be a real one.
--
-- Run it by hand:  pnpm --filter api db:seed:dev
--
-- It is keyed on the shop's SEGMENT (`store_categories.slug`), not on the shop's own slug, so it
-- works on any developer's database and a supplement shop stops selling crochet bags. Two shops on
-- the same segment get the same catalogue, which is what "by segment" means: to tell `lessari`
-- apart from `bewave-store` they need different segments, not different fixtures.
--
-- IT DELETES. Any category or product of a shop whose segment this file knows, whose slug is not
-- in that segment's list below, is removed — otherwise the generic catalogue every shop used to
-- get would sit alongside the new one and every window would show both. That is the right
-- behaviour for a fixture ("make the database match this file") and the wrong behaviour for
-- anything holding real rows, which is why this file is run by hand and never by a migration.
--
-- Idempotent on (storeId, slug), so re-running after editing a name or a price corrects the row.
-- The images are picsum.photos addressed by seed, so a product keeps its picture across runs: a
-- card that changes photo on every reload makes a layout impossible to judge.

-- ---------------------------------------------------------------- dev fixture: the segment
-- The one place a shop is named. It is this developer's supplement shop sitting on `saude`, and
-- everything below keys on the segment, so the fixture is wrong until this is right.
UPDATE "stores"
SET "categoryId" = (SELECT id FROM "store_categories" WHERE slug = 'suplementos'), "updatedAt" = now()
WHERE slug = 'mutante-performance'
  AND "categoryId" IS DISTINCT FROM (SELECT id FROM "store_categories" WHERE slug = 'suplementos');

-- ---------------------------------------------------------------- what each segment sells
-- Temporary views, so nothing below repeats the join or the lists.
CREATE TEMP VIEW shop_segment AS
SELECT s.id AS store_id, s.slug AS store_slug, c.slug AS segment
FROM "stores" s
JOIN "store_categories" c ON c.id = s."categoryId";

-- `parent` is the slug of the category this one sits under, or NULL for a top level. Two levels and
-- no third, which the API refuses on the way in — the URL `/<shop>/<category>` is flat.
--
-- `showcase` is the shape the category takes on the landing page, or NULL to keep it off. There is
-- no separate "banner" list any more: the poster IS the category, so the picture, the name and the
-- line on it are the ones below, and it goes to the category it is.
CREATE TEMP VIEW seed_category (segment, slug, name, description, parent, showcase, position) AS
VALUES
  -- suplementos
  ('suplementos', 'proteinas',   'Proteínas',  'Whey, albumina e veganas',        NULL,        'FULL',   0),
  ('suplementos', 'whey',        'Whey',       'Concentrado e isolado',           'proteinas', 'HALVES', 0),
  ('suplementos', 'albumina',    'Albumina',   'Liberação lenta',                 'proteinas',  NULL,    1),
  ('suplementos', 'creatina',    'Creatina',   'Força em cada repetição',         NULL,        'THIRDS', 1),
  ('suplementos', 'pre-treino',  'Pré-treino', 'Energia para o treino inteiro',   NULL,        'THIRDS', 2),
  ('suplementos', 'vitaminas',   'Vitaminas',  'A base que sustenta o resto',     NULL,        'THIRDS', 3),
  ('suplementos', 'snacks',      'Snacks',     'Proteína para levar na mochila',  NULL,        'HALVES', 4),
  -- moda
  ('moda',        'vestidos',    'Vestidos',   'Midi, longo e slip',              NULL,        'FULL',   0),
  ('moda',        'blusas',      'Blusas',     'Do básico ao que sai à noite',    NULL,        'THIRDS', 1),
  ('moda',        'calcas',      'Calças',     'Alfaiataria, wide leg e jeans',   NULL,        'THIRDS', 2),
  ('moda',        'calcados',    'Calçados',   'Tênis, rasteira e bota',          NULL,        'THIRDS', 3),
  ('moda',        'tenis',       'Tênis',      'Do branco liso ao corrida',       'calcados',  'HALVES', 0),
  ('moda',        'acessorios',  'Acessórios', 'O que fecha o look',              NULL,        'HALVES', 4);

CREATE TEMP VIEW seed_product (segment, category, slug, name, description, price, compare_at, position) AS
VALUES
  -- ------------------------------------------------------------- suplementos
  ('suplementos', 'whey',       'whey-concentrado-900g',  'Whey Protein Concentrado 900g', 'Concentrado de soro, 24 g de proteína por dose. Chocolate belga.',  13990, 16900,  0),
  ('suplementos', 'whey',       'whey-isolado-900g',      'Whey Protein Isolado 900g',     'Isolado por microfiltração, baixo em lactose. Baunilha.',           18990, 22900,  1),
  ('suplementos', 'albumina',   'albumina-500g',          'Albumina 500g',                 'Proteína da clara do ovo, liberação lenta. Sem sabor.',              5990,  NULL,  2),
  ('suplementos', 'creatina',   'creatina-mono-300g',     'Creatina Monohidratada 300g',   '100% pura, sem aditivos. 3 g por dose, cem doses.',                  8990, 10990,  3),
  ('suplementos', 'creatina',   'creatina-creapure-250g', 'Creatina Creapure 250g',        'Creapure alemã, com laudo por lote.',                               12990,  NULL,  4),
  ('suplementos', 'pre-treino', 'pre-treino-insano-300g', 'Pré-treino Insano 300g',        'Cafeína, beta-alanina e citrulina. Frutas vermelhas.',               9990, 12990,  5),
  ('suplementos', 'pre-treino', 'beta-alanina-200g',      'Beta-alanina 200g',             'Retarda a fadiga em séries longas. Sem sabor.',                      7490,  NULL,  6),
  ('suplementos', 'vitaminas',  'multivitaminico-120',    'Multivitamínico Essencial',     '120 cápsulas, 23 vitaminas e minerais. Um mês e meio.',              5490,  6990,  7),
  ('suplementos', 'vitaminas',  'vitamina-d3-k2-60',      'Vitamina D3 + K2',              '60 cápsulas. Absorção de cálcio e saúde óssea.',                     3990,  NULL,  8),
  ('suplementos', 'vitaminas',  'omega-3-120',            'Ômega 3 Ultra 120 cápsulas',    'EPA e DHA concentrados, óleo de peixe purificado.',                  6490,  7990,  9),
  ('suplementos', 'snacks',     'barra-proteina-12un',    'Barra de Proteína (12 un)',     '20 g de proteína por barra. Caixa com doze, sabores sortidos.',      8990, 10490, 10),
  ('suplementos', 'snacks',     'pasta-amendoim-1kg',     'Pasta de Amendoim 1kg',         'Integral, sem açúcar. Amendoim e nada mais.',                        3490,  NULL, 11),
  -- ------------------------------------------------------------- moda
  ('moda',        'blusas',     'blusa-canelada',         'Blusa Canelada',                'Malha canelada de algodão, modelagem justa, gola redonda.',          8900, 11900,  0),
  ('moda',        'blusas',     'cropped-gola-alta',      'Cropped Gola Alta',             'Manga longa, comprimento curto, tecido com elastano.',               7900,  NULL,  1),
  ('moda',        'blusas',     'camisa-linho',           'Camisa de Linho',               'Linho puro, corte solto, botões de madrepérola.',                   16900, 19900,  2),
  ('moda',        'vestidos',   'vestido-midi-floral',    'Vestido Midi Floral',           'Viscose leve, manga bufante, comprimento midi.',                    22900, 28900,  3),
  ('moda',        'vestidos',   'vestido-slip-cetim',     'Vestido Slip de Cetim',         'Alça fina, corte enviesado, caimento fluido.',                      24900,  NULL,  4),
  ('moda',        'calcas',     'calca-wide-leg',         'Calça Wide Leg',                'Cintura alta, perna ampla, tecido com caimento pesado.',            19900, 24900,  5),
  ('moda',        'calcas',     'calca-alfaiataria',      'Calça de Alfaiataria',          'Pregas na frente, bolso faca, forro na cintura.',                   21900,  NULL,  6),
  ('moda',        'calcas',     'jeans-mom',              'Jeans Mom',                     'Lavagem clara, cintura alta, barra desfiada.',                      17900, 21900,  7),
  ('moda',        'tenis',      'tenis-branco',           'Tênis Branco',                  'Couro liso, solado de borracha, cabedal sem costura aparente.',     27900, 34900,  8),
  ('moda',        'calcados',   'rasteira-trancada',      'Rasteira Trançada',             'Tiras trançadas à mão, palmilha acolchoada.',                       12900,  NULL,  9),
  ('moda',        'acessorios', 'bolsa-tiracolo',         'Bolsa Tiracolo',                'Alça regulável, fecho magnético, bolso interno.',                   18900, 23900, 10),
  ('moda',        'acessorios', 'cinto-couro',            'Cinto de Couro',                'Couro legítimo, fivela escovada, três centímetros de largura.',      8900,  NULL, 11);

-- ---------------------------------------------------------------- categories
INSERT INTO "product_categories" ("id", "storeId", "slug", "name", "description", "imageUrl", "position", "isActive", "slugHistory", "createdAt", "updatedAt")
SELECT
  uuidv7(), sh.store_id, c.slug, c.name, c.description,
  -- Landscape for the ones that also become a poster, square for a menu tile. The shape decides,
  -- because a 400×400 stretched across a full-width band is a blurred band.
  'https://picsum.photos/seed/' || sh.store_slug || '-' || c.slug ||
    CASE WHEN c.showcase IS NULL THEN '/400/400' ELSE '/1200/675' END,
  c.position, true, '{}', now(), now()
FROM shop_segment sh
JOIN seed_category c ON c.segment = sh.segment
ON CONFLICT ("storeId", "slug") DO UPDATE
  SET "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "imageUrl" = EXCLUDED."imageUrl",
      "position" = EXCLUDED."position",
      "isActive" = true,
      "updatedAt" = now();

-- ------------------------------------------------------------------- banners
-- The posters, now their own rows. `seed_category.showcase` still decides which categories are
-- worth one, because a seeded shop should open with a landing page rather than with a grid — but
-- the shape lives on the banner from here, not on the category.
--
-- Only category banners are seeded. A product banner and an external one are the two things a
-- shopkeeper reaches for once they have something specific to push, and inventing either here
-- would put a made-up destination on a demo shop.
DELETE FROM "store_banners" b
USING shop_segment sh
WHERE b."storeId" = sh.store_id;

INSERT INTO "store_banners" (
  "id", "storeId", "title", "subtitle", "imageUrl", "layout",
  "target", "categoryId", "productId", "externalUrl",
  "position", "isActive", "createdAt", "updatedAt"
)
SELECT
  uuidv7(), pc."storeId", pc."name", left(pc."description", 200), pc."imageUrl",
  c.showcase::"ShowcaseLayout",
  'CATEGORY', pc."id", NULL, NULL,
  c.position, true, now(), now()
FROM shop_segment sh
JOIN seed_category c ON c.segment = sh.segment
JOIN "product_categories" pc ON pc."storeId" = sh.store_id AND pc.slug = c.slug
WHERE c.showcase IS NOT NULL;

-- The tree, in a second pass: a child needs its parent's id, which only exists once the parent row
-- has been written. Matching on the slug is what lets the list above name a parent in words.
UPDATE "product_categories" child
SET "parentId" = parent.id, "updatedAt" = now()
FROM shop_segment sh, seed_category c, "product_categories" parent
WHERE child."storeId" = sh.store_id
  AND c.segment = sh.segment
  AND c.slug = child.slug
  AND c.parent IS NOT NULL
  AND parent."storeId" = sh.store_id
  AND parent.slug = c.parent
  AND child."parentId" IS DISTINCT FROM parent.id;

-- ---------------------------------------------------------------- products
-- compareAtPriceCents is set on some and not others on purpose: the window computes the percentage
-- from the pair, so a catalogue with both kinds is the only way to see that it does.
INSERT INTO "products" ("id", "storeId", "categoryId", "slug", "name", "description", "priceCents", "compareAtPriceCents", "position", "status", "slugHistory", "createdAt", "updatedAt")
SELECT
  uuidv7(), sh.store_id,
  (SELECT pc.id FROM "product_categories" pc WHERE pc."storeId" = sh.store_id AND pc.slug = p.category),
  p.slug, p.name, p.description, p.price, p.compare_at, p.position, 'ACTIVE'::"ProductStatus", '{}', now(), now()
FROM shop_segment sh
JOIN seed_product p ON p.segment = sh.segment
ON CONFLICT ("storeId", "slug") DO UPDATE
  SET "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "priceCents" = EXCLUDED."priceCents",
      "compareAtPriceCents" = EXCLUDED."compareAtPriceCents",
      "position" = EXCLUDED."position",
      "categoryId" = EXCLUDED."categoryId",
      "status" = 'ACTIVE',
      "updatedAt" = now();

-- ---------------------------------------------------------------- what this file no longer sells
-- Only for shops on a segment this file knows: a shop on `petshop` keeps whatever it has, because
-- this file has no opinion about it. Products go first — the category is their parent.
DELETE FROM "products" p
USING shop_segment sh
WHERE p."storeId" = sh.store_id
  AND EXISTS (SELECT 1 FROM seed_product sp WHERE sp.segment = sh.segment)
  AND NOT EXISTS (SELECT 1 FROM seed_product sp WHERE sp.segment = sh.segment AND sp.slug = p.slug);

-- Cascade takes the children of a deleted parent, so order does not matter here.
DELETE FROM "product_categories" pc
USING shop_segment sh
WHERE pc."storeId" = sh.store_id
  AND EXISTS (SELECT 1 FROM seed_category sc WHERE sc.segment = sh.segment)
  AND NOT EXISTS (SELECT 1 FROM seed_category sc WHERE sc.segment = sh.segment AND sc.slug = pc.slug);

-- ---------------------------------------------------------------- two images per product
-- Two, not one: the product page has a gallery and a single image never exercises it.
INSERT INTO "product_images" ("id", "productId", "url", "alt", "position", "createdAt")
SELECT uuidv7(), p.id,
       'https://picsum.photos/seed/' || p.slug || '-' || i.n || '/800/800',
       p.name, i.n, now()
FROM "products" p
CROSS JOIN (VALUES (0), (1)) AS i(n)
WHERE NOT EXISTS (
  SELECT 1 FROM "product_images" pi WHERE pi."productId" = p.id AND pi.position = i.n
);

-- ---------------------------------------------------------------- one variant per product
-- A product sells its variants, and the price written above is only their cache. A product with no
-- variant gets its default one here; a seeded product without options has its default variant take
-- the price the upsert just wrote, so editing a price in this file and re-running still changes it.
INSERT INTO "product_variants" (
  "id", "productId", "storeId", "position", "isActive",
  "priceCents", "compareAtPriceCents", "costCents", "sku", "barcode",
  "trackStock", "stockQuantity", "weightGrams", "lengthMm", "widthMm", "heightMm",
  "createdAt", "updatedAt"
)
SELECT
  uuidv7(), p.id, p."storeId", 0, true,
  p."priceCents", p."compareAtPriceCents", p."costCents", p."sku", p."barcode",
  p."trackStock", p."stockQuantity", p."weightGrams", p."lengthMm", p."widthMm", p."heightMm",
  now(), now()
FROM "products" p
WHERE NOT EXISTS (SELECT 1 FROM "product_variants" v WHERE v."productId" = p.id);

UPDATE "product_variants" v
SET "priceCents" = p."priceCents", "compareAtPriceCents" = p."compareAtPriceCents", "updatedAt" = now()
FROM "products" p, shop_segment sh
WHERE v."productId" = p.id
  AND p."storeId" = sh.store_id
  AND NOT EXISTS (SELECT 1 FROM "product_options" o WHERE o."productId" = p.id)
  AND (v."priceCents", v."compareAtPriceCents") IS DISTINCT FROM (p."priceCents", p."compareAtPriceCents");

DROP VIEW shop_segment;
DROP VIEW seed_category;
DROP VIEW seed_product;
