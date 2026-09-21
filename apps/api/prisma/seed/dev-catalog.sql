-- Mock catalogue for local work. NOT platform data, and deliberately NOT wired into
-- `migrations.seed` in prisma.config.ts — `prisma migrate reset` must never put invented products
-- into a database that might one day be a real one.
--
-- Run it by hand:  pnpm --filter api db:seed:dev
--
-- It fills whatever shops exist rather than naming them, so it works on any developer's database,
-- and it is idempotent on (storeId, slug) like the platform seed. Re-running after editing a name
-- or a price corrects the row instead of duplicating it.
--
-- The images are picsum.photos, addressed by seed so each product keeps the same picture across
-- runs. A stable fake is worth more than a pretty one: a card that changes photo on every reload
-- makes a layout impossible to judge.

-- ---------------------------------------------------------------- categories, for every shop
INSERT INTO "product_categories" ("id", "storeId", "slug", "name", "description", "imageUrl", "position", "isActive", "slugHistory", "createdAt", "updatedAt")
SELECT
  uuidv7(), s.id, c.slug, c.name, c.description,
  'https://picsum.photos/seed/' || s.slug || '-' || c.slug || '/400/400',
  c.position, true, '{}', now(), now()
FROM "stores" s
CROSS JOIN (VALUES
  ('mais-vendidos', 'Mais vendidos',  'O que sai mais da prateleira',        0),
  ('novidades',     'Novidades',      'Chegou agora',                        1),
  ('promocoes',     'Promoções',      'Por tempo limitado',                  2),
  ('acessorios',    'Acessórios',     'Para completar',                      3)
) AS c(slug, name, description, position)
ON CONFLICT ("storeId", "slug") DO UPDATE
  SET "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "imageUrl" = EXCLUDED."imageUrl",
      "position" = EXCLUDED."position",
      "updatedAt" = now();

-- ---------------------------------------------------------------- products, for every shop
-- compareAtPriceCents is set on some and not others on purpose: the window computes the
-- percentage from the pair, so a catalogue with both kinds is the only way to see that it does.
INSERT INTO "products" ("id", "storeId", "categoryId", "slug", "name", "description", "priceCents", "compareAtPriceCents", "position", "isAvailable", "slugHistory", "createdAt", "updatedAt")
SELECT
  uuidv7(), s.id,
  (SELECT pc.id FROM "product_categories" pc WHERE pc."storeId" = s.id AND pc.slug = p.category),
  p.slug, p.name, p.description, p.price, p.compare_at, p.position, true, '{}', now(), now()
FROM "stores" s
CROSS JOIN (VALUES
  ('bolsa-amora',        'Bolsa Amora',        'Bolsa de crochê feita à mão em fio de algodão, com alça ajustável.', 18900,  24900, 0, 'mais-vendidos'),
  ('bolsa-serena',       'Bolsa Serena',       'Modelo estruturado, forro interno e bolso para celular.',            22500,   NULL, 1, 'mais-vendidos'),
  ('necessaire-luna',    'Necessaire Luna',    'Tamanho de viagem, fecho de zíper e forro impermeável.',              8900,  11900, 2, 'acessorios'),
  ('chaveiro-flor',      'Chaveiro Flor',      'Pequeno, feito com as sobras de fio de cada bolsa.',                  2500,   NULL, 3, 'acessorios'),
  ('bolsa-praia-maré',   'Bolsa Praia Maré',   'Trama aberta, leve, secagem rápida.',                                19900,  25900, 4, 'novidades'),
  ('porta-copos-par',    'Porta-copos (par)',  'Dois porta-copos em crochê, cores combinando.',                       3900,   NULL, 5, 'novidades'),
  ('bolsa-carteiro',     'Bolsa Carteiro',     'Alça longa, aba com botão de madeira.',                              24900,  31900, 6, 'promocoes'),
  ('kit-presente',       'Kit Presente',       'Uma necessaire, um chaveiro e um par de porta-copos, embalados.',    13900,  17900, 7, 'promocoes')
) AS p(slug, name, description, price, compare_at, position, category)
ON CONFLICT ("storeId", "slug") DO UPDATE
  SET "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "priceCents" = EXCLUDED."priceCents",
      "compareAtPriceCents" = EXCLUDED."compareAtPriceCents",
      "position" = EXCLUDED."position",
      "categoryId" = EXCLUDED."categoryId",
      "updatedAt" = now();

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
