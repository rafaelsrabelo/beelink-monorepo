// Types
import type { PublicFeaturedProduct, ShowcaseProduct } from '@harness-monorepo/contracts';
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { SectionShape } from './page-document.js';

// App
import { isSoldOut } from '../catalog/catalog.visibility.js';
import { SHOWCASE_CARD_SELECT, shelfOf, showcaseQuery, toShowcaseCard } from '../catalog/showcase.query.js';
import { itemsOf } from './page.mapper.js';
import { NO_SLUGS, slideTargetsOf, type SlugsByEntity } from './page-links.js';
import { NO_SHELVES, type PageLookups, type ShelvesByComponent } from './page-public.mapper.js';

/*
  What a page's public read resolves besides its rows: the showcases' products, the featured ones,
  and the slugs the slides and buttons point at. Functions over the client and not a service's methods, because the shop's home
  and a landing page are read the same way, by two services.
*/

/** Every lookup for a page's bands, in parallel. */
export async function lookupsOf(db: PrismaService, storeId: string, sections: readonly SectionShape[]): Promise<PageLookups> {
  const [slugs, shelves, featured] = await Promise.all([
    slideSlugs(db, sections),
    shelvesOf(db, storeId, sections),
    featuredOf(db, storeId, sections),
  ]);
  return { slugs, shelves, featured };
}

/**
 * Each featured product's card, resolved now: its price, photo and stock are the catalogue's, so a
 * change there shows without publishing again. One query for every featured block on the page.
 *
 * Not the shelf's filter: a sold-out product still draws, marked so, because showing the stock is the
 * block's job and the product's page answers a sold-out visitor too. A deleted, draft or archived one
 * is not found, so the block holds nothing and draws nothing.
 */
async function featuredOf(
  db: PrismaService,
  storeId: string,
  sections: readonly SectionShape[],
): Promise<ReadonlyMap<string, PublicFeaturedProduct>> {
  const blocks = sections
    .flatMap((section) => section.components)
    .filter((component) => component.isActive && component.kind === 'FEATURED_PRODUCT')
    .flatMap((component) => {
      const [pick] = itemsOf(component.kind, component.items) as ShowcaseProduct[];
      return pick ? [{ componentId: component.id, productId: pick.productId }] : [];
    });

  if (!blocks.length) return new Map();

  const rows = await db.product.findMany({
    where: { id: { in: blocks.map((block) => block.productId) }, storeId, status: 'ACTIVE' },
    select: { ...SHOWCASE_CARD_SELECT, trackStock: true, stockQuantity: true },
  });
  const byId = new Map(rows.map((row) => [row.id, { ...toShowcaseCard(row), soldOut: isSoldOut(row) }]));

  return new Map(blocks.flatMap((block) => (byId.has(block.productId) ? [[block.componentId, byId.get(block.productId)!] as const] : [])));
}

/**
 * What every showcase on the page draws, resolved from its source: a query per showcase, in
 * parallel, and one more for the categories CATEGORY showcases name.
 *
 * Not in the catalogue's service, which imports the stores module this read serves; the query each
 * source runs lives in `catalog/showcase.query.ts`, where the rule of what is on the shelf already is. Hidden showcases are skipped — the mapper drops them anyway, and a query for a
 * shelf nobody sees is a query the anonymous page pays for.
 */
async function shelvesOf(db: PrismaService, storeId: string, sections: readonly SectionShape[]): Promise<ShelvesByComponent> {
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
async function slideSlugs(db: PrismaService, sections: readonly SectionShape[]): Promise<SlugsByEntity> {
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
