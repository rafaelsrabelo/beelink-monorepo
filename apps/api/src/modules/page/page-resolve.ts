// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { SectionRow } from './page.mapper.js';

// App
import { SHOWCASE_CARD_SELECT, shelfOf, showcaseQuery } from '../catalog/showcase.query.js';
import { NO_SHELVES, NO_SLUGS, slideTargetsOf, type ShelvesByComponent, type SlugsByEntity } from './page-public.mapper.js';

/*
  What a page's public read resolves besides its rows: the showcases' products and the slugs the
  slides point at. Functions over the client and not a service's methods, because the shop's home
  and a landing page are read the same way, by two services.
*/

/** Both lookups for a page's bands, in parallel. */
export async function lookupsOf(
  db: PrismaService,
  storeId: string,
  sections: readonly SectionRow[],
): Promise<{ slugs: SlugsByEntity; shelves: ShelvesByComponent }> {
  const [slugs, shelves] = await Promise.all([slideSlugs(db, sections), shelvesOf(db, storeId, sections)]);
  return { slugs, shelves };
}

/**
 * What every showcase on the page draws, resolved from its source: a query per showcase, in
 * parallel, and one more for the categories CATEGORY showcases name.
 *
 * Not in the catalogue's service, which imports the stores module this read serves; the query each
 * source runs lives in `catalog/showcase.query.ts`, where the rule of what is on the shelf already is. Hidden showcases are skipped — the mapper drops them anyway, and a query for a
 * shelf nobody sees is a query the anonymous page pays for.
 */
async function shelvesOf(db: PrismaService, storeId: string, sections: readonly SectionRow[]): Promise<ShelvesByComponent> {
  const showcases = sections
    .flatMap((section) => section.components)
    .filter((component) => component.isActive && component.kind === 'PRODUCTS');

  if (!showcases.length) return NO_SHELVES;

  const categoryIds = showcases.flatMap((showcase) =>
    showcase.source === 'CATEGORY' && showcase.sourceCategoryId ? [showcase.sourceCategoryId] : [],
  );

  const [categories, shelves] = await Promise.all([
    categoryIds.length
      ? db.productCategory.findMany({
          where: { id: { in: categoryIds }, storeId, isActive: true },
          select: { id: true, slug: true, name: true, description: true },
        })
      : [],
    Promise.all(
      showcases.map(async (showcase) => {
        const query = showcaseQuery(storeId, showcase, db.product.fields.priceCents);
        const rows = query ? await db.product.findMany({ ...query, select: SHOWCASE_CARD_SELECT }) : [];
        return [showcase, shelfOf(showcase, rows)] as const;
      }),
    ),
  ]);

  const categoryOf = new Map(
    categories.map((row) => [row.id, { slug: row.slug, name: row.name, description: row.description }]),
  );

  return new Map(
    shelves.map(([showcase, products]) => [
      showcase.id,
      { products, category: showcase.sourceCategoryId ? (categoryOf.get(showcase.sourceCategoryId) ?? null) : null },
    ]),
  );
}

/**
 * What the hero's slides point at, in one round trip for the whole shop.
 *
 * A slide keeps an id rather than an address, so renaming a category moves the slide with it —
 * the promise a foreign key makes, without the foreign key, because `items` is JSON. Two `IN`
 * queries and no join: a carousel is capped at twenty slides, and this is the page a stranger
 * asks for first.
 *
 * Nothing is thrown when an id resolves to nothing. It simply is not in the map, the mapper
 * builds no address, and the slide is a picture rather than a broken link.
 */
async function slideSlugs(db: PrismaService, sections: readonly SectionRow[]): Promise<SlugsByEntity> {
  const { categoryIds, productIds } = slideTargetsOf(sections);

  if (!categoryIds.length && !productIds.length) return NO_SLUGS;

  const [categories, products] = await Promise.all([
    categoryIds.length
      ? db.productCategory.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, slug: true },
        })
      : [],
    productIds.length
      ? db.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, slug: true },
        })
      : [],
  ]);

  return {
    categories: new Map(categories.map((row) => [row.id, row.slug])),
    products: new Map(products.map((row) => [row.id, row.slug])),
  };
}
